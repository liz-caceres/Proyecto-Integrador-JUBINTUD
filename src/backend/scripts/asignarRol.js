// Uso: node scripts/asignarRol.js mail@ejemplo.com centro
// Roles: jubilado | centro | administrador
const { db, auth } = require('../config/firebase');

(async () => {
  const [email, rol] = process.argv.slice(2);
  if (!email || !['jubilado', 'centro', 'administrador'].includes(rol)) {
    console.log('Uso: node scripts/asignarRol.js mail@ejemplo.com centro|administrador|jubilado');
    process.exit(1);
  }
  const usuario = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(usuario.uid, { rol });
  await db.collection('usuarios').doc(usuario.uid).set({ rol }, { merge: true });
  console.log(`Listo: ${email} ahora es "${rol}". Debe volver a iniciar sesión.`);
  process.exit(0);
})();
