import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Estado from '../components/Estado.jsx';

export default function MiCentro({ sesion, onCentro }) {
  if (!sesion.idCentro) return <FormularioCentro onCentro={onCentro} />;
  return <InfoCentro idCentro={sesion.idCentro} />;
}

function FormularioCentro({ onCentro }) {
  const [datos, setDatos] = useState({ nombre: '', direccion: '', telefono: '', email: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  const registrar = async (e) => {
    e.preventDefault();
    if (!datos.nombre.trim()) {
      setError('Escribí el nombre del centro.');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const r = await api.crearCentro(datos);
      onCentro(r.id);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <section className="tarjeta formulario">
      <h2>Registrá tu centro</h2>
      <p className="ayuda">Es el primer paso para poder publicar actividades.</p>
      <form onSubmit={registrar}>
        <label htmlFor="c-nombre">Nombre del centro</label>
        <input id="c-nombre" value={datos.nombre} onChange={cambiar('nombre')} />
        <label htmlFor="c-direccion">Dirección</label>
        <input id="c-direccion" value={datos.direccion} onChange={cambiar('direccion')} />
        <label htmlFor="c-telefono">Teléfono</label>
        <input id="c-telefono" value={datos.telefono} onChange={cambiar('telefono')} />
        <label htmlFor="c-email">Mail de contacto</label>
        <input id="c-email" type="email" value={datos.email} onChange={cambiar('email')} />
        {error && <p className="mensaje error" role="alert">{error}</p>}
        <button className="btn btn-primario" type="submit" disabled={enviando}>
          Registrar mi centro
        </button>
      </form>
    </section>
  );
}

function InfoCentro({ idCentro }) {
  const [centro, setCentro] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .centros()
      .then((lista) => activo && setCentro(lista.find((c) => c.id === idCentro) || false))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [idCentro]);

  if (error) return <p className="mensaje error">{error}</p>;
  if (centro === null) return <p>Cargando…</p>;
  if (centro === false) return <p className="mensaje aviso">No encontramos los datos de tu centro.</p>;
  return (
    <section className="tarjeta">
      <h2>{centro.nombre}</h2>
      <p>
        <Estado valor={centro.estado || 'activo'} />
      </p>
      {centro.direccion && <p>📍 {centro.direccion}</p>}
      {centro.telefono && <p>📞 {centro.telefono}</p>}
      {centro.email && <p>✉️ {centro.email}</p>}
      {centro.estado === 'suspendido' && (
        <p className="mensaje aviso">
          Tu centro está suspendido por el administrador: no podés crear actividades nuevas.
        </p>
      )}
    </section>
  );
}
