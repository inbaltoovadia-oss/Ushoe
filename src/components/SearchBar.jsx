import { useState, useRef, useEffect } from "react";
import { Search, Mic, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const suggestions = [
  "Best running shoes under $150",
  "Comfortable walking sneakers",
  "Nike Air Jordan 1 Chicago",
  "Adidas Ultraboost for marathon",
  "Trendy streetwear shoes 2026",
  "Best basketball shoes for guards",
];

export default function SearchBar({ large = false, onSearch }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % suggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (onSearch) onSearch(query);
    else navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleChip = (text) => {
    setQuery(text);
    if (onSearch) onSearch(text);
    else navigate(`/search?q=${encodeURIComponent(text)}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div
          className={`relative flex items-center bg-card border transition-all duration-300 ${
            large ? "rounded-2xl px-6 py-4" : "rounded-xl px-4 py-3"
          } ${
            focused
              ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
              : "border-border hover:border-primary/30"
          }`}
        >
          <Search
            className={`text-muted-foreground flex-shrink-0 ${large ? "w-6 h-6" : "w-5 h-5"}`}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={suggestions[placeholderIdx]}
            className={`flex-1 bg-transparent border-none outline-none ml-3 placeholder:text-muted-foreground/60 text-foreground ${
              large ? "text-lg" : "text-sm"
            }`}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="p-1 mr-1">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button
            type="submit"
            className={`flex-shrink-0 bg-primary text-primary-foreground rounded-xl transition-all hover:opacity-90 ${
              large ? "px-5 py-2.5" : "px-4 py-2"
            }`}
          >
            <ArrowRight className={large ? "w-5 h-5" : "w-4 h-4"} />
          </button>
        </div>
      </form>

      {/* Suggestion Chips */}
      <AnimatePresence>
        {(focused || large) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-wrap gap-2 mt-3 justify-center"
          >
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleChip(s)}
                className="text-xs px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-full transition-all whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}