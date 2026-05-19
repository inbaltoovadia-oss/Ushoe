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

    // When client has web search ON, always use it — don't gate on intent keywords
    const doWebSearch = useWebSearch === true;

    const isIsrael = (userLocation.countryCode || '').toUpperCase() === 'IL';
    const localRetailers = isIsrael
      ? 'nike.com/il, adidas.co.il, footlocker.co.il, terminalx.com, renuar.co.il, dynamica.co.il, ac.co.il'
      : 'nike.com, adidas.com, footlocker.com, zappos.com, finishline.com, jdsports.com';

    const systemPrompt = `You are uShoe AI — confident sneaker expert. Reply in the user's language. Max 3 sentences unless detail asked.

USER: ${personaSummary}
LOCATION: ${locationInfo}
CATALOG: ${catalogText || 'Use general knowledge.'}

${doWebSearch ? `SEARCH web for user's query. Only retailers shipping to ${userLocation.country || 'user\'s country'} (${localRetailers}). ships_to_user=true only if certain. Prices in ${isIsrael ? 'ILS ₪' : 'USD $'}. Real buy_link URLs. Max 3 results.` : `CATALOG MODE only. No web_recommendations.`}
Rules: 1 best pick, reference catalog by index, be punchy.`;

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
                buy_link:      { type: 'string' },
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
      // Never show a catalog card when web search is active — send web links instead
      best_pick_index:     doWebSearch ? -1 : (aiResponse.best_pick_index ?? -1),
      follow_up_questions: (aiResponse.follow_up_questions || []).slice(0, 2),
      used_web:            doWebSearch,
      web_recommendations: webRecs,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});