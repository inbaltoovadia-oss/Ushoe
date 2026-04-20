import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Syncs live shoe data from web, expands catalog with new models and colorways
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch live shoe data from web
    const webShoesResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a shoe catalog expert. Find and list 100+ popular shoes currently available for purchase online in 2026.

RULES:
1. Include diverse brands: Nike, Adidas, New Balance, Puma, ASICS, Converse, Jordan, Vans, Hoka, Brooks, Reebok, Saucony
2. For EACH shoe, include: brand, name, model, category, price, colorway, rating (1-5), image search query
3. Include MULTIPLE colorways per model (at least 2-3 per model)
4. Categories: Running, Casual, Basketball, Training, Lifestyle, Walking, Hiking
5. Prices should be realistic (50-300 USD range)
6. Include NEW and TRENDING models for each brand
7. Each shoe must be UNIQUE (different model or colorway combination)

Return as JSON array of shoe objects.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          shoes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                brand: { type: 'string' },
                name: { type: 'string' },
                model: { type: 'string' },
                category: { type: 'string' },
                price: { type: 'number' },
                original_price: { type: 'number' },
                colorway: { type: 'string' },
                rating: { type: 'number' },
                description: { type: 'string' },
                image_search_query: { type: 'string' },
                gender: { type: 'string' },
              },
            },
          },
        },
      },
    });

    // Get existing shoes to avoid duplicates
    const existingShoes = await base44.asServiceRole.entities.Shoe.list('-created_date', 500);
    const existingKeys = new Set(existingShoes.map(s => `${s.brand}-${s.name}-${s.colorway}`.toLowerCase()));

    // Filter new shoes
    const newShoes = (webShoesResponse.shoes || [])
      .filter(s => !existingKeys.has(`${s.brand}-${s.name}-${s.colorway}`.toLowerCase()))
      .map(s => ({
        name: s.name,
        brand: s.brand,
        model: s.model,
        category: s.category,
        price: s.price,
        original_price: s.original_price || s.price,
        colorway: s.colorway,
        rating: s.rating || 4.2,
        description: s.description || `${s.brand} ${s.name} in ${s.colorway}`,
        gender: s.gender || 'Unisex',
        image_url: '', // Will be resolved by resolveShoeImages function
        is_trending: Math.random() > 0.7, // 30% trending
        trending_score: Math.floor(Math.random() * 100),
        release_date: new Date().toISOString().split('T')[0],
      }));

    // Bulk create new shoes
    if (newShoes.length > 0) {
      await base44.asServiceRole.entities.Shoe.bulkCreate(newShoes);
    }

    return Response.json({
      status: 'success',
      added: newShoes.length,
      total_catalog: existingShoes.length + newShoes.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});