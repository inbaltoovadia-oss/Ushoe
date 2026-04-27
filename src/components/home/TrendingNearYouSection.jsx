import { useState, useEffect } from 'react';
import { Flame, Loader2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { getLocation } from '@/lib/locationStore';
import ShoeCard from '../ShoeCard';

const TRENDING_NEAR_TTL = 2 * 60 * 60 * 1000; // 2h
function getCachedNearby(city) {
  try {
    const raw = localStorage.getItem(`ushoe_trending_near_${city}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < TRENDING_NEAR_TTL) return data;
    localStorage.removeItem(`ushoe_trending_near_${city}`);
  } catch (_) {}
  return null;
}
function setCachedNearby(city, data) {
  try { localStorage.setItem(`ushoe_trending_near_${city}`, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
}

export default function TrendingNearYouSection() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location] = useState(getLocation());

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    // Serve from 2h cache first
    const cached = getCachedNearby(location.city);
    if (cached) { setShoes(cached); setLoading(false); return; }
    try {
      const response = await base44.functions.invoke('getTrendingNearYou', {
        city: location.city,
        state: location.state,
      });
      const result = response.data.trending_shoes || [];
      setCachedNearby(location.city, result);
      setShoes(result);
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