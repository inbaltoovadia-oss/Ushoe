import { base44 } from "@/api/base44Client";

/**
 * Fire all active webhooks subscribed to a given event.
 * @param {string} eventName - e.g. "price_drop", "wishlist_add"
 * @param {object} payload   - data to send with the event
 */
export async function dispatchWebhook(eventName, payload) {
  const webhooks = await base44.entities.Webhook.filter({ is_active: true });
  const matching = webhooks.filter(
    (w) => Array.isArray(w.events) && w.events.includes(eventName)
  );

  await Promise.allSettled(
    matching.map(async (webhook) => {
      const body = JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      const headers = {
        "Content-Type": "application/json",
      };
      if (webhook.secret) {
        headers["X-Webhook-Secret"] = webhook.secret;
      }

      await fetch(webhook.url, { method: "POST", headers, body });

      // Update last_triggered + trigger_count
      await base44.entities.Webhook.update(webhook.id, {
        last_triggered: new Date().toISOString(),
        trigger_count: (webhook.trigger_count || 0) + 1,
      });
    })
  );
}