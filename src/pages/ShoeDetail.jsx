import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Heart, MapPin, Globe, ArrowLeft, Star, Share2,
  Flame, CheckCircle, ShieldCheck, Truck, Tag, FolderOpen,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ShareShoeCard from "../components/ShareShoeCard";
import { base44 } from "@/api/base44Client";
import NearbyStores from "../components/NearbyStores.jsx";
import BuyOnline from "../components/BuyOnline.jsx";
import { toast } from "sonner";
import ShoeCard from "../components/ShoeCard";
import {
  isInWishlist, addToWishlistLocal, removeFromWishlistLocal, subscribeWishlist,
} from "../lib/wishlistStore";
import PriceTrackButton from "../components/PriceTrackButton";
import ScarcityBadge from "../components/ScarcityBadge";
import ProsConsCard from "../components/ProsConsCard";
import ReviewsSummary from "../components/ReviewsSummary";
import { addRecentlyViewed } from "../lib/recentlyViewedStore";
import ShoeImageGallery from "../components/ShoeImageGallery";
import ShoeStaticInsights from "../components/ShoeStaticInsights";
import PriceHistoryCard from "../components/PriceHistoryCard";
import SizeConfidenceNote from "../components/SizeConfidenceNote";
import SimilarAlternatives from "../components/SimilarAlternatives";
import MatchScoreBadge from "../components/MatchScoreBadge";
import CollectionsManager from "../components/CollectionsManager";
import { AnimatePresence as AP } from "framer-motion";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Verified Catalog" },
  { icon: Truck,       label: "Ships Nationwide" },
  { icon: CheckCircle, label: "Authentic Product" },
];

