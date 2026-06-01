import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [searches, wishlists, priceTracked, shoes] = await Promise.all([
      base44.asServiceRole.entities.SearchHistory.list('-created_date', 500),
      base44.asServiceRole.entities.WishlistItem.list('-created_date', 200),
      base44.asServiceRole.entities.PriceTrack.list('-created_date', 100),
      base44.asServiceRole.entities.Shoe.list('-trending_score', 50),
    ]);

    // Filter to last 30 days for trending
    const recentSearches = searches.filter(s => s.created_date && new Date(s.created_date) >= thirtyDaysAgo);

    // Top searches (all time)
    const searchCounts = {};
    searches.forEach(s => {
      const q = (s.query || '').toLowerCase().trim();
      if (q) searchCounts[q] = (searchCounts[q] || 0) + 1;
    });
    const topSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // ── Trending Brands (last 30 days) ──
    const KNOWN_BRANDS = ['nike', 'adidas', 'jordan', 'new balance', 'puma', 'reebok', 'vans', 'converse', 'hoka', 'asics', 'saucony', 'salomon', 'on running', 'yeezy', 'under armour', 'brooks', 'merrell', 'timberland', 'ugg', 'birkenstock', 'crocs', 'fila', 'balenciaga', 'gucci', 'louis vuitton', 'dior'];
    const brandCounts = {};
    recentSearches.forEach(s => {
      const q = (s.query || '').toLowerCase();
      KNOWN_BRANDS.forEach(brand => {
        if (q.includes(brand)) {
          const display = brand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          brandCounts[display] = (brandCounts[display] || 0) + 1;
        }
      });
    });
    const trendingBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([brand, count]) => ({ brand, count }));

    // ── Trending Models (last 30 days) — top unique search queries ──
    // Filter out conversational noise: too short, too long, or containing filler words
    const NOISE_PATTERNS = /^(hi|hey|hello|yes|no|ok|okay|thanks|try|test|again|asics|best|good|need|want|looking|shoes?\s*for|i\s|no\s|the\s)/i;
    const modelCounts = {};
    recentSearches.forEach(s => {
      const q = (s.query || '').trim();
      if (q.length < 4 || q.length > 60) return;
      if (NOISE_PATTERNS.test(q)) return;
      modelCounts[q] = (modelCounts[q] || 0) + 1;
    });
    const trendingModels = Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([model, count]) => ({ model, count }));

    // ── Search volume by day (last 14 days) ──
    const dailyCounts = {};
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    searches.filter(s => s.created_date && new Date(s.created_date) >= fourteenDaysAgo).forEach(s => {
      const day = new Date(s.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });
    // Fill in gaps for last 14 days
    const searchVolume = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      searchVolume.push({ date: label, count: dailyCounts[label] || 0 });
    }

    // Top wishlisted shoes
    const wishlistCounts = {};
    wishlists.forEach(w => {
      const key = w.shoe_name || w.shoe_id;
      if (key) wishlistCounts[key] = (wishlistCounts[key] || 0) + 1;
    });
    const topWishlisted = Object.entries(wishlistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Sponsored shoes (active)
    const sponsored = shoes.filter(s => s.is_sponsored && s.sponsored_until && new Date(s.sponsored_until) > now);
    const sponsoredRevenue = sponsored.reduce((acc, s) => {
      const planPrices = { starter: 29, featured: 79, premium: 199 };
      return acc + (planPrices[s.sponsored_plan] || 0);
    }, 0);

    return Response.json({
      totals: {
        searches: searches.length,
        wishlists: wishlists.length,
        price_tracks: priceTracked.length,
        sponsored_shoes: sponsored.length,
        sponsored_revenue: sponsoredRevenue,
      },
      top_searches: topSearches,
      top_wishlisted: topWishlisted,
      trending_brands: trendingBrands,
      trending_models: trendingModels,
      search_volume: searchVolume,
      sponsored_shoes: sponsored.map(s => ({
        id: s.id,
        name: s.name,
        brand: s.brand,
        plan: s.sponsored_plan,
        until: s.sponsored_until,
        price: s.price,
      })),
      recent_searches: searches.slice(0, 20).map(s => ({ query: s.query, date: s.created_date })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});