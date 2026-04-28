/**
 * collectionsStore — client-side localStorage store for shoe folders/collections.
 * Structure: { [collectionId]: { id, name, emoji, shoeIds: [] } }
 */

const KEY = "ushoe_collections_v1";
const listeners = new Set();

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach(fn => fn(data));
}

export function getCollections() {
  return Object.values(read());
}

export function subscribeCollections(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function createCollection(name, emoji = "👟") {
  const all = read();
  const id = `col_${Date.now()}`;
  all[id] = { id, name, emoji, shoeIds: [], createdAt: Date.now() };
  write(all);
  return id;
}

export function deleteCollection(id) {
  const all = read();
  delete all[id];
  write(all);
}

export function addToCollection(collectionId, shoeId) {
  const all = read();
  if (!all[collectionId]) return;
  if (!all[collectionId].shoeIds.includes(shoeId)) {
    all[collectionId].shoeIds.push(shoeId);
    write(all);
  }
}

export function removeFromCollection(collectionId, shoeId) {
  const all = read();
  if (!all[collectionId]) return;
  all[collectionId].shoeIds = all[collectionId].shoeIds.filter(id => id !== shoeId);
  write(all);
}

export function getCollectionsForShoe(shoeId) {
  return getCollections().filter(c => c.shoeIds.includes(shoeId));
}

export function renameCollection(id, name, emoji) {
  const all = read();
  if (!all[id]) return;
  if (name !== undefined) all[id].name = name;
  if (emoji !== undefined) all[id].emoji = emoji;
  write(all);
}