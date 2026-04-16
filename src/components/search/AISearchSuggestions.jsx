import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATIC_SUGGESTIONS = [
  "Best running shoes under $150",
  "Nike Air Force 1 white",
  "Comfortable walking shoes for wide feet",
  "Adidas Ultraboost 2024",
  "Jordan 1 retro high",
  "New Balance 990",
  "Hoka Clifton lightweight",
  "Vans Old Skool classic",
];

export default function AISearchSuggestions({ query, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions(STATIC_SUGGESTIONS.filter(s => !query || s.toLowerCase().includes(query.toLowerCase())).slice(0, 5));
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate 5 smart autocomplete suggestions for the shoe search query: "${query}". 
Include variations, related models, and popular searches. Keep each suggestion under 8 words. Return only the suggestions as a JSON array of strings.`,
          response_json_schema: {
            type: "object",
            properties: {
              suggestions: { type: "array", items: { type: "string" } },
            },
          },
        });
        setSuggestions(res.suggestions || []);
      } catch {
        setSuggestions(STATIC_SUGGESTIONS.slice(0, 5));
      }
      setLoading(false);
    }, 400);
  }, [query]);

  if (!suggestions.length && !loading) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Finding suggestions…
        </div>
      ) : (
        suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            {s}
          </button>
        ))
      )}
    </div>
  );
}