import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message, conversationHistory = [], userProfile = {}, catalogSnapshot = [] } = body;

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

    const catalogText = catalogSnapshot.slice(0, 20)
      .map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} [${s.category}]${s.is_trending ? ' 🔥' : ''}`)
      .join('\n');

    // Detect if this needs live web data (prices, stock, releases, trends)
    const needsWeb = /price|buy|where|stock|available|deal|sale|discount|trend|popular|2024|2025|2026|new release|release date|resale|stockx|goat|מחיר|קנה|במלאי|מבצע|precio|comprar|disponible|descuento|prix|acheter|Preis|kaufen|preço|سعر|شراء/i.test(message);

    const systemPrompt = `You are uShoe AI — the world's smartest sneaker assistant, powered by Gemini.

LANGUAGE: Detect user's language and reply in EXACTLY that language.

PERSONALITY:
- You are a confident, knowledgeable sneaker expert. Think: personal stylist + sneaker historian + deal hunter.
- Be conversational, direct, and enthusiastic about sneakers. Not robotic.
- Max 3-4 sentences unless user asks for detail.
- Always lead with ONE best recommendation when relevant.
- You have deep knowledge of: hype culture, resale markets, brand history, performance specs, sizing, colorways, collaborations, release calendars.

USER PROFILE:
${personaSummary}

CATALOG (pre-ranked for this user):
${catalogText || 'Use general knowledge.'}

${needsWeb ? `LIVE DATA: You have access to Google Search right now. Use it to find:
- Current real prices from Nike.com, Adidas.com, Foot Locker, Zappos, GOAT, StockX, etc.
- Latest release dates and upcoming drops
- Current stock availability
- Real resale values from StockX/GOAT
- Latest deals and promo codes
Search Google for the most up-to-date information before answering.` : ''}

RULES:
1. ONE best pick first when recommending.
2. Reference catalog shoes by name when relevant.
3. If user asks about price/availability, search the web and give real current data.
4. Mention resale value, rarity, and cultural context when relevant.
5. Stay focused on sneakers and footwear.
6. Use conversation history to improve personalization.`;

    const historyText = conversationHistory.slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

${historyText ? `CONVERSATION:\n${historyText}\n` : ''}
User: ${message}

Respond as uShoe AI:`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: needsWeb,
      model: needsWeb ? "gemini_3_1_pro" : "gemini_3_flash",
      response_json_schema: {
        type: 'object',
        properties: {
          reply:                { type: 'string' },
          best_pick_index:      { type: 'number' },
          follow_up_questions:  { type: 'array', items: { type: 'string' } },
          confidence:           { type: 'number' },
          web_sources:          { type: 'array', items: { type: 'string' } },
        }
      }
    });

    return Response.json({
      reply:                aiResponse.reply || 'Let me help you find the perfect shoe.',
      best_pick_index:      aiResponse.best_pick_index ?? -1,
      follow_up_questions:  aiResponse.follow_up_questions || [],
      confidence:           aiResponse.confidence || 0.8,
      used_web:             needsWeb,
      web_sources:          aiResponse.web_sources || [],
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});