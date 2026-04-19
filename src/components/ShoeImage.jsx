import { useState } from "react";

// Curated Unsplash fallbacks — neutral shoe photos, not misleading
const FALLBACKS = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=600&h=600&fit=crop",
];

function stableFallback(brand = "", name = "") {
  const idx = (brand.charCodeAt(0) || 0) + (name.charCodeAt(0) || 0);
  return FALLBACKS[idx % FALLBACKS.length];
}

/**
 * ShoeImage — renders the shoe's stored image_url with a graceful neutral fallback.
 * Never shows Bing/Google scraped images (CORS blocked in browser).
 * Props:
 *   src      — the shoe's stored image_url (preferred)
 *   brand    — used to pick a stable fallback
 *   name     — used to pick a stable fallback
 *   size     — ignored (kept for API compat)
 *   className
 *   alt
 */
export default function ShoeImage({ src, brand, name, size = 400, className = "", alt }) {
  const [failed, setFailed] = useState(false);

  const primary = src || stableFallback(brand, name);
  const fallback = stableFallback(brand, name);

  return (
    <img
      src={failed ? fallback : primary}
      alt={alt || `${brand || ""} ${name || ""}`.trim()}
      onError={() => setFailed(true)}
      loading="lazy"
      className={className}
    />
  );
}