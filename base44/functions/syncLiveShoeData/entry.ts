import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use Gemini with internet search to get a rich, diverse, current catalog
    const webShoesResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sneaker expert and catalog curator. Use Google Search to find 80 diverse sneakers that are trending, hyped, or popular RIGHT NOW in 2025-2026.

Search Google for:
- "most popular sneakers 2025"
- "best hype sneakers 2025 release"  
- "limited edition sneakers 2025"
- "luxury designer sneakers 2025"
- "best retro sneakers 2025"
- "upcoming sneaker releases 2026"

Include ALL of these categories:
1. MAINSTREAM (20 pairs): Nike Air Max, Air Force 1, Jordan 1, Adidas Samba, NB 550, etc.
2. HYPE/LIMITED (15 pairs): Travis Scott collabs, Off-White, Fear of God, Yeezy, Supreme
3. PERFORMANCE (15 pairs): HOKA Clifton, Brooks Ghost, ASICS Gel-Kayano, Nike Vaporfly, Saucony Endorphin
4. LUXURY/DESIGNER (10 pairs): Balenciaga Triple S, Golden Goose, Bottega Veneta, Common Projects, Louis Vuitton
5. RETRO/VINTAGE (10 pairs): Nike Dunk Low, Adidas Campus, Reebok Classic, Puma Suede, Converse Chuck 70
6. UPCOMING RELEASES (10 pairs): Shoes officially announced for 2025-2026 release

For EACH shoe include:
- brand, name, model, category (must be one of: Running, Casual, Basketball, Lifestyle, Training, Walking, Tennis, Hiking, Skateboarding)
- price (USD, realistic retail price)
- original_price (if often discounted)
- resale_value (USD, StockX average — higher than retail for hype shoes)
- colorway (e.g. "Triple Black", "University Blue/White")
- gender (Men/Women/Unisex)
- rating (1.0-5.0)
- rarity_score (0-100, 100 = ultra rare)
- trending_score (0-100)
- description (2 sentences: what makes this shoe notable, its cultural significance or performance edge)
- materials (e.g. "Leather upper, rubber sole, foam midsole")
- release_year (year this colorway released)
- is_trending (true if currently hyped)
- cultural_note (1 sentence about history or hype story)

Return as JSON.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: 'object',
        properties: {
          shoes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                brand:          { type: 'string' },
                name:           { type: 'string' },
                model:          { type: 'string' },
                category:       { type: 'string' },
                price:          { type: 'number' },
                original_price: { type: 'number' },
                resale_value:   { type: 'number' },
                colorway:       { type: 'string' },
                gender:         { type: 'string' },
                rating:         { type: 'number' },
                rarity_score:   { type: 'number' },
                trending_score: { type: 'number' },
                description:    { type: 'string' },
                materials:      { type: 'string' },
                release_year:   { type: 'number' },
                is_trending:    { type: 'boolean' },
                cultural_note:  { type: 'string' },
              },
            },
          },
        },
      },
    });

    const existingShoes = await base44.asServiceRole.entities.Shoe.list('-created_date', 500);
    const existingKeys = new Set(existingShoes.map(s => `${s.brand}-${s.name}-${s.colorway}`.toLowerCase()));

    const VALID_CATEGORIES = ['Running', 'Casual', 'Basketball', 'Lifestyle', 'Training', 'Walking', 'Tennis', 'Hiking', 'Skateboarding'];

    const newShoes = (webShoesResponse.shoes || [])
      .filter(s => s.brand && s.name && s.colorway)
      .filter(s => !existingKeys.has(`${s.brand}-${s.name}-${s.colorway}`.toLowerCase()))
      .map(s => {
        const cat = VALID_CATEGORIES.find(c => c.toLowerCase() === (s.category || '').toLowerCase()) || 'Casual';
        const desc = [s.description, s.cultural_note].filter(Boolean).join(' ');
        return {
          name:           s.name,
          brand:          s.brand,
          model:          s.model || s.name,
          category:       cat,
          price:          s.price || 120,
          original_price: s.original_price || s.price || 120,
          colorway:       s.colorway,
          gender:         ['Men', 'Women', 'Unisex'].includes(s.gender) ? s.gender : 'Unisex',
          rating:         Math.min(5, Math.max(1, s.rating || 4.2)),
          trending_score: Math.min(100, Math.max(0, s.trending_score || 50)),
          description:    desc || `${s.brand} ${s.name} in ${s.colorway}`,
          features:       s.materials ? [s.materials] : [],
          is_trending:    !!s.is_trending,
          image_url:      '',
          release_date:   s.release_year ? `${s.release_year}-01-01` : new Date().toISOString().split('T')[0],
        };
      });

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