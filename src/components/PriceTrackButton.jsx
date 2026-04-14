import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PriceTrackButton({ shoe, compact = false }) {
  const [tracked, setTracked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trackId, setTrackId] = useState(null);

  useEffect(() => {
    checkTracked();
  }, [shoe.id]);

  const checkTracked = async () => {
    setLoading(true);
    const items = await base44.entities.PriceTrack.filter({ shoe_id: shoe.id });
    if (items.length > 0) {
      setTracked(true);
      setTrackId(items[0].id);
      // Sync current price
      if (items[0].current_price !== shoe.price) {
        await base44.entities.PriceTrack.update(items[0].id, { current_price: shoe.price });
      }
    }
    setLoading(false);
  };

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    if (tracked) {
      await base44.entities.PriceTrack.delete(trackId);
      setTracked(false);
      setTrackId(null);
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
      setTracked(true);
      setTrackId(created.id);
      toast.success("We'll notify you when the price drops!");
    }
    setLoading(false);
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title={tracked ? "Stop tracking price" : "Notify me of price drops"}
        className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
          tracked
            ? "bg-primary text-white"
            : "bg-white/80 dark:bg-black/50 text-foreground hover:bg-white dark:hover:bg-black/70"
        }`}
      >
        {loading ? (
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
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all w-full ${
        tracked
          ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
          : "bg-secondary text-foreground hover:bg-secondary/80"
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : tracked ? (
        <Bell className="w-4 h-4 fill-primary text-primary" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {tracked ? "Tracking Price" : "Notify me of price drops"}
    </button>
  );
}