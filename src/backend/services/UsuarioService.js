const { getAuth } = require('firebase-admin/auth');
const { getFirestore, GeoPoint, Timestamp } = require('firebase-admin/firestore');
const ErrorNegocio = require('../errores/ErrorNegocio');

// RF-001 Alta de usuario. Solo el rol "jubilado" puede auto-registrarse.
class UsuarioService {
  constructor({ auth = getAuth(), db = getFirestore(), mailer = null } = {}) {
    this.auth = auth;
    this.db = db;
    this.mailer = mailer;
  }

  validarDatos({ nombre, apellido, email, password, ubicacion }) {
    const errores = [];
    if (!nombre || nombre.trim().length < 2) errores.push('Nombre obligatorio.');
    if (!apellido || apellido.trim().length < 2) errores.push('Apellido obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) errores.push('Mail inválido.');
    if (!password || password.length < 8) errores.push('Contraseña de 8+ caracteres.');
    if (ubicacion) {
      const { lat, lng } = ubicacion;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) errores.push('Ubicación inválida.');
    }
    return errores;
  }

  async registrar(datos) {
    const errores = this.validarDatos(datos);
    if (errores.length > 0) throw new ErrorNegocio(errores.join(' '), 400);

    const { nombre, apellido, email, password, ubicacion, intereses = [] } = datos;
    let cuenta;
    try {
      cuenta = await this.auth.createUser({
        email, password, displayName: `${nombre} ${apellido}`,
      });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        throw new ErrorNegocio('El usuario ya se encuentra registrado.', 409);
      }
      throw e;
    }

    try {
      await this.auth.setCustomUserClaims(cuenta.uid, { rol: 'jubilado' });
      await this.db.collection('usuarios').doc(cuenta.uid).set({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email,
        rol: 'jubilado',
        ubicacion: ubicacion ? new GeoPoint(ubicacion.lat, ubicacion.lng) : null,
        intereses: [...new Set(intereses.map((i) => i.trim().toLowerCase()))],
        fecha_registro: Timestamp.now(),
        ultima_actividad: Timestamp.now(),
      });
    } catch (e) {
      await this.auth.deleteUser(cuenta.uid); // compensación: no dejar cuentas huérfanas
      throw e;
    }

    if (this.mailer) {
      const enlace = await this.auth.generateEmailVerificationLink(email);
      await this.mailer.enviarVerificacion(email, enlace);
    }
    return { id: cuenta.uid, nombre, apellido, email, rol: 'jubilado' };
  }
}

module.exports = UsuarioService;
