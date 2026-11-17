// Conexión con el backend de JUBINTUD (Node/Express + Firebase).
const BASE = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000';
const CLAVE = 'jubintud_sesion';

let sesion = null;
let alVencer = () => {};

export function cargarSesion() {
  try {
    sesion = JSON.parse(localStorage.getItem(CLAVE));
  } catch {
    sesion = null;
  }
  return sesion;
}

export function guardarSesion(s) {
  sesion = s;
  localStorage.setItem(CLAVE, JSON.stringify(s));
}

export function actualizarSesion(parcial) {
  const nueva = { ...sesion, ...parcial };
  guardarSesion(nueva);
  return nueva;
}

export function borrarSesion() {
  sesion = null;
  localStorage.removeItem(CLAVE);
}

/** Se llama cuando el servidor responde 401 (token vencido). */
export function configurarAlVencer(fn) {
  alVencer = fn;
}

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

async function pedir(metodo, ruta, { cuerpo, token, conToken = true } = {}) {
  const cabeceras = { 'Content-Type': 'application/json' };
  const t = token || (sesion && sesion.token);
  if (conToken && t) cabeceras.Authorization = `Bearer ${t}`;

  let r;
  try {
    r = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Verificá que esté encendido.');
  }

  let datos = null;
  try {
    datos = await r.json();
  } catch {
    datos = null;
  }
  if (r.ok) return datos;

  if (r.status === 401 && conToken && !token) {
    const aviso = 'Tu sesión venció. Iniciá sesión de nuevo.';
    borrarSesion();
    alVencer(aviso);
    throw new ErrorApi(aviso, 401);
  }
  throw new ErrorApi((datos && datos.error) || `Error inesperado (${r.status}).`, r.status);
}

export async function iniciarSesion(email, password) {
  const r = await pedir('POST', '/login', { cuerpo: { email, password }, conToken: false });
  const yo = await pedir('GET', '/yo', { token: r.idToken });
  if (yo.rol !== 'centro' && yo.rol !== 'administrador') {
    throw new ErrorApi(
      'Este panel es para centros y administradores. Los jubilados usan la aplicación móvil.'
    );
  }
  const s = {
    token: r.idToken,
    uid: yo.id,
    rol: yo.rol,
    nombre: `${yo.nombre} ${yo.apellido}`.trim() || yo.email,
    idCentro: yo.id_centro || null,
  };
  guardarSesion(s);
  return s;
}

export const api = {
  actividades: (idCentro) =>
    pedir('GET', idCentro ? `/actividades?id_centro=${encodeURIComponent(idCentro)}` : '/actividades', {
      conToken: false,
    }),
  crearActividad: (datos) => pedir('POST', '/actividades', { cuerpo: datos }),
  editarActividad: (id, cambios) => pedir('PATCH', `/actividades/${id}`, { cuerpo: cambios }),
  inscriptos: (id) => pedir('GET', `/actividades/${id}/inscriptos`),

  centros: () => pedir('GET', '/centros'),
  crearCentro: (datos) => pedir('POST', '/centros', { cuerpo: datos }),
  estadoCentro: (id, estado) => pedir('PATCH', `/centros/${id}/estado`, { cuerpo: { estado } }),

  tickets: () => pedir('GET', '/tickets'),
  atenderTicket: (id, estado, respuesta) =>
    pedir('PATCH', `/tickets/${id}`, { cuerpo: { estado, ...(respuesta ? { respuesta } : {}) } }),

  resumen: () => pedir('GET', '/admin/resumen'),
};
