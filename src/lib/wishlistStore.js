// Simple in-memory wishlist store synced with entity
let wishlistIds = new Set();
let listeners = new Set();

export function isInWishlist(shoeId) {
  return wishlistIds.has(shoeId);
}

export function getWishlistIds() {
  return wishlistIds;
}

export function setWishlistIds(ids) {
  wishlistIds = new Set(ids);
  listeners.forEach((fn) => fn(wishlistIds));
}

export function addToWishlistLocal(shoeId) {
  wishlistIds.add(shoeId);
  listeners.forEach((fn) => fn(wishlistIds));
}

export function removeFromWishlistLocal(shoeId) {
  wishlistIds.delete(shoeId);
  listeners.forEach((fn) => fn(wishlistIds));
}

export function subscribeWishlist(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}