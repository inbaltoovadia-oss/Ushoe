import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scheduled every 30 min.
 * For each user who has discord_alerts_enabled + discord_webhook_url:
 *   - Fetches their tracked shoes
 *   - Uses Gemini Flash + live web search to check current stock
 *   - Compares against last known stock snapshot stored in RestockAlert
 *   - Sends a Discord notification if any size just became available
 */

async function sendDiscordNotification(webhookUrl, embed) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin manual trigger
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all user profiles with Discord enabled
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      discord_alerts_enabled: true,
    });

    if (profiles.length === 0) {
      return Response.json({ status: 'done', checked: 0, notifications_sent: 0 });
    }

    const results = [];

    for (const profile of profiles) {
      if (!profile.discord_webhook_url || !profile.created_by) continue;

      const userEmail = profile.created_by;

      // Get their tracked shoes
      const tracked = await base44.asServiceRole.entities.PriceTrack.filter({
        created_by: userEmail,
      });

      if (tracked.length === 0) continue;

      for (const item of tracked) {
        // Check current stock via live web search
        const stockResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Search the web RIGHT NOW and check current stock for: "${item.shoe_brand} ${item.shoe_name}"

Visit retailer websites (Nike, Adidas, Foot Locker, JD Sports, Zappos, and any Israeli retailers if relevant).

For EACH retailer, find:
- Is the shoe available to purchase right now?
- Which sizes are currently in stock? (list all available sizes)
- Current price (exact, copied from the site)
- Direct product URL

Return sizes as US numbers. If you cannot determine sizes, return an empty array. Only report sizes you actually see listed as available on the product page.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              retailers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name:            { type: 'string' },
                    price:           { type: 'string' },
                    in_stock:        { type: 'boolean' },
                    sizes_available: { type: 'array', items: { type: 'number' } },
                    url:             { type: 'string' },
                  }
                }
              }
            }
          }
        });

        const inStockRetailers = (stockResult?.retailers || []).filter(r => r.in_stock && r.sizes_available && r.sizes_available.length > 0);
        if (inStockRetailers.length === 0) continue;

        // Check what we last notified about for this shoe+user
        const prevAlerts = await base44.asServiceRole.entities.RestockAlert.filter({
          shoe_id: item.shoe_id,
          created_by: userEmail,
        });

        // Sizes we've already notified about (most recent alert)
        let previouslySeen = new Set();
        if (prevAlerts.length > 0) {
          const latest = prevAlerts.sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))[0];
          (latest.description || '').split(',').map(s => s.trim()).filter(Boolean).forEach(s => previouslySeen.add(s));
        }

        // Find newly available sizes
        const allCurrentSizes = new Set();
        const newSizesByRetailer = [];

        for (const r of inStockRetailers) {
          const newSizes = r.sizes_available.filter(sz => !previouslySeen.has(String(sz)));
          r.sizes_available.forEach(sz => allCurrentSizes.add(String(sz)));
          if (newSizes.length > 0) {
            newSizesByRetailer.push({ ...r, new_sizes: newSizes });
          }
        }

        if (newSizesByRetailer.length === 0) continue; // Nothing new

        // Record this notification so we don't re-send
        await base44.asServiceRole.entities.RestockAlert.create({
          shoe_id: item.shoe_id,
          shoe_name: item.shoe_name,
          shoe_brand: item.shoe_brand,
          shoe_image: item.shoe_image || '',
          detected_at: new Date().toISOString(),
          stores_with_stock: inStockRetailers.length,
          was_notified: true,
          description: Array.from(allCurrentSizes).join(', '),
          created_by: userEmail,
        });

        // Build Discord embed
        const shoeName = `${item.shoe_brand} ${item.shoe_name}`;
        const fields = newSizesByRetailer.map(r => ({
          name: `🛒 ${r.name} — ${r.price || 'Check price'}`,
          value: `Sizes: **${r.new_sizes.join(', ')}**${r.url ? `\n[View Product](${r.url})` : ''}`,
          inline: false,
        }));

        const embed = {
          title: `✅ Size Alert: ${shoeName}`,
          description: `New sizes just became available for a shoe you're tracking!`,
          color: 0x3b82f6,
          fields,
          thumbnail: item.shoe_image ? { url: item.shoe_image } : undefined,
          footer: { text: 'uShoe Stock Alert • Sizes may sell out quickly!' },
          timestamp: new Date().toISOString(),
        };

        const sent = await sendDiscordNotification(profile.discord_webhook_url, embed);
        results.push({ shoe: shoeName, sent, retailers: newSizesByRetailer.length });
      }
    }

    return Response.json({
      status: 'done',
      users_checked: profiles.length,
      notifications_sent: results.filter(r => r.sent).length,
      details: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});