// Skeleton loader for detail page
function DetailSkeleton() {
  return (
    <div className="min-h-screen pb-16 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="h-4 w-16 bg-secondary rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="lg:w-1/2 aspect-square rounded-3xl bg-secondary" />
          <div className="lg:w-1/2 space-y-4 pt-2">
            <div className="h-3 w-20 bg-secondary rounded-full" />
            <div className="h-8 w-3/4 bg-secondary rounded-xl" />
            <div className="h-4 w-24 bg-secondary rounded-full" />
            <div className="h-10 w-32 bg-secondary rounded-xl" />
            <div className="h-24 bg-secondary rounded-2xl" />
            <div className="h-12 bg-secondary rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShoeDetail() {
  const { id } = useParams();
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get("tab"); // "nearby" | "online"
  const [shoe, setShoe]               = useState(null);
  const [similar, setSimilar]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [wishlisted, setWishlisted]   = useState(false);
  const [selectedSize, setSelectedSize]   = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [activeTab, setActiveTab]     = useState(tabParam || null); // null | "nearby" | "online"
  const [showShare, setShowShare]         = useState(false);
  const [showCollections, setShowCollections] = useState(false);

  useEffect(() => { loadShoe(); }, [id]);
  useEffect(() => subscribeWishlist(() => setWishlisted(isInWishlist(id))), [id]);

  const loadShoe = async () => {
    setLoading(true);
    const [shoeData, allShoes] = await Promise.all([
      base44.entities.Shoe.filter({ id }),
      base44.entities.Shoe.list("-trending_score", 50),
    ]);
    if (shoeData.length > 0) {
      const s = shoeData[0];
      setShoe(s);
      addRecentlyViewed(s);
      setWishlisted(isInWishlist(s.id));
      setSimilar(allShoes.filter(x => x.id !== s.id && x.category === s.category).slice(0, 4));
    }
    setLoading(false);
  };

  const toggleWishlist = async () => {
    if (wishlisted) {
      removeFromWishlistLocal(shoe.id);
      const items = await base44.entities.WishlistItem.filter({ shoe_id: shoe.id });
      if (items.length > 0) await base44.entities.WishlistItem.delete(items[0].id);
      toast("Removed from wishlist");
    } else {
      addToWishlistLocal(shoe.id);
      await base44.entities.WishlistItem.create({
        shoe_id: shoe.id, shoe_name: shoe.name, shoe_brand: shoe.brand,
        shoe_image: shoe.image_url, shoe_price: shoe.price, price_alert: false,
      });
      toast.success("Saved to wishlist ❤️");
    }
    setWishlisted(!wishlisted);
  };

  if (loading) return <DetailSkeleton />;

  if (!shoe) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="font-heading font-bold text-2xl">Shoe not found</h2>
      <Link to="/" className="text-primary hover:underline">Go back home</Link>
    </div>
  );

  const discount = shoe.original_price > shoe.price
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  return (
    <div className="min-h-screen pb-20">
      <AnimatePresence>
        {showShare && <ShareShoeCard shoe={shoe} onClose={() => setShowShare(false)} />}
      </AnimatePresence>
      <AP>
        {showCollections && <CollectionsManager shoe={shoe} onClose={() => setShowCollections(false)} />}
      </AP>

      {/* Back Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">

          {/* ── LEFT: Image Gallery ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:w-[48%] lg:sticky lg:top-6 lg:self-start"
          >
            <ShoeImageGallery shoe={shoe} />

            {/* Trust badges row */}
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="w-3.5 h-3.5 text-green-500" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── RIGHT: Details ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:w-[52%] space-y-5"
          >
            {/* Brand + Name */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{shoe.brand}</p>
                {shoe.is_trending && (
                  <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Flame className="w-3 h-3" /> Trending
                  </span>
                )}
                {shoe.gender && (
                  <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{shoe.gender}</span>
                )}
                <MatchScoreBadge shoe={shoe} />
              </div>
              <h1 className="font-heading font-bold text-3xl sm:text-4xl leading-tight">{shoe.name}</h1>
              {shoe.colorway && (
                <p className="text-sm text-muted-foreground mt-1">{shoe.colorway}</p>
              )}
            </div>

            {/* Rating */}
            {shoe.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(shoe.rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20 fill-muted-foreground/10"}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold">{shoe.rating}</span>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
            )}

            {/* Price block */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-heading font-black text-4xl">${shoe.price}</span>
              {shoe.original_price > shoe.price && (
                <>
                  <span className="text-xl text-muted-foreground line-through font-normal">${shoe.original_price}</span>
                  <span className="inline-flex items-center gap-1 bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                    <Tag className="w-3.5 h-3.5" />
                    Save {discount}% · ${(shoe.original_price - shoe.price).toFixed(0)} off
                  </span>
                </>
              )}
            </div>

            {/* Scarcity badge */}
            <div className="flex flex-wrap gap-2">
              <ScarcityBadge shoe={shoe} />
            </div>

            {/* ── Colors ── */}
            {shoe.colors_available?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">
                  Color{selectedColor ? <span className="text-muted-foreground font-normal"> — {selectedColor}</span> : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {shoe.colors_available.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-2 ${
                        selectedColor === color
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-secondary hover:bg-secondary/80 text-foreground border-transparent"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Sizes ── */}
            {shoe.sizes_available?.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-semibold">
                    Size{selectedSize ? <span className="text-muted-foreground font-normal"> — US {selectedSize}</span> : ""}
                  </p>
                  <SizeConfidenceNote shoe={shoe} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {shoe.sizes_available.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all ${
                        selectedSize === size
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Primary CTAs ── */}
            <div className="flex gap-2">
              <button
                onClick={toggleWishlist}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                  wishlisted
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                    : "bg-secondary text-foreground hover:bg-secondary/70 border border-border"
                }`}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
                {wishlisted ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => setShowShare(true)}
                className="p-3 rounded-2xl bg-secondary hover:bg-secondary/70 border border-border transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCollections(true)}
                className="p-3 rounded-2xl bg-secondary hover:bg-secondary/70 border border-border transition-colors"
                title="Save to Collection"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <PriceTrackButton shoe={shoe} />
              </div>
            </div>

            {/* ── Find Near You / Buy Online — BIG primary actions ── */}
            <div className="pb-2 border-b border-border/40">
              {/* Deal tags + big CTA buttons */}
              <div className="flex gap-3">
                {/* Find Near You */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <button
                    onClick={() => setActiveTab(activeTab === "nearby" ? null : "nearby")}
                    className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] ${
                      activeTab === "nearby"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-primary/10 text-primary border-2 border-primary/30 hover:bg-primary/20"
                    }`}
                  >
                    <MapPin className="w-6 h-6" />
                    Find Near You
                  </button>
                </div>

                {/* Buy Online */}
                <div className="flex-1 flex flex-col gap-1.5">
                  {discount > 0 && (
                    <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-green-500 text-white rounded-xl text-xs font-bold">
                      <Tag className="w-3 h-3" />
                      {discount}% OFF online
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTab(activeTab === "online" ? null : "online")}
                    className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] ${
                      activeTab === "online"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-primary/10 text-primary border-2 border-primary/30 hover:bg-primary/20"
                    }`}
                  >
                    <Globe className="w-6 h-6" />
                    Buy Online
                  </button>
                </div>
              </div>

              {activeTab && !selectedSize && !selectedColor && (shoe.sizes_available?.length > 0 || shoe.colors_available?.length > 0) && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                  💡 Select a size or color above to filter by availability
                </p>
              )}

              <AnimatePresence mode="wait">
                {activeTab === "nearby" && (
                  <motion.div key="nearby" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-3">
                    <NearbyStores title="Stores Near You" maxCount={4} shoe={shoe} selectedSize={selectedSize} selectedColor={selectedColor} />
                  </motion.div>
                )}
                {activeTab === "online" && (
                  <motion.div key="online" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-3">
                    <BuyOnline shoe={shoe} selectedSize={selectedSize} selectedColor={selectedColor} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Description */}
            {shoe.description && (
              <p className="text-muted-foreground text-sm leading-relaxed border-l-2 border-primary/30 pl-3">{shoe.description}</p>
            )}

            {/* Features chips */}
            {shoe.features?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {shoe.features.map(f => (
                  <span key={f} className="text-xs px-3 py-1.5 bg-secondary rounded-full text-foreground font-medium">{f}</span>
                ))}
              </div>
            )}

            {/* Static Insights */}
            <ShoeStaticInsights shoe={shoe} />

            {/* Price History */}
            <PriceHistoryCard shoe={shoe} />

            {/* Pros & Cons */}
            <ProsConsCard shoe={shoe} />

            {/* Reviews Summary (static) */}
            <ReviewsSummary shoe={shoe} />
          </motion.div>
        </div>

        {/* ── Similar Alternatives ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10"
        >
          <SimilarAlternatives shoe={shoe} />
        </motion.div>

        {/* ── Similar Shoes ── */}
        {similar.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 pt-10 border-t border-border/40"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-2xl">You Might Also Like</h2>
              <Link to={`/search?q=${encodeURIComponent(shoe.category)}`} className="text-sm text-primary hover:underline">
                See all {shoe.category}
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {similar.map((s, i) => <ShoeCard key={s.id} shoe={s} index={i} />)}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}