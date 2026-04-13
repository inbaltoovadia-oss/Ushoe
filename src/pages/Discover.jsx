import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import MatchScoreRing from "../components/MatchScoreRing";
import SkeletonCard from "../components/SkeletonCard";

const promptChips = [
  "Best running shoes under $150",
  "Stylish sneakers for work",
  "Comfortable walking shoes",
  "Basketball shoes for quick guards",
  "Trendy streetwear kicks",
  "Lightweight training shoes",
];

export default function Discover() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [aiExplanation, setAiExplanation] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (text) => {
    const q = text || query;
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setResults(null);

    const allShoes = await base44.entities.Shoe.list("-trending_score", 50);

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a shoe recommendation AI. The user is looking for: "${q}"
      
Here are the available shoes in our database:
${allShoes.map((s, i) => `${i}: ${s.brand} ${s.name} - $${s.price} - ${s.category} - Features: ${(s.features || []).join(", ")}`).join("\n")}

Return the top 5 most relevant shoes as indices, with a match score (0-100) and a brief 1-line explanation for each.
Also provide a short overall recommendation summary.`,
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
        },
      },
    });

    const recs = (aiResponse.recommendations || [])
      .filter((r) => r.index >= 0 && r.index < allShoes.length)
      .map((r) => ({
        shoe: allShoes[r.index],
        match_score: r.match_score,
        explanation: r.explanation,
      }));

    setResults(recs);
    setAiExplanation(aiResponse.summary || "");
    setLoading(false);

    await base44.entities.SearchHistory.create({ query: q, results_count: recs.length });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Input Section */}
      <section className="relative py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI Shoe Finder
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl mb-4">
              What are you looking for?
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Describe your ideal shoe and let AI find the perfect match
            </p>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="relative"
            >
              <div className="flex items-center bg-card border border-border rounded-2xl px-6 py-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-lg shadow-primary/5">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="I need comfortable running shoes under $160..."
                  className="flex-1 bg-transparent border-none outline-none ml-3 text-lg placeholder:text-muted-foreground/50"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-shrink-0 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>

            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {promptChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSearch(chip)}
                  className="text-sm px-4 py-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-full transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Results */}
      <AnimatePresence>
        {loading && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 pb-16"
          >
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">AI is analyzing your request...</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </motion.section>
        )}

        {results && !loading && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 pb-16"
          >
            {/* AI Summary */}
            {aiExplanation && (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">AI Recommendation</span>
                </div>
                <p className="text-foreground">{aiExplanation}</p>
              </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result, i) => (
                <motion.div
                  key={result.shoe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  {/* Match Score Badge */}
                  <div className="absolute top-3 right-3 z-20">
                    <MatchScoreRing score={result.match_score} />
                  </div>
                  <ShoeCard shoe={result.shoe} index={i} />
                  {/* AI Explanation */}
                  <div className="mt-2 px-2">
                    <p className="text-xs text-muted-foreground italic">
                      {result.explanation}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}