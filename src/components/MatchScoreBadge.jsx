/**
 * MatchScoreBadge — shows "XX% Match For You" on shoe cards.
 * Uses the personalization engine score, zero credits.
 */
import { useState, useEffect } from "react";
import { getUserProfile } from "../lib/userProfileStore";
import { getMatchScore, getMatchLabel } from "../lib/matchScore";
import { Sparkles } from "lucide-react";

// Module-level profile cache so all badges share one fetch
let _profilePromise = null;

export default function MatchScoreBadge({ shoe, className = "" }) {
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (!_profilePromise) _profilePromise = getUserProfile();
    _profilePromise.then(profile => {
      if (!profile) return;
      const hasSignals = profile.survey_completed || profile.preferred_brands?.length || profile.main_use?.length;
      if (!hasSignals) return;
      setScore(getMatchScore(shoe, profile));
    });
  }, [shoe.id]);

  if (score === null) return null;

  const { label, color, bg } = getMatchLabel(score);

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${bg} ${color} ${className}`}>
      <Sparkles className="w-2.5 h-2.5" />
      {score}% Match
    </span>
  );
}