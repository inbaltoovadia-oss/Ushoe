// Size conversion tables (US Men's as base)
const US_TO_EU = { 6: 38, 6.5: 39, 7: 40, 7.5: 40.5, 8: 41, 8.5: 42, 9: 42.5, 9.5: 43, 10: 44, 10.5: 44.5, 11: 45, 11.5: 45.5, 12: 46, 12.5: 47, 13: 47.5, 14: 48.5, 15: 49.5 };
const US_TO_UK = { 6: 5.5, 6.5: 6, 7: 6.5, 7.5: 7, 8: 7.5, 8.5: 8, 9: 8.5, 9.5: 9, 10: 9.5, 10.5: 10, 11: 10.5, 11.5: 11, 12: 11.5, 12.5: 12, 13: 12.5, 14: 13.5, 15: 14.5 };

const EU_TO_US = Object.fromEntries(Object.entries(US_TO_EU).map(([us, eu]) => [eu, parseFloat(us)]));
const UK_TO_US = Object.fromEntries(Object.entries(US_TO_UK).map(([us, uk]) => [uk, parseFloat(us)]));

export const US_SIZES = Object.keys(US_TO_EU).map(Number);
export const EU_SIZES = [...new Set(Object.values(US_TO_EU))].sort((a, b) => a - b);
export const UK_SIZES = [...new Set(Object.values(US_TO_UK))].sort((a, b) => a - b);

export function convertSize(value, from, to) {
  if (from === to) return value;
  let usSize = value;
  if (from === "EU") usSize = EU_TO_US[value] || value;
  if (from === "UK") usSize = UK_TO_US[value] || value;
  if (to === "US") return usSize;
  if (to === "EU") return US_TO_EU[usSize] || value;
  if (to === "UK") return US_TO_UK[usSize] || value;
  return value;
}

const KEY = "ushoe_size_pref";
const LISTENERS = new Set();

function notify() {
  LISTENERS.forEach(fn => fn(getSize()));
}

export function getSize() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { us: null, eu: null, uk: null, system: "US" };
  } catch {
    return { us: null, eu: null, uk: null, system: "US" };
  }
}

export function setSize(us, system = "US") {
  const pref = {
    us,
    eu: US_TO_EU[us] || null,
    uk: US_TO_UK[us] || null,
    system,
  };
  localStorage.setItem(KEY, JSON.stringify(pref));
  notify();
}

export function subscribeSize(fn) {
  LISTENERS.add(fn);
  return () => LISTENERS.delete(fn);
}

export function getSizeLabel() {
  const s = getSize();
  if (!s.us) return null;
  if (s.system === "EU") return `EU ${s.eu}`;
  if (s.system === "UK") return `UK ${s.uk}`;
  return `US ${s.us}`;
}