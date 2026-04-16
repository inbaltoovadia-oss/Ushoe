import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Globe, ImagePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import MatchScoreRing from "../components/MatchScoreRing";
import SkeletonCard from "../components/SkeletonCard";
import InterestPicker from "../components/InterestPicker";
import { getInterests, ALL_CATEGORIES } from "../lib/interestStore";
import { getCached, setCache } from "../lib/searchCache";

const CATEGORY_ICONS = {
  Running: "🏃", Basketball: "🏀", Soccer: "⚽", Tennis: "🎾",
  Training: "💪", Lifestyle: "✨", Casual: "👟", Walking: "🚶",
  Hiking: "🥾", Skateboarding: "🛹",
};

export default function Discover() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [webResults, setWebResults] = useState([]);
  const [aiExplanation, setAiExplanation] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [interests, setInterestsState] = useState(getInterests());
  const [selectedCategory, setSelectedCategory] = useState("");
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Upload immediately
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
  };

  const handleSearch = async (text) => {
    const q = text || (selectedCategory ? `Best ${selectedCategory} shoes` : query);
    if (!q.trim() && !imageUrl) return;
    const finalQ = q.trim() || (imageUrl ? "Find shoes matching this image" : "");
    setQuery(finalQ);
    setLoading(true);
    setResults(null);
    setWebResults([]);
    if (resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }

    // Check cache first (skip if image uploaded)
    if (!imageUrl) {
      const cached = getCached(finalQ);
      if (cached) {
        setResults(cached.results);
        setWebResults(cached.webResults);
        setAiExplanation(cached.summary);
        setLoading(false);
        await base44.entities.SearchHistory.create({ query: finalQ, results_count: cached.results.length });
        return;
      }
    }

    const allShoes = await base44.entities.Shoe.list("-trending_score", 50);

    const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a shoe recommendation AI. The user is looking for: "${finalQ}"
${selectedCategory ? `Category: ${selectedCategory}.` : ""}
${imageUrl ? "The user uploaded an image — identify the shoe style/type from it." : ""}

From the catalog below, pick up to 5 best matches (by index number):
${allShoes.map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} ${s.category}`).join("\n")}

Also pick 3 real shoes from the web (brand, name, price like "$120", short reason, and a buy URL).
Write a 1-2 sentence summary of what you found.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "recommendations": [{"index": 0, "match_score": 85, "explanation": "..."}],
  "web_picks": [{"brand": "Nike", "name": "...", "price": "$120", "reason": "...", "search_url": "https://..."}]
}`,
        add_context_from_internet: true,
        file_urls: imageUrl ? [imageUrl] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  match_score: { type: "number" },
                  explanation: { type: "string" },
                },
              },
            },
            web_picks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  brand: { type: "string" },
                  price: { type: "string" },
                  reason: { type: "string" },
                  search_url: { type: "string" },
                },
              },
            },
          },
        },
      });

    const recs = (aiResponse.recommendations || [])
      .filter((r) => r.index >= 0 && r.index < allShoes.length)
      .map((r) => ({ shoe: allShoes[r.index], match_score: r.match_score, explanation: r.explanation }));

    setResults(recs);
    setWebResults(aiResponse.web_picks || []);
    setAiExplanation(aiResponse.summary || "");
    setLoading(false);

    // Cache the result
    if (!imageUrl) {
      setCache(finalQ, { results: recs, webResults: aiResponse.web_picks || [], summary: aiResponse.summary || "" });
    }

    await base44.entities.SearchHistory.create({ query: finalQ, results_count: recs.length });
  };

  const handleInterestSave = (saved) => {
    setInterestsState(saved);
  };

  return (
    <div className="min-h-screen">
      {showInterestPicker && (
        <InterestPicker
          onClose={() => setShowInterestPicker(false)}
          onSave={handleInterestSave}
        />
      )}

      {/* Hero Input Section */}
      <section className="relative py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Globe className="w-4 h-4" />
                AI + Web Search
              </div>
              <button
                onClick={() => setShowInterestPicker(true)}
                className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium hover:bg-accent/20 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                My Interests
              </button>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl mb-3">
              What are you looking for?
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              Describe, upload a photo, or pick a category — AI searches the web for you
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {/* Category Quick Picks */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                  className={`text-sm px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {cat}
                </button>
              ))}
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="relative inline-block mb-4">
                <img src={imagePreview} alt="upload" className="h-20 w-20 rounded-2xl object-cover border-2 border-primary" />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {!imageUrl && <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
              </div>
            )}

            {/* Search Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
              <div className="flex items-center bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-lg shadow-primary/5">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={selectedCategory ? `Search ${selectedCategory} shoes…` : "I need comfortable running shoes under $160..."}
                  className="flex-1 bg-transparent border-none outline-none mx-3 text-base placeholder:text-muted-foreground/50"
                />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors mr-1"
                  title="Upload shoe image"
                >
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Results */}
      <div ref={resultsRef} />
      <AnimatePresence>
        {loading && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 animate-pulse text-primary" />
              <span className="text-muted-foreground">AI is searching the web for you…</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </motion.section>
        )}

        {results && !loading && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-10">
            {/* AI Summary */}
            {aiExplanation && (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">AI Web Summary</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{aiExplanation}</p>
                {webResults.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-primary/10">
                    {webResults.map((pick, i) => (
                      <a
                        key={i}
                        href={pick.search_url && pick.search_url.startsWith("http") ? pick.search_url : `https://www.google.com/search?q=${encodeURIComponent((pick.brand || "") + " " + (pick.name || "") + " buy")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-xs font-medium hover:border-primary/40 hover:text-primary transition-all"
                      >
                        <span className="text-muted-foreground">{pick.brand}</span>
                        <span className="text-foreground">{pick.name}</span>
                        {pick.price && <span className="text-primary font-semibold">{pick.price}</span>}
                        <span className="text-muted-foreground">→</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DB Results */}
            {results.length > 0 && (
              <div>
                <h2 className="font-heading font-bold text-xl mb-4">Best Matches In Our Catalog</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.map((result, i) => (
                    <motion.div key={result.shoe.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="relative">
                      <div className="absolute top-3 right-3 z-20">
                        <MatchScoreRing score={result.match_score} />
                      </div>
                      <ShoeCard shoe={result.shoe} index={i} />
                      <p className="text-xs text-muted-foreground italic mt-2 px-1">{result.explanation}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}


          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}