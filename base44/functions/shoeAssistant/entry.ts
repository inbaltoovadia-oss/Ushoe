import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      userProfile = {},
      catalogSnapshot = [],
      userLocation = {},
      useWebSearch = true, // can be toggled off by client
    } = body;

    // Build persona string
    const personaLines = [];
    if (userProfile.gender) personaLines.push(`Gender: ${userProfile.gender}`);
    if (userProfile.preferred_brands?.length) personaLines.push(`Favourite brands: ${userProfile.preferred_brands.join(', ')}`);
    if (userProfile.main_use?.length) personaLines.push(`Primary use: ${userProfile.main_use.join(', ')}`);
    if (userProfile.style_preference?.length) personaLines.push(`Style: ${userProfile.style_preference.join(', ')}`);
    if (userProfile.budget_max) personaLines.push(`Budget: up to $${userProfile.budget_max}`);
    else if (userProfile.budget_behavioral) personaLines.push(`~$${userProfile.budget_behavioral} avg spend`);
    if (userProfile.recent_queries?.length) personaLines.push(`Recent searches: ${userProfile.recent_queries.slice(0, 3).join(', ')}`);
    const personaSummary = personaLines.length ? personaLines.join('\n') : 'No profile signals yet.';

    const locationInfo = userLocation.country
      ? `${userLocation.city || ''}, ${userLocation.country} (${userLocation.countryCode || ''})`
      : 'unknown';

    const catalogText = catalogSnapshot.slice(0, 15)
      .map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} [${s.category}]${s.is_trending ? ' 🔥' : ''}`)
      .join('\n');

    // Only auto-detect if client hasn't explicitly set useWebSearch=false
    const intentNeedsWeb = useWebSearch && /price|buy|where|stock|available|deal|sale|discount|trend|popular|2025|2026|new release|recommend|suggest|best|top|find|מחיר|קנה|מבצע|המלצה|precio|comprar|prix|acheter|سعر|شراء/i.test(message);
    const doWebSearch = useWebSearch && intentNeedsWeb;

    const isIsrael = (userLocation.countryCode || '').toUpperCase() === 'IL';
    const localRetailers = isIsrael
      ? 'nike.com/il, adidas.co.il, footlocker.co.il, terminalx.com, renuar.co.il, dynamica.co.il, ac.co.il'
      : 'nike.com, adidas.com, footlocker.com, zappos.com, finishline.com, jdsports.com';

    const systemPrompt = `You are uShoe AI — a confident, knowledgeable sneaker expert and deal hunter.

LANGUAGE: Reply in the SAME language as the user's message.
STYLE: Conversational, direct, enthusiastic. Max 3-4 sentences unless detail is asked for.

USER PROFILE:
${personaSummary}

LOCATION: ${locationInfo}

CATALOG (ranked for this user):
${catalogText || 'Use general knowledge.'}

${doWebSearch ? `WEB SEARCH TASK: Search the web NOW for the user's query.
- CRITICAL: ONLY include retailers that actually ship to ${userLocation.country || 'the user\'s country'} or have a local storefront there.
- Preferred local retailers: ${localRetailers}
- Each result MUST have ships_to_user = true — if you are not 100% sure it ships there, set it to false and it will be excluded.
- Return REAL prices in the local currency (${isIsrael ? 'ILS ₪' : 'USD $'}).
- Up to 3 web results only.` : `CATALOG MODE: Only recommend from the catalog above. Do NOT include web_recommendations.`}

RULES:
1. Lead with ONE best recommendation when relevant.
2. Reference catalog items by index.
3. Keep response concise and punchy.
4. Never recommend a shoe that doesn't ship to the user.`;

    const historyText = conversationHistory.slice(-4)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

${historyText ? `CONVERSATION:\n${historyText}\n` : ''}User: ${message}`;

    // Always use gemini_3_flash for speed — it supports web search and is much faster than pro
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: doWebSearch,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          reply:               { type: 'string' },
          best_pick_index:     { type: 'number' },
          follow_up_questions: { type: 'array', items: { type: 'string' } },
          web_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:          { type: 'string' },
                brand:         { type: 'string' },
                price:         { type: 'string' },
                retailer:      { type: 'string' },
                ships_to_user: { type: 'boolean' },
                why:           { type: 'string' },
              }
            }
          },
        }
      }
    });

    // Strict filter: only include results confirmed to ship to user
    const webRecs = doWebSearch
      ? (aiResponse.web_recommendations || [])
          .filter(r => r.ships_to_user === true && r.name && r.brand)
          .slice(0, 3)
      : [];

    return Response.json({
      reply:               aiResponse.reply || 'Let me help you find the perfect shoe.',
      best_pick_index:     aiResponse.best_pick_index ?? -1,
      follow_up_questions: (aiResponse.follow_up_questions || []).slice(0, 2),
      used_web:            doWebSearch,
      web_recommendations: webRecs,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});