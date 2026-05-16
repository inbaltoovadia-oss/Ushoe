import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, ImagePlus, X, Ruler } from "lucide-react";
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
import LocationButton from "../components/LocationButton";

import { getUserProfile, invalidateProfileCache } from "../lib/userProfileStore";
import { buildPersonaSummary, rankShoes } from "../lib/personalizationEngine";
import { canSearch, incrementSearchCount, canUse, getPlan, getSearchesUsedToday, PLAN_LIMITS } from "../lib/planStore";
import PlanGate from "../components/PlanGate";
import ShoeProblemSolver from "../components/ShoeProblemSolver";
import { Link } from "react-router-dom";
import RecentlyViewed from "../components/RecentlyViewed";
import WebShoeSearch from "../components/WebShoeSearch";

const CATEGORY_ICONS = {
  Running: "🏃", Basketball: "🏀", Soccer: "⚽", Tennis: "🎾",
  Training: "💪", Lifestyle: "✨", Casual: "👟", Walking: "🚶",
  Hiking: "🥾", Skateboarding: "🛹",
};

export default function Discover() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
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
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState("");
  const [showBrandEditor, setShowBrandEditor] = useState(false);
  const [brandEdit, setBrandEdit] = useState("");
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => subscribeSize(() => setSizeLabel(getSizeLabel())), []);

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
    if (resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }

    // Check cache first (instant return)
    if (!imageUrl) {
      const cached = getCached(finalQ);
      if (cached) {
        setResults(cached.results);
        setAiExplanation(cached.summary || "");
        setLoading(false);
        base44.entities.SearchHistory.create({ query: finalQ, results_count: cached.results.length }).catch(() => {});
        return;
      }
    }

    // Run catalog expansion + user profile in parallel (fast)
    // Fall back to direct DB fetch if function fails
    const [catalogRes, userProfile] = await Promise.allSettled([
      base44.functions.invoke('expandCatalogSearch', { query: finalQ, category: selectedCategory, limit: 80 }),
      getUserProfile(),
    ]);

    let allShoesData = [];
    if (catalogRes.status === 'fulfilled') {
      allShoesData = catalogRes.value?.data?.shoes || [];
    }
    // Fallback: load directly from DB if function failed or returned nothing
    if (allShoesData.length === 0) {
      try {
        allShoesData = await base44.entities.Shoe.list('-trending_score', 80);
      } catch {}
    }
    setAllShoes(allShoesData);

    // Show partial catalog results instantly using local scoring (no extra LLM call)
    const sizePref = getSize();
    const resolvedProfile = userProfile.status === 'fulfilled' ? userProfile.value : null;
    const personaSummary = buildPersonaSummary(resolvedProfile);

    // Quick local filter + rank for instant display
    const qLower = finalQ.toLowerCase();
    const quickMatches = allShoesData
      .map(s => {
        let score = 0;
        if ((s.name || '').toLowerCase().includes(qLower)) score += 100;
        if ((s.brand || '').toLowerCase().includes(qLower)) score += 80;
        if ((s.category || '').toLowerCase().includes(qLower)) score += 60;
        if ((s.colorway || '').toLowerCase().includes(qLower)) score += 40;
        if (selectedCategory && s.category === selectedCategory) score += 50;
        score += (s.trending_score || 0) * 0.1;
        return { shoe: s, match_score: Math.min(99, 40 + score), explanation: null };
      })
      .filter(r => r.match_score > 40)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 8);

    // Show quick results immediately
    if (quickMatches.length > 0) {
      setResults(quickMatches);
      setAiExplanation(`Showing best matches for "${finalQ}"`);
      setLoading(false);
    }

    // Refine catalog results with AI in background (improves quality)
    const refinePromise = (async () => {
      if (imageUrl || allShoesData.length === 0) return null;
      const rankedShoes = allShoesData.slice(0, 60);
      const sizeNote = sizePref.us ? `Size: US ${sizePref.us}` : "";
      const catalogPrompt = `Expert shoe AI. User wants: "${finalQ}"
${selectedCategory ? `Category: ${selectedCategory}.` : ""}
${sizeNote}
USER PROFILE: ${personaSummary}

Pick up to 8 UNIQUE best-matching shoes from this catalog:
${rankedShoes.map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} ${s.category}`).join("\n")}

