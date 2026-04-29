import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Star, X, TrendingDown, Trophy, GitCompare,
  RefreshCw, Loader2, ExternalLink, CheckCircle, XCircle, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getCompareShoes, clearCompare, subscribeCompare, toggleCompare } from "../lib/compareStore";
import { getPlan, getLimits } from "../lib/planStore";
import PlanGate from "../components/PlanGate";
import ShoeImage from "../components/ShoeImage";

// ─── Static rows from catalog data ───────────────────────────────────────────
const CATALOG_ROWS = [
  { label: "Brand", key: "brand" },
  { label: "Category", key: "category" },
  { label: "Gender", key: "gender" },
  {
    label: "Our Price",
    key: "price",
    render: (v) => (v ? `$${v}` : "—"),
    highlight: "lowest",
  },
  {
    label: "Original Price",
    key: "original_price",
    render: (v) => (v ? `$${v}` : "—"),
  },
  {
    label: "Discount",
    key: "_discount",
    derived: (shoe) =>
      shoe.original_price > shoe.price
        ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
        : 0,
    render: (v) => (v > 0 ? `${v}% off` : "—"),
    highlight: "highest",
  },
  {
    label: "Rating",
    key: "rating",
    render: (v) =>
      v ? (
        <span className="flex items-center gap-1 justify-center">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 inline" />
          {v}
        </span>
      ) : "—",
    highlight: "highest",
  },
  {
    label: "Colorway",
    key: "colorway",
    render: (v) => v || "—",
  },
  {
    label: "Available Colors",
    key: "colors_available",
    render: (v) =>
      v?.length ? (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.map((c) => (
            <span key={c} className="text-[11px] px-2 py-0.5 bg-secondary rounded-full">{c}</span>
          ))}
        </div>
      ) : "—",
  },
  {
    label: "Sizes Available",
    key: "sizes_available",
    render: (v) => (v?.length ? v.join(", ") : "—"),
  },
  {
    label: "Features",
    key: "features",
    render: (v) =>
      v?.length ? (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.map((f) => (
            <span key={f} className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{f}</span>
          ))}
        </div>
      ) : "—",
  },
  {
    label: "Release Date",
    key: "release_date",
    render: (v) => v || "—",
  },
  {
    label: "Trending",
    key: "is_trending",
    render: (v) => (v ? "🔥 Yes" : "No"),
  },
];

// ─── Live rows (from AI enrichment) ──────────────────────────────────────────
const LIVE_ROWS = [
  { label: "Current Market Price", key: "market_price", highlight: "lowest" },
  { label: "Lowest Price Found", key: "lowest_price", highlight: "lowest" },
  { label: "Best Retailer", key: "best_retailer" },
  { label: "In Stock Online", key: "in_stock_online", render: (v) => v === true ? <span className="flex items-center gap-1 justify-center text-green-600"><CheckCircle className="w-3.5 h-3.5" />Yes</span> : v === false ? <span className="flex items-center gap-1 justify-center text-red-500"><XCircle className="w-3.5 h-3.5" />No</span> : "—" },
  { label: "Colorways Available", key: "colorways_count", render: (v) => v ? `${v} colorways` : "—", highlight: "highest" },
  { label: "Resale Value", key: "resale_value" },
  { label: "Expert Rating", key: "expert_rating", highlight: "highest" },
  { label: "Verdict", key: "verdict" },
];

function getVal(shoe, row) {
  if (row.derived) return row.derived(shoe);
  return shoe[row.key];
}

