import { useState, useRef } from "react";
import { Upload, Camera, Link, Image, Video, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const SOCIAL_LINK_PATTERN = /^https?:\/\/(www\.)?(tiktok\.com|instagram\.com|youtube\.com|youtu\.be|twitter\.com|x\.com)/i;

export default function UploadZone({ onMediaReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [linkInput, setLinkInput] = useState("");
  const [activeTab, setActiveTab] = useState("image"); // image | link
  const [uploading, setUploading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File too large. Please use an image under 10MB.");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onMediaReady({ imageUrl: file_url });
    } catch (err) {
      setPreview(null);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleLinkSubmit = () => {
    const link = linkInput.trim();
    if (!link) return;
    if (!SOCIAL_LINK_PATTERN.test(link)) {
      setLinkError("Please paste a valid TikTok, Instagram, YouTube, or Twitter link.");
      return;
    }
    setLinkError("");
    onMediaReady({ videoLink: link });
  };

  return (
    <div className="space-y-4 mt-2">
      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-secondary rounded-2xl">
        <button
          onClick={() => setActiveTab("image")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "image" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image className="w-4 h-4" /> Photo / Screenshot
        </button>
        <button
          onClick={() => setActiveTab("link")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "link" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link className="w-4 h-4" /> Social Link
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "image" && (
          <motion.div key="image-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !preview && fileInputRef.current?.click()}
              className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden cursor-pointer min-h-[220px] flex flex-col items-center justify-center gap-4 ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-primary/3"
              }`}
            >
              {preview ? (
                <div className="relative w-full h-full">
                  <img src={preview} alt="Preview" className="w-full max-h-[360px] object-contain rounded-2xl" />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <p className="text-white text-xs font-medium">Uploading…</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreview(null); }}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 px-8 py-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Drop your image here</p>
                    <p className="text-muted-foreground text-sm mt-1">or tap to pick from your gallery</p>
                  </div>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP, HEIC — up to 10MB</p>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

            {/* Camera shortcut */}
            {!preview && (
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-secondary/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all mt-3"
              >
                <Camera className="w-4 h-4" />
                Open Camera
              </button>
            )}
          </motion.div>
        )}

        {activeTab === "link" && (
          <motion.div key="link-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="rounded-3xl bg-secondary/30 border border-border p-6 space-y-4">
              <div className="flex flex-col gap-3">
                {[
                  { label: "TikTok", emoji: "🎵", hint: "tiktok.com/..." },
                  { label: "Instagram Reel", emoji: "📸", hint: "instagram.com/reel/..." },
                  { label: "YouTube Shorts", emoji: "▶️", hint: "youtube.com/shorts/..." },
                ].map(({ label, emoji, hint }) => (
                  <div key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="text-lg w-6">{emoji}</span>
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="ml-auto font-mono text-xs opacity-60">{hint}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-2">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => { setLinkInput(e.target.value); setLinkError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
                  placeholder="Paste a TikTok, Instagram or YouTube link…"
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
                {linkError && <p className="text-xs text-destructive">{linkError}</p>}
                <button
                  onClick={handleLinkSubmit}
                  disabled={!linkInput.trim()}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Identify Shoe
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { icon: "📸", label: "Upload or link" },
          { icon: "🤖", label: "AI identifies" },
          { icon: "🛒", label: "Buy instantly" },
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-secondary/40 text-center">
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}