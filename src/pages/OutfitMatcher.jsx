import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ImagePlus, Loader2, X, Sparkles, Globe, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";

export default function OutfitMatcher() {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [matchedShoes, setMatchedShoes] = useState([]);
  const [webPicks, setWebPicks] = useState([]);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    setAiResult(null);
    setMatchedShoes([]);
    setWebPicks([]);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const analyze = async () => {
    if (!imageUrl) return;
    setLoading(true);
    setAiResult(null);
    setMatchedShoes([]);
    setWebPicks([]);

    const [allShoes, aiResponse] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 50),
      base44.integrations.Core.InvokeLLM({
        prompt: `You are a fashion AI stylist specializing in shoes.

Analyze the outfit in the provided image and recommend shoes that would perfectly complement it.

Steps:
1. Describe the outfit style (color palette, formality level, aesthetic)
2. From the shoe catalog below, pick the top 4 best matching shoes (by index):
${allShoes.map((s, i) => `${i}: ${s.brand} ${s.name} - $${s.price} - ${s.category} - ${s.colorway || ''} - ${(s.features || []).join(", ")}`).join("\n")}

3. Search the web for 3 additional shoe recommendations from popular brands that match this outfit style

Provide a brief outfit analysis and styling tip.`,
        add_context_from_internet: true,
        file_urls: [imageUrl],
        response_json_schema: {
          type: "object",
          properties: {
            outfit_style: { type: "string" },
            color_palette: { type: "string" },
            styling_tip: { type: "string" },
            catalog_matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  reason: { type: "string" },
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
      }),
    ]);

    const matches = (aiResponse.catalog_matches || [])
      .filter((m) => m.index >= 0 && m.index < allShoes.length)
      .map((m) => ({ shoe: allShoes[m.index], reason: m.reason }));

    setAiResult(aiResponse);
    setMatchedShoes(matches);
    setWebPicks(aiResponse.web_picks || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI Outfit Matcher
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl">What Shoes Match My Outfit?</h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Upload or snap a photo of your outfit — AI finds perfect matching shoes from the web.
          </p>
        </motion.div>

        {/* Upload Area */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />

          {imagePreview ? (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative flex-shrink-0">
                <img src={imagePreview} alt="outfit" className="w-48 h-64 sm:w-56 sm:h-72 rounded-2xl object-cover border-2 border-primary" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => { setImagePreview(null); setImageUrl(null); setAiResult(null); setMatchedShoes([]); setWebPicks([]); }}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-4">
                {aiResult ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                    <p className="font-semibold text-sm mb-1">Outfit: {aiResult.outfit_style}</p>
                    <p className="text-xs text-muted-foreground mb-1">Colors: {aiResult.color_palette}</p>
                    <p className="text-sm italic text-foreground/80">"{aiResult.styling_tip}"</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Outfit uploaded! Click analyze to find matching shoes.</p>
                )}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={analyze}
                    disabled={loading || uploading}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? "Analyzing..." : "Find Matching Shoes"}
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="px-4 py-3 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80">
                    Change Photo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center">
                <ImagePlus className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-heading font-semibold text-lg">Upload your outfit</p>
                <p className="text-muted-foreground text-sm mt-1">Photo, mirror selfie, or flat lay — AI handles it all</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-medium hover:opacity-90 transition-opacity">
                  <ImagePlus className="w-4 h-4" />
                  Upload Photo
                </button>
                <button onClick={() => cameraRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-secondary rounded-2xl font-medium hover:bg-secondary/80 transition-colors">
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10">
              <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <Globe className="w-4 h-4 animate-pulse text-primary" />
                AI is analyzing your outfit and searching for matching shoes…
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </motion.div>
          )}

          {matchedShoes.length > 0 && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-8">
              {/* Catalog matches */}
              <div>
                <h2 className="font-heading font-bold text-xl mb-4">Best Matches From Our Catalog</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {matchedShoes.map((m, i) => (
                    <div key={m.shoe.id}>
                      <ShoeCard shoe={m.shoe} index={i} />
                      <p className="text-xs text-muted-foreground italic mt-1 px-1">{m.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Web picks */}
              {webPicks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-accent" />
                    <h2 className="font-heading font-bold text-xl">Also Found Online</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {webPicks.map((p, i) => (
                      <a
                        key={i}
                        href={p.search_url || `https://www.google.com/search?q=${encodeURIComponent(p.brand + " " + p.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:border-primary/30 transition-all"
                      >
                        <p className="text-xs text-muted-foreground uppercase font-medium">{p.brand}</p>
                        <p className="font-heading font-semibold mt-1">{p.name}</p>
                        <p className="text-primary font-bold mt-1">{p.price}</p>
                        <p className="text-xs text-muted-foreground mt-2">{p.reason}</p>
                        <span className="text-xs text-primary mt-3 inline-flex items-center gap-1 font-medium hover:underline">
                          View online <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}