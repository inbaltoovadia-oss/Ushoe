import { useState } from "react";

const DEFAULT_SHOE = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop";

// Stable Unsplash shoe photos to cycle through as fallbacks
const SHOE_FALLBACKS = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=500&h=500&fit=crop",
];

// Pick a stable fallback based on the shoe name (consistent per shoe)
function stableFallback(brand, name) {
  const key = `${brand}${name}`.length;
  return SHOE_FALLBACKS[key % SHOE_FALLBACKS.length];
}

// Returns image sources to try in order: Bing (2 servers) → stable Unsplash fallback
function getSources(brand, name, size = 400) {
  const q = encodeURIComponent(`${brand || ""} ${name || ""} shoe`.trim());
  return [
    `https://tse1.mm.bing.net/th?q=${q}&w=${size}&h=${size}&c=7&rs=1&p=0&dpr=2&pid=1.7&mkt=en-US&adlt=moderate`,
    `https://tse4.mm.bing.net/th?q=${q}&w=${size}&h=${size}&c=7&rs=1&p=0&dpr=2&pid=1.7&mkt=en-US&adlt=moderate`,
    stableFallback(brand, name),
  ];
}

export default function ShoeImage({ brand, name, size = 400, className = "", alt }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const sources = getSources(brand, name, size);

  const handleError = () => {
    setSrcIndex(i => Math.min(i + 1, sources.length - 1));
  };

  return (
    <img
      src={sources[srcIndex]}
      alt={alt || `${brand || ""} ${name || ""}`.trim()}
      onError={handleError}
      className={className}
      crossOrigin="anonymous"
    />
  );
}