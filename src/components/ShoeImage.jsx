import { useState } from "react";

const BRAND_FALLBACKS = {
  Nike: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  Adidas: "https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=600&q=80",
  "Adidas Samba": "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&q=80",
  Jordan: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&q=80",
  Puma: "https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=600&q=80",
  "New Balance": "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80",
  Converse: "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&q=80",
  Vans: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80",
  Hoka: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  Asics: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80",
  Reebok: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80",
};

const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80";

function getBrandFallback(brand, name) {
  if (!brand) return DEFAULT_FALLBACK;
  const bl = brand.toLowerCase();
  const nl = (name || "").toLowerCase();
  if (bl === "adidas" && nl.includes("samba")) return BRAND_FALLBACKS["Adidas Samba"];
  const exact = Object.keys(BRAND_FALLBACKS).find(k => k.toLowerCase() === bl);
  if (exact) return BRAND_FALLBACKS[exact];
  const prefix = Object.keys(BRAND_FALLBACKS).find(k => bl.startsWith(k.toLowerCase()));
  if (prefix) return BRAND_FALLBACKS[prefix];
  return DEFAULT_FALLBACK;
}

export default function ShoeImage({ src, brand, name, className = "", alt }) {
  const buildSources = () => {
    const s = [];
    if (src && src.startsWith("http")) s.push(src);
    const brandFb = getBrandFallback(brand, name);
    if (!s.includes(brandFb)) s.push(brandFb);
    if (!s.includes(DEFAULT_FALLBACK)) s.push(DEFAULT_FALLBACK);
    return s;
  };

  const [sources] = useState(buildSources);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const currentSrc = sources[idx];

  const handleError = () => {
    if (idx < sources.length - 1) setIdx(i => i + 1);
  };

  return (
    <>
      {!loaded && (
        <div className={`bg-gradient-to-br from-secondary via-secondary/60 to-secondary animate-pulse ${className}`} />
      )}
      <img
        key={currentSrc}
        src={currentSrc}
        alt={alt || `${brand || ""} ${name || ""}`.trim()}
        onError={handleError}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        className={`${className} ${!loaded ? "opacity-0 absolute" : "opacity-100"}`}
      />
    </>
  );
}