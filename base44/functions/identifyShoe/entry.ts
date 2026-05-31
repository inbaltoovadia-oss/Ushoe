import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── In-memory rate limiter (per user, resets per isolate restart) ──
const RATE_LIMIT = new Map(); // userId → { count, windowStart }
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 8; // max 8 identifications per minute per user

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = RATE_LIMIT.get(userId) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    RATE_LIMIT.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  RATE_LIMIT.set(userId, entry);
  return true;
}

// ── Input sanitization ──
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').replace(/[^\w\s.,!?@:/\-#%&()[\]'"]/g, '').trim().slice(0, 2000);
}

function isValidUrl(str) {
  try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

const ALLOWED_IMAGE_HOSTS = ['base44.app', 'cdn.base44.app', 'storage.googleapis.com', 'firebasestorage.googleapis.com'];
const SOCIAL_DOMAINS = ['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be', 'twitter.com', 'x.com'];

function isAllowedImageUrl(url) {
  try { const u = new URL(url); return ALLOWED_IMAGE_HOSTS.some(h => u.hostname.endsWith(h)); } catch { return false; }
}

function isAllowedSocialUrl(url) {
  try { const u = new URL(url); return SOCIAL_DOMAINS.some(h => u.hostname.includes(h)); } catch { return false; }
}

// Result cache — keyed by imageUrl/videoLink to avoid re-processing identical uploads
const RESULT_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function cacheGet(k) {
  const e = RESULT_CACHE.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { RESULT_CACHE.delete(k); return null; }
  return e.data;
}
function cacheSet(k, data) {
  RESULT_CACHE.set(k, { data, ts: Date.now() });
  if (RESULT_CACHE.size > 100) RESULT_CACHE.delete(RESULT_CACHE.keys().next().value);
}

// ── Catalog matching helper ──
function matchCatalog(allShoes, brand, model, colorway) {
  const bl = (brand || '').toLowerCase();
  const ml = (model || '').toLowerCase();
  const cl = (colorway || '').toLowerCase();

  const exact = allShoes.filter(s => {
    const sb = (s.brand || '').toLowerCase();
    const sn = (s.name || '').toLowerCase();
    const sm = (s.model || '').toLowerCase();
    const brandMatch = sb === bl || sb.includes(bl) || bl.includes(sb);
    const modelMatch = ml && (sn.includes(ml) || sm.includes(ml) || ml.includes(sm));
    return brandMatch && modelMatch;
  }).sort((a, b) => {
    const aColor = cl && (a.colorway || '').toLowerCase().includes(cl) ? 1 : 0;
    const bColor = cl && (b.colorway || '').toLowerCase().includes(cl) ? 1 : 0;
    return bColor - aColor;
  });

  const similar = allShoes.filter(s => {
    const sb = (s.brand || '').toLowerCase();
    const brandMatch = sb.includes(bl) || bl.includes(sb);
    return brandMatch && !exact.find(m => m.id === s.id);
  }).sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0)).slice(0, 6);

  return { catalogMatches: exact.slice(0, 6), similarMatches: similar };
}

