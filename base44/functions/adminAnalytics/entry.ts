import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [searches, wishlists, priceTracked, shoes] = await Promise.all([
      base44.asServiceRole.entities.SearchHistory.list('-created_date', 100),
      base44.asServiceRole.entities.WishlistItem.list('-created_date', 200),
      base44.asServiceRole.entities.PriceTrack.list('-created_date', 100),
      base44.asServiceRole.entities.Shoe.list('-trending_score', 50),
    ]);

    // Top searches
    const searchCounts = {};
    searches.forEach(s => {
      const q = (s.query || '').toLowerCase().trim();
      searchCounts[q] = (searchCounts[q] || 0) + 1;
    });
    const topSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Top wishlisted shoes
    const wishlistCounts = {};
    wishlists.forEach(w => {
      const key = w.shoe_name || w.shoe_id;
      wishlistCounts[key] = (wishlistCounts[key] || 0) + 1;
    });
    const topWishlisted = Object.entries(wishlistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Sponsored shoes (active)
    const now = new Date();
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