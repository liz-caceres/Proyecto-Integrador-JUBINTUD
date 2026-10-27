const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const ErrorNegocio = require('../errores/ErrorNegocio');

// CU-01 / CU-02 Inscripción a salidas y RF-03 Cancelar salida.
// El ID compuesto "usuario_actividad" impide inscripciones duplicadas y la
// transacción evita que dos pedidos simultáneos superen el cupo.
class InscripcionService {
  constructor(db = getFirestore()) {
    this.db = db;
  }

  async inscribir(idUsuario, idActividad) {
    const refActividad = this.db.collection('actividades').doc(idActividad);
    const refInscripcion = this.db
      .collection('inscripciones')
      .doc(`${idUsuario}_${idActividad}`);

    return this.db.runTransaction(async (tx) => {
      const actividad = await tx.get(refActividad);
      const inscripcion = await tx.get(refInscripcion);

      if (!actividad.exists) throw new ErrorNegocio('La actividad no existe.', 404);
      if (inscripcion.exists) throw new ErrorNegocio('Ya estás inscripto.', 409);

      const { estado, cupos, fecha } = actividad.data();
      if (estado !== 'activa') {
        throw new ErrorNegocio(`La actividad está ${estado}.`, 409);
      }
      if (fecha.toMillis() < Date.now()) {
        throw new ErrorNegocio('La actividad ya se realizó.', 409);
      }
      if (cupos <= 0) throw new ErrorNegocio('No hay cupos disponibles.', 409);

      tx.update(refActividad, { cupos: cupos - 1 });
      tx.set(refInscripcion, {
        id_usuario: idUsuario,
        id_actividad: idActividad,
        fecha_inscripcion: Timestamp.now(),
      });
      return { cuposRestantes: cupos - 1 };
    });
  }

  async cancelar(idUsuario, idActividad) {
    const refActividad = this.db.collection('actividades').doc(idActividad);
    const refInscripcion = this.db
      .collection('inscripciones')
      .doc(`${idUsuario}_${idActividad}`);

    return this.db.runTransaction(async (tx) => {
      const actividad = await tx.get(refActividad);
      const inscripcion = await tx.get(refInscripcion);
      if (!inscripcion.exists) throw new ErrorNegocio('No estás inscripto.', 404);

      const cuposLiberados = actividad.data().cupos + 1; // se libera el cupo
      tx.delete(refInscripcion);
      tx.update(refActividad, { cupos: cuposLiberados });
      return { cuposRestantes: cuposLiberados };
    });
  }
}

module.exports = InscripcionService;
