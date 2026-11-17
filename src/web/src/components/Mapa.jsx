import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { coordenadas, formatoFecha } from '../utils.js';

// Con Vite hay que indicar a mano dónde están las imágenes de los marcadores de Leaflet.
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const CENTRO_BUENOS_AIRES = [-34.599, -58.42];
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Mapa con un marcador por cada actividad que tenga coordenadas. */
export function MapaActividades({ actividades }) {
  const conUbicacion = actividades.filter((a) => coordenadas(a.ubicacion));
  const centro = conUbicacion.length
    ? [conUbicacion[0].ubicacion.lat, conUbicacion[0].ubicacion.lng]
    : CENTRO_BUENOS_AIRES;
  return (
    <>
      <MapContainer center={centro} zoom={12} className="mapa" scrollWheelZoom>
        <TileLayer attribution={ATRIBUCION} url={TESELAS} />
        {conUbicacion.map((a) => (
          <Marker key={a.id} position={[a.ubicacion.lat, a.ubicacion.lng]}>
            <Popup>
              <strong>{a.nombre}</strong>
              <br />
              {formatoFecha(a.fecha)}
              <br />
              Lugares libres: {a.cupos}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="ayuda">
        {conUbicacion.length} de {actividades.length} actividades tienen ubicación en el mapa.
      </p>
    </>
  );
}

function ClickEnMapa({ onElegir }) {
  useMapEvents({
    click(e) {
      onElegir({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) });
    },
  });
  return null;
}

/** Mapa para elegir una ubicación haciendo clic. */
export function MapaSelector({ valor, onCambio }) {
  const centro = valor ? [valor.lat, valor.lng] : CENTRO_BUENOS_AIRES;
  return (
    <MapContainer center={centro} zoom={13} className="mapa mapa-chico" scrollWheelZoom={false}>
      <TileLayer attribution={ATRIBUCION} url={TESELAS} />
      <ClickEnMapa onElegir={onCambio} />
      {valor && <Marker position={[valor.lat, valor.lng]} />}
    </MapContainer>
  );
}
