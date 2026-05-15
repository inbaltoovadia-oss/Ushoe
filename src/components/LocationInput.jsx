/**
 * LocationInput — enhanced location component with:
 * - Use My Location button
 * - Manual city name or zip code input fallback
 * - Full state management (granted / denied / unavailable)
 */
import { useState, useEffect } from "react";
import { MapPin, Navigation, Loader2, AlertCircle, CheckCircle, WifiOff, Search, X } from "lucide-react";
import { requestLocation, subscribeLocation, getLocation, setLocation } from "../lib/locationStore";

async function resolveManualInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (!data || data.length === 0) return null;
    const place = data[0];
    const addr = place.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || trimmed;
    const country = addr.country || "";
    const countryCode = (addr.country_code || "US").toUpperCase();
    return { city, country, countryCode, lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
  } catch {
    return null;
  }
}

export default function LocationInput({ onLocated, className = "", compact = false }) {
  const [loc, setLoc] = useState(getLocation());
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => subscribeLocation(setLoc), []);

  const handleGPS = async () => {
    setLoading(true);
    setShowManual(false);
    const result = await requestLocation();
    setLoading(false);
    if (result.permission === "granted") onLocated?.(result);
    if (result.permission === "denied" || result.permission === "unavailable") {
      setShowManual(true);
    }
  };

  const handleManualSubmit = async (e) => {
    e?.preventDefault();
    if (!manualValue.trim()) return;
    setManualLoading(true);
    setManualError("");
    const result = await resolveManualInput(manualValue);
    setManualLoading(false);
    if (!result) {
      setManualError("Location not found. Try a city name or zip code.");
      return;
    }
    setLocation(result.city, result.lat, result.lng, result.country, result.countryCode);
    setShowManual(false);
    setManualValue("");
    onLocated?.(result);
  };

  // Detected / granted
  if ((loc.permission === "granted" || loc.detected) && !showManual) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{loc.city}{loc.country ? `, ${loc.country}` : ""}</span>
          </div>
          <button
            onClick={() => setShowManual(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" /> Change
          </button>
          <button
            onClick={handleGPS}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
            {loading ? "Updating…" : "GPS"}
          </button>
        </div>

        {showManual && <ManualForm value={manualValue} onChange={setManualValue} onSubmit={handleManualSubmit} loading={manualLoading} error={manualError} onCancel={() => setShowManual(false)} />}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {loc.permission === "denied" && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Location access denied — enter your city below.
        </p>
      )}
      {loc.permission === "unavailable" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          GPS unavailable — enter your city below.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGPS}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-60 ${compact ? "text-xs px-3 py-1.5" : ""}`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {loading ? "Detecting…" : "Use My Location"}
        </button>
        <button
          onClick={() => setShowManual(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors text-sm ${compact ? "text-xs py-1.5" : ""}`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Enter city / zip
        </button>
      </div>

      {(showManual || loc.permission === "denied" || loc.permission === "unavailable") && (
        <ManualForm
          value={manualValue}
          onChange={setManualValue}
          onSubmit={handleManualSubmit}
          loading={manualLoading}
          error={manualError}
          onCancel={() => setShowManual(false)}
        />
      )}
    </div>
  );
}

function ManualForm({ value, onChange, onSubmit, loading, error, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5 mt-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="City name or zip code…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}