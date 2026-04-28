/**
 * LocationButton — standalone "Use My Location" button.
 * Handles all permission states with clear UX.
 */
import { useState, useEffect } from "react";
import { MapPin, Loader2, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { getLocation, subscribeLocation, requestLocation } from "../lib/locationStore";
import { motion, AnimatePresence } from "framer-motion";

export default function LocationButton({ compact = false, onLocationSet }) {
  const [loc, setLoc] = useState(getLocation());

  useEffect(() => subscribeLocation(l => {
    setLoc(l);
    if (l.detected && onLocationSet) onLocationSet(l);
  }), []);

  const handleClick = async () => {
    if (loc.loading) return;
    await requestLocation();
  };

  if (loc.loading) {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-medium text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        {!compact && "Detecting…"}
      </button>
    );
  }

  if (loc.detected) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40 text-xs font-semibold text-green-700 dark:text-green-400"
      >
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate max-w-[120px]">{loc.city}, {loc.countryCode}</span>
        <button onClick={handleClick} className="text-[10px] underline opacity-60 hover:opacity-100 ml-1">change</button>
      </motion.div>
    );
  }

  if (loc.permission === "denied") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 text-xs text-red-600 dark:text-red-400">
        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
        Location blocked — enable in browser settings
      </div>
    );
  }

  if (loc.permission === "unavailable") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary text-xs text-muted-foreground">
        <AlertCircle className="w-3.5 h-3.5" />
        Location unavailable
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-sm font-semibold text-primary transition-all hover:scale-[1.02] active:scale-95"
    >
      <MapPin className="w-4 h-4" />
      {compact ? "My Location" : "Use My Location"}
    </button>
  );
}