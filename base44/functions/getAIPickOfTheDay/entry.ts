import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// AI Pick of the Day — one featured shoe daily based on trends, value, and popularity
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get date-based seed for consistent daily pick
    const today = new Date().toISOString().split('T')[0];
    const dateSeed = parseInt(today.replace(/-/g, ''), 10) % 10000;

    // Fetch all shoes with high ratings and trending status
    const allShoes = await base44.asServiceRole.entities.Shoe.list('-trending_score', 300);
    
    // Filter quality shoes (rating >= 4, trending or popular)
    const qualityShoes = allShoes
      .filter(s => (s.rating || 0) >= 4 && (s.is_trending || (s.trending_score || 0) > 50))
      .slice(0, 50);

    if (qualityShoes.length === 0) {
      return Response.json({ error: 'No quality shoes available' }, { status: 404 });
    }

    // Deterministic selection using date seed
    const pickedShoe = qualityShoes[dateSeed % qualityShoes.length];

    // Get AI explanation
    const explanationResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a sneaker expert. Explain why the ${pickedShoe.brand} ${pickedShoe.name} in ${pickedShoe.colorway} is the SHOE OF THE DAY.

Consider:
- Current trends and popularity
- Value for money (price: $${pickedShoe.price})
- Versatility and styling
- Quality and reviews (rating: ${pickedShoe.rating || 4}/5)
- Availability

Provide a 1-2 sentence punchy explanation that sells the shoe.`,
      response_json_schema: {
        type: 'object',
        properties: {
          explanation: { type: 'string' },
          highlight: { type: 'string' },
        },
      },
    });

    return Response.json({
      date: today,
      shoe: pickedShoe,
      explanation: explanationResponse.explanation,
      highlight: explanationResponse.highlight,
      cta: 'See all colors & buy now',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});