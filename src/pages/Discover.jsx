import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Globe, ImagePlus, X, Ruler, Trophy, Bell, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import MatchScoreRing from "../components/MatchScoreRing";
import SkeletonCard from "../components/SkeletonCard";
import InterestPicker from "../components/InterestPicker";
import { getInterests, ALL_CATEGORIES } from "../lib/interestStore";
import { getSizeLabel, subscribeSize, getSize } from "../lib/sizeStore";
import SizeSelector from "../components/SizeSelector";
import { getCached, setCache } from "../lib/searchCache";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { getUserProfile } from "../lib/userProfileStore";
import { buildPersonaSummary, rankShoes } from "../lib/personalizationEngine";
import { canSearch, incrementSearchCount, canUse, getPlan, getSearchesUsedToday, PLAN_LIMITS } from "../lib/planStore";

import PlanGate from "../components/PlanGate";
import ShoeProblemSolver from "../components/ShoeProblemSolver";
import ShoeImage from "../components/ShoeImage";
import { Link } from "react-router-dom";

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
  const [sizeLabel, setSizeLabel] = useState(getSizeLabel());
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [searchBlocked, setSearchBlocked] = useState(false);
  const [loc, setLoc] = useState(getLocation());
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => subscribeSize(() => setSizeLabel(getSizeLabel())), []);
  useEffect(() => subscribeLocation(setLoc), []);

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
    // Free plan search limit
    if (!canSearch()) {
      setSearchBlocked(true);
      return;
    }
    setSearchBlocked(false);
    incrementSearchCount();
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

    const [allShoes, userProfile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 100),
      getUserProfile(),
    ]);

    // Pre-rank catalog by personalization before sending to AI
    const rankedShoes = rankShoes(allShoes, userProfile, { limit: 80 });

    // Run catalog matching and web search in parallel with separate simple schemas
    const sizePref = getSize();
    const sizeNote = sizePref.us ? `The user's shoe size is US ${sizePref.us} (EU ${sizePref.eu}, UK ${sizePref.uk}). Prefer shoes available in this size.` : "";
    const personaSummary = buildPersonaSummary(userProfile);

    const catalogPrompt = `You are an expert shoe specialist AI. CRITICAL: Detect the language of the user's query and write your summary in that exact same language. The user is looking for: "${finalQ}"
${selectedCategory ? `Category: ${selectedCategory}.` : ""}
${imageUrl ? "The user uploaded an image — identify the shoe style/type from it." : ""}
${sizeNote}

USER PROFILE (use this to make picks more relevant):
${personaSummary}

From the catalog below (pre-ranked by relevance), pick up to 10 best matches by index number. Return diverse results across different brands, price ranges, and styles:
${rankedShoes.map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} ${s.category} trending=${s.is_trending ? "yes" : "no"} sizes:${(s.sizes_available||[]).join(",")}`).join("\n")}

Write a short 1-sentence expert summary of what you found and why these match the user.`;

    const loc = getLocation();
    const webPrompt = `Find 10 real shoes matching: "${finalQ}"${selectedCategory ? ` in category ${selectedCategory}` : ""} that are available to ship to ${loc.city}.
