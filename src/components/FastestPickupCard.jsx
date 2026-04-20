import { useState, useEffect } from 'react';
import { Loader2, MapPin, Clock, Phone, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { getLocation } from '@/lib/locationStore';

export default function FastestPickupCard({ shoeId }) {
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPickup();
  }, [shoeId]);

  const loadPickup = async () => {
    setLoading(true);
    try {
      const loc = getLocation();
      const response = await base44.functions.invoke('getFastestPickupNearYou', {
        shoe_id: shoeId,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      setPickup(response.data);
    } catch (error) {
      console.error('Failed to load pickup:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    );
  }

  if (!pickup) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-300/60 dark:border-green-800/40 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
        <h3 className="font-heading font-bold text-lg text-green-900 dark:text-green-300">
          Fastest Pickup Near You
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{pickup.fastest_pickup.store_name}</p>
          <p className="text-xs text-muted-foreground">{pickup.fastest_pickup.store_type}</p>
        </div>

        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground">{pickup.fastest_pickup.address}</p>
            <p className="text-muted-foreground text-xs">{pickup.fastest_pickup.city}</p>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-black/40 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Distance</span>
            <span className="font-bold text-green-700 dark:text-green-400">{pickup.fastest_pickup.distance_miles} mi</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Availability</span>
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
              {pickup.fastest_pickup.availability}
            </span>
          </div>
        </div>

        {pickup.fastest_pickup.phone && (
          <a
            href={`tel:${pickup.fastest_pickup.phone}`}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Phone className="w-3.5 h-3.5" />
            {pickup.fastest_pickup.phone}
          </a>
        )}
      </div>
    </motion.div>
  );
}