import { Star, Phone, ExternalLink, Navigation, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const stockStatuses = ["In stock", "Limited stock", "Out of stock"];
const stockColors = {
  "In stock": "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock": "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
  "Out of stock": "text-red-500 bg-red-50 dark:bg-red-950/30",
};
const stockIcons = { "In stock": "✅", "Limited stock": "⚠️", "Out of stock": "❌" };

export default function StoreCard({ store, index = 0 }) {
  // Deterministic simulated stock status per store
  const stockStatus = stockStatuses[Math.abs((store.name?.charCodeAt(0) || 0) + index) % 3];

  const openDirections = () => {
    const dest = store.latitude && store.longitude
      ? `${store.latitude},${store.longitude}`
      : encodeURIComponent(store.address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      <div className="flex gap-4 p-4">
        {/* Store Image */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
          <img
            src={store.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop"}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-heading font-semibold text-sm truncate">{store.name}</h4>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">{store.rating}</span>
                {store.distance != null && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-medium text-primary">
                      {store.distance < 0.1 ? "< 0.1 mi" : `${store.distance.toFixed(1)} mi`}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${stockColors[stockStatus]}`}>
              {stockIcons[stockStatus]} {stockStatus}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1 truncate">{store.address}</p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={openDirections}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Navigation className="w-3 h-3" />
              Directions
            </button>
            {store.phone && (
              <a
                href={`tel:${store.phone}`}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Phone className="w-3 h-3" />
                Call
              </a>
            )}
            {store.website && (
              <a
                href={store.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Shop
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}