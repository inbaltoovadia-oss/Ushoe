import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function StoreMap({ stores, userCoords, onSelectStore, selectedIndex }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [apiKey, setApiKey] = useState(null);
  const [keyError, setKeyError] = useState(false);

  // Fetch the API key from backend once
  useEffect(() => {
    base44.functions.invoke("getGoogleMapsKey", {})
      .then(res => setApiKey(res.data?.apiKey || null))
      .catch(() => setKeyError(true));
  }, []);

  // Init map once we have the key
  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    loadGoogleMaps(apiKey).then(() => {
      if (mapRef.current) return; // already initialised

      const center = userCoords
        ? { lat: userCoords.lat, lng: userCoords.lng }
        : stores.find(s => s.latitude && s.longitude)
          ? { lat: stores[0].latitude, lng: stores[0].longitude }
          : { lat: 40.7128, lng: -74.006 };

      const map = new window.google.maps.Map(containerRef.current, {
        center,
        zoom: 12,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      mapRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();

      const bounds = new window.google.maps.LatLngBounds();

      // User location marker
      if (userCoords) {
        bounds.extend({ lat: userCoords.lat, lng: userCoords.lng });
        new window.google.maps.Marker({
          position: { lat: userCoords.lat, lng: userCoords.lng },
          map,
          title: "Your Location",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
          zIndex: 999,
        });

        new window.google.maps.Circle({
          map,
          center: { lat: userCoords.lat, lng: userCoords.lng },
          radius: 40233, // 25 miles in metres
          strokeColor: "#3b82f6",
          strokeOpacity: 0.4,
          strokeWeight: 1.5,
          fillColor: "#3b82f6",
          fillOpacity: 0.05,
        });
      }

      // Store markers
      const newMarkers = stores.map((store, i) => {
        if (!store.latitude || !store.longitude) return null;
        bounds.extend({ lat: store.latitude, lng: store.longitude });

        const marker = new window.google.maps.Marker({
          position: { lat: store.latitude, lng: store.longitude },
          map,
          title: store.name,
          icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        });

        marker.addListener("click", () => {
          onSelectStore(i);
          infoWindowRef.current.setContent(`
            <div style="font-family:sans-serif;padding:4px 2px;max-width:200px">
              <p style="font-weight:700;margin:0 0 2px">${store.name}</p>
              <p style="color:#666;font-size:12px;margin:0 0 4px">${store.address}</p>
              ${store.distance_miles != null ? `<p style="color:#2563eb;font-size:12px;font-weight:600;margin:0">📍 ${store.distance_miles.toFixed(1)} mi away</p>` : ""}
              ${store.rating ? `<p style="font-size:12px;margin:2px 0 0">⭐ ${store.rating.toFixed(1)}</p>` : ""}
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        });

        return marker;
      });

      markersRef.current = newMarkers;

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    }).catch(() => setKeyError(true));
  }, [apiKey, stores, userCoords]);

  // Highlight selected marker
  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      if (!marker) return;
      marker.setIcon(
        i === selectedIndex
          ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          : "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
      );
      marker.setZIndex(i === selectedIndex ? 100 : 1);
    });
  }, [selectedIndex]);

  if (keyError) {
    return (
      <div className="w-full h-[520px] rounded-2xl border border-border bg-secondary flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Could not load Google Maps.</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-[520px] rounded-2xl border border-border bg-secondary flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading map…</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[520px] rounded-2xl overflow-hidden border border-border shadow-lg"
    />
  );
}