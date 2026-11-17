import { useEffect, useState } from 'react';
import { actualizarSesion, borrarSesion, cargarSesion, configurarAlVencer } from './api.js';
import Login from './pages/Login.jsx';
import MiCentro from './pages/MiCentro.jsx';
import Actividades from './pages/Actividades.jsx';
import MapaPagina from './pages/MapaPagina.jsx';
import Resumen from './pages/Resumen.jsx';
import CentrosAdmin from './pages/CentrosAdmin.jsx';
import Soporte from './pages/Soporte.jsx';

// Cada rol ve pantallas distintas.
const PESTANAS = {
  centro: ['Mi centro', 'Actividades', 'Mapa'],
  administrador: ['Resumen', 'Centros', 'Actividades', 'Mapa', 'Soporte'],
};

const ROL_TEXTO = { centro: 'Centro', administrador: 'Administrador' };

export default function App() {
  const [sesion, setSesion] = useState(() => cargarSesion());
  const [aviso, setAviso] = useState('');
  const [pestana, setPestana] = useState(null);

  useEffect(() => {
    configurarAlVencer((mensaje) => {
      setAviso(mensaje);
      setSesion(null);
    });
  }, []);

  if (!sesion) {
    return (
      <Login
        aviso={aviso}
        onIngreso={(s) => {
          setAviso('');
          setPestana(null);
          setSesion(s);
        }}
      />
    );
  }

  const pestanas = PESTANAS[sesion.rol] || [];
  const actual = pestana && pestanas.includes(pestana) ? pestana : pestanas[0];
  const esCentro = sesion.rol === 'centro';

  const salir = () => {
    borrarSesion();
    setSesion(null);
  };

  let contenido = <p className="mensaje error">Tu usuario no tiene acceso a este panel.</p>;
  if (actual === 'Mi centro') {
    contenido = <MiCentro sesion={sesion} onCentro={(id) => setSesion(actualizarSesion({ idCentro: id }))} />;
  } else if (actual === 'Actividades') {
    contenido =
      esCentro && !sesion.idCentro ? (
        <p className="mensaje aviso">Primero registrá tu centro en la pestaña "Mi centro".</p>
      ) : (
        <Actividades key={sesion.idCentro || 'todas'} idCentro={esCentro ? sesion.idCentro : null} puedeCrear={esCentro} />
      );
  } else if (actual === 'Mapa') {
    contenido =
      esCentro && !sesion.idCentro ? (
        <p className="mensaje aviso">Primero registrá tu centro en la pestaña "Mi centro".</p>
      ) : (
        <MapaPagina idCentro={esCentro ? sesion.idCentro : null} />
      );
  } else if (actual === 'Resumen') {
    contenido = <Resumen />;
  } else if (actual === 'Centros') {
    contenido = <CentrosAdmin />;
  } else if (actual === 'Soporte') {
    contenido = <Soporte />;
  }

  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca">JUBINTUD <span>Panel de gestión</span></div>
        <div className="usuario">
          <span>
            {sesion.nombre} · <strong>{ROL_TEXTO[sesion.rol] || sesion.rol}</strong>
          </span>
          <button className="btn btn-chico" onClick={salir}>Salir</button>
        </div>
      </header>
      <nav className="pestanas" aria-label="Secciones">
        {pestanas.map((p) => (
          <button
            key={p}
            className={`pestana ${p === actual ? 'activa' : ''}`}
            aria-current={p === actual ? 'page' : undefined}
            onClick={() => setPestana(p)}
          >
            {p}
          </button>
        ))}
      </nav>
      <main className="contenido">{contenido}</main>
    </div>
  );
}
