import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Get shoes trending in user's location using live data + local signals
Deno.serve(async (req) => {
  try {
    const { city = 'New York', state = 'NY' } = await req.json();
    const base44 = createClientFromRequest(req);

    // Fetch live trending data from web for the location
    const trendingResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `What are the top 10 trending shoes RIGHT NOW in ${city}, ${state} based on current web search trends, social media buzz, and local sneaker culture?

For each shoe, provide: brand, model, colorway, reason it's trending, estimated popularity (1-10).

Focus on:
1. Current street style trends in that city
2. Local climate preferences (e.g., water shoes for beach cities)
3. Athlete endorsements and collaborations
4. Upcoming releases
5. Viral social media trends

Return as JSON array.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          trending_shoes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                brand: { type: 'string' },
                model: { type: 'string' },
                colorway: { type: 'string' },
                reason: { type: 'string' },
                popularity: { type: 'number' },
              },
            },
          },
          location_insight: { type: 'string' },
        },
      },
    });

    // Get matching shoes from catalog
    const allShoes = await base44.asServiceRole.entities.Shoe.list('-trending_score', 200);
    
    const matches = (trendingResponse.trending_shoes || [])
      .map(trend => {
        const match = allShoes.find(s =>
          s.brand?.toLowerCase() === trend.brand?.toLowerCase() &&
          s.name?.toLowerCase().includes(trend.model?.toLowerCase() || '')
        );
        return match ? { ...match, trending_reason: trend.reason, web_popularity: trend.popularity } : null;
      })
      .filter(Boolean)
      .slice(0, 10);

    return Response.json({
      location: `${city}, ${state}`,
      trending_shoes: matches,
      insight: trendingResponse.location_insight,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});