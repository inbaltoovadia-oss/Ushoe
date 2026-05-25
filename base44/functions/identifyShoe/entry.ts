import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { imageUrl, videoLink } = body;

    if (!imageUrl && !videoLink) {
      return Response.json({ error: 'Missing imageUrl or videoLink' }, { status: 400 });
    }

    // Step 1: identify shoe from image or link
    let identificationPrompt;
    let file_urls;

    if (videoLink) {
      // For social media links, use web search to extract shoe info
      identificationPrompt = `You are an expert sneaker identifier called "Ushoe AI". 
      
Analyze this social media link: ${videoLink}

Visit the page, watch/view the content, and identify every sneaker/shoe visible.

For the MAIN/MOST PROMINENT sneaker you can see, provide:
- brand: exact brand name (Nike, Adidas, Jordan, New Balance, Puma, etc.)
- model: exact model name (Air Force 1, Stan Smith, Air Max 90, Ultraboost, etc.)
- colorway: exact colorway name or description (e.g. "Triple White", "Black/Red", "University Blue")
- confidence: a number 0-100 indicating how certain you are
- reasoning: brief explanation of what visual clues you used
- release_year: approximate year if known
- retail_price_usd: approximate retail price in USD if known
- is_limited: true if this is a limited/hard to find release

Also list any other sneakers visible (up to 3 more).

Return ONLY valid JSON, no markdown.`;
      
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: identificationPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });

      // Parse text result
      let parsed = {};
      const jsonMatch = (typeof result === 'string' ? result : JSON.stringify(result)).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {}
      }

      const primary = parsed;
      const otherShoes = parsed.other_shoes || [];
      const brand = primary.brand || '';
      const model = primary.model || '';
      const colorway = primary.colorway || '';
      const confidence = primary.confidence || 50;

      // Step 2: search our catalog for matches
      let catalogMatches = [];
      let similarMatches = [];
      if (brand || model) {
        const allShoes = await base44.asServiceRole.entities.Shoe.list('-trending_score', 100);
        const bl = brand.toLowerCase();
        const ml = model.toLowerCase();
        const cl = colorway.toLowerCase();

        catalogMatches = allShoes.filter(s => {
          const sb = (s.brand || '').toLowerCase();
          const sn = (s.name || '').toLowerCase();
          const sm = (s.model || '').toLowerCase();
          const sc = (s.colorway || '').toLowerCase();
          const brandMatch = sb.includes(bl) || bl.includes(sb);
          const modelMatch = ml && (sn.includes(ml) || sm.includes(ml) || ml.includes(sn));
          const colorMatch = cl && (sc.includes(cl) || cl.includes(sc));
          return brandMatch && modelMatch;
        }).sort((a, b) => {
          const aColor = cl && (a.colorway || '').toLowerCase().includes(cl) ? 1 : 0;
          const bColor = cl && (b.colorway || '').toLowerCase().includes(cl) ? 1 : 0;
          return bColor - aColor;
        });

        similarMatches = allShoes.filter(s => {
          const sb = (s.brand || '').toLowerCase();
          const brandMatch = sb.includes(bl) || bl.includes(sb);
          return brandMatch && !catalogMatches.find(m => m.id === s.id);
        }).slice(0, 6);
      }

      return Response.json({
        identified: {
          brand, model, colorway, confidence,
          reasoning: primary.reasoning || '',
          release_year: primary.release_year || null,
          retail_price_usd: primary.retail_price_usd || null,
          is_limited: primary.is_limited || false,
          full_name: [brand, model, colorway].filter(Boolean).join(' '),
        },
        other_shoes: otherShoes,
        catalog_matches: catalogMatches.slice(0, 6),
        similar_matches: similarMatches,
        source: 'video_link',
      });

    } else {
      // Image-based identification using Gemini Vision
      identificationPrompt = `You are an expert sneaker identifier called "Ushoe AI". 

Carefully analyze this image and identify any sneaker/shoe visible.

For the MAIN/MOST PROMINENT sneaker, provide:
- brand: exact brand name (Nike, Adidas, Jordan, New Balance, Puma, Reebok, Vans, Converse, HOKA, Salomon, New Balance, Asics, Saucony, Brooks, On Running, etc.)
- model: exact model name (e.g. "Air Force 1 Low", "Stan Smith", "Air Max 90", "Ultraboost 22", "550", "990v5", etc.)
- colorway: exact colorway name or color description (e.g. "Triple White", "Black/Red", "University Blue/White")
- confidence: number 0-100 of how certain you are
- reasoning: what visual clues (logo, silhouette, sole, colorway, materials) led you to this
- release_year: approximate year if known
- retail_price_usd: approximate retail price in USD if known
- is_limited: true if this is a limited/rare release

If multiple sneakers visible, also list them in other_shoes array.

If you CANNOT identify a sneaker (no shoe visible, blurry, covered), set confidence to 0 and explain in reasoning.

Return ONLY valid JSON like:
{"brand":"Nike","model":"Air Force 1 Low","colorway":"Triple White","confidence":95,"reasoning":"...","release_year":2023,"retail_price_usd":110,"is_limited":false,"other_shoes":[]}`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: identificationPrompt,
        file_urls: [imageUrl],
        model: 'gemini_3_flash',
      });

      let parsed = {};
      const rawStr = typeof result === 'string' ? result : JSON.stringify(result);
      const jsonMatch = rawStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {}
      }

      const brand = parsed.brand || '';
      const model = parsed.model || '';
      const colorway = parsed.colorway || '';
      const confidence = parsed.confidence || 0;

      let catalogMatches = [];
      let similarMatches = [];
      if (brand || model) {
        const allShoes = await base44.asServiceRole.entities.Shoe.list('-trending_score', 100);
        const bl = brand.toLowerCase();
        const ml = model.toLowerCase();
        const cl = colorway.toLowerCase();

        catalogMatches = allShoes.filter(s => {
          const sb = (s.brand || '').toLowerCase();
          const sn = (s.name || '').toLowerCase();
          const sm = (s.model || '').toLowerCase();
          const brandMatch = sb.includes(bl) || bl.includes(sb);
          const modelMatch = ml && (sn.includes(ml) || sm.includes(ml) || ml.includes(sn));
          return brandMatch && modelMatch;
        }).sort((a, b) => {
          const aColor = cl && (a.colorway || '').toLowerCase().includes(cl) ? 1 : 0;
          const bColor = cl && (b.colorway || '').toLowerCase().includes(cl) ? 1 : 0;
          return bColor - aColor;
        });

        similarMatches = allShoes.filter(s => {
          const sb = (s.brand || '').toLowerCase();
          const brandMatch = sb.includes(bl) || bl.includes(sb);
          return brandMatch && !catalogMatches.find(m => m.id === s.id);
        }).slice(0, 6);
      }

      return Response.json({
        identified: {
          brand, model, colorway, confidence,
          reasoning: parsed.reasoning || '',
          release_year: parsed.release_year || null,
          retail_price_usd: parsed.retail_price_usd || null,
          is_limited: parsed.is_limited || false,
          full_name: [brand, model, colorway].filter(Boolean).join(' '),
        },
        other_shoes: parsed.other_shoes || [],
        catalog_matches: catalogMatches.slice(0, 6),
        similar_matches: similarMatches,
        source: 'image',
      });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});