/**
 * Shoe Rotation Planner — weekly calendar with catalog-driven recommendations.
 * Zero API credits: pure catalog data + localStorage.
 */
import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, Shuffle, CheckCircle, Lightbulb, Star, Dumbbell, Briefcase, Umbrella, Sun, Moon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeImage from "../components/ShoeImage";
import { Link } from "react-router-dom";
import { getCollections } from "../lib/collectionsStore";

const STORAGE_KEY = "ushoe_rotation_v2";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const OCCASIONS = [
  { id: "gym",      label: "Gym / Workout", icon: Dumbbell,  color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/30",    hint: "Training, Running" },
  { id: "work",     label: "Work / Office",  icon: Briefcase, color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30",  hint: "Casual, Lifestyle" },
  { id: "casual",   label: "Casual Day",     icon: Sun,       color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/30",hint: "Casual, Lifestyle" },
  { id: "running",  label: "Running",        icon: Star,      color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/30",hint: "Running" },
  { id: "rainy",    label: "Rainy Day",      icon: Umbrella,  color: "text-slate-600",  bg: "bg-slate-100 dark:bg-slate-800/30",hint: "Hiking, Walking" },
  { id: "evening",  label: "Evening / Out",  icon: Moon,      color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30",hint: "Lifestyle" },
  { id: "rest",     label: "Rest / Home",    icon: CheckCircle,color:"text-teal-500",   bg: "bg-teal-50 dark:bg-teal-950/30",  hint: "Sandals, Slides" },
];

const OCCASION_CATEGORIES = {
  gym:     ["Training", "Running"],
  work:    ["Casual", "Lifestyle", "Walking"],
  casual:  ["Casual", "Lifestyle", "Skateboarding"],
  running: ["Running"],
  rainy:   ["Hiking", "Walking"],
  evening: ["Lifestyle", "Casual"],
  rest:    ["Sandals", "Slides", "Flip Flops", "Crocs & Clogs"],
};

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// Count how many times a shoe appears in the rotation
function getWearCounts(rotation) {
  const counts = {};
  Object.values(rotation).forEach(day => {
    if (day.shoeId) counts[day.shoeId] = (counts[day.shoeId] || 0) + 1;
  });
  return counts;
}

export default function ShoeRotation() {
  const [rotation, setRotation] = useState(load());
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickingDay, setPickingDay] = useState(null); // index of day being edited
  const [tab, setTab] = useState("week"); // "week" | "ideal3" | "ideal5"

  useEffect(() => {
    base44.entities.Shoe.list("-trending_score", 80).then(all => {
      setShoes(all);
      setLoading(false);
    });
  }, []);

  const shoeMap = Object.fromEntries(shoes.map(s => [s.id, s]));
  const wearCounts = getWearCounts(rotation);

  const setDay = (dayIdx, shoeId, occasionId) => {
    const next = { ...rotation, [dayIdx]: { shoeId, occasionId } };
    setRotation(next);
    save(next);
  };

  const clearDay = (dayIdx) => {
    const next = { ...rotation };
    delete next[dayIdx];
    setRotation(next);
    save(next);
  };

  // Auto-fill missing days with smart suggestions
  const autoFill = () => {
    const next = { ...rotation };
    DAYS.forEach((_, i) => {
      if (next[i]?.shoeId) return;
      const defaultOcc = i < 5 ? (i % 2 === 0 ? "work" : "casual") : (i === 5 ? "casual" : "rest");
      const cats = OCCASION_CATEGORIES[defaultOcc] || ["Casual"];
      const candidates = shoes.filter(s => cats.includes(s.category)).sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));
      // prefer shoes not already heavily used
      const ranked = candidates.sort((a, b) => (wearCounts[a.id] || 0) - (wearCounts[b.id] || 0));
      if (ranked.length > 0) next[i] = { shoeId: ranked[0].id, occasionId: defaultOcc };
    });
    setRotation(next);
    save(next);
  };

  // Ideal rotation builders
  const buildIdealRotation = (n) => {
    const picks = [];
    const categories = n === 3
      ? [["Running"], ["Casual", "Lifestyle"], ["Training"]]
      : [["Running"], ["Casual", "Lifestyle"], ["Training"], ["Basketball", "Lifestyle"], ["Sandals", "Slides", "Walking"]];
    categories.forEach(cats => {
      const c = shoes.find(s => cats.includes(s.category) && !picks.some(p => p.id === s.id));
      if (c) picks.push(c);
    });
    return picks;
  };

  const categories = [...new Set(shoes.map(s => s.category).filter(Boolean))];
  const missingCategories = ["Running", "Casual", "Training"].filter(c => !shoes.some(s => s.category === c));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl">Shoe Rotation Planner</h1>
              <p className="text-sm text-muted-foreground">Plan your weekly footwear for longer shoe life</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={autoFill}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Shuffle className="w-4 h-4" />
              Auto-Fill Week
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: "week",   label: "📅 Weekly Plan" },
            { id: "ideal3", label: "👟 Ideal 3-Pair" },
            { id: "ideal5", label: "🏆 Ideal 5-Pair" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── WEEKLY CALENDAR ── */}
        {tab === "week" && (
          <div className="space-y-3">
            {DAYS.map((day, i) => {
              const entry = rotation[i];
              const shoe = entry?.shoeId ? shoeMap[entry.shoeId] : null;
              const occ = OCCASIONS.find(o => o.id === entry?.occasionId);
              const OccIcon = occ?.icon;
              const wearCount = shoe ? (wearCounts[shoe.id] || 0) : 0;

              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  {/* Top row: day label + action buttons */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-heading font-bold text-base leading-none">{DAY_SHORT[i]}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{day}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPickingDay(i)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground text-xs font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {shoe ? "Change" : "Assign"}
                      </button>
                      {shoe && (
                        <button onClick={() => clearDay(i)} className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: shoe info */}
                  {shoe ? (
                    <div className="flex items-center gap-3">
                      <Link to={`/shoe/${shoe.id}`} className="w-14 h-14 rounded-xl overflow-hidden bg-secondary flex-shrink-0 hover:opacity-80 transition-opacity">
                        <ShoeImage src={shoe.image_url} brand={shoe.brand} name={shoe.name} className="w-full h-full object-cover" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{shoe.brand}</p>
                        <p className="text-sm font-semibold truncate">{shoe.name}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {occ && (
                            <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${occ.bg} ${occ.color}`}>
                              {OccIcon && <OccIcon className="w-3 h-3" />}
                              {occ.label}
                            </div>
                          )}
                          {wearCount >= 3 && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full font-medium">
                              ⚠️ {wearCount}× this week
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No shoe assigned yet</p>
                  )}
                </motion.div>
              );
            })}

            {/* Wear balance tip */}
            {Object.values(wearCounts).some(c => c >= 3) && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-4 flex gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Wear Imbalance</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">One pair is used 3+ times this week. Rotate to extend shoe life and improve comfort.</p>
                </div>
              </div>
            )}

            {/* Missing category tip */}
            {shoes.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Rotation Tips</p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-0.5">
                    <li>• Let each pair rest 24h between uses to maintain shape</li>
                    <li>• Mix athletic & lifestyle shoes throughout the week</li>
                    <li>• Keep a waterproof option for rainy days</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── IDEAL 3-PAIR ── */}
        {tab === "ideal3" && (
          <IdealRotation shoes={buildIdealRotation(3)} title="Your Ideal 3-Shoe Rotation" description="A minimal, versatile setup covering your core needs." />
        )}

        {/* ── IDEAL 5-PAIR ── */}
        {tab === "ideal5" && (
          <IdealRotation shoes={buildIdealRotation(5)} title="Your Ideal 5-Shoe Rotation" description="Full coverage for every occasion throughout the week." />
        )}
      </div>

      {/* Shoe Picker Sheet */}
      <AnimatePresence>
        {pickingDay !== null && (
          <ShoePicker
            dayName={DAYS[pickingDay]}
            shoes={shoes}
            occasions={OCCASIONS}
            occasionCategories={OCCASION_CATEGORIES}
            currentEntry={rotation[pickingDay]}
            onSelect={(shoeId, occasionId) => {
              setDay(pickingDay, shoeId, occasionId);
              setPickingDay(null);
            }}
            onClose={() => setPickingDay(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function IdealRotation({ shoes, title, description }) {
  if (!shoes.length) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Add more shoes to get rotation recommendations.</p>
        <Link to="/search" className="mt-4 inline-flex items-center gap-2 text-primary font-medium hover:underline">Browse catalog →</Link>
      </div>
    );
  }
  const uses = ["Gym & Running", "Everyday Casual", "Work & Smart", "Evening & Style", "Outdoor & Weather"];
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="font-heading font-bold text-2xl">{title}</h2>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </div>
      {shoes.map((shoe, i) => (
        <motion.div
          key={shoe.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="bg-card border border-border rounded-2xl p-4 flex gap-4 items-center hover:shadow-md transition-shadow"
        >
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
            <ShoeImage src={shoe.image_url} brand={shoe.brand} name={shoe.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">#{i + 1}</span>
              <span className="text-xs text-muted-foreground">{uses[i] || shoe.category}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{shoe.brand}</p>
            <p className="font-semibold text-sm truncate">{shoe.name}</p>
            <p className="text-sm font-bold text-primary mt-0.5">${shoe.price}</p>
          </div>
          <Link to={`/shoe/${shoe.id}`} className="flex-shrink-0 px-3 py-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">
            View
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function ShoePicker({ dayName, shoes, occasions, occasionCategories, currentEntry, onSelect, onClose }) {
  const [selectedOcc, setSelectedOcc] = useState(currentEntry?.occasionId || "casual");
  const [selectedShoe, setSelectedShoe] = useState(currentEntry?.shoeId || null);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const cats = occasionCategories[selectedOcc] || [];
  const filtered = shoes.filter(s => cats.length === 0 || cats.includes(s.category)).slice(0, 20);
  const displayShoes = filtered.length ? filtered : shoes.slice(0, 12);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ height: "min(88dvh, 680px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top spacing */}
        <div className="pt-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
          <h3 className="font-heading font-bold text-lg">Pick for {dayName}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Occasion grid — wraps instead of horizontal scroll */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="grid grid-cols-4 gap-1.5">
            {occasions.map(occ => {
              const Icon = occ.icon;
              const active = selectedOcc === occ.id;
              return (
                <button
                  key={occ.id}
                  onClick={() => setSelectedOcc(occ.id)}
                  className={`flex flex-col items-center gap-1 px-1 py-2 rounded-xl text-[10px] font-medium transition-all border-2 leading-tight text-center ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="line-clamp-2">{occ.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border/60 mx-4 flex-shrink-0" />

        {/* Shoe list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">No exact matches — showing all shoes</p>
          )}
          {displayShoes.map(shoe => (
            <button
              key={shoe.id}
              onClick={() => setSelectedShoe(shoe.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border-2 ${
                selectedShoe === shoe.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-secondary"
              }`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                <ShoeImage src={shoe.image_url} brand={shoe.brand} name={shoe.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{shoe.brand} · {shoe.category}</p>
                <p className="text-sm font-semibold truncate">{shoe.name}</p>
                <p className="text-xs font-bold text-primary">${shoe.price}</p>
              </div>
              {selectedShoe === shoe.id && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* Sticky footer */}
        <div className="px-4 pb-6 pt-3 border-t border-border flex-shrink-0">
          <button
            disabled={!selectedShoe}
            onClick={() => selectedShoe && onSelect(selectedShoe, selectedOcc)}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
          >
            Assign to {dayName}
          </button>
        </div>
      </motion.div>
    </div>
  );
}