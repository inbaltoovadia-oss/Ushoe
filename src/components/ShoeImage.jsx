import { useState } from "react";

const DEFAULT_SHOE = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop";

// Generates a list of image sources to try in order for a given shoe name+brand
function getImageSources(brand, name, size = 400) {
  const q = encodeURIComponent(`${brand || ""} ${name || ""}`.trim());
  return [
    `https://tse1.mm.bing.net/th?q=${q}&w=${size}&h=${size}&c=7&rs=1&p=0&dpr=2&pid=1.7&mkt=en-US&adlt=moderate`,
    `https://tse2.mm.bing.net/th?q=${q}&w=${size}&h=${size}&c=7&rs=1&p=0&dpr=2&pid=1.7&mkt=en-US&adlt=moderate`,
    `https://tse3.mm.bing.net/th?q=${q}+shoe&w=${size}&h=${size}&c=7&rs=1&pid=1.7&mkt=en-US&adlt=moderate`,
  ];
}

export default function ShoeImage({ brand, name, size = 400, className = "", alt }) {
  const sources = getImageSources(brand, name, size);
  const [srcIndex, setSrcIndex] = useState(0);

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(i => i + 1);
    } else {
      // All sources failed — use default
      setSrcIndex(sources.length); // triggers default
    }
  };

  const src = srcIndex >= sources.length ? DEFAULT_SHOE : sources[srcIndex];

  return (
    <img
      src={src}
      alt={alt || `${brand} ${name}`}
      onError={handleError}
      className={className}
    />
  );
}