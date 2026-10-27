// Error de regla de negocio: el controlador lo traduce a una respuesta HTTP.
class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.status = status;
  }
}

module.exports = ErrorNegocio;
