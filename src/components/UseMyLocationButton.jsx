import { useState, useEffect } from "react";
import { MapPin, Navigation, Loader2, AlertCircle, CheckCircle, WifiOff } from "lucide-react";
import { requestLocation, subscribeLocation, getLocation } from "../lib/locationStore";

/**
 * A self-contained "Use My Location" button.
 * - Shows a button to trigger the browser permission prompt
 * - Handles granted / denied / unavailable states with clear messages
 * - Displays the resolved city + coords once granted
 */
export default function UseMyLocationButton({ onLocated, className = "" }) {
  const [loc, setLoc] = useState(getLocation());
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeLocation(setLoc), []);

  const handleRequest = async () => {
    setLoading(true);
    const result = await requestLocation();
    setLoading(false);
    if (result.permission === "granted") onLocated?.(result);
  };

  // Already have a detected location
  if (loc.permission === "granted" || loc.detected) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{loc.city}{loc.country ? `, ${loc.country}` : ""}</span>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
        </p>
        <button
          onClick={handleRequest}
          disabled={loading}
          className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50 pl-6"
        >
          {loading
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Updating…</>
            : <><Navigation className="w-3 h-3" /> Update location</>
          }
        </button>
      </div>
    );
  }

  if (loc.permission === "denied") {
    return (
      <div className={`flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 ${className}`}>
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Location access was denied. Please enable it in your browser settings to use nearby features.</span>
      </div>
    );
  }

  if (loc.permission === "unavailable") {
    return (
      <div className={`flex items-start gap-2 text-sm text-muted-foreground ${className}`}>
        <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Location is not available on this device or browser.</span>
      </div>
    );
  }

  // Default: unknown — show the trigger button
  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-60 ${className}`}
    >
      {loading
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting location…</>
        : <><Navigation className="w-4 h-4" /> Use My Location</>
      }
    </button>
  );
}