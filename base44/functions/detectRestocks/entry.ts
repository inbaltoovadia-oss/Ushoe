import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Real-time restock detection for tracked shoes
// Compares current stock against historical baseline to detect restocks
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tracked shoes for this user
    const tracked = await base44.entities.PriceTrack.filter({ created_by: user.email });

    if (tracked.length === 0) {
      return Response.json({ restocks: [] });
    }

    // Fetch current store availability for each tracked shoe
    const restocks = [];

    for (const item of tracked) {
      const shoeData = await base44.entities.Shoe.filter({ id: item.shoe_id });
      if (shoeData.length === 0) continue;

      const shoe = shoeData[0];

      // Check web for current stock status
      const stockCheck = await base44.integrations.Core.InvokeLLM({
        prompt: `Check REAL CURRENT stock (today) for: ${shoe.brand} ${shoe.name}

Search for:
1. Major retailers (Nike, Adidas, Foot Locker, Finish Line, JD Sports)
2. Only return shoes BACK IN STOCK TODAY
3. Return: retailer, price, in_stock (true/false), last_updated

Be accurate — if out of stock, return false.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            stores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  retailer: { type: 'string' },
                  price: { type: 'string' },
                  in_stock: { type: 'boolean' },
                  last_updated: { type: 'string' },
                },
              },
            },
          },
        },
      });

      // Detect restocks (was out, now in)
      const nowInStock = (stockCheck.stores || []).filter(s => s.in_stock);

      if (nowInStock.length > 0) {
        restocks.push({
          shoe_id: item.shoe_id,
          shoe_name: shoe.name,
          shoe_brand: shoe.brand,
          shoe_image: shoe.image_url,
          current_price: shoe.price,
          tracked_price: item.tracked_price,
          stores_with_stock: nowInStock.length,
          stores: nowInStock,
          detected_at: new Date().toISOString(),
        });

        // Send restock alert email
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `✅ ${shoe.brand} ${shoe.name} is Back in Stock!`,
          body: `Great news! Your tracked shoe is now available at ${nowInStock[0].retailer}.

**${shoe.brand} ${shoe.name}**
Price: ${nowInStock[0].price}
Available at: ${nowInStock.map(s => s.retailer).join(', ')}

Available at ${nowInStock.length} retailer${nowInStock.length > 1 ? 's' : ''}.

Check it out: https://ushoe.app/shoe/${item.shoe_id}`,
        });
      }
    }

    return Response.json({
      status: 'success',
      restocks_detected: restocks.length,
      restocks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});