function getBestIndex(shoes, row) {
  if (!row.highlight) return -1;
  const vals = shoes.map((s) => {
    const raw = row.live ? s[row.key] : getVal(s, row);
    if (typeof raw === "string") {
      const parsed = parseFloat(raw.replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    }
    return typeof raw === "number" ? raw : null;
  });
  if (vals.every((v) => v === null)) return -1;
  const nonNull = vals.filter((v) => v !== null);
  const target = row.highlight === "lowest" ? Math.min(...nonNull) : Math.max(...nonNull);
  return vals.findIndex((v) => v === target);
}

export default function Compare() {
  const navigate = useNavigate();
  const [shoes, setShoes] = useState(getCompareShoes());
  const [liveData, setLiveData] = useState({});   // { [shoeId]: enriched object }
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const limits = getLimits();

  useEffect(() => subscribeCompare(setShoes), []);

  const maxCompare = limits.compareMax || 2;
  const visibleShoes = getPlan() === "free" ? shoes.slice(0, maxCompare) : shoes;
  const isPlanLocked = getPlan() === "free" && shoes.length > maxCompare;

  const fetchLiveData = async () => {
    if (!visibleShoes.length) return;
    setLoadingLive(true);
    setLiveLoaded(false);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a shoe market data expert. For EACH of the following shoes, search the web RIGHT NOW and provide accurate, up-to-date information.

Shoes to research:
${visibleShoes.map((s, i) => `${i + 1}. ${s.brand} ${s.name} (catalog price: $${s.price})`).join("\n")}

For each shoe return:
- shoe_index: number (1-based)
- market_price: current typical retail price as string e.g. "$130"
- lowest_price: lowest current price found online as string e.g. "$115"
- best_retailer: name of retailer with the best current price
- buy_url: direct URL to buy (prefer official brand site or Nike/Adidas/StockX/GOAT/Zappos/FootLocker)
- in_stock_online: boolean — is it currently in stock online?
- colorways_count: number of colorway options currently available
- resale_value: StockX/GOAT resale value if available, as string
- expert_rating: score out of 10 from expert reviews, as number
- verdict: one sentence expert verdict

Return data for ALL ${visibleShoes.length} shoes.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            shoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  shoe_index: { type: "number" },
                  market_price: { type: "string" },
                  lowest_price: { type: "string" },
                  best_retailer: { type: "string" },
                  buy_url: { type: "string" },
                  in_stock_online: { type: "boolean" },
                  colorways_count: { type: "number" },
                  resale_value: { type: "string" },
                  expert_rating: { type: "number" },
                  verdict: { type: "string" },
                },
              },
            },
          },
        },
      });

      const enriched = {};
      (res.shoes || []).forEach((d) => {
        const shoe = visibleShoes[d.shoe_index - 1];
        if (shoe) enriched[shoe.id] = d;
      });
      setLiveData(enriched);
    } catch (e) {
      console.error(e);
    }
    setLoadingLive(false);
    setLiveLoaded(true);
  };

  // Do NOT auto-fetch — user must click to avoid burning credits
  // useEffect(() => { if (visibleShoes.length > 0) fetchLiveData(); }, []);

  if (shoes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
          <GitCompare className="w-9 h-9 text-muted-foreground/40" />
        </div>
        <h2 className="font-heading font-bold text-2xl mb-2">Nothing to compare yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">Browse shoes and click "Compare" on any shoe to add it here.</p>
        <Link to="/search" className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-semibold hover:opacity-90">
          Browse Shoes
        </Link>
      </div>
    );
  }

  const bestValueIdx = visibleShoes.reduce(
    (bi, s, i) => (s.price < (visibleShoes[bi]?.price ?? Infinity) ? i : bi), 0
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl">Compare Shoes</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Live market data · Real prices · Expert verdicts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveData}
              disabled={loadingLive}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-semibold disabled:opacity-60"
            >
              {loadingLive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {loadingLive ? "Fetching live data…" : "Refresh Live Data"}
            </button>
            <button onClick={clearCompare} className="text-xs text-destructive hover:underline px-2">
              Clear all
            </button>
          </div>
        </div>

        {/* ── Plan lock banner ── */}
        {isPlanLocked && (
          <div className="mb-5">
            <PlanGate locked inline feature="Compare more than 2 shoes" description="Upgrade to Pro to compare up to 4 shoes at once" />
          </div>
        )}

        {/* ── Shoe header cards ── */}
        <div className={`grid gap-3 mb-6 ${visibleShoes.length === 2 ? "grid-cols-2" : visibleShoes.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
          {visibleShoes.map((shoe, i) => {
            const live = liveData[shoe.id];
            const isBest = i === bestValueIdx;
            const savings = shoe.original_price > shoe.price ? shoe.original_price - shoe.price : 0;
            return (
              <motion.div
                key={shoe.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl border-2 overflow-hidden ${isBest ? "border-green-400" : "border-border"} bg-card flex flex-row sm:flex-col items-center gap-3 p-3`}
              >
                {isBest && (
                  <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-[10px] text-center py-1 font-bold hidden sm:flex items-center justify-center gap-1">
                    <TrendingDown className="w-2.5 h-2.5" /> Best Value
                  </div>
                )}
                {/* Image — fixed small size, no aspect-square fill */}
                <div className="w-16 h-16 sm:w-full sm:h-28 flex-shrink-0 overflow-hidden rounded-xl bg-secondary/30 sm:mt-5">
                  <ShoeImage
                    src={shoe.image_url}
                    brand={shoe.brand}
                    name={shoe.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 sm:text-center sm:w-full">
                  {isBest && <p className="text-[10px] font-bold text-green-600 sm:hidden mb-0.5">★ Best Value</p>}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">{shoe.brand}</p>
                  <p className="font-heading font-semibold text-sm leading-tight line-clamp-2 mt-0.5">{shoe.name}</p>
                  <p className="font-heading font-bold text-base sm:text-xl mt-1 text-primary">${shoe.price}</p>
                  {savings > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium hidden sm:block">Save ${savings}</p>
                  )}
                  <div className="flex gap-1.5 mt-2 sm:flex-col">
                    {live?.buy_url ? (
                      <a
                        href={live.buy_url.startsWith("http") ? live.buy_url : `https://www.google.com/search?q=${encodeURIComponent(shoe.brand + " " + shoe.name + " buy")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-[11px] bg-primary text-primary-foreground px-2 py-1.5 rounded-lg font-semibold hover:opacity-90 flex-1 sm:w-full"
                      >
                        <ExternalLink className="w-3 h-3" /> Buy
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(shoe.brand + " " + shoe.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-[11px] bg-secondary text-foreground px-2 py-1.5 rounded-lg font-semibold hover:bg-secondary/80 flex-1 sm:w-full"
                      >
                        <Globe className="w-3 h-3" /> Shop
                      </a>
                    )}
                    <button
                      onClick={() => toggleCompare(shoe)}
                      className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Price diff callout ── */}
        {visibleShoes.length >= 2 && (() => {
          const prices = visibleShoes.map(s => s.price).filter(Boolean);
          const diff = Math.max(...prices) - Math.min(...prices);
          if (diff <= 0) return null;
          const cheapest = visibleShoes.find(s => s.price === Math.min(...prices));
          const priciest = visibleShoes.find(s => s.price === Math.max(...prices));
          return (
            <div className="mb-6 bg-primary/5 border border-primary/10 rounded-2xl px-5 py-3 text-sm flex items-center gap-3">
              <TrendingDown className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                <strong>{cheapest?.name}</strong> is{" "}
                <span className="text-green-600 font-bold">${diff} cheaper</span> than <strong>{priciest?.name}</strong>
              </span>
            </div>
          );
        })()}

        {/* ── Live data section ── */}
        <div className="mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-bold text-base">Live Market Data</h2>
          {loadingLive && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {liveLoaded && !loadingLive && <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">● Live</span>}
        </div>
        <div className="overflow-x-auto mb-8 rounded-2xl border border-border">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="bg-secondary/60">
                <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4 w-40 uppercase tracking-wider">Spec</th>
                {visibleShoes.map((shoe) => (
                  <th key={shoe.id} className="py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {shoe.brand} {shoe.name.split(" ").slice(0, 2).join(" ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIVE_ROWS.map((row, ri) => {
                const enrichedShoes = visibleShoes.map(s => ({ ...s, ...(liveData[s.id] || {}) }));
                const bestIdx = getBestIndex(enrichedShoes, { ...row, live: true });
                return (
                  <tr key={row.key} className={ri % 2 === 0 ? "bg-background" : "bg-secondary/20"}>
                    <td className="py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">{row.label}</td>
                    {visibleShoes.map((shoe, si) => {
                      const d = liveData[shoe.id];
                      const val = d ? d[row.key] : undefined;
                      const display = loadingLive
                        ? <span className="inline-block w-16 h-3 bg-secondary animate-pulse rounded-full" />
                        : val !== undefined && val !== null
                          ? row.render ? row.render(val) : String(val)
                          : "—";
                      const isHighlighted = !loadingLive && bestIdx === si && val !== undefined && val !== null;
                      return (
                        <td key={shoe.id} className={`py-3 px-3 text-sm text-center ${isHighlighted ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-semibold" : ""}`}>
                          {display}
                          {isHighlighted && row.highlight === "lowest" && <span className="ml-1 text-[9px] text-green-600 font-bold">▼ Best</span>}
                          {isHighlighted && row.highlight === "highest" && <span className="ml-1 text-[9px] text-green-600 font-bold">▲ Best</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Catalog specs ── */}
        <div className="mb-2 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-bold text-base">Catalog Specs</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="bg-secondary/60">
                <th className="text-left text-xs font-semibold text-muted-foreground py-3 px-4 w-40 uppercase tracking-wider">Spec</th>
                {visibleShoes.map((shoe) => (
                  <th key={shoe.id} className="py-3 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {shoe.brand} {shoe.name.split(" ").slice(0, 2).join(" ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATALOG_ROWS.map((row, ri) => {
                const bestIdx = getBestIndex(visibleShoes, row);
                return (
                  <tr key={row.key} className={ri % 2 === 0 ? "bg-background" : "bg-secondary/20"}>
                    <td className="py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">{row.label}</td>
                    {visibleShoes.map((shoe, si) => {
                      const val = getVal(shoe, row);
                      const display = row.render ? row.render(val) : (val ?? "—");
                      const isHighlighted = bestIdx === si;
                      return (
                        <td key={shoe.id} className={`py-3 px-3 text-sm text-center ${isHighlighted ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-semibold" : ""}`}>
                          {display ?? "—"}
                          {isHighlighted && row.highlight === "lowest" && <span className="ml-1 text-[9px] text-green-600 font-bold">▼ Best</span>}
                          {isHighlighted && row.highlight === "highest" && <span className="ml-1 text-[9px] text-green-600 font-bold">▲ Best</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Add more shoes CTA ── */}
        {shoes.length < 4 && (
          <div className="mt-8 text-center">
            <Link to="/search" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
              <GitCompare className="w-4 h-4" />
              Add more shoes to compare ({shoes.length}/4)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}