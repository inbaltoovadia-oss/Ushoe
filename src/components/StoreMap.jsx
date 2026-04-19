import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icons (broken in Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const storeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ stores, userCoords }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (userCoords) points.push([userCoords.lat, userCoords.lng]);
    stores.forEach(s => { if (s.latitude && s.longitude) points.push([s.latitude, s.longitude]); });
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [stores, userCoords]);
  return null;
}

export default function StoreMap({ stores, userCoords, onSelectStore, selectedIndex }) {
  const center = userCoords
    ? [userCoords.lat, userCoords.lng]
    : stores.find(s => s.latitude)?.[0]
      ? [stores[0].latitude, stores[0].longitude]
      : [40.7128, -74.006];

  return (
    <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-border shadow-lg">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds stores={stores} userCoords={userCoords} />

        {/* User location */}
        {userCoords && (
          <>
            <Circle
              center={[userCoords.lat, userCoords.lng]}
              radius={40233} // 25 miles in meters
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.05, weight: 1.5, dashArray: "6 4" }}
            />
            <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
              <Popup><strong>Your Location</strong></Popup>
            </Marker>
          </>
        )}

        {/* Store markers */}
        {stores.map((store, i) => {
          if (!store.latitude || !store.longitude) return null;
          return (
            <Marker
              key={i}
              position={[store.latitude, store.longitude]}
              icon={storeIcon}
              eventHandlers={{ click: () => onSelectStore(i) }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{store.name}</p>
                  <p className="text-gray-500 text-xs">{store.address}</p>
                  {store.distance_miles != null && (
                    <p className="text-blue-600 font-semibold text-xs mt-1">
                      📍 {store.distance_miles.toFixed(1)} mi away
                    </p>
                  )}
                  {store.rating && <p className="text-xs">⭐ {store.rating.toFixed(1)}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}