import { CLASE_ESTADO, NOMBRE_ESTADO } from '../utils.js';

export default function Estado({ valor }) {
  return <span className={`etiqueta ${CLASE_ESTADO[valor] || 'info'}`}>{NOMBRE_ESTADO[valor] || valor}</span>;
}
