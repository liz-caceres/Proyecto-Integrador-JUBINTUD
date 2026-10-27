const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Timestamp, GeoPoint } = require('firebase-admin/firestore');

const ErrorNegocio = require('./errores/ErrorNegocio');
const UsuarioService = require('./services/UsuarioService');
const InscripcionService = require('./services/InscripcionService');
const MatchingService = require('./services/MatchingService');
const { autenticar, exigirRol } = require('./middleware/auth');

// Convierte Timestamp -> texto ISO y GeoPoint -> {lat, lng} para enviarlos como JSON.
function serializar(v) {
  if (v === null || v === undefined) return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (typeof v.latitude === 'number' && typeof v.longitude === 'number') {
    return { lat: v.latitude, lng: v.longitude };
  }
  if (Array.isArray(v)) return v.map(serializar);
  if (typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializar(x)]));
  }
  return v;
}

// Evita repetir try/catch en cada ruta (funciona en Express 4 y 5).
const ruta = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function crearApp({ db, auth, apiKey, fetchFn = fetch }) {
  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(express.json());

  const usuarios = new UsuarioService({ auth, db });
  const inscripciones = new InscripcionService(db);
  const matching = new MatchingService();
  const protegida = autenticar(auth);

  app.get('/salud', (req, res) => res.json({ estado: 'ok' }));

  // --- Cuentas ---------------------------------------------------------
  app.post('/registro', ruta(async (req, res) => {
    res.status(201).json(await usuarios.registrar(req.body));
  }));

  // Inicio de sesión: devuelve el ID token que se usa como "Bearer" en las demás rutas.
  app.post('/login', ruta(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new ErrorNegocio('Mail y contraseña obligatorios.', 400);
    const r = await fetchFn(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }) });
    const datos = await r.json();
    if (!r.ok) throw new ErrorNegocio('Mail o contraseña incorrectos.', 401);
    await db.collection('usuarios').doc(datos.localId)
      .set({ ultima_actividad: Timestamp.now() }, { merge: true });
    res.json({ idToken: datos.idToken, refreshToken: datos.refreshToken, uid: datos.localId });
  }));

  // --- Actividades -----------------------------------------------------
  app.get('/actividades', ruta(async (req, res) => {
    const snap = await db.collection('actividades').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...serializar(d.data()) })));
  }));

  app.post('/actividades', protegida, exigirRol('centro', 'administrador'), ruta(async (req, res) => {
    const { nombre, descripcion = '', fecha, cupos, dificultad = 'baja', lugar = '', ubicacion, id_centro } = req.body;
    const f = new Date(fecha);
    if (!nombre || !id_centro) throw new ErrorNegocio('Nombre e id_centro son obligatorios.', 400);
    if (!Number.isInteger(cupos) || cupos < 1) throw new ErrorNegocio('Los cupos deben ser un entero mayor a 0.', 400);
    if (Number.isNaN(f.getTime())) throw new ErrorNegocio('Fecha inválida (usar formato 2026-11-05T15:00:00).', 400);
    const ref = await db.collection('actividades').add({
      nombre, descripcion, cupos, dificultad, lugar, id_centro,
      fecha: Timestamp.fromDate(f),
      estado: 'activa',
      ubicacion: ubicacion ? new GeoPoint(ubicacion.lat, ubicacion.lng) : null,
    });
    res.status(201).json({ id: ref.id });
  }));

  // --- Inscripciones ---------------------------------------------------
  app.post('/actividades/:id/inscripcion', protegida, ruta(async (req, res) => {
    res.status(201).json(await inscripciones.inscribir(req.usuario.uid, req.params.id));
  }));

  app.delete('/actividades/:id/inscripcion', protegida, ruta(async (req, res) => {
    res.json(await inscripciones.cancelar(req.usuario.uid, req.params.id));
  }));

  // --- Matching --------------------------------------------------------
  app.get('/sugerencias', protegida, ruta(async (req, res) => {
    const yoDoc = await db.collection('usuarios').doc(req.usuario.uid).get();
    if (!yoDoc.exists) throw new ErrorNegocio('Perfil no encontrado.', 404);
    const yo = { id: req.usuario.uid, ...yoDoc.data() };
    const snap = await db.collection('usuarios').limit(200).get();
    const candidatos = snap.docs.map((d) => {
      const u = d.data();
      return { id: d.id, nombre: `${u.nombre} ${u.apellido}`, intereses: u.intereses, ubicacion: u.ubicacion };
    });
    res.json(matching.sugerirContactos(yo, candidatos, { limite: 10 }));
  }));

  // --- Errores ---------------------------------------------------------
  app.use((err, req, res, next) => {
    if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  return app;
}

module.exports = crearApp;
