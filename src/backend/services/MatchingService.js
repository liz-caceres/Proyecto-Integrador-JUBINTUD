// Motor de emparejamiento por afinidad: intereses en común + cercanía geográfica.
class MatchingService {
  constructor({ radioMaxKm = 15, pesoIntereses = 0.7, pesoCercania = 0.3 } = {}) {
    this.radioMaxKm = radioMaxKm;
    this.pesoIntereses = pesoIntereses;
    this.pesoCercania = pesoCercania;
  }

  // Distancia entre dos puntos {latitude, longitude} con la fórmula de Haversine.
  distanciaKm(a, b) {
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLng = rad(b.longitude - a.longitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }

  // Índice de Jaccard: |A ∩ B| / |A ∪ B|, entre 0 y 1.
  similitudIntereses(a = [], b = []) {
    const conjA = new Set(a.map((i) => i.toLowerCase()));
    const conjB = new Set(b.map((i) => i.toLowerCase()));
    const comunes = [...conjA].filter((i) => conjB.has(i));
    const union = new Set([...conjA, ...conjB]).size;
    return { valor: union === 0 ? 0 : comunes.length / union, comunes };
  }

  calcularAfinidad(a, b) {
    const { valor, comunes } = this.similitudIntereses(a.intereses, b.intereses);
    let distancia = null;
    let cercania = 0;
    if (a.ubicacion && b.ubicacion) {
      distancia = this.distanciaKm(a.ubicacion, b.ubicacion);
      cercania = Math.max(0, 1 - distancia / this.radioMaxKm);
    }
    const puntaje = 100 * (this.pesoIntereses * valor + this.pesoCercania * cercania);
    return {
      puntaje: Math.round(puntaje),
      interesesComunes: comunes,
      distanciaKm: distancia === null ? null : Math.round(distancia * 10) / 10,
    };
  }

  // Devuelve los candidatos más afines, excluyendo al propio usuario y a sus contactos.
  sugerirContactos(usuario, candidatos, { limite = 10, excluidos = [] } = {}) {
    return candidatos
      .filter((c) => c.id !== usuario.id && !excluidos.includes(c.id))
      .map((c) => ({ id: c.id, nombre: c.nombre, ...this.calcularAfinidad(usuario, c) }))
      .filter((s) => s.puntaje > 0)
      .sort((x, y) => y.puntaje - x.puntaje)
      .slice(0, limite);
  }
}

module.exports = MatchingService;
