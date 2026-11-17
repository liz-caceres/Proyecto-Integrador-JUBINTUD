import { useState } from 'react';
import { MapaSelector } from './Mapa.jsx';
import { BARRIOS, aInputFecha, coordenadas } from '../utils.js';

/** Formulario para crear o editar una actividad. */
export default function FormActividad({ inicial, onGuardar, onCerrar }) {
  const edicion = Boolean(inicial);
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion || '');
  const [fecha, setFecha] = useState(aInputFecha(inicial?.fecha));
  const [cupos, setCupos] = useState('');
  const [dificultad, setDificultad] = useState(inicial?.dificultad || 'baja');
  const [lugar, setLugar] = useState(inicial?.lugar || '');
  const [ubicacion, setUbicacion] = useState(coordenadas(inicial?.ubicacion));
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const f = new Date(fecha);
    if (!nombre.trim()) return setError('Escribí el nombre de la actividad.');
    if (Number.isNaN(f.getTime())) return setError('Elegí una fecha y una hora.');
    if (!edicion && f.getTime() < Date.now()) return setError('La fecha tiene que ser futura.');
    if (!edicion && !(Number.isInteger(Number(cupos)) && Number(cupos) >= 1)) {
      return setError('Indicá cuántos lugares hay (un número entero, al menos 1).');
    }
    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      dificultad,
      lugar: lugar.trim(),
      fecha: f.toISOString(),
      ...(ubicacion ? { ubicacion } : {}),
    };
    if (!edicion) datos.cupos = Number(cupos);
    setEnviando(true);
    setError('');
    try {
      await onGuardar(datos);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="formulario">
      <label htmlFor="a-nombre">Nombre de la actividad</label>
      <input id="a-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label htmlFor="a-desc">Descripción</label>
      <textarea id="a-desc" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />

      <label htmlFor="a-fecha">Fecha y hora</label>
      <input id="a-fecha" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      {!edicion ? (
        <>
          <label htmlFor="a-cupos">Cantidad de lugares</label>
          <input id="a-cupos" type="number" min="1" value={cupos} onChange={(e) => setCupos(e.target.value)} />
        </>
      ) : (
        <p className="ayuda">Los lugares no se pueden cambiar para no desordenar las inscripciones existentes.</p>
      )}

      <label htmlFor="a-dif">Dificultad</label>
      <select id="a-dif" value={dificultad} onChange={(e) => setDificultad(e.target.value)}>
        <option value="baja">Baja</option>
        <option value="media">Media</option>
        <option value="alta">Alta</option>
      </select>

      <label htmlFor="a-lugar">Lugar (dirección o sala)</label>
      <input id="a-lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} />

      <p className="etiqueta-campo">Ubicación en el mapa (hacé clic o elegí un barrio)</p>
      <div className="barrios">
        {Object.entries(BARRIOS).map(([nombreBarrio, coord]) => (
          <button type="button" key={nombreBarrio} className="btn btn-chico" onClick={() => setUbicacion(coord)}>
            {nombreBarrio}
          </button>
        ))}
      </div>
      <MapaSelector valor={ubicacion} onCambio={setUbicacion} />
      <p className="ayuda">
        {ubicacion ? `Ubicación elegida: ${ubicacion.lat}, ${ubicacion.lng}` : 'Todavía no elegiste una ubicación.'}
      </p>

      {error && <p className="mensaje error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="button" className="btn" onClick={onCerrar}>Cancelar</button>
        <button type="submit" className="btn btn-primario" disabled={enviando}>
          {edicion ? 'Guardar cambios' : 'Publicar actividad'}
        </button>
      </div>
    </form>
  );
}
