// Guest mode + onboarding tracking — persisted to localStorage
const ONBOARDED_KEY = "ushoe_onboarded";
const GUEST_KEY = "ushoe_guest_mode";
const GUEST_INTERESTS_KEY = "ushoe_guest_interests";

const listeners = new Set();
const notify = () => listeners.forEach(fn => fn(getGuestState()));

export function getGuestState() {
  return {
    onboarded: localStorage.getItem(ONBOARDED_KEY) === "true",
    isGuest: localStorage.getItem(GUEST_KEY) === "true",
  };
}

export function hasOnboarded() {
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function isGuest() {
  return localStorage.getItem(GUEST_KEY) === "true";
}

export function setGuestMode(value = true) {
  localStorage.setItem(GUEST_KEY, String(value));
  localStorage.setItem(ONBOARDED_KEY, "true");
  notify();
}

export function setOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "true");
  notify();
}

export function clearGuestMode() {
  localStorage.removeItem(GUEST_KEY);
  notify();
}

export function setGuestInterests(interests) {
  localStorage.setItem(GUEST_INTERESTS_KEY, JSON.stringify(interests));
}

export function getGuestInterests() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_INTERESTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function subscribeGuest(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}