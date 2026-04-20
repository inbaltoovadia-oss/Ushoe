import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scans all PriceTrack records across all users.
 * For each user with a price drop, sends a single summary email.
 * Designed to run as a scheduled daily job.
 * Can also be triggered manually by an admin.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no user) and manual admin invocations
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all tracked items grouped by user
    const allTracked = await base44.asServiceRole.entities.PriceTrack.list('-created_date', 500);

    // Group by creator (user email)
    const byUser = {};
    for (const item of allTracked) {
      const email = item.created_by;
      if (!email) continue;
      if (!byUser[email]) byUser[email] = [];
      byUser[email].push(item);
    }

    // For each user, check if any tracked shoe has dropped in price
    const results = [];
    for (const [email, items] of Object.entries(byUser)) {
      // Re-fetch latest shoe prices
      const updatedItems = await Promise.all(
        items.map(async (item) => {
          const shoes = await base44.asServiceRole.entities.Shoe.filter({ id: item.shoe_id });
          const latestPrice = shoes.length > 0 ? shoes[0].price : item.current_price;
          // Update current_price if changed
          if (latestPrice !== item.current_price) {
            await base44.asServiceRole.entities.PriceTrack.update(item.id, { current_price: latestPrice });
          }
          return { ...item, current_price: latestPrice };
        })
      );

      const drops = updatedItems.filter(i => i.current_price < i.tracked_price);
      if (drops.length === 0) {
        results.push({ email, status: 'no_drops' });
        continue;
      }

      // Build and send email
      const subject = `🎉 Price Drop! ${drops.length} shoe${drops.length > 1 ? 's' : ''} just got cheaper on uShoe`;
      const dropLines = drops
        .map(d => `• ${d.shoe_brand} ${d.shoe_name}: $${d.tracked_price} → $${d.current_price} (save $${(d.tracked_price - d.current_price).toFixed(0)})`)
        .join('\n');

      const body = `Great news! Prices dropped on shoes you're tracking:

${dropLines}

Visit uShoe to grab these deals before they sell out!

—
The uShoe Team
To stop receiving alerts, remove shoes from your price tracker.`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject,
        body,
        from_name: 'uShoe Price Alerts',
      });

      results.push({ email, status: 'sent', drops: drops.length });
    }

    const sent = results.filter(r => r.status === 'sent').length;
    return Response.json({ status: 'done', emails_sent: sent, details: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});