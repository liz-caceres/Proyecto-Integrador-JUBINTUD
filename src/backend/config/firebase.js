const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const rutaClave = path.resolve(__dirname, '..', process.env.FIREBASE_KEY_PATH);
initializeApp({ credential: cert(require(rutaClave)) });

module.exports = { db: getFirestore(), auth: getAuth() };