let cart = [];
let listeners = new Set();

export function getCart() {
  return [...cart];
}

export function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

export function addToCart(shoe, size) {
  const existing = cart.find((i) => i.shoe.id === shoe.id && i.size === size);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ shoe, size, qty: 1 });
  }
  notify();
}

export function removeFromCart(shoeId, size) {
  cart = cart.filter((i) => !(i.shoe.id === shoeId && i.size === size));
  notify();
}

export function updateQty(shoeId, size, qty) {
  const item = cart.find((i) => i.shoe.id === shoeId && i.size === size);
  if (item) {
    if (qty <= 0) removeFromCart(shoeId, size);
    else item.qty = qty;
    notify();
  }
}

function notify() {
  listeners.forEach((fn) => fn(getCart()));
}

export function subscribeCart(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}