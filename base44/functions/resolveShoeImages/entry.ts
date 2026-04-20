import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Resolves image URLs for a single shoe using AI + web search.
 * Returns up to 3 candidate URLs ordered by reliability.
 * Validation: brand match + model name close match is enough.
 * Color mismatch is acceptable as a fallback.
 * Saves the best URL back to the Shoe entity.
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

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find product image URLs for this shoe. Prioritize availability over exact color match.

Brand: ${shoe.brand}
Model: ${shoe.name}
${shoe.colorway ? `Preferred colorway: ${shoe.colorway} (color mismatch is OK as fallback)` : ''}
${shoe.category ? `Category: ${shoe.category}` : ''}

STRICT RULES:
1. Return 3 candidate image URLs, ordered best-to-worst
2. URLs MUST be direct image files ending in .jpg, .jpeg, .png, or .webp
3. Prefer CDN/static image hosts (images.nike.com, assets.adidas.com, cdn.shopify.com, etc.)
4. Brand MUST match. Model name should be close (exact colorway NOT required)
5. Prefer clean product shots on white/light background
6. DO NOT return: HTML pages, Google/Bing/Pinterest/social media URLs, or redirect URLs
7. If you find a URL for the same model but different colorway, that is ACCEPTABLE — include it
8. For fallback: a generic shot of any ${shoe.brand} ${shoe.category || 'shoe'} is acceptable as candidate_3

Return JSON:
- candidates: array of up to 3 objects, each with { url, source_domain, confidence (0-1), notes }
  confidence 1.0 = exact model+color match
  confidence 0.7 = same model, different color
  confidence 0.4 = same brand, similar category`,
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
                source_domain: { type: 'string' },
                confidence: { type: 'number' },
                notes: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const candidates = (response.candidates || []).filter(c =>
      c.url &&
      c.url.startsWith('http') &&
      /\.(jpg|jpeg|png|webp)(\?|$)/i.test(c.url)
    );

    // Accept: confidence >= 0.4 (brand + category match is enough)
    const best = candidates.find(c => (c.confidence || 0) >= 0.4) || candidates[0];

    if (best) {
      await base44.asServiceRole.entities.Shoe.update(shoe.id, { image_url: best.url });
      return Response.json({
        status: 'updated',
        shoe_id: shoe.id,
        shoe_name: shoe.name,
        image_url: best.url,
        source_domain: best.source_domain,
        confidence: best.confidence,
        notes: best.notes,
        all_candidates: candidates
      });
    }

    // Nothing usable found
    return Response.json({
      status: 'not_found',
      shoe_id: shoe.id,
      shoe_name: shoe.name,
      reason: 'No direct image URLs found',
      all_candidates: candidates
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});