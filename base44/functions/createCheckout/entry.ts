import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Price IDs
const PRICE_MAP = {
  // Subscriptions
  pro:    'price_1TdafKGl7xINc5OfkzklSvTm',
  brand:  'price_1TdafKGl7xINc5Oftrb2WaZ9',
  // Sponsorships (one-time)
  starter:  'price_1TdafKGl7xINc5OfZF1qD8Yx',
  featured: 'price_1TdafKGl7xINc5OfkScrmc7o',
  premium:  'price_1TdafKGl7xINc5OfiWazoFq5',
};

const SUBSCRIPTION_PLANS = new Set(['pro', 'brand']);

Deno.serve(async (req) => {
  try {
    const { planId, shoeId, shoeName, successUrl, cancelUrl } = await req.json();

    if (!planId || !PRICE_MAP[planId]) {
      return Response.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const priceId = PRICE_MAP[planId];
    const isSubscription = SUBSCRIPTION_PLANS.has(planId);

    const sessionParams = {
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || 'https://app.base44.com/subscription?success=1',
      cancel_url:  cancelUrl  || 'https://app.base44.com/subscription?canceled=1',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_id: planId,
        shoe_id: shoeId || '',
        shoe_name: shoeName || '',
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[createCheckout] Created session ${session.id} for plan=${planId}`);
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[createCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});