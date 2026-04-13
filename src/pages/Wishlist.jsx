import { useState, useEffect } from "react";
import { Heart, Trash2, MapPin, Bell, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { removeFromWishlistLocal, setWishlistIds } from "../lib/wishlistStore";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    setLoading(true);
    const data = await base44.entities.WishlistItem.list("-created_date", 50);
    setItems(data);
    setWishlistIds(data.map((d) => d.shoe_id));
    setLoading(false);
  };

  const removeItem = async (item) => {
    removeFromWishlistLocal(item.shoe_id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await base44.entities.WishlistItem.delete(item.id);
  };

  const toggleAlert = async (item) => {
    const updated = { ...item, price_alert: !item.price_alert };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    await base44.entities.WishlistItem.update(item.id, { price_alert: !item.price_alert });
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-xl">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="font-heading font-bold text-3xl">Wishlist</h1>
          </div>
          <p className="text-muted-foreground">
            {items.length} saved shoe{items.length !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 animate-pulse">
                <div className="aspect-square bg-secondary" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-secondary rounded w-20" />
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-5 bg-secondary rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-xl">Your wishlist is empty</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              Save shoes you love and they'll show up here
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90"
            >
              Explore Shoes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden group hover:shadow-lg transition-all duration-300">
                    {/* Image */}
                    <Link to={`/shoe/${item.shoe_id}`} className="block">
                      <div className="relative aspect-square overflow-hidden bg-secondary/30">
                        <img
                          src={item.shoe_image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop"}
                          alt={item.shoe_name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {item.shoe_brand}
                      </p>
                      <h3 className="font-heading font-semibold mt-1 line-clamp-1">
                        {item.shoe_name}
                      </h3>
                      <p className="font-heading font-bold text-lg mt-1">${item.shoe_price}</p>

                      <div className="flex items-center gap-2 mt-3">
                        <Link
                          to={`/shoe/${item.shoe_id}`}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                        >
                          <MapPin className="w-3 h-3" />
                          Find nearby
                        </Link>
                        <button
                          onClick={() => toggleAlert(item)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.price_alert
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                          title={item.price_alert ? "Alert enabled" : "Enable price alert"}
                        >
                          {item.price_alert ? (
                            <Bell className="w-3.5 h-3.5" />
                          ) : (
                            <BellOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => removeItem(item)}
                          className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}