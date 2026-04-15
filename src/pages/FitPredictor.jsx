import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ImagePlus, Loader2, Ruler, X, Sparkles, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const BRANDS = ["Nike", "Adidas", "New Balance", "ASICS", "Puma", "Converse", "Vans", "Jordan", "On Running", "Salomon", "Reebok", "Hoka"];
const SIZES_US = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14];

export default function FitPredictor() {
  const [knownBrand, setKnownBrand] = useState("Nike");
  const [knownSize, setKnownSize] = useState(10);
  const [width, setWidth] = useState("normal");
  const [footLength, setFootLength] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert shoe fit predictor AI.

User's known fit: ${knownBrand} size US ${knownSize}, width: ${width}
${footLength ? `Foot length: ${footLength} cm` : ""}
${imageUrl ? "A foot photo has been provided — analyze the foot shape, length estimate, arch, and width from the image." : ""}

Using real-world brand sizing data and the user's known fit, predict the best size for each of these brands:
${BRANDS.join(", ")}

For each brand provide:
- recommended US size
- fit prediction (runs small / true to size / runs large)
- confidence (High/Medium/Low)
- a short note

Also output:
- estimated foot length in cm (if photo provided, estimate from image; otherwise from known size)
- estimated foot width category
- overall fit profile summary (1-2 sentences)`,
      add_context_from_internet: true,
      file_urls: imageUrl ? [imageUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          foot_length_cm: { type: "number" },
          foot_width: { type: "string" },
          fit_summary: { type: "string" },
          predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                brand: { type: "string" },
                recommended_size: { type: "string" },
                fit: { type: "string" },
                confidence: { type: "string" },
                note: { type: "string" },
              },
            },
          },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  const fitColor = (fit) => {
    if (!fit) return "text-muted-foreground";
    const f = fit.toLowerCase();
    if (f.includes("small")) return "text-orange-500";
    if (f.includes("large")) return "text-blue-500";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Ruler className="w-4 h-4" />
            AI Fit Predictor
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl">Find Your Perfect Size</h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Tell us your current fit or upload a foot photo — AI predicts your size across every major brand.
          </p>
        </motion.div>

        {/* Input Form */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6">
          {/* Known Brand + Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Brand you know your size in</label>
              <select
                value={knownBrand}
                onChange={(e) => setKnownBrand(e.target.value)}
                className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-sm outline-none"
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Your size (US)</label>
              <select
                value={knownSize}
                onChange={(e) => setKnownSize(Number(e.target.value))}
                className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-sm outline-none"
              >
                {SIZES_US.map((s) => <option key={s} value={s}>US {s}</option>)}
              </select>
            </div>
          </div>

          {/* Width */}
          <div>
            <label className="text-sm font-medium mb-2 block">Foot width</label>
            <div className="flex gap-2 flex-wrap">
              {["narrow", "normal", "wide", "extra-wide"].map((w) => (
                <button
                  key={w}
                  onClick={() => setWidth(w)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all border-2 ${
                    width === w ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Optional foot length */}
          <div>
            <label className="text-sm font-medium mb-2 block">Foot length <span className="text-muted-foreground font-normal">(optional, in cm)</span></label>
            <input
              type="number"
              placeholder="e.g. 27.5"
              value={footLength}
              onChange={(e) => setFootLength(e.target.value)}
              className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Foot photo <span className="text-muted-foreground font-normal">(optional — improves accuracy)</span></label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />

            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="foot" className="w-28 h-28 rounded-2xl object-cover border-2 border-primary" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => { setImagePreview(null); setImageUrl(null); }}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-secondary rounded-2xl text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload Photo
                </button>
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-secondary rounded-2xl text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>
            )}
          </div>

          <button
            onClick={analyze}
            disabled={loading || uploading}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Analyzing...</> : <><Sparkles className="w-5 h-5" />Predict My Size</>}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-4">
              {/* Foot Profile */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Your Fit Profile</span>
                </div>
                <p className="text-sm text-foreground">{result.fit_summary}</p>
                <div className="flex gap-4 mt-3 text-sm">
                  {result.foot_length_cm && <span className="text-muted-foreground">📏 ~{result.foot_length_cm} cm</span>}
                  {result.foot_width && <span className="text-muted-foreground">↔️ {result.foot_width}</span>}
                </div>
              </div>

              {/* Brand Predictions */}
              <h3 className="font-heading font-bold text-lg">Size Guide by Brand</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(result.predictions || []).map((p, i) => (
                  <motion.div
                    key={p.brand}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading font-semibold">{p.brand}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.confidence === "High" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" :
                        p.confidence === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400" :
                        "bg-secondary text-muted-foreground"
                      }`}>{p.confidence}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-2xl">US {p.recommended_size}</span>
                      <span className={`text-xs font-medium ${fitColor(p.fit)}`}>{p.fit}</span>
                    </div>
                    {p.note && <p className="text-xs text-muted-foreground mt-1">{p.note}</p>}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}