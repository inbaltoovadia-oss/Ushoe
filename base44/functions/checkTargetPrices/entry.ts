import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Runs every hour (scheduled).
 * For each PriceTrack record with a target_price set:
 *   1. Checks the live current price via Gemini Flash + web search
 *   2. If the live price <= target_price, sends an email via SendEmail
 *   3. Records alert_sent_at so we don't spam (re-alerts only after 24h)
 */

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours between repeat alerts

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin manual call
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all tracked items that have a target price set
    const allTracked = await base44.asServiceRole.entities.PriceTrack.list('-created_date', 500);
    const withTarget = allTracked.filter(t => t.target_price != null && t.target_price > 0);

    if (withTarget.length === 0) {
      return Response.json({ status: 'done', checked: 0, alerts_sent: 0 });
    }

    // Group by unique shoe so we only do one web lookup per shoe
    const byShoe = {};
    for (const item of withTarget) {
      if (!byShoe[item.shoe_id]) byShoe[item.shoe_id] = { items: [], name: item.shoe_name, brand: item.shoe_brand, image: item.shoe_image };
      byShoe[item.shoe_id].items.push(item);
    }

    let alertsSent = 0;
    const results = [];

    for (const [shoeId, group] of Object.entries(byShoe)) {
      const shoeName = `${group.brand} ${group.name}`;

      // Look up live price via Gemini Flash + web
      let livePrice = null;
      let bestRetailer = null;
      let buyLink = null;

      try {
        const priceResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Search the web right now and find the lowest current retail price for: "${shoeName}".
Visit retailer websites (Nike, Adidas, Foot Locker, JD Sports, Zappos, or local retailers).
Return the single LOWEST price you find, the retailer name, and the exact product URL.
Copy the price exactly as shown on the page (e.g. $89.99, ₪529.90).`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              lowest_price: { type: 'number' },
              price_display: { type: 'string' },
              retailer: { type: 'string' },
              url: { type: 'string' },
              currency: { type: 'string' },
            }
          }
        });

        livePrice = priceResult?.lowest_price || null;
        bestRetailer = priceResult?.retailer || null;
        buyLink = priceResult?.url || null;
        const priceDisplay = priceResult?.price_display || (livePrice ? String(livePrice) : null);

        // Update current_price on all matching records
        for (const item of group.items) {
          if (livePrice && livePrice !== item.current_price) {
            await base44.asServiceRole.entities.PriceTrack.update(item.id, { current_price: livePrice });
          }

          // Check if price is at or below target
          if (!livePrice || livePrice > item.target_price) {
            results.push({ shoe: shoeName, user: item.created_by, status: 'above_target', live: livePrice, target: item.target_price });
            continue;
          }

          // Check cooldown — don't re-alert within 24h
          if (item.alert_sent_at) {
            const lastSent = new Date(item.alert_sent_at).getTime();
            if (Date.now() - lastSent < ALERT_COOLDOWN_MS) {
              results.push({ shoe: shoeName, user: item.created_by, status: 'cooldown' });
              continue;
            }
          }

          // Price is at or below target — send email!
          const savings = item.tracked_price - livePrice;
          const savingsPct = Math.round((savings / item.tracked_price) * 100);

          const subject = `🎉 Price Alert: ${shoeName} is now ${priceDisplay || '$' + livePrice}!`;

          const body = `Great news! A sneaker you're tracking just dropped below your target price.

👟 ${shoeName}
💰 Current Price: ${priceDisplay || '$' + livePrice} at ${bestRetailer || 'a retailer'}
🎯 Your Target: $${item.target_price}
📉 You save: $${savings.toFixed(0)} (${savingsPct}% off your tracked price of $${item.tracked_price})

${buyLink ? `🛒 Buy now: ${buyLink}` : `🔍 Search for it: https://www.google.com/search?q=${encodeURIComponent(shoeName + ' buy')}`}

---
This alert was triggered because the live price dropped below your set target of $${item.target_price}.
To update or remove this alert, visit your Price Tracker in the uShoe app.`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: item.created_by,
            subject,
            body,
            from_name: 'uShoe Price Alerts',
          });

          // Mark alert sent
          await base44.asServiceRole.entities.PriceTrack.update(item.id, {
            alert_sent_at: new Date().toISOString(),
            current_price: livePrice,
          });

          alertsSent++;
          results.push({ shoe: shoeName, user: item.created_by, status: 'alert_sent', live: livePrice, target: item.target_price });
        }
      } catch (err) {
        results.push({ shoe: shoeName, status: 'error', error: err.message });
      }
    }

    return Response.json({
      status: 'done',
      shoes_checked: Object.keys(byShoe).length,
      alerts_sent: alertsSent,
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});