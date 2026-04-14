import { useState, useRef, useEffect } from "react";
import { MapPin, Search, Loader2, Navigation, X } from "lucide-react";
import { setLocation, detectLocation } from "../lib/locationStore";

export default function LocationPicker({ onClose }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&featuretype=city,state,country`
        );
        const data = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 400);
  }, [query]);

  const selectPlace = (place) => {
    const city =
      place.address?.city ||
      place.address?.town ||
      place.address?.village ||
      place.address?.state ||
      place.address?.country ||
      place.display_name.split(",")[0];
    setLocation(city, parseFloat(place.lat), parseFloat(place.lon));
    onClose?.();
  };

  const handleDetect = async () => {
    setDetecting(true);
    await detectLocation();
    setDetecting(false);
    onClose?.();
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-xl p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <span className="font-heading font-semibold text-sm">Choose Location</span>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* GPS Detect */}
      <button
        onClick={handleDetect}
        disabled={detecting}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors mb-3 text-sm font-medium"
      >
        {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        Use my current location
      </button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, state, or country..."
          className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-primary/30"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul className="mt-2 space-y-1 max-h-56 overflow-y-auto">
          {suggestions.map((place) => {
            const label = place.display_name;
            return (
              <li key={place.place_id}>
                <button
                  onClick={() => selectPlace(place)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2 leading-tight">{label}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}