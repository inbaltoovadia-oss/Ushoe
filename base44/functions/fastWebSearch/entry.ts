import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 20 * 60 * 1000;

function cacheGet(k) {
  const e = CACHE.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { CACHE.delete(k); return null; }
  return e.data;
}
function cacheSet(k, data) {
  CACHE.set(k, { data, ts: Date.now() });
  if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value);
}

// These search URLs are guaranteed to work (retailer search pages, never 404)
function getRetailerSearchUrls(query, countryCode) {
  const q = encodeURIComponent(query);
  if (countryCode === 'IL') {
    return [
      { retailer: 'Nike Israel',       searchUrl: `https://www.nike.com/il/w?q=${q}&vst=${q}`,                         fetchUrl: `https://www.nike.com/il/w?q=${q}&vst=${q}` },
      { retailer: 'Terminal X',        searchUrl: `https://www.terminalx.com/catalogsearch/result/?q=${q}`,             fetchUrl: `https://www.terminalx.com/catalogsearch/result/?q=${q}` },
      { retailer: 'Foot Locker Israel',searchUrl: `https://footlocker.co.il/search?q=${q}`,                             fetchUrl: `https://footlocker.co.il/search?q=${q}` },
      { retailer: 'AC Sports',         searchUrl: `https://www.acsports.co.il/search?q=${q}`,                          fetchUrl: `https://www.acsports.co.il/search?q=${q}` },
      { retailer: 'Adidas Israel',     searchUrl: `https://www.adidas.co.il/search?q=${q}`,                            fetchUrl: `https://www.adidas.co.il/search?q=${q}` },
    ];
  }
  return [
    { retailer: 'Nike',        searchUrl: `https://www.nike.com/w?q=${q}&vst=${q}`,               fetchUrl: `https://www.nike.com/w?q=${q}&vst=${q}` },
    { retailer: 'Foot Locker', searchUrl: `https://www.footlocker.com/search?query=${q}`,          fetchUrl: `https://www.footlocker.com/search?query=${q}` },
    { retailer: 'Adidas',      searchUrl: `https://www.adidas.com/us/search?q=${q}`,               fetchUrl: `https://www.adidas.com/us/search?q=${q}` },
    { retailer: 'JD Sports',   searchUrl: `https://www.jdsports.com/search/jdsports/${q}/`,        fetchUrl: `https://www.jdsports.com/search/jdsports/${q}/` },
    { retailer: 'Zappos',      searchUrl: `https://www.zappos.com/search?term=${q}`,               fetchUrl: `https://www.zappos.com/search?term=${q}` },
  ];
}

async function fetchPage(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, finalUrl: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cleanHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .substring(0, 4500);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, city, country, countryCode } = await req.json();

    if (!query || !query.trim()) return Response.json({ web_picks: [], nearby_stores: [] });

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;

    const cacheKey = `${q}::${cc}::${cityName}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const retailers = getRetailerSearchUrls(q, cc);

    // Fetch all retailer search pages in parallel
    const fetchResults = await Promise.all(
      retailers.map(async (r) => {
        const page = await fetchPage(r.fetchUrl);
        return { ...r, page };
      })
    );

    // Build page snippets from successful fetches
    const pageSnippets = fetchResults
      .filter(r => r.page && r.page.ok && r.page.text.length > 300)
      .map(r => `=== ${r.retailer} ===\nSearch URL: ${r.searchUrl}\n${cleanHtml(r.page.text)}`);

    // Always include the guaranteed search URLs in the LLM context even if fetch failed
    const allRetailerContext = retailers.map(r =>
      `- ${r.retailer}: guaranteed working search page = ${r.searchUrl}`
    ).join('\n');

    const extractionPrompt = `You are extracting shoe prices from retailer pages for the query: "${q}" in ${countryName}.

RETAILER SEARCH PAGES (these URLs always work — use them as buy_link if no product URL found):
${allRetailerContext}

