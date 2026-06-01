import Stripe from 'npm:stripe@14';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const SPONSORSHIP_DURATIONS = {
  starter:  7,
  featured: 14,
  premium:  30,
};

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripeWebhook] Signature verification failed:', err.message);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  console.log(`[stripeWebhook] Event: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { plan_id, shoe_id } = session.metadata || {};

    if (!plan_id) {
      console.warn('[stripeWebhook] No plan_id in metadata, skipping.');
      return Response.json({ received: true });
    }

    const base44 = createClientFromRequest(req);

    // Handle sponsorship activation
    if (['starter', 'featured', 'premium'].includes(plan_id) && shoe_id) {
      const durationDays = SPONSORSHIP_DURATIONS[plan_id] || 7;
      const sponsoredUntil = new Date();
      sponsoredUntil.setDate(sponsoredUntil.getDate() + durationDays);

      try {
        await base44.asServiceRole.entities.Shoe.update(shoe_id, {
          is_sponsored: true,
          sponsored_plan: plan_id,
          sponsored_until: sponsoredUntil.toISOString(),
        });
        console.log(`[stripeWebhook] Shoe ${shoe_id} sponsored on plan=${plan_id} until ${sponsoredUntil.toISOString()}`);
      } catch (err) {
        console.error('[stripeWebhook] Failed to activate sponsorship:', err.message);
      }
    }

    // Handle subscription activation (pro / brand)
    if (['pro', 'brand'].includes(plan_id)) {
      console.log(`[stripeWebhook] Subscription activated: plan=${plan_id}, customer=${session.customer}`);
      // Plan is activated client-side via Stripe redirect for now.
      // For per-user server-side enforcement, store subscription status on UserProfile here.
    }
  }

  return Response.json({ received: true });
});