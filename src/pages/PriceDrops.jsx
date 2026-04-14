import { useState, useEffect } from "react";
import { Bell, TrendingDown, ArrowLeft, MapPin, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import NearbyStores from "../components/NearbyStores";

export default function PriceDrops() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracked();
  }, []);

  const loadTracked = async () => {
    setLoading(true);
    // Fetch all tracked items
    const tracked = await base44.entities.PriceTrack.list("-created_date", 50);
    // Fetch latest prices from shoes
    const shoeIds = [...new Set(tracked.map((t) => t.shoe_id))];
    const updated = await Promise.all(
      tracked.map(async (item) => {
        const shoes = await base44.entities.Shoe.filter({ id: item.shoe_id });
        const latestPrice = shoes.length > 0 ? shoes[0].price : item.current_price;
        if (latestPrice !== item.current_price) {
          await base44.entities.PriceTrack.update(item.id, { current_price: latestPrice });
        }
        return { ...item, current_price: latestPrice };
      })
    );
    setItems(updated);
    setLoading(false);
  };

  const removeItem = async (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await base44.entities.PriceTrack.delete(id);
  };

  const drops = items.filter((i) => i.current_price < i.tracked_price);
  const tracking = items.filter((i) => i.current_price >= i.tracked_price);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading font-bold text-3xl">Price Drops</h1>
          </div>
          <p className="text-muted-foreground">
            Tracking {items.length} shoe{items.length !== 1 ? "s" : ""} · {drops.length} price drop{drops.length !== 1 ? "s" : ""} detected
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 animate-pulse h-40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <Bell className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-xl">No tracked shoes yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              Hit "Notify me of price drops" on any shoe to start tracking
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90"
            >
              Explore Shoes
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-8">
              {/* Price Drops */}
              {drops.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-5 h-5 text-green-500" />
                    <h2 className="font-heading font-bold text-xl text-green-600 dark:text-green-400">
                      Price Drops! 🎉
                    </h2>
                  </div>
                  <AnimatePresence>
                    <div className="space-y-3">
                      {drops.map((item, i) => (
                        <TrackedItem key={item.id} item={item} index={i} onRemove={removeItem} isDrop />
                      ))}
                    </div>
                  </AnimatePresence>
                </section>
              )}

              {/* Still Tracking */}
              {tracking.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <h2 className="font-heading font-bold text-xl">Tracking</h2>
                  </div>
                  <div className="space-y-3">
                    {tracking.map((item, i) => (
                      <TrackedItem key={item.id} item={item} index={i} onRemove={removeItem} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar: Nearby Stores */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <NearbyStores title="Buy Near You" maxCount={5} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackedItem({ item, index, onRemove, isDrop }) {
  const savings = item.tracked_price - item.current_price;
  const pct = Math.round((savings / item.tracked_price) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-2xl border overflow-hidden flex gap-4 p-4 ${
        isDrop ? "border-green-400/50 bg-green-50/30 dark:bg-green-950/10" : "border-border/50"
      }`}
    >
      <Link to={`/shoe/${item.shoe_id}`} className="flex-shrink-0">
        <img
          src={item.shoe_image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop"}
          alt={item.shoe_name}
          className="w-20 h-20 rounded-xl object-cover"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.shoe_brand}</p>
        <Link to={`/shoe/${item.shoe_id}`} className="font-heading font-semibold hover:text-primary transition-colors line-clamp-1">
          {item.shoe_name}
        </Link>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {isDrop ? (
            <>
              <span className="font-heading font-bold text-xl text-green-600 dark:text-green-400">
                ${item.current_price}
              </span>
              <span className="text-sm text-muted-foreground line-through">${item.tracked_price}</span>
              <span className="text-xs font-semibold bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                Save ${savings.toFixed(0)} ({pct}% off)
              </span>
            </>
          ) : (
            <>
              <span className="font-heading font-bold text-xl">${item.current_price}</span>
              <span className="text-xs text-muted-foreground">Tracked at ${item.tracked_price}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <button
          onClick={() => onRemove(item.id)}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          title="Stop tracking"
        >
          ✕
        </button>
        <Link
          to={`/shoe/${item.shoe_id}`}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}