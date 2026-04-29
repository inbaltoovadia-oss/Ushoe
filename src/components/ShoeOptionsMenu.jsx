import { useState, useEffect } from "react";
import { MoreHorizontal, Rocket, GitCompare, Heart, Share2, X, Check, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toggleCompare } from "../lib/compareStore";
import { isInWishlist, addToWishlistLocal, removeFromWishlistLocal, subscribeWishlist } from "../lib/wishlistStore";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ShoeOptionsMenu({ shoe, onSponsorClick }) {
  const [open, setOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(isInWishlist(shoe.id));
  const [copied, setCopied] = useState(false);

  // Keep wishlist state in sync
  useEffect(() => subscribeWishlist(() => setWishlisted(isInWishlist(shoe.id))), [shoe.id]);

  // Scroll lock while panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleWishlist = async () => {
    if (wishlisted) {
      removeFromWishlistLocal(shoe.id);
      const items = await base44.entities.WishlistItem.filter({ shoe_id: shoe.id });
      if (items.length > 0) await base44.entities.WishlistItem.delete(items[0].id);
      toast.success("Removed from wishlist");
    } else {
      addToWishlistLocal(shoe.id);
      await base44.entities.WishlistItem.create({
        shoe_id: shoe.id, shoe_name: shoe.name, shoe_brand: shoe.brand,
        shoe_image: shoe.image_url, shoe_price: shoe.price, price_alert: false,
      });
      toast.success("Added to wishlist ❤️");
    }
    setOpen(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/shoe/${shoe.id}`;
    const shareText = `Check out the ${shoe.brand} ${shoe.name} — $${shoe.price}`;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: shoe.name, text: shareText, url });
        setOpen(false);
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard!");
    } catch {
      // Last resort: prompt
      window.prompt("Copy this link:", url);
    }
  };

  const handleCompare = () => {
    toggleCompare(shoe);
    toast.success("Added to compare");
    setOpen(false);
  };

  const handleSponsor = () => {
    setOpen(false);
    onSponsorClick?.();
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 backdrop-blur-md transition-all"
        title="More options"
      >
        <MoreHorizontal className="w-4 h-4 text-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
            />

            {/* Panel — centered on screen */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-[92vw] max-w-sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">{shoe.brand}</p>
                    <p className="font-heading font-bold text-base leading-tight truncate">{shoe.name}</p>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
                    className="ml-3 flex-shrink-0 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="p-3 space-y-1">
                  {/* Share */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{copied ? "Copied!" : "Share Shoe"}</p>
                      <p className="text-[11px] text-muted-foreground">Copy link or share via apps</p>
                    </div>
                  </button>

                  {/* Compare */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCompare(); }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GitCompare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Add to Compare</p>
                      <p className="text-[11px] text-muted-foreground">Compare with other shoes side-by-side</p>
                    </div>
                  </button>

                  {/* Wishlist */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(); }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${wishlisted ? "bg-red-50 dark:bg-red-950/40" : "bg-secondary"}`}>
                      <Heart className={`w-4 h-4 ${wishlisted ? "text-red-500 fill-red-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{wishlisted ? "Remove from Wishlist" : "Save to Wishlist"}</p>
                      <p className="text-[11px] text-muted-foreground">{wishlisted ? "Already saved" : "Keep track of shoes you love"}</p>
                    </div>
                  </button>

                  {/* Sponsor */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSponsor(); }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Sponsor This Shoe</p>
                      <p className="text-[11px] text-muted-foreground">Promote this listing to more shoppers</p>
                    </div>
                  </button>
                </div>

                {/* Bottom safe area */}
                <div className="h-2" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}