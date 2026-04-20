import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ImageOff, RefreshCw, CheckCircle, Lock, Unlock, Loader2, Pencil } from "lucide-react";
import ImagePicker from "./ImagePicker";

export default function ImageManager() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickerShoe, setPickerShoe] = useState(null);
  const [filter, setFilter] = useState("all"); // all | locked | unlocked | missing

  useEffect(() => { loadShoes(); }, []);

  const loadShoes = async () => {
    setLoading(true);
    const all = await base44.entities.Shoe.list("-created_date", 100);
    setShoes(all);
    setLoading(false);
  };

  const handleSaved = (updated) => {
    setShoes(prev => prev.map(s => s.id === updated.id ? updated : s));
    setPickerShoe(null);
  };

  const unlockImage = async (shoe) => {
    await base44.entities.Shoe.update(shoe.id, { image_locked: false });
    setShoes(prev => prev.map(s => s.id === shoe.id ? { ...s, image_locked: false } : s));
  };

  const hasImage = (shoe) => shoe.image_url && shoe.image_url.startsWith("http");

  const filtered = shoes.filter(shoe => {
    if (filter === "locked") return shoe.image_locked;
    if (filter === "unlocked") return !shoe.image_locked && hasImage(shoe);
    if (filter === "missing") return !hasImage(shoe);
    return true;
  });

  const lockedCount = shoes.filter(s => s.image_locked).length;
  const missingCount = shoes.filter(s => !hasImage(s)).length;
  const unlockedCount = shoes.filter(s => !s.image_locked && hasImage(s)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Total" value={shoes.length} onClick={() => setFilter("all")} active={filter === "all"} />
        <StatBox label="Locked ✓" value={lockedCount} color="green" onClick={() => setFilter("locked")} active={filter === "locked"} />
        <StatBox label="Unlocked" value={unlockedCount} color="blue" onClick={() => setFilter("unlocked")} active={filter === "unlocked"} />
        <StatBox label="Missing" value={missingCount} color="amber" onClick={() => setFilter("missing")} active={filter === "missing"} />
      </div>

      {/* Shoe List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No shoes in this category.</p>
        )}
        {filtered.map(shoe => (
          <div key={shoe.id} className={`flex items-center gap-3 p-3 bg-card border rounded-xl transition-all ${
            shoe.image_locked ? "border-green-400/40 bg-green-50/30 dark:bg-green-950/10" : "border-border"
          }`}>
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
              {hasImage(shoe) ? (
                <img src={shoe.image_url} alt={shoe.name} className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{shoe.name}</p>
                {shoe.image_locked && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{shoe.brand} · {shoe.category}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {shoe.image_locked && (
                <button
                  onClick={() => unlockImage(shoe)}
                  title="Unlock to allow auto-replacement"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <Unlock className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setPickerShoe(shoe)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Pencil className="w-3.5 h-3.5" />
                {shoe.image_locked ? "Change" : "Pick Image"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={loadShoes}
          className="flex items-center gap-1.5 text-xs px-3 py-2 border border-border rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Image Picker Modal */}
      {pickerShoe && (
        <ImagePicker
          shoe={pickerShoe}
          onSaved={handleSaved}
          onClose={() => setPickerShoe(null)}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color, onClick, active }) {
  const colorMap = {
    green: "text-green-700 dark:text-green-400",
    blue: "text-blue-700 dark:text-blue-400",
    amber: "text-amber-700 dark:text-amber-400",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-4 text-center transition-all border ${
        active ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "bg-card border-border hover:border-primary/40"
      }`}
    >
      <p className={`text-2xl font-heading font-bold ${colorMap[color] || "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </button>
  );
}