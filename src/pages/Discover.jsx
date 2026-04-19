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
  const [allShoes, setAllShoes] = useState([]);
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
    if (!canSearch()) { setSearchBlocked(true); return; }
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

    // Load shoes in parallel with cache check
    const [allShoesData, userProfile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 60),
      getUserProfile(),
    ]);

    setAllShoes(allShoesData);
    const rankedShoes = rankShoes(allShoesData, userProfile, { limit: 50 });
    const sizePref = getSize();
    const sizeNote = sizePref.us ? `Size: US ${sizePref.us}` : "";
    const personaSummary = buildPersonaSummary(userProfile);

    const catalogPrompt = `Expert shoe AI. User wants: "${finalQ}"
${selectedCategory ? `Category: ${selectedCategory}.` : ""}
${sizeNote}

USER PROFILE: ${personaSummary}

Pick up to 8 UNIQUE shoes (no duplicates) from this catalog:
${rankedShoes.map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} ${s.category}`).join("\n")}

1-sentence summary:`;

    const currentLoc = getLocation();
    const webPrompt = `Find up to 10 DISTINCT shoe models matching: "${finalQ}"${selectedCategory ? ` in category ${selectedCategory}` : ""} available to buy online.

CRITICAL RULES - FOLLOW EXACTLY:
1. EACH shoe must be a completely DIFFERENT model from a DIFFERENT brand when possible. NO duplicates of the same shoe.
2. Match the brand EXACTLY to the shoe name - if searching for "Asics", show ONLY Asics shoes. If searching for "Adidas", show ONLY Adidas shoes. NEVER mix brands.
3. For each shoe, find the LOWEST price available across all retailers. Convert any foreign currency to USD and return the price in USD (e.g. "$120").
4. Mark is_best_deal: true for exactly ONE shoe — the single best value considering price, brand quality, and relevance. All others must be false.
5. If the search is broad (e.g. "running shoes"), return diverse models across different brands (Nike, Adidas, Asics, New Balance, etc.). If specific (e.g. "Nike Air Max 90"), return variants/colorways of that model only.
6. For each result return: brand (EXACT brand name), name (exact model name), price (cheapest USD price as string like "$120"), retailer (best price source), ships_to_user (true), is_best_deal (boolean), image_url (direct image URL of the shoe - must be a real product photo URL from the retailer or Google Shopping).

