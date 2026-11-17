import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { MapaActividades } from '../components/Mapa.jsx';

export default function MapaPagina({ idCentro }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api
      .actividades(idCentro)
      .then((l) => activo && setLista(l))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [idCentro]);

  return (
    <section>
      <h2>Mapa de actividades</h2>
      {error && <p className="mensaje error">{error}</p>}
      {!lista && !error && <p>Cargando…</p>}
      {lista && <MapaActividades actividades={lista} />}
    </section>
  );
}
