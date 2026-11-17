# Panel web JUBINTUD (React + Vite) – centros y administradores

Una sola web con pantallas distintas según el rol:
- **Centro:** Mi centro (registrarlo), Actividades (crear, editar, suspender, cancelar, ver inscriptos) y Mapa.
- **Administrador:** Resumen del sistema, Centros (suspender/reactivar), Actividades (todas), Mapa y Soporte (responder consultas).
Los jubilados usan la app móvil: si ingresan acá, el panel los rechaza con un aviso.

## Puesta en marcha

1. Descomprimir este paquete en una carpeta nueva, por ejemplo `src/web`.
2. En esa carpeta: `npm install`
3. Si tu backend NO corre en http://localhost:3000, copiar `.env.example` como `.env` y cambiar `VITE_API_URL`.
4. Con el backend encendido (`node server.js` en `src/backend`): `npm run dev`
5. Abrir http://localhost:5173 e ingresar con un usuario de rol `centro` o `administrador`.

Para crear esos usuarios: registrarlos (con la app o con Postman en POST /registro), promoverlos con
`node scripts/asignarRol.js mail centro` (o `administrador`) en `src/backend`, y volver a iniciar sesión.

`npm run build` genera la carpeta `dist/` lista para publicar.
Los mapas usan Leaflet con teselas de OpenStreetMap (hace falta conexión a internet).
