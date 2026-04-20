import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all shoes
    const allShoes = await base44.asServiceRole.entities.Shoe.list('-created_date', 500);

    // Track seen shoes by brand+name
    const seen = new Map();
    const toDelete = [];

    for (const shoe of allShoes) {
      const key = `${shoe.brand}|${shoe.name}`.toLowerCase();
      if (seen.has(key)) {
        // Mark this as duplicate
        toDelete.push(shoe.id);
      } else {
        seen.set(key, shoe.id);
      }
    }

    // Delete duplicates
    for (const id of toDelete) {
      await base44.asServiceRole.entities.Shoe.delete(id);
    }

    return Response.json({
      success: true,
      duplicatesRemoved: toDelete.length,
      uniqueShoes: seen.size,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});