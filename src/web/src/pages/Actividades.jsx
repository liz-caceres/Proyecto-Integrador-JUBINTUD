import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Estado from '../components/Estado.jsx';
import FormActividad from '../components/FormActividad.jsx';
import Modal from '../components/Modal.jsx';
import { NOMBRE_ESTADO, formatoFecha } from '../utils.js';

/** Lista de actividades. El centro ve y gestiona las suyas; el administrador ve todas. */
export default function Actividades({ idCentro, puedeCrear }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [modal, setModal] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await api.actividades(idCentro));
    } catch (e) {
      setError(e.message);
      setLista([]);
    }
  }, [idCentro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (a, estado, pregunta) => {
    if (!window.confirm(pregunta)) return;
    setError('');
    try {
      await api.editarActividad(a.id, { estado });
      setMensaje(`La actividad "${a.nombre}" quedó ${NOMBRE_ESTADO[estado].toLowerCase()}.`);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const guardar = async (datos) => {
    if (modal.tipo === 'editar') {
      await api.editarActividad(modal.actividad.id, datos);
      setMensaje('Cambios guardados.');
    } else {
      await api.crearActividad(datos);
      setMensaje('¡Actividad publicada!');
    }
    setModal(null);
    await cargar();
  };

  return (
    <section>
      <div className="barra">
        <h2>{puedeCrear ? 'Mis actividades' : 'Todas las actividades'}</h2>
        {puedeCrear && (
          <button className="btn btn-primario" onClick={() => setModal({ tipo: 'nueva' })}>
            + Nueva actividad
          </button>
        )}
      </div>
      {mensaje && <p className="mensaje ok" role="status">{mensaje}</p>}
      {error && <p className="mensaje error" role="alert">{error}</p>}
      {lista === null && <p>Cargando…</p>}
      {lista && lista.length === 0 && !error && (
        <p className="vacio">
          {puedeCrear ? 'Todavía no publicaste actividades. Tocá "Nueva actividad" para crear la primera.' : 'No hay actividades.'}
        </p>
      )}
      {lista && lista.length > 0 && (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Actividad</th>
                <th scope="col">Fecha</th>
                <th scope="col">Lugar</th>
                <th scope="col">Lugares libres</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const estado = a.estado || 'activa';
                return (
                  <tr key={a.id}>
                    <td data-etiqueta="Actividad"><strong>{a.nombre}</strong></td>
                    <td data-etiqueta="Fecha">{formatoFecha(a.fecha)}</td>
                    <td data-etiqueta="Lugar">{a.lugar || '—'}</td>
                    <td data-etiqueta="Lugares libres">{a.cupos}</td>
                    <td data-etiqueta="Estado"><Estado valor={estado} /></td>
                    <td data-etiqueta="Acciones" className="acciones-fila">
                      <button className="btn btn-chico" onClick={() => setModal({ tipo: 'inscriptos', actividad: a })}>
                        Inscriptos
                      </button>
                      <button className="btn btn-chico" onClick={() => setModal({ tipo: 'editar', actividad: a })}>
                        Editar
                      </button>
                      {estado === 'activa' && (
                        <button
                          className="btn btn-chico"
                          onClick={() =>
                            cambiarEstado(a, 'suspendida', `¿Suspender "${a.nombre}"? Las personas inscriptas no podrán participar mientras esté suspendida.`)
                          }
                        >
                          Suspender
                        </button>
                      )}
                      {estado === 'suspendida' && (
                        <button
                          className="btn btn-chico"
                          onClick={() => cambiarEstado(a, 'activa', `¿Reactivar "${a.nombre}"?`)}
                        >
                          Reactivar
                        </button>
                      )}
                      {estado !== 'cancelada' && (
                        <button
                          className="btn btn-chico btn-peligro"
                          onClick={() => cambiarEstado(a, 'cancelada', `¿Cancelar "${a.nombre}"? La actividad no se va a realizar.`)}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (modal.tipo === 'nueva' || modal.tipo === 'editar') && (
        <Modal titulo={modal.tipo === 'nueva' ? 'Nueva actividad' : 'Editar actividad'} onCerrar={() => setModal(null)}>
          <FormActividad inicial={modal.actividad} onGuardar={guardar} onCerrar={() => setModal(null)} />
        </Modal>
      )}
      {modal && modal.tipo === 'inscriptos' && (
        <Modal titulo={`Inscriptos: ${modal.actividad.nombre}`} onCerrar={() => setModal(null)}>
          <Inscriptos idActividad={modal.actividad.id} />
        </Modal>
      )}
    </section>
  );
}

function Inscriptos({ idActividad }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .inscriptos(idActividad)
      .then((r) => activo && setInfo(r))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [idActividad]);

  if (error) return <p className="mensaje error">{error}</p>;
  if (!info) return <p>Cargando…</p>;
  return (
    <div>
      <p>
        <strong>{info.total_inscriptos}</strong> inscriptas/os · <strong>{info.cupos_disponibles}</strong> lugares libres
      </p>
      {info.inscriptos.length === 0 ? (
        <p className="vacio">Todavía no hay inscriptos.</p>
      ) : (
        <ul className="lista">
          {info.inscriptos.map((i) => (
            <li key={i.id}>
              <strong>{`${i.nombre || ''} ${i.apellido || ''}`.trim() || 'Sin nombre'}</strong>
              <span>{i.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
