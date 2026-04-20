import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WorthItScore({ shoeId, compact = false }) {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScore();
  }, [shoeId]);

  const loadScore = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('calculateWorthItScore', { shoe_id: shoeId });
      setScore(response.data);
    } catch (error) {
      console.error('Failed to load score:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !score) return null;

  const scoreColor =
    score.score >= 8 ? 'text-green-600 dark:text-green-400' :
    score.score >= 7 ? 'text-blue-600 dark:text-blue-400' :
    score.score >= 6 ? 'text-amber-600 dark:text-amber-400' :
    'text-muted-foreground';

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <TrendingUp className={`w-3.5 h-3.5 ${scoreColor}`} />
        <span className={`font-bold text-sm ${scoreColor}`}>{score.score}</span>
        <span className="text-xs text-muted-foreground">/10</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-semibold">Worth It?</h4>
        <div className={`text-3xl font-bold ${scoreColor}`}>
          {score.score}
          <span className="text-sm text-muted-foreground font-normal">/10</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{score.explanation}</p>

      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Price Value</span>
          <span className="font-semibold">{score.breakdown.price_score}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Popularity</span>
          <span className="font-semibold">{score.breakdown.popularity_score}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Demand</span>
          <span className="font-semibold">{score.breakdown.availability_score}</span>
        </div>
      </div>
    </div>
  );
}