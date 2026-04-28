/**
 * matchScore — calculates a 0-100 "Match For You" score for a shoe.
 * Purely client-side, zero credits.
 */
import { scoreShoe } from "./personalizationEngine";

const MAX_RAW = 35 + 30 + 15 + 10 + 20 + 15 + 25 + 20 + 10; // sum of all WEIGHTS

export function getMatchScore(shoe, profile) {
  if (!profile) return null;
  const result = scoreShoe(shoe, profile);
  const raw = typeof result === "number" ? result : result.score;
  // Normalise to 60–99 range so it always looks meaningful
  const normalised = 60 + Math.round(Math.min(raw, MAX_RAW) / MAX_RAW * 39);
  return Math.min(99, Math.max(60, normalised));
}

export function getMatchLabel(score) {
  if (score >= 90) return { label: "Perfect Match", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40" };
  if (score >= 80) return { label: "Great Match", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" };
  if (score >= 70) return { label: "Good Match", color: "text-primary", bg: "bg-primary/10" };
  return { label: "Match", color: "text-muted-foreground", bg: "bg-secondary" };
}