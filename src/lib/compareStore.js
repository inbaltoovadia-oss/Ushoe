// Global compare store — max 4 shoes
let selectedIds = [];
let selectedShoes = [];
let listeners = new Set();

const notify = () => listeners.forEach(fn => fn([...selectedShoes]));

export const subscribeCompare = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getCompareShoes = () => [...selectedShoes];

export const isInCompare = (id) => selectedIds.includes(id);

export const toggleCompare = (shoe) => {
  if (selectedIds.includes(shoe.id)) {
    selectedIds = selectedIds.filter(i => i !== shoe.id);
    selectedShoes = selectedShoes.filter(s => s.id !== shoe.id);
  } else {
    if (selectedIds.length >= 4) return false; // max 4
    selectedIds = [...selectedIds, shoe.id];
    selectedShoes = [...selectedShoes, shoe];
  }
  notify();
  return true;
};

export const clearCompare = () => {
  selectedIds = [];
  selectedShoes = [];
  notify();
};