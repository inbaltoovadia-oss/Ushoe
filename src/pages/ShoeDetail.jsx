import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Heart,
  MapPin,
  ArrowLeft,
  Star,
  Share2,
  Flame,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import StoreCard from "../components/StoreCard";
import ShoeCard from "../components/ShoeCard";
import {
  isInWishlist,
  addToWishlistLocal,
  removeFromWishlistLocal,
  subscribeWishlist,
} from "../lib/wishlistStore";

export default function ShoeDetail() {
  const { id } = useParams();
  const [shoe, setShoe] = useState(null);
  const [stores, setStores] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);

  useEffect(() => {
    loadShoe();
  }, [id]);

  useEffect(() => {
    return subscribeWishlist(() => setWishlisted(isInWishlist(id)));
  }, [id]);

  const loadShoe = async () => {
    setLoading(true);
    const [shoeData, storeData, allShoes] = await Promise.all([
      base44.entities.Shoe.filter({ id }),
      base44.entities.Store.list("-rating", 10),
      base44.entities.Shoe.list("-trending_score", 50),
    ]);

    if (shoeData.length > 0) {
      setShoe(shoeData[0]);
      setWishlisted(isInWishlist(shoeData[0].id));
      setSimilar(
        allShoes
          .filter((s) => s.id !== shoeData[0].id && s.category === shoeData[0].category)
          .slice(0, 4)
      );
    }
    setStores(storeData);
    setLoading(false);
  };

  const toggleWishlist = async () => {
    if (wishlisted) {
      removeFromWishlistLocal(shoe.id);
      const items = await base44.entities.WishlistItem.filter({ shoe_id: shoe.id });
      if (items.length > 0) await base44.entities.WishlistItem.delete(items[0].id);
    } else {
      addToWishlistLocal(shoe.id);
      await base44.entities.WishlistItem.create({
        shoe_id: shoe.id,
        shoe_name: shoe.name,
        shoe_brand: shoe.brand,
        shoe_image: shoe.image_url,
        shoe_price: shoe.price,
        price_alert: false,
      });
    }
    setWishlisted(!wishlisted);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shoe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="font-heading font-bold text-2xl">Shoe not found</h2>
        <Link to="/" className="text-primary mt-4 hover:underline">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Back Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/2"
          >
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-secondary/30">
              <img
                src={shoe.image_url}
                alt={shoe.name}
                className="w-full h-full object-cover"
              />
              {shoe.is_trending && (
                <div className="absolute top-4 left-4 flex items-center gap-1 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-sm font-semibold">
                  <Flame className="w-4 h-4" />
                  Trending
                </div>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/2"
          >
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
              {shoe.brand}
            </p>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl mt-2">{shoe.name}</h1>

            {/* Rating */}
            {shoe.rating && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(shoe.rating)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{shoe.rating}</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="font-heading font-bold text-3xl">${shoe.price}</span>
              {shoe.original_price > shoe.price && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ${shoe.original_price}
                  </span>
                  <span className="text-sm font-semibold text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                    Save ${shoe.original_price - shoe.price}
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            {shoe.description && (
              <p className="text-muted-foreground mt-4 leading-relaxed">{shoe.description}</p>
            )}

            {/* Features */}
            {shoe.features && shoe.features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {shoe.features.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-3 py-1.5 bg-secondary rounded-full text-foreground font-medium"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Sizes */}
            {shoe.sizes_available && shoe.sizes_available.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-3">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {shoe.sizes_available.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-xl text-sm font-medium transition-all ${
                        selectedSize === size
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={toggleWishlist}
                className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all ${
                  wishlisted
                    ? "bg-red-500 text-white"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? "fill-current" : ""}`} />
                {wishlisted ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="p-3.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Nearby Stores */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading font-bold text-2xl">Find Nearby</h2>
              <p className="text-sm text-muted-foreground mt-1">Stores that carry this shoe</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.slice(0, 3).map((store, i) => (
              <StoreCard key={store.id} store={store} index={i} />
            ))}
          </div>
        </section>

        {/* Similar Shoes */}
        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="font-heading font-bold text-2xl mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {similar.map((s, i) => (
                <ShoeCard key={s.id} shoe={s} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}