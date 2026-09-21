# Proyecto Integrador JUBINTUD

# JUBINTUD

Sistema de gestión de actividades recreativas para adultos mayores, orientado a la inclusión social y la participación comunitaria.

---

##  Objetivos
- Facilitar la inscripción de jubilados en actividades recreativas.
- Permitir a los centros comunitarios organizar y gestionar eventos.
- Brindar soporte técnico mediante tickets.
- Promover la interacción social entre usuarios a través de contactos.

---

## Arquitectura
- **Frontend móvil:** Flutter (Dart).
- **Backend:** Node.js con Express.
- **Base de datos:** PostgreSQL + PostGIS, MongoDB para registros.
- **Infraestructura:** Docker + Kubernetes en la nube (OCI/AWS/Azure).

---

## Modelo de datos (DER)
Entidades principales:
- **Usuarios**: entidad central, vinculada con inscripciones, tickets y contactos.
- **Centros**: organizan actividades.
- **Actividades**: eventos recreativos con cupos y ubicación.
- **Inscripciones**: relación N:M entre usuarios y actividades.
- **Tickets**: soporte técnico (1:N con usuarios).
- **Contactos**: red social interna (N:M entre usuarios).

---

## Casos de uso
- **Usuario (Jubilado):** inscribirse en actividades, consultar calendario, recibir notificaciones.
- **Centro Comunitario:** crear y gestionar actividades, controlar inscriptos.
- **Administrador:** soporte técnico, mantenimiento y aprobación de nuevos centros.

---
