import { useState } from "react";

export default function ShoeImage({ src, brand, name, className = "", alt }) {
  const isValid = src && src.includes("unsplash.com");
  const [failed, setFailed] = useState(!isValid);

  if (failed || !src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-secondary/60 ${className}`}>
        <span className="text-2xl">👟</span>
        <span className="font-heading font-bold text-xs text-primary">uShoe</span>
        <span className="text-[10px] text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || `${brand || ""} ${name || ""}`.trim()}
      onError={() => setFailed(true)}
      loading="lazy"
      className={className}
    />
  );
}