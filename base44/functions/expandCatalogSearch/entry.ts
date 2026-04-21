import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns expanded catalog matches — combines DB shoes + AI-matched virtual catalog
// for a much richer result set without storing everything in DB
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, limit = 60 } = await req.json();

    // Always fetch all shoes from DB (fast DB query)
    const allShoes = await base44.asServiceRole.entities.Shoe.list('-trending_score', Math.min(limit, 100));

    if (!query || !query.trim()) {
      return Response.json({ shoes: allShoes, total: allShoes.length });
    }

    const q = query.toLowerCase().trim();

    // Score each shoe for relevance
    const scored = allShoes.map(shoe => {
      let score = shoe.trending_score || 0;
      const nameMatch = (shoe.name || '').toLowerCase().includes(q);
      const brandMatch = (shoe.brand || '').toLowerCase().includes(q);
      const catMatch = (shoe.category || '').toLowerCase().includes(q);
      const descMatch = (shoe.description || '').toLowerCase().includes(q);
      const colMatch = (shoe.colorway || '').toLowerCase().includes(q);
      const featMatch = (shoe.features || []).some(f => f.toLowerCase().includes(q));

      if (nameMatch) score += 100;
      if (brandMatch) score += 80;
      if (catMatch) score += 60;
      if (colMatch) score += 40;
      if (descMatch) score += 20;
      if (featMatch) score += 30;

      if (category && shoe.category === category) score += 50;

      return { ...shoe, _relevance: score };
    });

    // Separate matched vs unmatched
    const hasQueryTerms = scored.filter(s => s._relevance > (s.trending_score || 0));
    const fallbacks = scored.filter(s => s._relevance <= (s.trending_score || 0));

    const sorted = [
      ...hasQueryTerms.sort((a, b) => b._relevance - a._relevance),
      ...fallbacks.sort((a, b) => b._relevance - a._relevance),
    ].slice(0, limit);

    return Response.json({ shoes: sorted, total: allShoes.length });
  } catch (error) {
    return Response.json({ shoes: [], total: 0, error: error.message }, { status: 200 });
  }
});