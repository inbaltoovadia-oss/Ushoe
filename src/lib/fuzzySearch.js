/**
 * Simple fuzzy/typo-tolerant matching for local shoe catalog search.
 * Uses Levenshtein distance + token overlap for robust matching.
 */

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function tokenSimilarity(query, target) {
  const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const tLower = target.toLowerCase();
  let score = 0;
  for (const token of qTokens) {
    if (tLower.includes(token)) {
      score += 2;
      continue;
    }
    // Check each word in target for close match
    const tWords = tLower.split(/\s+/);
    for (const tWord of tWords) {
      if (tWord.length < 2) continue;
      const maxLen = Math.max(token.length, tWord.length);
      const dist = levenshtein(token, tWord);
      const similarity = 1 - dist / maxLen;
      if (similarity >= 0.7) {
        score += similarity;
      }
    }
  }
  return score;
}

/**
 * Score a shoe against a query with fuzzy tolerance.
 * Returns a number (higher = better match).
 */
export function fuzzyScoreShoe(shoe, query) {
  if (!query) return shoe.trending_score || 0;
  const q = query.trim();

  let score = 0;
  score += tokenSimilarity(q, shoe.name || '') * 50;
  score += tokenSimilarity(q, shoe.brand || '') * 40;
  score += tokenSimilarity(q, shoe.category || '') * 25;
  score += tokenSimilarity(q, shoe.colorway || '') * 15;
  score += tokenSimilarity(q, shoe.description || '') * 5;
  score += (shoe.features || []).reduce((acc, f) => acc + tokenSimilarity(q, f) * 8, 0);

  // Boost trending items slightly
  score += (shoe.trending_score || 0) * 0.05;

  return score;
}

/**
 * Filter and rank shoes by fuzzy query match.
 * Returns sorted array with _fuzzyScore attached.
 */
export function fuzzySearchShoes(shoes, query, limit = 50) {
  if (!query?.trim()) return shoes.slice(0, limit);
  return shoes
    .map(s => ({ ...s, _fuzzyScore: fuzzyScoreShoe(s, query) }))
    .filter(s => s._fuzzyScore > 1)
    .sort((a, b) => b._fuzzyScore - a._fuzzyScore)
    .slice(0, limit);
}