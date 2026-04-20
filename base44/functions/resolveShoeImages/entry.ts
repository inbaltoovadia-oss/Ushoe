import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Resolves an accurate, copyright-safe image URL for a SINGLE shoe.
 * Uses AI + web search to find images from official brand pages or authorized retailers.
 * Validates that the found image matches brand + model + colorway.
 * Saves verified URL back to the Shoe entity.
 * 
 * Admin only. Requires { shoe_id } in body.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { shoe_id } = body;
    if (!shoe_id) {
      return Response.json({ error: 'shoe_id is required' }, { status: 400 });
    }

    const shoes = await base44.asServiceRole.entities.Shoe.filter({ id: shoe_id });
    if (!shoes.length) {
      return Response.json({ error: 'Shoe not found' }, { status: 404 });
    }
    const shoe = shoes[0];

    const query = [shoe.brand, shoe.name, shoe.colorway].filter(Boolean).join(' ');

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find an accurate, publicly accessible product image URL for this specific shoe:

Brand: ${shoe.brand}
Model: ${shoe.name}
${shoe.colorway ? `Colorway: ${shoe.colorway}` : ''}
${shoe.category ? `Category: ${shoe.category}` : ''}

Search for the official product image. Requirements:
1. The image MUST show exactly this shoe model and colorway (not a different colorway or similar model)
2. Source must be from an official brand website (nike.com, adidas.com, puma.com, etc.) OR a major authorized retailer (footlocker.com, zappos.com, nordstrom.com, etc.)
3. Prefer direct .jpg/.jpeg/.png/.webp image URLs
4. Prefer clean white/light background product shots
5. Do NOT return Bing, Google Images, Pinterest, social media, or random blogs
6. If you cannot find a verified matching image with high confidence, return null for image_url

Return JSON with:
- image_url: direct image URL or null
- source_domain: e.g. "nike.com"
- confidence: 0.0-1.0 (how sure you are this matches the exact shoe)
- match_reason: brief explanation of why this image matches`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          image_url: { type: 'string' },
          source_domain: { type: 'string' },
          confidence: { type: 'number' },
          match_reason: { type: 'string' }
        }
      }
    });

    const { image_url, confidence, source_domain, match_reason } = response;

    const TRUSTED_DOMAINS = [
      'nike.com', 'adidas.com', 'newbalance.com', 'footlocker.com',
      'zappos.com', 'nordstrom.com', 'puma.com', 'reebok.com', 'converse.com',
      'vans.com', 'asics.com', 'saucony.com', 'brooks.com', 'hoka.com',
      'on-running.com', 'salomon.com', 'finishline.com', 'dickssportinggoods.com',
      'running.com', 'jordanbrand.com'
    ];

    const isTrusted = source_domain && TRUSTED_DOMAINS.some(d => source_domain.includes(d));
    const isHighConfidence = (confidence || 0) >= 0.8;
    const hasValidUrl = image_url && image_url.startsWith('http');

    if (hasValidUrl && isHighConfidence && isTrusted) {
      await base44.asServiceRole.entities.Shoe.update(shoe.id, { image_url });
      return Response.json({
        status: 'updated',
        shoe_id: shoe.id,
        shoe_name: shoe.name,
        image_url,
        source_domain,
        confidence,
        match_reason
      });
    } else {
      return Response.json({
        status: 'not_found',
        shoe_id: shoe.id,
        shoe_name: shoe.name,
        reason: !hasValidUrl ? 'no URL found' 
          : !isHighConfidence ? `low confidence: ${confidence}`
          : `untrusted source: ${source_domain}`,
        source_domain,
        confidence,
        match_reason
      });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});