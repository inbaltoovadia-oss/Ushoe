// Persists user's interest categories in localStorage
const STORAGE_KEY = "ushoe_interests";

export const ALL_CATEGORIES = [
  "Running",
  "Basketball",
  "Soccer",
  "Tennis",
  "Training",
  "Lifestyle",
  "Casual",
  "Walking",
  "Hiking",
  "Skateboarding",
];

let listeners = new Set();

export function getInterests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setInterests(interests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(interests));
  listeners.forEach((fn) => fn(interests));
}

export function subscribeInterests(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}