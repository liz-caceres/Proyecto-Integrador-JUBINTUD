export const dos = (n) => String(n).padStart(2, '0');

export function formatoFecha(iso) {
  if (!iso) return 'Sin fecha';
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return 'Sin fecha';
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())} hs`;
}

/** Valor para un <input type="datetime-local">. Sin fecha: dentro de una semana, a las 16:00. */
export function aInputFecha(iso) {
  let f = iso ? new Date(iso) : null;
  if (!f || Number.isNaN(f.getTime())) {
    f = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    f.setHours(16, 0, 0, 0);
  }
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

export const NOMBRE_ESTADO = {
  activa: 'Activa',
  suspendida: 'Suspendida',
  cancelada: 'Cancelada',
  activo: 'Activo',
  suspendido: 'Suspendido',
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
};

export const CLASE_ESTADO = {
  activa: 'ok',
  activo: 'ok',
  resuelto: 'ok',
  suspendida: 'aviso',
  suspendido: 'aviso',
  pendiente: 'aviso',
  cancelada: 'error',
  en_proceso: 'info',
};

export const BARRIOS = {
  Palermo: { lat: -34.588, lng: -58.43 },
  'Villa Crespo': { lat: -34.599, lng: -58.44 },
  Almagro: { lat: -34.608, lng: -58.421 },
  Belgrano: { lat: -34.562, lng: -58.456 },
  Recoleta: { lat: -34.588, lng: -58.393 },
  Caballito: { lat: -34.618, lng: -58.444 },
};

/** Algunas actividades viejas guardaron la ubicación como texto: solo sirven las coordenadas. */
export function coordenadas(u) {
  return u && typeof u.lat === 'number' && typeof u.lng === 'number' ? u : null;
}