// ── Main handler ──
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — all AI endpoints require authentication
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit per user
    if (!checkRateLimit(user.id)) {
      return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json();
    const rawImageUrl = body.imageUrl;
    const rawVideoLink = body.videoLink;

    // Input validation
    if (!rawImageUrl && !rawVideoLink) {
      return Response.json({ error: 'Missing imageUrl or videoLink' }, { status: 400 });
    }

    const imageUrl = rawImageUrl ? sanitizeText(rawImageUrl) : null;
    const videoLink = rawVideoLink ? sanitizeText(rawVideoLink) : null;

    if (imageUrl && !isAllowedImageUrl(imageUrl)) {
      return Response.json({ error: 'Invalid image source. Please upload via the Ushoe uploader.' }, { status: 400 });
    }
    if (videoLink && !isAllowedSocialUrl(videoLink)) {
      return Response.json({ error: 'Invalid link. Only TikTok, Instagram, YouTube, and X links are supported.' }, { status: 400 });
    }

    // Cache check
    const cacheKey = imageUrl || videoLink;
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    // Load catalog in parallel with AI call
    const catalogPromise = base44.asServiceRole.entities.Shoe.list('-trending_score', 200);

    let identified = {};
    let otherShoes = [];
    let source = 'image';

    if (videoLink) {
      source = 'video_link';
      const domain = (() => { try { return new URL(videoLink).hostname.replace('www.', ''); } catch { return 'unknown'; } })();

      const result = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are Ushoe AI — an elite sneaker recognition expert.

Visit this ${domain} link right now: ${videoLink}

Watch the video or view the post carefully. Identify EVERY sneaker/shoe visible.

For the MAIN/MOST PROMINENT sneaker provide:
- brand: exact brand name (Nike, Adidas, Jordan, New Balance, Puma, Reebok, Vans, Converse, HOKA, Salomon, Asics, Saucony, Brooks, On Running, Yeezy, etc.)
- model: exact model name (e.g. "Air Force 1 Low", "Stan Smith", "Air Max 90", "990v5", "Ultraboost 23", etc.)
- colorway: exact colorway or color description (e.g. "Triple White", "University Blue/White", "Core Black/Red")
- confidence: 0-100 certainty score
- reasoning: what visual clues you used — logo placement, silhouette shape, sole design, color blocking, materials
- release_year: approximate year if known
- retail_price_usd: approximate original retail price in USD
- is_limited: true if limited edition / hard to find
- styling_notes: one sentence about how this shoe is typically worn/styled
- popularity: "iconic" | "popular" | "niche" | "rare"
- other_shoes: array of other sneakers seen — each with brand, model, colorway, confidence

Return ONLY valid JSON, no markdown, no explanation outside JSON.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Identification timed out')), 90000)),
      ]);

      const raw = typeof result === 'string' ? result : JSON.stringify(result);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? (() => { try { return JSON.parse(jsonMatch[0]); } catch { return {}; } })() : {};

      identified = {
        brand: sanitizeText(parsed.brand || ''),
        model: sanitizeText(parsed.model || ''),
        colorway: sanitizeText(parsed.colorway || ''),
        confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0)),
        reasoning: sanitizeText(parsed.reasoning || ''),
        release_year: parsed.release_year || null,
        retail_price_usd: parsed.retail_price_usd || null,
        is_limited: !!parsed.is_limited,
        styling_notes: sanitizeText(parsed.styling_notes || ''),
        popularity: parsed.popularity || 'popular',
      };
      otherShoes = (parsed.other_shoes || []).slice(0, 4).map(s => ({
        brand: sanitizeText(s.brand || ''),
        model: sanitizeText(s.model || ''),
        colorway: sanitizeText(s.colorway || ''),
        confidence: Math.min(100, Math.max(0, parseInt(s.confidence) || 0)),
      }));

    } else {
      // Image vision analysis
      const result = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are Ushoe AI — an elite sneaker recognition expert with encyclopedic knowledge of every sneaker model ever made.

Carefully analyze this image. Focus specifically on any sneaker/shoe.

Look for:
1. LOGO: Nike swoosh, Adidas three stripes, Jordan jumpman, NB logo, etc.
2. SILHOUETTE: low/mid/high top, toe shape, heel height, sole thickness
3. SOLE DESIGN: air bubble, boost foam, chunky, slim, herringbone pattern
4. UPPER MATERIALS: leather, mesh, suede, knit, rubber
5. COLOR BLOCKING: main color zones and how they combine
6. UNIQUE FEATURES: tabs, straps, lacing system, tongue shape

Return ONLY valid JSON (no markdown):
{
  "brand": "exact brand",
  "model": "exact model name",
  "colorway": "exact colorway or color description",
  "confidence": 0-100,
  "reasoning": "which visual clues led to this — be specific about logo/silhouette/sole/colorway",
  "release_year": 2023,
  "retail_price_usd": 110,
  "is_limited": false,
  "styling_notes": "how this shoe is typically worn",
  "popularity": "iconic|popular|niche|rare",
  "multiple_shoes_detected": false,
  "other_shoes": []
}

If NO sneaker is visible or you truly cannot identify it: set confidence to 0 and explain in reasoning.
NEVER guess. If uncertain, lower the confidence score appropriately.`,
          file_urls: [imageUrl],
          model: 'gemini_3_flash',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Identification timed out')), 60000)),
      ]);

      const raw = typeof result === 'string' ? result : JSON.stringify(result);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? (() => { try { return JSON.parse(jsonMatch[0]); } catch { return {}; } })() : {};

      identified = {
        brand: sanitizeText(parsed.brand || ''),
        model: sanitizeText(parsed.model || ''),
        colorway: sanitizeText(parsed.colorway || ''),
        confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0)),
        reasoning: sanitizeText(parsed.reasoning || ''),
        release_year: parsed.release_year || null,
        retail_price_usd: parsed.retail_price_usd || null,
        is_limited: !!parsed.is_limited,
        styling_notes: sanitizeText(parsed.styling_notes || ''),
        popularity: parsed.popularity || 'popular',
        multiple_shoes_detected: !!parsed.multiple_shoes_detected,
      };
      otherShoes = (parsed.other_shoes || []).slice(0, 4).map(s => ({
        brand: sanitizeText(s.brand || ''),
        model: sanitizeText(s.model || ''),
        colorway: sanitizeText(s.colorway || ''),
        confidence: Math.min(100, Math.max(0, parseInt(s.confidence) || 0)),
      }));
    }

    identified.full_name = [identified.brand, identified.model, identified.colorway].filter(Boolean).join(' ');

    // Catalog matching
    const allShoes = await catalogPromise;
    const { catalogMatches, similarMatches } = matchCatalog(allShoes, identified.brand, identified.model, identified.colorway);

    const response = {
      identified,
      other_shoes: otherShoes,
      catalog_matches: catalogMatches,
      similar_matches: similarMatches,
      source,
    };

    // Cache successful high-confidence results
    if (identified.confidence >= 30) cacheSet(cacheKey, response);

    return Response.json(response);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});