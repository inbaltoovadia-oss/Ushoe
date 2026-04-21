import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fuzzy/typo-tolerant shoe search with Levenshtein distance
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
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
  const tLower = (target || '').toLowerCase();
  let score = 0;
  for (const token of qTokens) {
    if (tLower.includes(token)) { score += 2; continue; }
    for (const tWord of tLower.split(/\s+/)) {
      if (tWord.length < 2) continue;
      const maxLen = Math.max(token.length, tWord.length);
      if (maxLen === 0) continue;
      const similarity = 1 - levenshtein(token, tWord) / maxLen;
      if (similarity >= 0.7) score += similarity;
    }
  }
  return score;
}

function scoreShoe(shoe, q, category) {
  let score = shoe.trending_score || 0;
  score += tokenSimilarity(q, shoe.name || '') * 50;
  score += tokenSimilarity(q, shoe.brand || '') * 40;
  score += tokenSimilarity(q, shoe.category || '') * 25;
  score += tokenSimilarity(q, shoe.colorway || '') * 15;
  score += tokenSimilarity(q, shoe.description || '') * 5;
  score += (shoe.features || []).reduce((acc, f) => acc + tokenSimilarity(q, f) * 8, 0);
  if (category && shoe.category === category) score += 50;
  return score;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, limit = 80 } = await req.json();

    const allShoes = await base44.asServiceRole.entities.Shoe.list('-trending_score', 200);

    if (!query || !query.trim()) {
      // If category filter, prioritize that category
      if (category) {
        const catShoes = allShoes.filter(s => s.category === category);
        const rest = allShoes.filter(s => s.category !== category);
        return Response.json({ shoes: [...catShoes, ...rest].slice(0, limit), total: allShoes.length });
      }
      return Response.json({ shoes: allShoes.slice(0, limit), total: allShoes.length });
    }

    const q = query.trim();
    const scored = allShoes.map(shoe => ({ ...shoe, _relevance: scoreShoe(shoe, q, category) }));

    const baselineScore = (shoe) => shoe.trending_score || 0;
    const hasMatch = scored.filter(s => s._relevance > baselineScore(s));
    const noMatch = scored.filter(s => s._relevance <= baselineScore(s));

    const sorted = [
      ...hasMatch.sort((a, b) => b._relevance - a._relevance),
      ...noMatch.sort((a, b) => b._relevance - a._relevance),
    ].slice(0, limit);

    return Response.json({ shoes: sorted, total: allShoes.length });
  } catch (error) {
    return Response.json({ shoes: [], total: 0, error: error.message }, { status: 200 });
  }
});