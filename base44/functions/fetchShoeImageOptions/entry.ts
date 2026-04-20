import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Fetches 4-5 image candidates for a shoe using AI + web search.
 * Admin only. Requires { shoe_id } in body.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { shoe_id } = await req.json().catch(() => ({}));
    if (!shoe_id) return Response.json({ error: 'shoe_id required' }, { status: 400 });

    const shoes = await base44.asServiceRole.entities.Shoe.filter({ id: shoe_id });
    if (!shoes.length) return Response.json({ error: 'Shoe not found' }, { status: 404 });
    const shoe = shoes[0];

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find 5 product image URLs for this specific shoe:

Brand: ${shoe.brand}
Model: ${shoe.name}
${shoe.colorway ? `Colorway: ${shoe.colorway}` : ''}
${shoe.category ? `Category: ${shoe.category}` : ''}

Requirements:
1. Return exactly 5 candidates, from most to least accurate match
2. URLs MUST end in .jpg, .jpeg, .png, or .webp
3. Prefer CDN/static hosts: images.nike.com, assets.adidas.com, cdn.shopify.com, static.sneakers.com, etc.
4. Include variety: different angles, colorways if exact not found
5. NO HTML pages, Google, Pinterest, or social media URLs
6. For each candidate provide: url, description (10 words max what the image shows), confidence (0.0-1.0)

confidence meaning:
1.0 = exact model + exact colorway
0.8 = exact model, different colorway  
0.6 = same brand + category, close model
0.4 = same brand, generic category shot`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                description: { type: 'string' },
                confidence: { type: 'number' }
              }
            }
          }
        }
      }
    });

    const candidates = (response.candidates || [])
      .filter(c => c.url && c.url.startsWith('http') && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(c.url))
      .slice(0, 5);

    return Response.json({ candidates, shoe_name: shoe.name, shoe_brand: shoe.brand });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});