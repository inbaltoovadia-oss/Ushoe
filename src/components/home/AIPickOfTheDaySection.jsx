import { useState, useEffect } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import ShoeImage from '../ShoeImage';

export default function AIPickOfTheDaySection() {
  const [pick, setPick] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPick();
  }, []);

  const loadPick = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getAIPickOfTheDay', {});
      setPick(response.data);
    } catch (error) {
      console.error('Failed to load pick:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !pick) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-12"
    >
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-amber-500" />
        <h2 className="font-heading font-bold text-2xl">Shoe of the Day</h2>
        <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">Updated daily</span>
      </div>

      <Link to={`/shoe/${pick.shoe.id}`}>
        <div className="group relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-3xl border-2 border-amber-200/60 dark:border-amber-800/40 overflow-hidden hover:shadow-2xl hover:shadow-amber-400/20 transition-all duration-300 p-8 cursor-pointer">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-2xl" />

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            {/* Image */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="relative h-64 sm:h-72 order-2 sm:order-1"
            >
              <ShoeImage
                src={pick.shoe.image_url}
                brand={pick.shoe.brand}
                name={pick.shoe.name}
                className="w-full h-full object-contain"
              />
            </motion.div>

            {/* Details */}
            <div className="order-1 sm:order-2">
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 bg-amber-500/20 rounded-full">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">EDITOR'S PICK</span>
              </div>

              <h3 className="font-heading font-black text-3xl sm:text-4xl mb-2 text-foreground">
                {pick.shoe.brand}
              </h3>
              <p className="text-lg text-foreground mb-2">{pick.shoe.name}</p>
              <p className="text-sm text-muted-foreground mb-4">{pick.shoe.colorway}</p>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-heading font-bold text-3xl text-foreground">${pick.shoe.price}</span>
                {pick.shoe.rating && (
                  <span className="text-sm text-amber-600 dark:text-amber-400">⭐ {pick.shoe.rating}/5</span>
                )}
              </div>

              <p className="text-base leading-relaxed mb-6 text-foreground">
                {pick.explanation}
              </p>

              <button className="w-full bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors group-hover:shadow-lg">
                {pick.cta}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.section>
  );
}