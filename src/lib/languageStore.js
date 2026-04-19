/**
 * languageStore — global language preference.
 * Persists to localStorage and notifies subscribers on change.
 */

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "he", label: "עברית", flag: "🇮🇱", dir: "rtl" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  { code: "pt", label: "Português", flag: "🇧🇷", dir: "ltr" },
];

const KEY = "ushoe_language";
const listeners = new Set();

export function getLanguage() {
  const stored = localStorage.getItem(KEY);
  return LANGUAGES.find(l => l.code === stored) || LANGUAGES[0];
}

export function setLanguage(code) {
  localStorage.setItem(KEY, code);
  const lang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
  // Apply dir to document
  document.documentElement.dir = lang.dir;
  listeners.forEach(fn => fn(lang));
}

export function subscribeLanguage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Apply on load
const _initial = getLanguage();
document.documentElement.dir = _initial.dir;