import { useState } from 'react';
import { iniciarSesion } from '../api.js';

export default function Login({ aviso, onIngreso }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Completá tu mail y tu contraseña.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      onIngreso(await iniciarSesion(email.trim(), password));
    } catch (err) {
      setError(err.message);
      setCargando(false);
    }
  };

  return (
    <main className="login">
      <form className="tarjeta login-tarjeta" onSubmit={enviar}>
        <h1>JUBINTUD</h1>
        <p className="subtitulo">Panel de gestión para centros y administradores</p>
        {aviso && <p className="mensaje aviso">{aviso}</p>}
        <label htmlFor="email">Mail</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="mensaje error" role="alert">{error}</p>}
        <button className="btn btn-primario" type="submit" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
