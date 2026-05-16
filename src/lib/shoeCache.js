/**
 * Shared in-memory shoe catalog cache.
 * All home sections share one fetch, avoiding parallel duplicate requests.
 */
import { base44 } from "@/api/base44Client";

let cache = null;
let fetchPromise = null;

export async function getShoesCatalog(limit = 80) {
  if (cache) return cache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = base44.entities.Shoe.list("-trending_score", limit)
    .then(shoes => {
      cache = shoes;
      fetchPromise = null;
      return shoes;
    })
    .catch(err => {
      fetchPromise = null;
      throw err;
    });

  return fetchPromise;
}

export function clearShoeCache() {
  cache = null;
}