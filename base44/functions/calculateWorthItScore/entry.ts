import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Calculate "Worth It?" score for a shoe based on price, popularity, and availability
Deno.serve(async (req) => {
  try {
    const { shoe_id } = await req.json();
    if (!shoe_id) {
      return Response.json({ error: 'Missing shoe_id' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const shoe = await base44.asServiceRole.entities.Shoe.list();
    const shoeRecord = shoe.find(s => s.id === shoe_id);
    if (!shoeRecord) {
      return Response.json({ error: 'Shoe not found' }, { status: 404 });
    }

    // Get all shoes to compare prices
    const allShoes = await base44.asServiceRole.entities.Shoe.list('-price', 1000);
    
    // Price score (lower = better, max 3 points)
    const avgPrice = allShoes.reduce((a, b) => a + (b.price || 0), 0) / allShoes.length;
    const priceScore = Math.min(3, Math.max(0, 3 - ((shoeRecord.price - avgPrice) / avgPrice) * 3));

    // Popularity score (rating + trending, max 4 points)
    const rating = (shoeRecord.rating || 4) / 5; // normalize 0-1
    const trending = shoeRecord.is_trending ? 1 : 0.5;
    const popularityScore = (rating * 2 + trending * 2);

    // Availability score (based on wishlist + price tracking interest, max 3 points)
    const wishlistItems = await base44.asServiceRole.entities.WishlistItem.filter({ shoe_id });
    const tracked = await base44.asServiceRole.entities.PriceTrack.filter({ shoe_id });
    const interestScore = Math.min(3, (wishlistItems.length + tracked.length) / 10);

    // Calculate final score out of 10
    const totalScore = priceScore + popularityScore + interestScore;
    const finalScore = Math.round(totalScore * 10) / 10;

    // Generate explanation
    let explanation = '';
    if (finalScore >= 8) explanation = 'Great value & highly popular';
    else if (finalScore >= 7) explanation = 'Solid choice with good ratings';
    else if (finalScore >= 6) explanation = 'Decent option at fair price';
    else if (finalScore >= 5) explanation = 'Average value for the price';
    else explanation = 'Consider other options first';

    return Response.json({
      shoe_id,
      score: finalScore,
      max: 10,
      explanation,
      breakdown: {
        price_score: Math.round(priceScore * 10) / 10,
        popularity_score: Math.round(popularityScore * 10) / 10,
        availability_score: Math.round(interestScore * 10) / 10,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});