/**
 * TREND AGENT
 * Discovers real-world shoe trends, hype releases, and rising brands from the web.
 * Cache TTL: 14 days — trends shift slowly, no need for frequent refreshes.
 */

import { base44 } from "@/api/base44Client";
import { getCachedTrends, setCachedTrends } from "./agentCache";

export async function runTrendAgent({ city = "New York" } = {}) {
  const cached = getCachedTrends(city);
  if (cached) return cached;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a SHOE TREND AGENT. Identify the most hyped and trending sneakers in the market RIGHT NOW based on social media, resale platforms, and sneaker communities.

USER REGION: ${city}

TASK: Find the top trending sneakers and brands globally (and regionally where relevant).

RULES:
- Only include shoes/brands with verifiable hype (StockX trending, social media buzz, recent drops)
- Focus on the last 30 days of trend data
- Cover a mix of: new releases, classic revivals, collab drops, budget gems
- Include both streetwear/lifestyle AND performance categories

Return:
- top_shoes: array of up to 8 trending shoes, each with:
  { name, brand, reason_trending, hype_score (1-100), category, avg_resale_price, release_recency: "recent" | "classic_revival" | "upcoming" }
- top_brands: array of up to 5 brands gaining momentum, each with:
  { brand, momentum: "rising" | "stable" | "declining", key_reason }
- trend_themes: array of up to 4 macro trend themes (e.g. "Chunky soles comeback", "Y2K revival")
- summary: 1-2 sentence overview of the current sneaker market
- refreshed_at: today's date as ISO string`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        refreshed_at: { type: "string" },
        top_shoes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name:              { type: "string" },
              brand:             { type: "string" },
              reason_trending:   { type: "string" },
              hype_score:        { type: "number" },
              category:          { type: "string" },
              avg_resale_price:  { type: "number" },
              release_recency:   { type: "string" },
            },
          },
        },
        top_brands: {
          type: "array",
          items: {
            type: "object",
            properties: {
              brand:      { type: "string" },
              momentum:   { type: "string" },
              key_reason: { type: "string" },
            },
          },
        },
        trend_themes: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  });

  const result = {
    summary:       res.summary || "",
    refreshed_at:  res.refreshed_at || new Date().toISOString(),
    top_shoes:     res.top_shoes || [],
    top_brands:    res.top_brands || [],
    trend_themes:  res.trend_themes || [],
  };

  setCachedTrends(city, result);
  return result;
}