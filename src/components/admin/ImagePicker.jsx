import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Lock, RefreshCw, X, Star } from "lucide-react";

export default function ImagePicker({ shoe, onSaved, onClose }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchOptions = async () => {
    setLoading(true);
    setCandidates([]);
    setSelected(null);
    const res = await base44.functions.invoke("fetchShoeImageOptions", { shoe_id: shoe.id });
    setCandidates(res.data.candidates || []);
    setLoading(false);
    setFetched(true);
  };

  const saveSelection = async () => {
    if (!selected) return;
    setSaving(true);
    await base44.entities.Shoe.update(shoe.id, {
      image_url: selected.url,
      image_locked: true,
    });
    setSaving(false);
    onSaved({ ...shoe, image_url: selected.url, image_locked: true });
  };

  const confidenceColor = (c) => {
    if (c >= 0.9) return "text-green-600";
    if (c >= 0.7) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-xl">{shoe.name}</h2>
            <p className="text-sm text-muted-foreground">{shoe.brand} · {shoe.category}</p>
            {shoe.image_locked && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full mt-1">
                <Lock className="w-3 h-3" /> Image locked
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Current image */}
        <div className="px-6 py-4 border-b border-border">
          <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Current Image</p>
          <div className="flex items-center gap-4">
            <img
              src={shoe.image_url}
              alt={shoe.name}
              className="w-20 h-20 rounded-xl object-cover bg-secondary"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground break-all line-clamp-2">{shoe.image_url}</p>
              {!fetched && (
                <button
                  onClick={fetchOptions}
                  className="mt-2 flex items-center gap-2 text-sm px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Find Image Options
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="px-6 py-8 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Searching the web for {shoe.brand} {shoe.name} images…</p>
            <div className="grid grid-cols-4 gap-3 w-full mt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Candidates Grid */}
        {!loading && fetched && candidates.length > 0 && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Select the correct image:</p>
              <button
                onClick={fetchOptions}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh options
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {candidates.map((c, i) => {
                const isSelected = selected?.url === c.url;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(isSelected ? null : c)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all group ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="aspect-square bg-secondary">
                      <img
                        src={c.url}
                        alt={`Option ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.parentElement.innerHTML =
                            '<div class="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2">Image failed to load</div>';
                        }}
                      />
                    </div>
                    {/* Overlay */}
                    <div className={`absolute inset-0 transition-opacity ${isSelected ? "bg-primary/20" : "bg-transparent"}`} />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-lg">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {i === 0 && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" /> Best
                      </div>
                    )}
                    {/* Caption */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className={`text-[10px] font-semibold ${confidenceColor(c.confidence)}`}>
                        {Math.round((c.confidence || 0) * 100)}% match
                      </p>
                      {c.description && (
                        <p className="text-[9px] text-white/80 line-clamp-1">{c.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {fetched && candidates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No image candidates found. Try refreshing.</p>
            )}
          </div>
        )}

        {/* Footer */}
        {fetched && !loading && (
          <div className="px-6 pb-6 pt-3 flex gap-3 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSelection}
              disabled={!selected || saving}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? "Saving…" : "Select & Lock Image"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}