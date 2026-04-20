import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Generate personalized homepage sections based on user profile + trends
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile and signals
    const [profiles, allShoes, wishlist] = await Promise.all([
      base44.entities.UserProfile.filter({ created_by: user.email }),
      base44.entities.Shoe.list('-trending_score', 100),
      base44.entities.WishlistItem.filter({ created_by: user.email }),
    ]);

    const profile = profiles[0] || {};
    const wishlistIds = new Set(wishlist.map(w => w.shoe_id));

    // If user hasn't completed survey, return general trending
    if (!profile.survey_completed) {
      const trending = allShoes
        .filter(s => s.is_trending)
        .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
        .slice(0, 8);

      return Response.json({
        has_preferences: false,
        recommended_for_you: [],
        trending: trending,
        personalization_reason: 'Complete your style quiz for personalized recommendations',
      });
    }

    // Scoring function for personalization
    const scoreForHomepage = (shoe) => {
      let score = 0;

      // 1. Category match (strong weight = 25)
      if (profile.main_use?.includes(shoe.category)) {
        score += 25;
      }

      // 2. Budget match (20)
      if (profile.budget_max && shoe.price <= profile.budget_max) {
        score += 20;
      }

      // 3. Brand preference (20)
      if (profile.preferred_brands?.some(b => b.toLowerCase() === (shoe.brand || '').toLowerCase())) {
        score += 20;
      }

      // 4. Gender match (10)
      if (profile.gender && (shoe.gender === profile.gender || shoe.gender === 'Unisex')) {
        score += 10;
      }

      // 5. Style match (15)
      if (profile.style_preference?.length > 0) {
        const desc = `${shoe.name} ${shoe.description || ''}`.toLowerCase();
        const matches = profile.style_preference.filter(s => desc.includes(s.toLowerCase())).length;
        score += Math.min(15, matches * 5);
      }

      // 6. Trending bonus (12)
      if (shoe.is_trending) {
        score += 12;
      }

      // 7. Not already wishlisted (slight boost for discovery)
      if (!wishlistIds.has(shoe.id)) {
        score += 3;
      }

      // 8. Rating (8)
      if (shoe.rating && shoe.rating >= 4.5) {
        score += 8;
      }

      return score;
    };

    // Generate "Recommended for You" section
    const recommended = allShoes
      .map(s => ({ ...s, score: scoreForHomepage(s) }))
      .sort((a, b) => b.score - a.score)
      .filter(s => s.score > 20) // Only high matches
      .slice(0, 8);

    // Generate "Trending" section (always include even for personalized users)
    const trending = allShoes
      .filter(s => s.is_trending)
      .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
      .slice(0, 8);

    // Generate personalization reason
    let reason = `Tailored to your ${profile.style_preference?.join(', ')} style`;
    if (profile.main_use?.length > 0) {
      reason += ` for ${profile.main_use[0].toLowerCase()}`;
    }
    if (profile.budget_max) {
      reason += ` under $${profile.budget_max}`;
    }

    return Response.json({
      status: 'success',
      has_preferences: true,
      recommended_for_you: recommended,
      trending: trending,
      personalization_reason: reason,
      user_profile: {
        styles: profile.style_preference || [],
        use: profile.main_use || [],
        brands: profile.preferred_brands || [],
        budget: profile.budget_max || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});