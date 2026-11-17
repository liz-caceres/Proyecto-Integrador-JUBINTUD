import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Estado from '../components/Estado.jsx';
import Modal from '../components/Modal.jsx';
import { NOMBRE_ESTADO, formatoFecha } from '../utils.js';

const ESTADOS = ['pendiente', 'en_proceso', 'resuelto'];

export default function Soporte() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ticket, setTicket] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await api.tickets());
    } catch (e) {
      setError(e.message);
      setLista([]);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (estado, respuesta) => {
    await api.atenderTicket(ticket.id, estado, respuesta);
    setTicket(null);
    setMensaje('Consulta actualizada.');
    await cargar();
  };

  return (
    <section>
      <h2>Consultas de soporte</h2>
      {mensaje && <p className="mensaje ok" role="status">{mensaje}</p>}
      {error && <p className="mensaje error" role="alert">{error}</p>}
      {lista === null && <p>Cargando…</p>}
      {lista && lista.length === 0 && !error && <p className="vacio">No hay consultas de soporte.</p>}
      {lista && lista.length > 0 && (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Consulta</th>
                <th scope="col">Fecha</th>
                <th scope="col">Estado</th>
                <th scope="col">Respuesta</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id}>
                  <td data-etiqueta="Consulta">{t.descripcion}</td>
                  <td data-etiqueta="Fecha">{formatoFecha(t.fecha_creacion)}</td>
                  <td data-etiqueta="Estado"><Estado valor={t.estado || 'pendiente'} /></td>
                  <td data-etiqueta="Respuesta">{t.respuesta || '—'}</td>
                  <td data-etiqueta="Acciones">
                    <button className="btn btn-chico" onClick={() => setTicket(t)}>Atender</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ticket && (
        <Modal titulo="Atender consulta" onCerrar={() => setTicket(null)}>
          <FormTicket ticket={ticket} onGuardar={guardar} onCerrar={() => setTicket(null)} />
        </Modal>
      )}
    </section>
  );
}

function FormTicket({ ticket, onGuardar, onCerrar }) {
  const [estado, setEstado] = useState(ticket.estado || 'pendiente');
  const [respuesta, setRespuesta] = useState(ticket.respuesta || '');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await onGuardar(estado, respuesta.trim());
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="formulario">
      <p className="cita">{ticket.descripcion}</p>
      <label htmlFor="t-estado">Estado</label>
      <select id="t-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
        {ESTADOS.map((e) => (
          <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>
        ))}
      </select>
      <label htmlFor="t-respuesta">Respuesta para la persona</label>
      <textarea id="t-respuesta" rows={4} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
      {error && <p className="mensaje error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="button" className="btn" onClick={onCerrar}>Cancelar</button>
        <button type="submit" className="btn btn-primario" disabled={enviando}>Guardar</button>
      </div>
    </form>
  );
}
