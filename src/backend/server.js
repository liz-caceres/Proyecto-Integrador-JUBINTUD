const { db, auth } = require('./config/firebase'); // inicializa Firebase y carga el .env
const crearApp = require('./app');

const app = crearApp({ db, auth, apiKey: process.env.FIREBASE_API_KEY });
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => console.log(`API de JUBINTUD en http://localhost:${PUERTO}`));
