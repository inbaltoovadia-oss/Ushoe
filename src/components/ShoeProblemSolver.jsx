import { useState, useRef } from "react";
import { Wrench, Send, Loader2, ExternalLink, ChevronDown, ChevronUp, ImagePlus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function ShoeProblemSolver() {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef(null);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploadingImage(false);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!problem.trim() && !imageUrl) return;
    setLoading(true);
    setResult(null);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `A user has a shoe problem: "${problem || "see the image provided"}". 
${imageUrl ? "They also uploaded a photo of the issue — analyze it to better understand the problem." : ""}
Search the web for the best solutions, fixes, tips, or products that solve this issue.
Provide 4-6 actionable solutions. For each, include:
- A clear title
- A short description (2-3 sentences)
- Difficulty level: Easy / Medium / Hard
- Whether they need to buy something (needs_product: true/false)
- A helpful search URL (Google search link) for more info`,
      add_context_from_internet: true,
      file_urls: imageUrl ? [imageUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          solutions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                difficulty: { type: "string" },
                needs_product: { type: "boolean" },
                search_url: { type: "string" },
              },
            },
          },
        },
      },
    });

    setResult(res);
    setLoading(false);
  };

  const difficultyColor = {
    Easy: "text-green-600 bg-green-50 dark:bg-green-950/30",
    Medium: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    Hard: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-card border border-border rounded-2xl hover:border-primary/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Wrench className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-heading font-semibold text-sm">Shoe Problem Solver</p>
            <p className="text-xs text-muted-foreground">Describe your shoe issue — AI searches the web for fixes</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-t-0 border-border rounded-b-2xl px-5 py-4">
              <form onSubmit={handleSubmit} className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <input
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    placeholder="e.g. my shoes squeak when I walk, heel is slipping, sole is coming off…"
                    className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none border border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                  />
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-colors flex-shrink-0"
                    title="Upload a photo of your shoe problem"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!problem.trim() && !imageUrl) || uploadingImage}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? "Searching…" : "Solve"}
                  </button>
                </div>
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="shoe problem" className="h-20 w-20 object-cover rounded-xl border-2 border-primary" />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </form>

              {result && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {result.summary && (
                    <p className="text-sm text-muted-foreground mb-4 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                      {result.summary}
                    </p>
                  )}
                  <div className="space-y-3">
                    {(result.solutions || []).map((sol, i) => (
                      <div key={i} className="bg-secondary/50 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-semibold text-sm">{sol.title}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {sol.difficulty && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${difficultyColor[sol.difficulty] || "bg-secondary text-muted-foreground"}`}>
                                {sol.difficulty}
                              </span>
                            )}
                            {sol.needs_product && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
                                Product needed
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{sol.description}</p>
                        {sol.search_url && (
                          <a
                            href={sol.search_url.startsWith("http") ? sol.search_url : `https://www.google.com/search?q=${encodeURIComponent(sol.title + " shoe fix")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                          >
                            <ExternalLink className="w-3 h-3" /> Learn more
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}