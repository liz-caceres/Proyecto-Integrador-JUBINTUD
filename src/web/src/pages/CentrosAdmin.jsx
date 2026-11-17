import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Estado from '../components/Estado.jsx';

export default function CentrosAdmin() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLista(await api.centros());
    } catch (e) {
      setError(e.message);
      setLista([]);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = async (c) => {
    const suspender = (c.estado || 'activo') !== 'suspendido';
    const pregunta = suspender
      ? `¿Suspender "${c.nombre}"? No va a poder crear actividades nuevas.`
      : `¿Reactivar "${c.nombre}"?`;
    if (!window.confirm(pregunta)) return;
    setError('');
    try {
      await api.estadoCentro(c.id, suspender ? 'suspendido' : 'activo');
      setMensaje(`"${c.nombre}" quedó ${suspender ? 'suspendido' : 'activo'}.`);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <h2>Centros</h2>
      {mensaje && <p className="mensaje ok" role="status">{mensaje}</p>}
      {error && <p className="mensaje error" role="alert">{error}</p>}
      {lista === null && <p>Cargando…</p>}
      {lista && lista.length === 0 && !error && <p className="vacio">Todavía no hay centros registrados.</p>}
      {lista && lista.length > 0 && (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Centro</th>
                <th scope="col">Dirección</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td data-etiqueta="Centro"><strong>{c.nombre}</strong></td>
                  <td data-etiqueta="Dirección">{c.direccion || '—'}</td>
                  <td data-etiqueta="Teléfono">{c.telefono || '—'}</td>
                  <td data-etiqueta="Estado"><Estado valor={c.estado || 'activo'} /></td>
                  <td data-etiqueta="Acciones">
                    <button className="btn btn-chico" onClick={() => cambiar(c)}>
                      {(c.estado || 'activo') === 'suspendido' ? 'Reactivar' : 'Suspender'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
