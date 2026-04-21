// Tracks recently viewed shoes in localStorage
const STORAGE_KEY = "ushoe_recently_viewed";
const MAX_ITEMS = 20;

let listeners = new Set();

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(shoe) {
  if (!shoe?.id) return;
  const current = getRecentlyViewed();
  // Remove if already exists (move to front)
  const filtered = current.filter(s => s.id !== shoe.id);
  const updated = [
    { id: shoe.id, name: shoe.name, brand: shoe.brand, price: shoe.price, image_url: shoe.image_url, category: shoe.category },
    ...filtered,
  ].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  listeners.forEach(fn => fn(updated));
}

export function subscribeRecentlyViewed(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}