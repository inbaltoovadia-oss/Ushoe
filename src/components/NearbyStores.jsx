import { useState, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { sortStoresByLocation } from "../lib/storeUtils";
import StoreCard from "./StoreCard";

export default function NearbyStores({ title = "Nearby Stores", maxCount = 6 }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loc, setLoc] = useState(getLocation());

  useEffect(() => {
    loadStores(loc);
    const unsub = subscribeLocation((newLoc) => {
      setLoc(newLoc);
      loadStores(newLoc);
    });
    return unsub;
  }, []);

  const loadStores = async (location) => {
    setLoading(true);
    const all = await base44.entities.Store.list("-rating", 50);
    const sorted = sortStoresByLocation(all, location.lat, location.lng);
    setStores(sorted.slice(0, maxCount));
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">{title}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          near {loc.city}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Finding stores near {loc.city}…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store, i) => (
            <StoreCard key={store.id} store={store} index={i} />
          ))}
          {stores.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No stores found near {loc.city}.</p>
          )}
        </div>
      )}
    </div>
  );
}