Return a DIVERSE set across different brands (Nike, Adidas, New Balance, etc.) and price points.
CRITICAL rules:
1. Only include retailers that ship to ${loc.city}.
2. For each shoe provide: brand (e.g. "Nike"), name (exact model name), price (as string like "$120"), retailer name, ships_to_user (true), is_best_deal (boolean — mark true for the SINGLE best value option considering price and availability, only ONE item should have this as true).
Return ONLY these fields — do not include any URLs.`;

    const [catalogResponse, webResponse] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: catalogPrompt,
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
          },
        },
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: webPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            web_picks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  brand: { type: "string" },
                  price: { type: "string" },
                  retailer: { type: "string" },
                  ships_to_user: { type: "boolean" },
                  is_best_deal: { type: "boolean" },
                },
              },
            },
          },
        },
      }),
    ]);

    const recs = (catalogResponse.recommendations || [])
      .filter((r) => r.index >= 0 && r.index < rankedShoes.length)
      .map((r) => ({ shoe: rankedShoes[r.index], match_score: r.match_score, explanation: r.explanation }));

    setResults(recs);
    // Only keep results that ship to user
    setWebResults((webResponse.web_picks || []).filter(p => p.ships_to_user !== false));
    setAiExplanation(catalogResponse.summary || "");
    setLoading(false);

    // Cache the result
    if (!imageUrl) {
      setCache(finalQ, { results: recs, webResults: webResponse.web_picks || [], summary: catalogResponse.summary || "" });
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
      <AnimatePresence>
        {showSizePicker && <SizeSelector onClose={() => setShowSizePicker(false)} />}
      </AnimatePresence>

      {/* Hero Input Section */}
      <section className="relative py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
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
              <button
                onClick={() => setShowSizePicker(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  sizeLabel
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Ruler className="w-4 h-4" />
                {sizeLabel ? `Size: ${sizeLabel}` : "Set My Size"}
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

            {/* Free plan search counter */}
            {getPlan() === "free" && (
              <div className="flex items-center justify-center gap-2 mb-3 text-xs text-muted-foreground">
                {(() => {
                  const used = getSearchesUsedToday();
                  const max = PLAN_LIMITS.free.aiSearchesPerDay;
                  const remaining = max - used;
                  return remaining > 0 ? (
                    <span>{remaining} of {max} free AI searches remaining today</span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      Daily limit reached — <Link to="/subscription" className="underline text-primary">Upgrade to Pro</Link> for unlimited
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Example Prompt Pills */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {[
                "Best running shoes under $150",
                "Comfortable white sneakers",
                "Nike basketball shoes size 11",
                "Lightweight hiking shoes",
                "Stylish shoes for work",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => { setQuery(prompt); handleSearch(prompt); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

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
                  dir={/[\u0590-\u05FF\u0600-\u06FF]/.test(query) ? "rtl" : "ltr"}
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

      {/* Shoe Problem Solver */}
      <ShoeProblemSolver />

      {/* Results */}
      <div ref={resultsRef} />
      {searchBlocked && (
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <PlanGate
            locked
            feature="Daily AI Search Limit Reached"
            description="Free plan allows 5 AI searches per day. Upgrade to Pro for unlimited searches."
          />
        </div>
      )}
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
              </div>
            )}

            {/* Web Picks */}
            {webResults.length > 0 && (
              <div>
                <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Also Found on the Web
                </h2>

                {/* Best Option — full-width prominent card */}
                {webResults.filter(p => p.is_best_deal).map((pick, i) => {
                  const searchQuery = encodeURIComponent(`${pick.brand || ""} ${pick.name || ""}`);
                  const url = `https://www.google.com/search?tbm=shop&q=${searchQuery}`;
                  return (
                    <motion.a
                      key={`best-${i}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex gap-4 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 mb-4 p-4"
                    >
                      <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-secondary">
                        <ShoeImage
                            brand={pick.brand}
                            name={pick.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                            <Trophy className="w-3 h-3" />
                            Best Option
                          </span>
                          <span className="text-[9px] font-bold text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400 px-2 py-0.5 rounded-full">
                            ✓ Ships to {loc.city}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{pick.brand}</p>
                        <p className="font-heading font-bold text-base group-hover:text-primary transition-colors line-clamp-1">{pick.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          {pick.price && <p className="text-primary font-bold text-xl">{pick.price}</p>}
                          <span className="text-xs text-muted-foreground">{pick.retailer} →</span>
                        </div>
                      </div>
                    </motion.a>
                  );
                })}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {webResults.filter(p => !p.is_best_deal).map((pick, i) => {
                    const searchQuery = encodeURIComponent(`${pick.brand || ""} ${pick.name || ""}`);
                    const url = `https://www.google.com/search?tbm=shop&q=${searchQuery}`;
                    return (
                      <motion.a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="group block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300"
                      >
                        <div className="relative aspect-square overflow-hidden bg-secondary/40">
                          <ShoeImage
                            brand={pick.brand}
                            name={pick.name}
                            size={400}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                            <span className="text-white text-[11px] font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                              Find on Google →
                            </span>
                          </div>
                          <div className="absolute top-2 left-2">
                            <span className="text-[9px] font-bold text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                              ✓ Ships to you
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{pick.brand}</p>
                          <p className="font-heading font-semibold text-xs mt-0.5 line-clamp-2 group-hover:text-primary transition-colors leading-tight">{pick.name}</p>
                          <div className="flex items-center justify-between mt-2">
                            {pick.price && <p className="text-primary font-bold text-sm">{pick.price}</p>}
                            {pick.retailer && <p className="text-[9px] text-muted-foreground truncate max-w-[50%] text-right">{pick.retailer}</p>}
                          </div>
                        </div>
                      </motion.a>
                    );
                  })}
                </div>

                {/* Soft premium prompt — price alerts */}
                {!canUse("priceAlerts") && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        <span className="font-semibold">Get notified when prices drop</span> — track these shoes and we'll alert you
                      </p>
                    </div>
                    <Link
                      to="/subscription"
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      Unlock Pro
                    </Link>
                  </motion.div>
                )}
              </div>
            )}

            {/* DB Results */}
            {results.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-bold text-xl">Best Matches In Our Catalog</h2>
                  <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">{results.length} match{results.length !== 1 ? "es" : ""} found</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.map((result, i) => (
                    <motion.div key={result.shoe.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="relative group">
                      <div className="absolute top-3 right-3 z-20">
                        <MatchScoreRing score={result.match_score} />
                      </div>
                      <ShoeCard shoe={result.shoe} index={i} />
                      {result.explanation && (
                        <div className="mt-2 mx-1 flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2">
                          <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{result.explanation}</p>
                        </div>
                      )}
                      <Link
                        to={`/shoe/${result.shoe.id}`}
                        className="mt-2 mx-1 flex items-center justify-center gap-2 w-[calc(100%-8px)] py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        Quick View
                      </Link>
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