Example for "Asics running shoes":
- brand: "Asics", name: "Gel-Kayano 30", price: "$160", image_url: "https://...", ...
- brand: "Asics", name: "Gel-Nimbus 25", price: "$150", image_url: "https://...", ...
NOT Adidas, NOT Nike - ONLY Asics when user asks for Asics.`;

    const [catalogResponse, webResponse] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: catalogPrompt,
        file_urls: imageUrl ? [imageUrl] : undefined,
        model: "automatic",
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
        model: "gemini_3_flash",
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
                  image_url: { type: "string" },
                },
              },
            },
          },
        },
      }),
    ]);

    // Deduplicate catalog recommendations by index
    const seenIndices = new Set();
    const recs = (catalogResponse.recommendations || [])
      .filter((r) => {
        if (r.index < 0 || r.index >= rankedShoes.length) return false;
        if (seenIndices.has(r.index)) return false;
        seenIndices.add(r.index);
        return true;
      })
      .map((r) => ({ shoe: rankedShoes[r.index], match_score: r.match_score, explanation: r.explanation }));

    // Deduplicate web results by brand+name combination
    const seenWeb = new Set();
    const filteredWebResults = (webResponse.web_picks || []).filter((p) => {
      const key = `${(p.brand || "").toLowerCase()}-${(p.name || "").toLowerCase()}`;
      if (seenWeb.has(key)) return false;
      seenWeb.add(key);
      return true;
    });

    // Fallback: if AI didn't mark any best deal, mark the cheapest
    const hasBestDeal = filteredWebResults.some(p => p.is_best_deal);
    if (!hasBestDeal && filteredWebResults.length > 0) {
      const prices = filteredWebResults.map(p => parseFloat((p.price || "0").replace(/[^0-9.]/g, "")) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) filteredWebResults[minIdx] = { ...filteredWebResults[minIdx], is_best_deal: true };
    }

    setResults(recs);
    setWebResults(filteredWebResults);
    setAiExplanation(catalogResponse.summary || "");
    setLoading(false);

    if (!imageUrl) {
      setCache(finalQ, { results: recs, webResults: filteredWebResults, summary: catalogResponse.summary || "" });
    }

    await base44.entities.SearchHistory.create({ query: finalQ, results_count: recs.length });
  };

  const handleInterestSave = (saved) => setInterestsState(saved);

  return (
    <div className="min-h-screen">
      {showInterestPicker && (
        <InterestPicker onClose={() => setShowInterestPicker(false)} onSave={handleInterestSave} />
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
                  sizeLabel ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground"
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
                    selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {cat}
                </button>
              ))}
            </div>

            {imagePreview && (
              <div className="relative inline-block mb-4">
                <img src={imagePreview} alt="upload" className="h-20 w-20 rounded-2xl object-cover border-2 border-primary" />
                <button onClick={clearImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
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
                      <Link to="/subscription" className="underline text-primary">Upgrade to Pro for unlimited searches</Link>
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
                <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-xl hover:bg-secondary transition-colors mr-1" title="Upload shoe image">
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                </button>
                <button type="submit" disabled={loading} className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
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
          <PlanGate locked feature="Daily AI Search Limit Reached" description="Free plan allows 5 AI searches per day. Upgrade to Pro for unlimited searches." />
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

            {/* Web Results — Best Deal + Other Unique Models */}
            {webResults.length > 0 && (
              <div>
                <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Best Deals Found on the Web
                </h2>

                {(() => {
                  // Find the best deal
                  let bestPick = webResults.find(p => p.is_best_deal);
                  if (!bestPick && webResults.length > 0) {
                    const prices = webResults.map(p => parseFloat((p.price || "0").replace(/[^0-9.]/g, "")) || Infinity);
                    bestPick = webResults[prices.indexOf(Math.min(...prices))];
                  }

                  // Get other unique models (different brand+name from best pick)
                  const otherPicks = webResults
                    .filter(p => p !== bestPick)
                    .filter((p, idx, arr) => {
                      const key = `${(p.brand || "").toLowerCase()}-${(p.name || "").toLowerCase()}`;
                      return arr.findIndex(x => `${(x.brand || "").toLowerCase()}-${(x.name || "").toLowerCase()}` === key) === idx;
                    })
                    .slice(0, 5);

                  return (
                    <div className="space-y-4">
                      {/* Best Deal — Large Card */}
                      {bestPick && (() => {
                        // Try to find matching shoe in catalog for image fallback
                        const catalogMatch = allShoes.find(
                          s => s.brand.toLowerCase() === (bestPick.brand || "").toLowerCase() &&
                               s.name.toLowerCase().includes((bestPick.name || "").split(" ")[0].toLowerCase())
                        );
                        const fallbackShoe = catalogMatch || allShoes.find(s => s.brand.toLowerCase() === (bestPick.brand || "").toLowerCase());
                        const displayImage = bestPick.image_url || fallbackShoe?.image_url;

                        return (
                          <motion.a
                            href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${bestPick.brand} ${bestPick.name}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group block bg-gradient-to-r from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-900/10 border-2 border-green-500 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-1 transition-all duration-300 p-5"
                          >
                            <div className="flex gap-5">
                              <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-white relative">
                                {displayImage ? (
                                  <img
                                    src={displayImage}
                                    alt={`${bestPick.brand} ${bestPick.name}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={(e) => {
                                      e.currentTarget.src = `https://www.google.com/s2/favicons?domain=google.com&sz=128`;
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=google.com&sz=128`}
                                    alt="Search on Google"
                                    className="w-full h-full object-contain p-4"
                                  />
                                )}
                                {/* BEST DEAL Badge */}
                                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                  <Trophy className="w-2.5 h-2.5" />
                                  BEST DEAL
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{bestPick.brand}</span>
                                  <span className="text-[9px] font-bold text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400 px-2 py-0.5 rounded-full">
                                    ✓ Ships to {loc.city}
                                  </span>
                                </div>
                                <p className="font-heading font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">{bestPick.name}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  {bestPick.price && <p className="text-green-600 dark:text-green-400 font-bold text-2xl">{bestPick.price}</p>}
                                  {bestPick.retailer && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      at {bestPick.retailer} <span className="text-green-600">→</span>
                                    </span>
                                  )}
                                </div>
                                {!bestPick.image_url && (
                                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5" /> Click to see real photos and buy on Google
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.a>
                        );
                      })()}

                      {/* Other Unique Models — Grid */}
                      {otherPicks.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-3">Other models available:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            {otherPicks.map((pick, i) => {
                              // Try to find matching shoe in catalog for image fallback
                              const catalogMatch = allShoes.find(
                                s => s.brand.toLowerCase() === (pick.brand || "").toLowerCase() &&
                                     s.name.toLowerCase().includes((pick.name || "").split(" ")[0].toLowerCase())
                              );
                              const fallbackShoe = catalogMatch || allShoes.find(s => s.brand.toLowerCase() === (pick.brand || "").toLowerCase());
                              const displayImage = pick.image_url || fallbackShoe?.image_url;

                              return (
                                <motion.a
                                  key={i}
                                  href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${pick.brand} ${pick.name}`)}&tbm=isch`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  initial={{ opacity: 0, y: 16 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="group block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300"
                                >
                                  <div className="relative aspect-square overflow-hidden bg-white">
                                    {displayImage ? (
                                      <img
                                        src={displayImage}
                                        alt={`${pick.brand} ${pick.name}`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                          e.currentTarget.src = `https://www.google.com/s2/favicons?domain=google.com&sz=128`;
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={`https://www.google.com/s2/favicons?domain=google.com&sz=128`}
                                        alt="View on Google"
                                        className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                      <span className="text-white text-[10px] font-semibold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">
                                        See Photos →
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{pick.brand}</p>
                                    <p className="font-heading font-semibold text-xs mt-0.5 line-clamp-2 group-hover:text-primary transition-colors leading-tight">{pick.name}</p>
                                    {pick.price && <p className="text-primary font-bold text-sm mt-1.5">{pick.price}</p>}
                                  </div>
                                </motion.a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* DB Results */}
            {results.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-bold text-xl">Best Matches In Our Catalog</h2>
                  <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
                    {results.length} {results.length === 1 ? "match" : "matches"} found
                  </span>
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