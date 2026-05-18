import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ensureLoaded, getTrackedMap, setTracked, removeTracked, subscribeTrack } from "../lib/priceTrackStore";

export default function PriceTrackButton({ shoe, compact = false }) {
  const [trackedMap, setTrackedMap] = useState(getTrackedMap());
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    ensureLoaded().then(() => {
      setTrackedMap(getTrackedMap());
      setInitializing(false);
    });
    const unsub = subscribeTrack((map) => setTrackedMap(map));
    return unsub;
  }, []);

  const tracked = !!trackedMap[shoe.id];
  const trackRecord = trackedMap[shoe.id];

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    if (tracked) {
      await base44.entities.PriceTrack.delete(trackRecord.id);
      removeTracked(shoe.id);
      toast.success("Price tracking removed");
    } else {
      const created = await base44.entities.PriceTrack.create({
        shoe_id: shoe.id,
        shoe_name: shoe.name,
        shoe_brand: shoe.brand,
        shoe_image: shoe.image_url,
        tracked_price: shoe.price,
        current_price: shoe.price,
        category: shoe.category,
      });
      setTracked(shoe.id, created);
      toast.success("We'll email you on price drops & restocks!");
    }
    setLoading(false);
  };

  const busy = loading || initializing;

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        title={tracked ? "Stop price & stock alerts" : "Notify me of price drops & restocks"}
        className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
          tracked
            ? "bg-primary text-white"
            : "bg-white/80 dark:bg-black/50 text-foreground hover:bg-white dark:hover:bg-black/70"
        }`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : tracked ? (
          <Bell className="w-4 h-4 fill-current" />
        ) : (
          <BellOff className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all w-full ${
        tracked
          ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
          : "bg-secondary text-foreground hover:bg-secondary/80"
      }`}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : tracked ? (
        <Bell className="w-4 h-4 fill-primary text-primary" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {tracked ? "Price & Stock Alerts On" : "Price & Stock Alerts"}
    </button>
  );
}