1-sentence summary of why these match:`;

      return base44.integrations.Core.InvokeLLM({
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
      });
    })();

    const [catalogResponse] = await Promise.allSettled([refinePromise]);

    // Apply refined catalog results if available
    if (catalogResponse.status === 'fulfilled' && catalogResponse.value) {
      const cr = catalogResponse.value;
      const seenIndices = new Set();
      const recs = (cr.recommendations || [])
        .filter((r) => {
          if (r.index < 0 || r.index >= allShoesData.length) return false;
          if (seenIndices.has(r.index)) return false;
          if ((r.match_score || 0) < 10) return false;
          seenIndices.add(r.index);
          return true;
        })
        .map((r) => ({ shoe: allShoesData[r.index], match_score: r.match_score, explanation: r.explanation }));

      if (recs.length > 0) {
        setResults(recs);
        setAiExplanation(cr.summary || "");
      }

      // Cache full results
      const finalRecs = recs.length > 0 ? recs : quickMatches;
      if (!imageUrl) {
        setCache(finalQ, { results: finalRecs, summary: cr.summary || "" });
      }
    }

    setLoading(false);

    base44.entities.SearchHistory.create({ query: finalQ, results_count: (results || quickMatches).length }).catch(() => {});
  };

  const handleInterestSave = (saved) => setInterestsState(saved);

  const loadSuggestions = (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    // Local suggestions from catalog data + static patterns — zero credits
    const qLower = q.toLowerCase();
    const local = [];
    const BRANDS = ["Nike", "Adidas", "Jordan", "New Balance", "Puma", "Converse", "Vans", "Hoka", "Asics", "Reebok", "Saucony", "Brooks"];
    const CATS = ["Running", "Basketball", "Casual", "Training", "Lifestyle", "Walking", "Hiking"];
    const PROMPTS = [
      `Best ${q} shoes`, `${q} shoes under $150`, `${q} shoes for men`, `${q} shoes for women`,
      `Top rated ${q}`, `Comfortable ${q} shoes`,
    ];
    BRANDS.forEach(b => { if (b.toLowerCase().startsWith(qLower)) local.push({ text: `${b} shoes`, icon: "👟", type: "brand" }); });
    CATS.forEach(c => { if (c.toLowerCase().startsWith(qLower)) local.push({ text: `Best ${c} shoes`, icon: "🏃", type: "category" }); });
    PROMPTS.slice(0, 4).forEach(p => local.push({ text: p, icon: "✨", type: "suggestion" }));
    setSuggestions(local.slice(0, 6));
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowSuggestions(true);
    loadSuggestions(val);
  };

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch(suggestion.text);
  };

  return (
    <div className="min-h-screen">
      {showInterestPicker && (
        <InterestPicker onClose={() => setShowInterestPicker(false)} onSave={handleInterestSave} />
      )}
      <AnimatePresence>
        {showSizePicker && <SizeSelector onClose={() => setShowSizePicker(false)} />}
      </AnimatePresence>

      {/* Budget Editor Modal */}
      <AnimatePresence>
        {showBudgetEditor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBudgetEditor(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            >
              <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-6">
                <h3 className="font-heading font-bold text-lg mb-4">Set Your Budget</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={budgetEdit}
                    onChange={(e) => setBudgetEdit(e.target.value)}
                    placeholder="Max budget (USD)"
                    className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBudgetEditor(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const user = await base44.auth.me();
                      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
                      const data = { budget_max: budgetEdit ? parseFloat(budgetEdit) : undefined };
                      if (profiles.length > 0) {
                        await base44.entities.UserProfile.update(profiles[0].id, data);
                      } else {
                        await base44.entities.UserProfile.create(data);
                      }
                      invalidateProfileCache();
                      setShowBudgetEditor(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Brand Editor Modal */}
      <AnimatePresence>
        {showBrandEditor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBrandEditor(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            >
              <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-6 max-h-[85dvh] overflow-y-auto">
                <h3 className="font-heading font-bold text-lg mb-4">Favorite Brands</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Nike", "Adidas", "Jordan", "New Balance", "Puma", "Converse", "Vans", "Hoka", "Asics", "Reebok", "Saucony", "Brooks"].map(b => (
                    <button
                      key={b}
                      onClick={() => setBrandEdit(prev => prev.includes(b) ? prev.filter(v => v !== b) : [...prev, b])}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        brandEdit.includes(b) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBrandEditor(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const user = await base44.auth.me();
                      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
                      const data = { preferred_brands: brandEdit };
                      if (profiles.length > 0) {
                        await base44.entities.UserProfile.update(profiles[0].id, data);
                      } else {
                        await base44.entities.UserProfile.create(data);
                      }
                      invalidateProfileCache();
                      setShowBrandEditor(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Input Section */}
      <section className="relative py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI-Powered Search
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
              <button
                onClick={() => setShowBudgetEditor(true)}
                className="inline-flex items-center gap-2 bg-secondary text-muted-foreground hover:text-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                💰 Budget
              </button>
              <button
                onClick={() => setShowBrandEditor(true)}
                className="inline-flex items-center gap-2 bg-secondary text-muted-foreground hover:text-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                ⭐ Brands
              </button>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl mb-3">
              What are you looking for?
            </h1>
            <p className="text-muted-foreground text-lg mb-4">
              Describe, upload a photo, or pick a category — AI finds your perfect match
            </p>
            <div className="flex justify-center mb-4">
              <LocationButton compact />
            </div>
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

            {/* Search Input with Smart Suggestions */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
              <div className="flex items-center bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-lg shadow-primary/5">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={selectedCategory ? `Search ${selectedCategory} shoes…` : "I need comfortable running shoes under $160..."}
                  className="flex-1 bg-transparent border-none outline-none mx-3 text-base placeholder:text-muted-foreground/50"
                  dir={/[\u0590-\u05FF\u0600-\u06FF]/.test(query) ? "rtl" : "ltr"}
                  autoComplete="off"
                />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-xl hover:bg-secondary transition-colors mr-1" title="Upload shoe image">
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                </button>
                <button type="submit" disabled={loading} className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>

              {/* Smart Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full mt-2 left-0 right-0 z-50 bg-card border border-border rounded-2xl overflow-hidden shadow-lg"
                >
                  <div className="space-y-1 p-2">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectSuggestion(sug)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-sm"
                      >
                        <span className="text-lg">{sug.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">{sug.text}</p>
                          <p className="text-xs text-muted-foreground capitalize">{sug.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      {/* Recently Viewed */}
      <RecentlyViewed />

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
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Finding best matches in catalog…</span>
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
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">AI Summary</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{aiExplanation}</p>
              </div>
            )}

            {/* No results */}
            {results.length === 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 py-4 px-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl">
                  <span className="text-xl">👟</span>
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">No matching shoes found in our catalog. Try a different search.</p>
                </div>
                <WebShoeSearch query={query} />
              </div>
            )}
            {results.length > 0 && (
              <div className="space-y-10">
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
                {/* Also search the web for this shoe */}
                <WebShoeSearch query={query} />
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}