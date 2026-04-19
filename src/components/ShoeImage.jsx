import { useState } from "react";

// Stable Unsplash shoe photos to cycle through as fallbacks
const SHOE_FALLBACKS = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=500&h=500&fit=crop",
];

function stableFallback(brand, name) {
  const key = (`${brand}${name}`).length;
  return SHOE_FALLBACKS[key % SHOE_FALLBACKS.length];
}

export default function ShoeImage({ brand, name, size = 400, className = "", alt }) {
  const [failed, setFailed] = useState(false);

  const primary = `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=${size}&h=${size}&fit=crop`;
  const fallback = stableFallback(brand, name);

  return (
    <img
      src={failed ? fallback : primary}
      alt={alt || `${brand || ""} ${name || ""}`.trim()}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}