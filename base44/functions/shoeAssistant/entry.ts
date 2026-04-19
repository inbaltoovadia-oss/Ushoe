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
    if (userProfile.tracked_brands?.length) personaLines.push(`Price-tracking: ${userProfile.tracked_brands.join(', ')}`);
    if (userProfile.recent_queries?.length) personaLines.push(`Recent searches: ${userProfile.recent_queries.slice(0, 5).join(', ')}`);
    const personaSummary = personaLines.length ? personaLines.join('\n') : 'No profile signals yet — use trending data.';

    // Catalog snippet (pre-ranked by personalization engine on client)
    const catalogText = catalogSnapshot.slice(0, 20)
      .map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} [${s.category}]${s.is_trending ? ' 🔥' : ''}${s._score ? ` score=${Math.round(s._score)}` : ''}`)
      .join('\n');

    // Build conversation messages
    const systemPrompt = `You are uShoe AI — a world-class shoe specialist and personal shopping assistant.

LANGUAGE RULE:
- Detect the language of the user's message and reply in EXACTLY that language.
- Follow-up questions must also be in the same language.

PERSONALITY:
- Confident, direct, expert. Talk like a real shoe consultant, not a chatbot.
- Short answers. Maximum 3-4 sentences per response unless the user asks for detail.
- Always lead with ONE best pick when giving recommendations.
- Use your knowledge of shoe brands, performance features, and trends.

USER PROFILE (use this to personalize every answer):
${personaSummary}

TOP CATALOG SHOES (pre-ranked for this user, use index numbers to reference):
${catalogText || 'No catalog available — use general knowledge.'}

RULES:
1. Always give ONE best pick first when recommending shoes.
2. Reference catalog shoes by name when relevant.
3. Blend global trends + user preferences (trending running shoes if user likes running).
4. If asked about price/availability, mention you can search the web.
5. Stay focused on shoes — redirect off-topic questions back to footwear.
6. Learn from the conversation history to improve responses.`;

    // Build messages array for LLM
    const historyText = conversationHistory.slice(-8)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n` : ''}
User: ${message}

Respond as uShoe AI:`;

    // Run AI + web search in parallel when needed
    // Includes Hebrew, Spanish, French, German, Arabic, Portuguese keywords alongside English
    const needsWeb = /price|buy|where|stock|available|deal|sale|discount|trend|popular|2024|2025|new release|מחיר|קנה|במלאי|מבצע|מגמה|precio|comprar|disponible|descuento|tendencia|prix|acheter|disponible|réduction|tendance|Preis|kaufen|verfügbar|Rabatt|Trend|preço|comprar|disponível|desconto|سعر|شراء|متوفر|خصم/i.test(message);

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: needsWeb,
      response_json_schema: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          best_pick_index: { type: 'number' },
          follow_up_questions: {
            type: 'array',
            items: { type: 'string' }
          },
          confidence: { type: 'number' }
        }
      }
    });

    return Response.json({
      reply: aiResponse.reply || 'Let me help you find the perfect shoe.',
      best_pick_index: aiResponse.best_pick_index ?? -1,
      follow_up_questions: aiResponse.follow_up_questions || [],
      confidence: aiResponse.confidence || 0.8,
      used_web: needsWeb
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});