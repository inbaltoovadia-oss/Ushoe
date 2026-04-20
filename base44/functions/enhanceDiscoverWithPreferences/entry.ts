import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Enhanced search results based on user preferences
// Re-ranks shoes using survey + behavioral signals
Deno.serve(async (req) => {
  try {
    const { shoes, query } = await req.json();

    if (!Array.isArray(shoes) || shoes.length === 0) {
      return Response.json({ ranked_shoes: [] });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ranked_shoes: shoes }); // No personalization for anonymous
    }

    // Fetch user preferences
    const [profiles, wishlist, tracked] = await Promise.all([
      base44.entities.UserProfile.filter({ created_by: user.email }),
      base44.entities.WishlistItem.filter({ created_by: user.email }),
      base44.entities.PriceTrack.filter({ created_by: user.email }),
    ]);

    const profile = profiles[0] || {};
    const wishlistBrands = new Set(wishlist.map(w => (w.shoe_brand || '').toLowerCase()));
    const trackedBrands = new Set(tracked.map(t => (t.shoe_brand || '').toLowerCase()));

    // Scoring function
    const scoreShoe = (shoe) => {
      let score = 0;

      // 1. Brand preference (20 points max)
      const brandLower = (shoe.brand || '').toLowerCase();
      if (profile.preferred_brands?.some(b => b.toLowerCase() === brandLower)) {
        score += 20;
      }

      // 2. Budget match (15 points max)
      if (profile.budget_max && shoe.price <= profile.budget_max) {
        score += 15;
      } else if (profile.budget_max && shoe.price <= profile.budget_max * 1.1) {
        score += 7; // Close to budget
      }

      // 3. Category match (20 points max)
      if (profile.main_use?.includes(shoe.category)) {
        score += 20;
      }

      // 4. Style match (15 points max)
      if (profile.style_preference?.length > 0) {
        const shoeDescription = `${shoe.name} ${shoe.description || ''}`.toLowerCase();
        const styleMatches = profile.style_preference.filter(s =>
          shoeDescription.includes(s.toLowerCase())
        ).length;
        score += Math.min(15, styleMatches * 5);
      }

      // 5. Gender match (10 points max)
      if (profile.gender && (shoe.gender === profile.gender || shoe.gender === 'Unisex')) {
        score += 10;
      }

      // 6. Wishlist signal (8 points)
      if (wishlistBrands.has(brandLower)) {
        score += 8;
      }

      // 7. Tracking signal (6 points)
      if (trackedBrands.has(brandLower)) {
        score += 6;
      }

      // 8. Trending bonus (10 points)
      if (shoe.is_trending) {
        score += 10;
      }

      // 9. Rating bonus (5 points)
      if (shoe.rating && shoe.rating >= 4.5) {
        score += 5;
      }

      // 10. Sale bonus (5 points)
      if (shoe.original_price > shoe.price) {
        score += 5;
      }

      return score;
    };

    // Rank shoes
    const ranked = shoes
      .map(shoe => ({
        ...shoe,
        personalization_score: scoreShoe(shoe),
      }))
      .sort((a, b) => b.personalization_score - a.personalization_score);

    return Response.json({
      ranked_shoes: ranked,
      user_has_preferences: !!profile.survey_completed,
    });
  } catch (error) {
    return Response.json({ error: error.message, ranked_shoes: shoes }, { status: 500 });
  }
});