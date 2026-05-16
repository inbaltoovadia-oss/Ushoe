import { useState } from "react";
import { Loader2, Sparkles, Plus, X, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  "Running", "Casual", "Basketball", "Lifestyle", "Training",
  "Walking", "Tennis", "Cleats", "Sandals", "Flip Flops",
  "Slides", "Crocs & Clogs", "Hiking", "Skateboarding", "Golf"
];

const BRANDS = ["Nike", "Adidas", "Jordan", "New Balance", "Puma", "Converse", "Vans", "Hoka", "Asics", "Reebok", "Saucony", "Brooks", "Crocs", "Other"];

export default function AddShoePanel({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("form"); // "form" | "enriching" | "preview" | "done"
  const [form, setForm] = useState({ name: "", brand: BRANDS[0], category: CATEGORIES[0], image_url: "" });
  const [enriched, setEnriched] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("form");
    setForm({ name: "", brand: BRANDS[0], category: CATEGORIES[0], image_url: "" });
    setEnriched(null);
    setError("");
  };

  const handleEnrich = async () => {
    if (!form.name.trim()) { setError("Please enter a shoe name."); return; }
    setError("");
    setStep("enriching");

    const prompt = `You are a shoe expert. Look up all details about the shoe: "${form.brand} ${form.name}" in category "${form.category}".
Return a comprehensive JSON with all available real details including price, description, features, colorways, sizes, rating, trending score, and a high-quality image URL from a known retailer or brand site.
If the user provided an image URL, use it as image_url.
Provided image URL: "${form.image_url || "none"}"

Return only valid JSON matching this schema exactly.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          model: { type: "string" },
          category: { type: "string" },
          price: { type: "number" },
          original_price: { type: "number" },
          image_url: { type: "string" },
          colorway: { type: "string" },
          description: { type: "string" },
          features: { type: "array", items: { type: "string" } },
          rating: { type: "number" },
          trending_score: { type: "number" },
          sizes_available: { type: "array", items: { type: "number" } },
          colors_available: { type: "array", items: { type: "string" } },
          gender: { type: "string", enum: ["Men", "Women", "Unisex"] },
          is_trending: { type: "boolean" },
        },
      },
    });

    // Override with user inputs
    const merged = {
      ...result,
      name: form.name || result.name,
      brand: form.brand || result.brand,
      category: form.category || result.category,
      image_url: form.image_url || result.image_url,
    };

    setEnriched(merged);
    setStep("preview");
  };

  const handleSave = async () => {
    setStep("enriching");
    await base44.entities.Shoe.create(enriched);
    setStep("done");
    onAdded?.();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" /> Add Shoe to Catalog
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Add New Shoe
        </h3>
        <button onClick={() => { setOpen(false); reset(); }} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {step === "done" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <p className="font-semibold text-lg">Shoe added to catalog!</p>
          <button onClick={() => { reset(); setOpen(false); }} className="mt-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Done
          </button>
        </div>
      )}

      {step === "enriching" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">AI is looking up all details for this shoe…</p>
        </div>
      )}

      {step === "form" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Shoe Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Air Max 90, Ultra Boost 22"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Brand</label>
              <select
                value={form.brand}
                onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              >
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Image URL <span className="text-muted-foreground font-normal">(optional — AI will find one if blank)</span></label>
            <input
              value={form.image_url}
              onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            onClick={handleEnrich}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Look Up Details with AI
          </button>
        </div>
      )}

      {step === "preview" && enriched && (
        <div className="space-y-4">
          <div className="flex gap-4">
            {enriched.image_url && (
              <img src={enriched.image_url} alt={enriched.name} className="w-24 h-24 object-cover rounded-xl border border-border flex-shrink-0" onError={e => e.target.style.display = 'none'} />
            )}
            <div className="flex-1">
              <p className="font-bold text-lg font-heading">{enriched.brand} {enriched.name}</p>
              <p className="text-muted-foreground text-sm">{enriched.category} · {enriched.gender}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-primary text-lg">${enriched.price}</span>
                {enriched.original_price > enriched.price && (
                  <span className="text-muted-foreground line-through text-sm">${enriched.original_price}</span>
                )}
              </div>
            </div>
          </div>
          {enriched.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{enriched.description}</p>
          )}
          {enriched.features?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {enriched.features.map((f, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-secondary rounded-full text-muted-foreground">{f}</span>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep("form")} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">
              Back & Edit
            </button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add to Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}