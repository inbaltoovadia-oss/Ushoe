import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Rocket, Camera, GitCompare, Heart, TrendingUp, Share2, X } from "lucide-react";
import { toggleCompare } from "../lib/compareStore";
import { isInWishlist, addToWishlistLocal, removeFromWishlistLocal } from "../lib/wishlistStore";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ShoeOptionsMenu({ shoe, onSponsorClick, onARClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const wrap = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    fn();
  };

  const handleWishlist = async () => {
    const wishlisted = isInWishlist(shoe.id);
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
      toast.success("Added to wishlist");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/shoe/${shoe.id}`);
    toast.success("Link copied!");
  };

  const items = [
    { icon: Rocket, label: "Sponsor this shoe", color: "text-amber-500", onClick: wrap(onSponsorClick) },
    { icon: Camera, label: "AR Try-On", color: "text-primary", onClick: wrap(onARClick) },
    { icon: GitCompare, label: "Add to Compare", color: "text-foreground", onClick: wrap(() => toggleCompare(shoe)) },
    { icon: Heart, label: isInWishlist(shoe.id) ? "Remove from Wishlist" : "Save to Wishlist", color: "text-red-500", onClick: wrap(handleWishlist) },
    { icon: Share2, label: "Copy Link", color: "text-foreground", onClick: wrap(handleShare) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 backdrop-blur-md transition-all"
        title="More options"
      >
        <MoreHorizontal className="w-4 h-4 text-foreground" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-card border border-border rounded-2xl shadow-2xl py-1.5 w-48 z-50 overflow-hidden">
          {items.map(({ icon: Icon, label, color, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-secondary transition-colors text-left"
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}