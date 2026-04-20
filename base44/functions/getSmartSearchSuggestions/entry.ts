import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Smart search suggestions — autocomplete shoes, brands, and trending searches
Deno.serve(async (req) => {
  try {
    const { query = '' } = await req.json();
    if (!query || query.length < 2) {
      return Response.json({ suggestions: [] });
    }

    const base44 = createClientFromRequest(req);
    const lower = query.toLowerCase();

    // Fetch catalog
    const [allShoes, searchHistory] = await Promise.all([
      base44.asServiceRole.entities.Shoe.list('-trending_score', 500),
      base44.asServiceRole.entities.SearchHistory.list('-created_date', 100),
    ]);

    // 1. Exact model/shoe matches
    const shoeMatches = allShoes
      .filter(s =>
        s.name?.toLowerCase().includes(lower) ||
        s.brand?.toLowerCase().includes(lower) ||
        s.colorway?.toLowerCase().includes(lower)
      )
      .slice(0, 5)
      .map(s => ({
        type: 'shoe',
        text: `${s.brand} ${s.name}`,
        icon: '👟',
        id: s.id,
      }));

    // 2. Brand matches
    const brandSet = new Set(allShoes.map(s => s.brand).filter(Boolean));
    const brandMatches = Array.from(brandSet)
      .filter(b => b?.toLowerCase().includes(lower))
      .slice(0, 3)
      .map(b => ({
        type: 'brand',
        text: b,
        icon: '🏷️',
      }));

    // 3. Popular searches (recent queries)
    const popularSearches = [...new Set(searchHistory.map(s => s.query).filter(q => q?.toLowerCase().includes(lower)))]
      .slice(0, 3)
      .map(q => ({
        type: 'search',
        text: q,
        icon: '🔥',
      }));

    // 4. Trending shoes in query category
    const trendingMatches = allShoes
      .filter(s => s.is_trending && (s.name?.toLowerCase().includes(lower) || s.category?.toLowerCase().includes(lower)))
      .slice(0, 2)
      .map(s => ({
        type: 'trending',
        text: `${s.brand} ${s.name} (trending)`,
        icon: '🔥',
        id: s.id,
      }));

    // Combine and deduplicate
    const allSuggestions = [...shoeMatches, ...brandMatches, ...popularSearches, ...trendingMatches];
    const seen = new Set(allSuggestions.map(s => s.text));
    const deduped = Array.from(seen).map(text => allSuggestions.find(s => s.text === text)).slice(0, 8);

    return Response.json({ suggestions: deduped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});