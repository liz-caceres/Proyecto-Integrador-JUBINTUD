const { db } = require('./config/firebase');
(async () => {
  await db.collection('prueba').doc('hola').set({ mensaje: 'Conexión OK', fecha: new Date() });
  const doc = await db.collection('prueba').doc('hola').get();
  console.log(doc.data());
  process.exit(0);
})();