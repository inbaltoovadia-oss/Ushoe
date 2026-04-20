import { useState, useEffect } from 'react';
import { Flame, Loader2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { getLocation } from '@/lib/locationStore';
import ShoeCard from '../ShoeCard';

export default function TrendingNearYouSection() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(getLocation());

  useEffect(() => {
    loadTrending();
  }, [location]);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getTrendingNearYou', {
        city: location.city,
        state: location.state,
      });
      setShoes(response.data.trending_shoes || []);
    } catch (error) {
      console.error('Failed to load trending:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!shoes.length && !loading) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-12"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-500" />
          <h2 className="font-heading font-bold text-2xl">Trending Near You</h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
          <MapPin className="w-3 h-3" />
          {location.city}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {shoes.map((shoe, i) => (
            <motion.div
              key={shoe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ShoeCard shoe={shoe} index={i} />
              {shoe.trending_reason && (
                <p className="text-xs text-muted-foreground mt-2 italic px-1">
                  "{shoe.trending_reason}"
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
}