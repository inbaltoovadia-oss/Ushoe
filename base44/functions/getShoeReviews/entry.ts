import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { brand, name, model } = await req.json();
    if (!brand || !name) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const shoeName = model ? `${brand} ${name} ${model}` : `${brand} ${name}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Search the web RIGHT NOW for real buyer reviews of the "${shoeName}".
Find actual user ratings from RunRepeat, Reddit r/Sneakers r/RunningShoeGeeks, Trustpilot, brand websites, and sneaker review blogs.
Return ACCURATE scores out of 5 for each aspect based on what real users say — do NOT return generic 4.5 scores.
If a shoe is known to have poor breathability (e.g. leather shoes), score it low. If it has comfort issues, score comfort low.
Be specific to THIS exact shoe model: ${shoeName}.
Also return review_count (actual number of reviews found), 2 top pros and 1 top con from real reviews, and sizing advice (runs small/large/true to size).`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          overall_rating:  { type: 'number' },
          review_count:    { type: 'number' },
          scores: {
            type: 'object',
            properties: {
              comfort:       { type: 'number' },
              sizing:        { type: 'number' },
              durability:    { type: 'number' },
              traction:      { type: 'number' },
              breathability: { type: 'number' },
              style:         { type: 'number' },
              value:         { type: 'number' },
            }
          },
          top_pros:      { type: 'array', items: { type: 'string' } },
          top_con:       { type: 'string' },
          sizing_advice: { type: 'string' },
          source_note:   { type: 'string' },
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});