import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatoFecha } from '../utils.js';

const ETIQUETAS = {
  usuarios: 'Usuarios registrados',
  centros: 'Centros',
  actividades: 'Actividades',
  inscripciones: 'Inscripciones',
  tickets: 'Consultas de soporte',
};

export default function Resumen() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      setDatos(await api.resumen());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <section>
      <div className="barra">
        <h2>Resumen del sistema</h2>
        <button className="btn" onClick={cargar}>Actualizar</button>
      </div>
      {error && <p className="mensaje error" role="alert">{error}</p>}
      {!datos && !error && <p>Cargando…</p>}
      {datos && (
        <>
          <p className="mensaje ok" role="status">
            ✔ El sistema está funcionando. Verificado: {formatoFecha(datos.verificado_en)}
          </p>
          <div className="cuadricula">
            {Object.entries(ETIQUETAS).map(([clave, texto]) => (
              <div className="tarjeta numero" key={clave}>
                <span className="valor">{datos.totales[clave] ?? 0}</span>
                <span>{texto}</span>
              </div>
            ))}
            <div className={`tarjeta numero ${datos.tickets_pendientes > 0 ? 'destacada' : ''}`}>
              <span className="valor">{datos.tickets_pendientes}</span>
              <span>Consultas sin responder</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
