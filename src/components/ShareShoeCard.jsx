import { useState, useRef, useEffect } from "react";
import { X, Download, Instagram, MessageCircle, Share2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop";

export default function ShareShoeCard({ shoe, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const shopUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${shoe.brand} ${shoe.name}`)}`;
  const pageUrl = `${window.location.origin}/shoe/${shoe.id}`;
  const discount = shoe.original_price > shoe.price
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setGenerating(true);
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    setGenerating(false);
    return canvas;
  };

  const downloadCard = async () => {
    const canvas = await generateImage();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${shoe.name.replace(/\s+/g, "-")}-ushoe.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Card downloaded! Ready to post.");
  };

  const shareToWhatsApp = () => {
    const text = `Check out the ${shoe.brand} ${shoe.name} — only $${shoe.price}! 👟\n${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareToTikTok = () => {
    downloadCard();
    toast.info("Card downloaded! Open TikTok and upload as a photo post.", { duration: 4000 });
  };

  const shareToInstagram = () => {
    downloadCard();
    toast.info("Card downloaded! Open Instagram Stories and add the image.", { duration: 4000 });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  const canNativeShare = !!navigator.share;
  const nativeShare = async () => {
    // Try simple URL share first (most reliable)
    try {
      await navigator.share({
        title: `${shoe.brand} ${shoe.name}`,
        text: `Check this out — only $${shoe.price}!`,
        url: pageUrl,
      });
      return;
    } catch {}
    // Fallback: copy link
    copyLink();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — sticky */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h3 className="font-heading font-bold text-lg">Share Shoe</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-2">
          {/* Preview Card */}
          <div
            ref={cardRef}
            className="relative rounded-2xl overflow-hidden mb-4"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
              aspectRatio: "1 / 1",
            }}
          >
            <div className="absolute inset-0 opacity-30" style={{
              background: "radial-gradient(ellipse at 70% 30%, hsl(220,90%,56%) 0%, transparent 60%)",
            }} />
            <img
              src={imgError ? FALLBACK_IMG : (shoe.image_url || FALLBACK_IMG)}
              alt={shoe.name}
              onError={() => setImgError(true)}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-luminosity"
              style={{ transform: "scale(1.05)" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 100%)" }} />
            {discount > 0 && (
              <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{discount}%
              </div>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-1.5">
              <span className="text-lg">👟</span>
              <span className="text-white font-heading font-bold text-sm">uShoe</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{shoe.brand}</p>
              <h4 className="text-white font-heading font-bold text-xl leading-tight line-clamp-2">{shoe.name}</h4>
              {shoe.colorway && <p className="text-white/60 text-xs mt-0.5">{shoe.colorway}</p>}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-heading font-black text-2xl">${shoe.price}</span>
                  {shoe.original_price > shoe.price && (
                    <span className="text-white/50 text-sm line-through">${shoe.original_price}</span>
                  )}
                </div>
                <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
                  <span className="text-white text-xs font-semibold">Shop Now →</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share buttons — always visible at bottom */}
        <div className="px-5 pb-5 pt-2 space-y-2.5 flex-shrink-0 border-t border-border/40">
          {canNativeShare && (
            <button
              onClick={nativeShare}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              Share via Device
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareToInstagram}
              disabled={generating}
              className="flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm transition-all text-white"
              style={{ background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)" }}
            >
              <Instagram className="w-4 h-4" />
              Instagram
            </button>
            <button
              onClick={shareToWhatsApp}
              className="flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm bg-green-500 hover:bg-green-600 text-white transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadCard}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm bg-secondary hover:bg-secondary/80 text-foreground transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {generating ? "Generating…" : "Save Image"}
            </button>
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm bg-secondary hover:bg-secondary/80 text-foreground transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}