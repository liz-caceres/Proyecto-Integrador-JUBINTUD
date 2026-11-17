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
    if (!r.ok) {
      const motivo = (datos.error && datos.error.message) || 'DESCONOCIDO';
      console.error('Falló el login en Firebase:', motivo);
      const credenciales = ['EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'INVALID_LOGIN_CREDENTIALS', 'USER_DISABLED'];
      if (credenciales.some((c) => motivo.startsWith(c))) {
        throw new ErrorNegocio('Mail o contraseña incorrectos.', 401);
      }
      throw new ErrorNegocio(`No se pudo iniciar sesión (${motivo}). Revisá la configuración de Firebase.`, 500);
    }
    await db.collection('usuarios').doc(datos.localId)
      .set({ ultima_actividad: Timestamp.now() }, { merge: true });
    res.json({ idToken: datos.idToken, refreshToken: datos.refreshToken, uid: datos.localId });
  }));

  // Perfil del usuario logueado (lo usa el panel web para saber el rol).
  app.get('/yo', protegida, ruta(async (req, res) => {
    const doc = await db.collection('usuarios').doc(req.usuario.uid).get();
    if (!doc.exists) throw new ErrorNegocio('Perfil no encontrado.', 404);
    const u = doc.data();
    res.json({
      id: doc.id,
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      email: u.email || '',
      rol: u.rol,
      id_centro: u.id_centro || null,
    });
  }));

  // --- Centros ---------------------------------------------------------
  app.get('/centros', protegida, ruta(async (req, res) => {
    const snap = await db.collection('centros').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...serializar(d.data()) })));
  }));

  app.post('/centros', protegida, exigirRol('centro', 'administrador'), ruta(async (req, res) => {
    const { nombre, direccion = '', telefono = '', email = '' } = req.body;
    if (!nombre || !String(nombre).trim()) throw new ErrorNegocio('El nombre del centro es obligatorio.', 400);
    const yoRef = db.collection('usuarios').doc(req.usuario.uid);
    const yo = await yoRef.get();
    if (yo.exists && yo.data().id_centro) throw new ErrorNegocio('Ya registraste un centro.', 409);
    const ref = await db.collection('centros').add({
      nombre: String(nombre).trim(), direccion, telefono, email,
      estado: 'activo',
      id_responsable: req.usuario.uid,
      fecha_registro: Timestamp.now(),
    });
    await yoRef.set({ id_centro: ref.id }, { merge: true });
    res.status(201).json({ id: ref.id });
  }));

  app.patch('/centros/:id/estado', protegida, exigirRol('administrador'), ruta(async (req, res) => {
    const { estado } = req.body;
    if (!['activo', 'suspendido'].includes(estado)) throw new ErrorNegocio('Estado inválido.', 400);
    await db.collection('centros').doc(req.params.id).set({ estado }, { merge: true });
    res.json({ id: req.params.id, estado });
  }));

  // --- Actividades -----------------------------------------------------
  // Pública. Con ?id_centro=XXX devuelve solo las de ese centro.
  app.get('/actividades', ruta(async (req, res) => {
    let consulta = db.collection('actividades');
    if (req.query.id_centro) consulta = consulta.where('id_centro', '==', req.query.id_centro);
    const snap = await consulta.get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...serializar(d.data()) })));
  }));

  app.post('/actividades', protegida, exigirRol('centro', 'administrador'), ruta(async (req, res) => {
    const { nombre, descripcion = '', fecha, cupos, dificultad = 'baja', lugar = '', ubicacion } = req.body;
    const yo = await db.collection('usuarios').doc(req.usuario.uid).get();
    // El id_centro sale del usuario; también se acepta en el body (para Postman).
    const id_centro = req.body.id_centro || (yo.exists && yo.data().id_centro);
    const f = new Date(fecha);
    if (!nombre) throw new ErrorNegocio('El nombre es obligatorio.', 400);
    if (!id_centro) throw new ErrorNegocio('Primero registrá tu centro.', 400);
    if (!Number.isInteger(cupos) || cupos < 1) throw new ErrorNegocio('Los cupos deben ser un entero mayor a 0.', 400);
    if (Number.isNaN(f.getTime())) throw new ErrorNegocio('Fecha inválida (usar formato 2026-11-05T15:00:00).', 400);
    const centro = await db.collection('centros').doc(id_centro).get();
    if (centro.exists && centro.data().estado === 'suspendido') {
      throw new ErrorNegocio('Tu centro está suspendido: no podés crear actividades.', 403);
    }
    const ref = await db.collection('actividades').add({
      nombre, descripcion, cupos, dificultad, lugar, id_centro,
      fecha: Timestamp.fromDate(f),
      estado: 'activa',
      ubicacion: ubicacion ? new GeoPoint(ubicacion.lat, ubicacion.lng) : null,
    });
    res.status(201).json({ id: ref.id });
  }));

  app.patch('/actividades/:id', protegida, exigirRol('centro', 'administrador'), ruta(async (req, res) => {
    const permitidos = ['nombre', 'descripcion', 'dificultad', 'lugar', 'estado'];
    const cambios = {};
    for (const k of permitidos) if (req.body[k] !== undefined) cambios[k] = req.body[k];
    if (req.body.fecha) {
      const f = new Date(req.body.fecha);
      if (Number.isNaN(f.getTime())) throw new ErrorNegocio('Fecha inválida.', 400);
      cambios.fecha = Timestamp.fromDate(f);
    }
    if (req.body.ubicacion) {
      cambios.ubicacion = new GeoPoint(req.body.ubicacion.lat, req.body.ubicacion.lng);
    }
    await db.collection('actividades').doc(req.params.id).set(cambios, { merge: true });
    res.json({ id: req.params.id });
  }));

  // Lista de inscriptos de una actividad (para el panel).
  app.get('/actividades/:id/inscriptos', protegida, exigirRol('centro', 'administrador'), ruta(async (req, res) => {
    const actDoc = await db.collection('actividades').doc(req.params.id).get();
    if (!actDoc.exists) throw new ErrorNegocio('Actividad no encontrada.', 404);
    const cupos = actDoc.data().cupos || 0;

    // Se leen las inscripciones y se filtra acá, tolerando distintos nombres de campo.
    const snap = await db.collection('inscripciones').get();
    const delaActividad = snap.docs
      .map((d) => d.data())
      .filter((i) => (i.id_actividad || i.actividad_id || i.idActividad) === req.params.id)
      .filter((i) => !['cancelada', 'cancelado'].includes(i.estado));

    const inscriptos = [];
    for (const i of delaActividad) {
      const idUsuario = i.id_usuario || i.usuario_id || i.idUsuario;
      if (!idUsuario) continue;
      const u = await db.collection('usuarios').doc(idUsuario).get();
      const datos = u.exists ? u.data() : {};
      inscriptos.push({
        id: idUsuario, nombre: datos.nombre || '', apellido: datos.apellido || '', email: datos.email || '',
      });
    }
    res.json({
      total_inscriptos: inscriptos.length,
      cupos_disponibles: Math.max(cupos - inscriptos.length, 0),
      inscriptos,
    });
  }));

  // --- Inscripciones ---------------------------------------------------
  app.post('/actividades/:id/inscripcion', protegida, ruta(async (req, res) => {
    res.status(201).json(await inscripciones.inscribir(req.usuario.uid, req.params.id));
  }));

  app.delete('/actividades/:id/inscripcion', protegida, ruta(async (req, res) => {
    res.json(await inscripciones.cancelar(req.usuario.uid, req.params.id));
  }));

  // --- Soporte (tickets) -----------------------------------------------
  app.get('/tickets', protegida, exigirRol('administrador'), ruta(async (req, res) => {
    const snap = await db.collection('tickets').get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...serializar(d.data()) })));
  }));

  app.patch('/tickets/:id', protegida, exigirRol('administrador'), ruta(async (req, res) => {
    const { estado, respuesta } = req.body;
    if (!['pendiente', 'en_proceso', 'resuelto'].includes(estado)) {
      throw new ErrorNegocio('Estado inválido.', 400);
    }
    const cambios = { estado };
    if (respuesta) cambios.respuesta = respuesta;
    await db.collection('tickets').doc(req.params.id).set(cambios, { merge: true });
    res.json({ id: req.params.id, estado });
  }));

  // --- Resumen del sistema (administrador) -----------------------------
  app.get('/admin/resumen', protegida, exigirRol('administrador'), ruta(async (req, res) => {
    const nombres = ['usuarios', 'centros', 'actividades', 'inscripciones', 'tickets'];
    const snaps = await Promise.all(nombres.map((n) => db.collection(n).get()));
    const totales = {};
    nombres.forEach((n, i) => { totales[n] = snaps[i].size; });
    const pendientes = snaps[4].docs.filter((d) => (d.data().estado || 'pendiente') === 'pendiente').length;
    res.json({
      totales,
      tickets_pendientes: pendientes,
      verificado_en: new Date().toISOString(),
    });
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