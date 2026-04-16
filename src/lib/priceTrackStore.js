// Shared store to avoid N+1 API calls from PriceTrackButton on every card
let trackedMap = {}; // shoe_id -> track record
let loaded = false;
let loading = false;
let listeners = new Set();
let pendingCallbacks = [];

const notify = () => listeners.forEach(fn => fn({ ...trackedMap }));

export const subscribeTrack = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getTrackedMap = () => trackedMap;

export const ensureLoaded = async () => {
  if (loaded) return;
  if (loading) {
    // Wait for the in-flight request
    return new Promise(resolve => pendingCallbacks.push(resolve));
  }
  loading = true;
  try {
    const { base44 } = await import("@/api/base44Client");
    const items = await base44.entities.PriceTrack.list("-created_date", 200);
    trackedMap = {};
    items.forEach(item => { trackedMap[item.shoe_id] = item; });
    loaded = true;
    notify();
  } finally {
    loading = false;
    pendingCallbacks.forEach(resolve => resolve());
    pendingCallbacks = [];
  }
};

export const setTracked = (shoeId, record) => {
  trackedMap = { ...trackedMap, [shoeId]: record };
  notify();
};

export const removeTracked = (shoeId) => {
  const next = { ...trackedMap };
  delete next[shoeId];
  trackedMap = next;
  notify();
};