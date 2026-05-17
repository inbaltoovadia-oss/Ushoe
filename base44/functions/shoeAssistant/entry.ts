import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message, conversationHistory = [], userProfile = {}, catalogSnapshot = [], userLocation = {} } = body;

    // Build persona string
    const personaLines = [];
    if (userProfile.gender) personaLines.push(`Gender: ${userProfile.gender}`);
    if (userProfile.preferred_brands?.length) personaLines.push(`Favourite brands: ${userProfile.preferred_brands.join(', ')}`);
    if (userProfile.main_use?.length) personaLines.push(`Primary use: ${userProfile.main_use.join(', ')}`);
    if (userProfile.style_preference?.length) personaLines.push(`Style: ${userProfile.style_preference.join(', ')}`);
    if (userProfile.budget_max) personaLines.push(`Budget: up to $${userProfile.budget_max}`);
    else if (userProfile.budget_behavioral) personaLines.push(`~$${userProfile.budget_behavioral} avg spend`);
    if (userProfile.searched_brands?.length) personaLines.push(`Brands searched: ${userProfile.searched_brands.join(', ')}`);
    if (userProfile.searched_categories?.length) personaLines.push(`Categories searched: ${userProfile.searched_categories.join(', ')}`);
    if (userProfile.wishlist_brands?.length) personaLines.push(`Wishlisted brands: ${userProfile.wishlist_brands.join(', ')}`);
    if (userProfile.recent_queries?.length) personaLines.push(`Recent searches: ${userProfile.recent_queries.slice(0, 5).join(', ')}`);
    const personaSummary = personaLines.length ? personaLines.join('\n') : 'No profile signals yet.';

    const locationInfo = userLocation.country
      ? `User is in: ${userLocation.city || ''}, ${userLocation.country} (${userLocation.countryCode || ''})`
      : 'Location: unknown';

    const catalogText = catalogSnapshot.slice(0, 20)
      .map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} [${s.category}]${s.is_trending ? ' 🔥' : ''}`)
      .join('\n');

    // Detect if this needs live web data
    const needsWeb = /price|buy|where|stock|available|deal|sale|discount|trend|popular|2024|2025|2026|new release|release date|resale|stockx|goat|recommend|suggest|best|top|find|מחיר|קנה|במלאי|מבצע|המלצה|precio|comprar|disponible|descuento|prix|acheter|Preis|kaufen|preço|سعر|شراء/i.test(message);

    const systemPrompt = `You are uShoe AI — the world's smartest sneaker assistant.

LANGUAGE: Detect user's language and reply in EXACTLY that language.

PERSONALITY:
- Confident, knowledgeable sneaker expert. Think: personal stylist + sneaker historian + deal hunter.
- Conversational, direct, enthusiastic. Not robotic.
- Max 3-4 sentences unless user asks for detail.
- Always lead with ONE best recommendation when relevant.

USER PROFILE:
${personaSummary}

USER LOCATION:
${locationInfo}

CATALOG (pre-ranked for this user):
${catalogText || 'Use general knowledge.'}

${needsWeb ? `LIVE DATA: Search the web NOW to find:
- Real current prices from local retailers that SHIP TO or have stores in the user's country
- Latest deals and discounts
- Stock availability
- Best recommendations matching the user's request
- For Israeli users: search nike.com/il, adidas.co.il, footlocker.co.il, terminalx.com, renuar.co.il
- For US users: nike.com, adidas.com, footlocker.com, zappos.com, finish line
- Only include products that actually ship to the user's location` : ''}

RULES:
1. ONE best pick first when recommending (from catalog if possible, otherwise from web).
2. Reference catalog shoes by index when relevant.
3. If asking about price/availability, search web and give real current data.
4. For web recommendations: include real product name, brand, price, and the retailer name.
5. Stay focused on sneakers and footwear.
6. Use conversation history for better personalization.
7. When recommending web shoes, make sure they ship to the user's location (${userLocation.country || 'their country'}).`;

    const historyText = conversationHistory.slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

${historyText ? `CONVERSATION:\n${historyText}\n` : ''}
User: ${message}

Respond as uShoe AI. If you found web shoes to recommend, populate the web_recommendations array with up to 3 results that ship to the user's location:`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: needsWeb,
      model: needsWeb ? "gemini_3_1_pro" : "gemini_3_flash",
      response_json_schema: {
        type: 'object',
        properties: {
          reply:               { type: 'string' },
          best_pick_index:     { type: 'number' },
          follow_up_questions: { type: 'array', items: { type: 'string' } },
          confidence:          { type: 'number' },
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

    // Filter web recommendations to only those that ship to user
    const webRecs = (aiResponse.web_recommendations || [])
      .filter(r => r.ships_to_user !== false && r.name && r.brand)
      .slice(0, 3);

    return Response.json({
      reply:               aiResponse.reply || 'Let me help you find the perfect shoe.',
      best_pick_index:     aiResponse.best_pick_index ?? -1,
      follow_up_questions: aiResponse.follow_up_questions || [],
      confidence:          aiResponse.confidence || 0.8,
      used_web:            needsWeb,
      web_recommendations: webRecs,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});