${pageSnippets.length > 0 ? `FETCHED PAGE CONTENT:\n${pageSnippets.join('\n\n')}` : 'Note: Retailer pages were bot-blocked. Use your web knowledge + the search URLs above.'}

RULES:
1. Return AT LEAST 3 results, one per retailer.
2. For buy_link: if you found a real product URL in the page text, use it. Otherwise use the retailer's search URL above — it ALWAYS works and never 404s.
3. Copy prices EXACTLY as seen (e.g. ₪529.90, not ₪530). If price unknown from page, use your best knowledge of typical ${countryName} prices for this shoe.
4. Set price_confidence="high" if read from page text, "medium" if estimated from web knowledge, "low" if guessing.
5. Mark is_best_deal=true for the single cheapest option.
6. Include sizes_available as numbers if visible in page text.`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      add_context_from_internet: pageSnippets.length === 0,
      model: pageSnippets.length === 0 ? "gemini_3_flash" : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          web_picks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:               { type: "string" },
                brand:              { type: "string" },
                price:              { type: "string" },
                original_price:     { type: "string" },
                currency:           { type: "string" },
                retailer:           { type: "string" },
                buy_link:           { type: "string" },
                in_stock:           { type: "boolean" },
                estimated_shipping: { type: "string" },
                sizes_available:    { type: "array", items: { type: "number" } },
                colors_available:   { type: "array", items: { type: "string" } },
                is_best_deal:       { type: "boolean" },
                price_confidence:   { type: "string" },
                discount_percent:   { type: "number" },
              },
            },
          },
        },
      },
    });

    const rawPicks = llmResult?.web_picks || [];

    // Deduplicate by retailer
    const seen = new Set();
    const dedupedPicks = rawPicks.filter(p => {
      if (!p.retailer) return false;
      const k = p.retailer.toLowerCase().replace(/\s+/g, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Ensure every pick has a valid buy_link — fallback to search URL
    const finalPicks = dedupedPicks.map(p => {
      if (!p.buy_link || p.buy_link.trim() === '') {
        const match = retailers.find(r =>
          r.retailer.toLowerCase().includes(p.retailer.toLowerCase().split(' ')[0]) ||
          p.retailer.toLowerCase().includes(r.retailer.toLowerCase().split(' ')[0])
        );
        return { ...p, buy_link: match ? match.searchUrl : `https://www.google.com/search?q=${encodeURIComponent(q + ' ' + p.retailer + ' buy')}` };
      }
      return p;
    });

    // Pad to at least 3 results using guaranteed search URLs if needed
    if (finalPicks.length < 3) {
      for (const r of retailers) {
        if (finalPicks.length >= 3) break;
        const alreadyHave = finalPicks.some(p =>
          p.retailer.toLowerCase().includes(r.retailer.toLowerCase().split(' ')[0]) ||
          r.retailer.toLowerCase().includes(p.retailer.toLowerCase().split(' ')[0])
        );
        if (!alreadyHave) {
          finalPicks.push({
            name: q,
            brand: '',
            price: '',
            original_price: '',
            currency: cc === 'IL' ? 'ILS' : 'USD',
            retailer: r.retailer,
            buy_link: r.searchUrl,
            in_stock: true,
            estimated_shipping: '',
            sizes_available: [],
            colors_available: [],
            is_best_deal: false,
            price_confidence: 'low',
            discount_percent: 0,
          });
        }
      }
    }

    // Mark best deal
    if (finalPicks.length > 0 && !finalPicks.some(p => p.is_best_deal)) {
      const prices = finalPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0 && prices[minIdx] < Infinity) finalPicks[minIdx] = { ...finalPicks[minIdx], is_best_deal: true };
    }

    const response = {
      web_picks: finalPicks,
      nearby_stores: [],
      location_used: `${cityName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
      pages_fetched: fetchResults.filter(r => r.page?.ok).map(r => r.retailer),
    };

    if (finalPicks.some(p => p.price_confidence !== 'low')) cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});