import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs daily. For each user with tracked shoes:
 * 1. Checks for price drops (tracked_price → current_price)
 * 2. Checks for restocks via web search (out_of_stock → back in stock)
 * Sends a single combined email per user if anything changed.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no user) and manual admin invocations
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all tracked items
    const allTracked = await base44.asServiceRole.entities.PriceTrack.list('-created_date', 500);

    // Group by user email
    const byUser = {};
    for (const item of allTracked) {
      if (!item.created_by) continue;
      if (!byUser[item.created_by]) byUser[item.created_by] = [];
      byUser[item.created_by].push(item);
    }

    const results = [];

    for (const [email, items] of Object.entries(byUser)) {
      const drops = [];
      const restocks = [];

      await Promise.all(items.map(async (item) => {
        // Fetch latest shoe data from catalog
        const shoes = await base44.asServiceRole.entities.Shoe.filter({ id: item.shoe_id });
        if (shoes.length === 0) return;
        const shoe = shoes[0];
        const latestPrice = shoe.price;

        // Update stored current_price if changed
        if (latestPrice !== item.current_price) {
          await base44.asServiceRole.entities.PriceTrack.update(item.id, { current_price: latestPrice });
        }

        // Price drop check
        if (latestPrice < item.tracked_price) {
          drops.push({
            name: `${shoe.brand} ${shoe.name}`,
            from: item.tracked_price,
            to: latestPrice,
            saving: (item.tracked_price - latestPrice).toFixed(0),
            shoeId: shoe.id,
          });
        }

        // Restock check via web
        const stockResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Is "${shoe.brand} ${shoe.name}" currently back in stock at any major retailer (Nike, Adidas, Foot Locker, JD Sports, Zappos, Finish Line)? Search right now. Return in_stock=true only if genuinely available to purchase today. Include retailer name and current price.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              in_stock: { type: 'boolean' },
              retailers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    price: { type: 'string' },
                  }
                }
              }
            }
          }
        });

        if (stockResult.in_stock && (stockResult.retailers || []).length > 0) {
          restocks.push({
            name: `${shoe.brand} ${shoe.name}`,
            shoeId: shoe.id,
            retailers: stockResult.retailers.slice(0, 3),
          });
        }
      }));

      if (drops.length === 0 && restocks.length === 0) {
        results.push({ email, status: 'no_changes' });
        continue;
      }

      // Build email
      let subject = '';
      let bodyParts = [];

      if (drops.length > 0 && restocks.length > 0) {
        subject = `💰 Price drop + restock alert for your tracked shoes`;
      } else if (drops.length > 0) {
        subject = `💰 Price drop on ${drops.length} shoe${drops.length > 1 ? 's' : ''} you're tracking`;
      } else {
        subject = `✅ ${restocks.length} tracked shoe${restocks.length > 1 ? 's' : ''} back in stock`;
      }

      if (drops.length > 0) {
        bodyParts.push(`PRICE DROPS:\n` + drops.map(d =>
          `• ${d.name}: $${d.from} → $${d.to} (save $${d.saving}) — https://app.ushoe.com/shoe/${d.shoeId}`
        ).join('\n'));
      }

      if (restocks.length > 0) {
        bodyParts.push(`BACK IN STOCK:\n` + restocks.map(r =>
          `• ${r.name} — available at ${r.retailers.map(s => `${s.name} (${s.price})`).join(', ')}\n  https://app.ushoe.com/shoe/${r.shoeId}`
        ).join('\n'));
      }

      const body = `Hey! Here's your uShoe alert update:

${bodyParts.join('\n\n')}

—
The uShoe Team
To stop receiving alerts, remove shoes from your tracker in the app.`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject,
        body,
        from_name: 'uShoe Alerts',
      });

      results.push({ email, status: 'sent', drops: drops.length, restocks: restocks.length });
    }

    const sent = results.filter(r => r.status === 'sent').length;
    return Response.json({ status: 'done', emails_sent: sent, details: results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});