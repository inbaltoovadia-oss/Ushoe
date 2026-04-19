import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const shoes = await base44.asServiceRole.entities.Shoe.list('-created_date', 100);

    if (!shoes.length) {
      return Response.json({ message: 'No shoes to update', updated: 0 });
    }

    // Ask LLM to score each shoe's current trending level
    const shoeList = shoes.map((s, i) => `${i}: ${s.brand} ${s.name} (${s.category})`).join('\n');

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sneaker trend analyst. Search the web RIGHT NOW for current sneaker trends.
Based on current social media buzz, resale demand, celebrity endorsements, and release hype, score each shoe's trending level from 0-100.

Shoe catalog:
${shoeList}

For each shoe, return:
- index: the number before the shoe name
- trending_score: 0-100 (100 = extremely trending right now)
- is_trending: true if score >= 65

Search Google Trends, StockX, GOAT, r/Sneakers, Instagram, TikTok for current data.
Be accurate and data-driven. Popular current models should score high.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          shoes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: { type: 'number' },
                trending_score: { type: 'number' },
                is_trending: { type: 'boolean' },
              },
            },
          },
        },
      },
    });

    let updated = 0;
    const updates = result.shoes || [];

    await Promise.all(
      updates.map(async (u) => {
        const shoe = shoes[u.index];
        if (!shoe) return;
        await base44.asServiceRole.entities.Shoe.update(shoe.id, {
          trending_score: Math.round(u.trending_score),
          is_trending: !!u.is_trending,
        });
        updated++;
      })
    );

    return Response.json({ message: 'Trends refreshed', updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});