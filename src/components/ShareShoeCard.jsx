import { useState, useEffect } from "react";
import { X, Instagram, MessageCircle, Share2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ShareShoeCard({ shoe, onClose }) {
  const [copied, setCopied] = useState(false);

  const pageUrl = `${window.location.origin}/shoe/${shoe.id}`;
  const shareText = `Check out the ${shoe.brand} ${shoe.name} — only $${shoe.price}! 👟`;

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${shoe.brand} ${shoe.name}`, text: shareText, url: pageUrl });
        onClose();
        return;
      } catch {}
    }
    copyLink();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
    } catch {
      window.prompt("Copy link:", pageUrl);
    }
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + pageUrl)}`, "_blank");
    onClose();
  };

  const shareInstagram = () => {
    copyLink();
    toast.info("Link copied! Paste it in your Instagram bio or story.", { duration: 4000 });
  };

  const shareTikTok = () => {
    copyLink();
    toast.info("Link copied! Paste it in your TikTok bio or video description.", { duration: 4000 });
  };

  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText + "\n" + pageUrl)}`, "_blank");
    onClose();
  };

  const discount = shoe.original_price > shoe.price
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  const ACTIONS = [
    { label: "Share via Device", sub: "Open system share sheet", icon: Share2, bg: "bg-primary/10", color: "text-primary", onClick: nativeShare, primary: true },
    { label: "WhatsApp", sub: "Send as a message", icon: MessageCircle, bg: "bg-green-100 dark:bg-green-950/40", color: "text-green-600", onClick: shareWhatsApp },
    { label: "Instagram", sub: "Copy link to share", icon: Instagram, bg: "bg-pink-100 dark:bg-pink-950/40", color: "text-pink-500", onClick: shareInstagram },
    {
      label: "TikTok", sub: "Copy link to share",
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.15a8.17 8.17 0 0 0 4.78 1.52V7.22a4.86 4.86 0 0 1-1.01-.53z"/>
        </svg>
      ),
      bg: "bg-slate-100 dark:bg-slate-800/60", color: "text-foreground", onClick: shareTikTok,
    },
    { label: "Messages / SMS", sub: "Send via text message", icon: () => <span className="text-base">💬</span>, bg: "bg-blue-100 dark:bg-blue-950/40", color: "text-blue-600", onClick: shareSMS },
    { label: copied ? "Copied!" : "Copy Link", sub: "Paste anywhere", icon: copied ? Check : Copy, bg: "bg-secondary", color: copied ? "text-green-600" : "text-muted-foreground", onClick: copyLink },
  ];

  return (
    // Sits below the navbar (z-40 navbar, z-[45] overlay) — clicks outside close it
    <div
      className="fixed inset-0 z-[45] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "70dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
            <img src={shoe.image_url} alt={shoe.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{shoe.brand}</p>
            <p className="font-heading font-bold text-sm truncate leading-tight">{shoe.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-sm text-primary">${shoe.price}</span>
              {discount > 0 && (
                <span className="text-[10px] bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded-full">-{discount}%</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-border/60 mx-5 flex-shrink-0" />

        {/* Actions */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1.5">
          {ACTIONS.map(({ label, sub, icon: Icon, bg, color, onClick, primary }) => (
            <button
              key={label}
              onClick={onClick}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all hover:scale-[0.99] active:scale-[0.97] ${
                primary ? "bg-primary/8 hover:bg-primary/12 border border-primary/20" : "hover:bg-secondary"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <span className={color}><Icon className="w-4 h-4" /></span>
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${primary ? "text-primary" : ""}`}>{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="pb-3 flex-shrink-0" />
      </motion.div>
    </div>
  );
}