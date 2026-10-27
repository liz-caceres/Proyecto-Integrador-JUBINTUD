// Verifica el ID token de Firebase que llega en "Authorization: Bearer <token>".
function autenticar(auth) {
  return async (req, res, next) => {
    const cabecera = req.headers.authorization || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Falta el token de sesión.' });
    try {
      const d = await auth.verifyIdToken(token);
      req.usuario = { uid: d.uid, email: d.email, rol: d.rol || 'jubilado' };
      next();
    } catch (e) {
      res.status(401).json({ error: 'Token inválido o vencido.' });
    }
  };
}

function exigirRol(...roles) {
  return (req, res, next) =>
    roles.includes(req.usuario.rol)
      ? next()
      : res.status(403).json({ error: 'No tenés permisos para esta acción.' });
}

module.exports = { autenticar, exigirRol };
