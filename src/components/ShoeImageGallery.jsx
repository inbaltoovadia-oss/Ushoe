import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ShoeImage from "./ShoeImage";

export default function ShoeImageGallery({ shoe }) {
  // Build a small gallery from the main image + color hints
  const images = [shoe.image_url].filter(Boolean);
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-secondary/60 to-secondary/20 group">
        <ShoeImage
          src={images[current]}
          brand={shoe.brand}
          name={shoe.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        {/* Nav arrows — only if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-black/80 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-black/80 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-white w-4" : "bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}