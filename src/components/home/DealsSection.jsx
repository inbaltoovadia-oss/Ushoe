/**
 * DealsSection (home page) — shows catalog shoes + a teaser of Web Deals.
 * Catalog cards show DealIndicator badges dynamically.
 */
import { useState, useEffect } from "react";
import { Tag, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";

export default function DealsSection() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Shoe.list("-trending_score", 8).then(all => {
      setShoes(all.slice(0, 4));
      setLoading(false);
    });
  }, []);

  return (
    <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-bold text-2xl sm:text-3xl">Hot Deals</h2>
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Live</span>
        </div>
        <Link to="/deals" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
          View all deals <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : shoes.map((shoe, i) => <ShoeCard key={shoe.id} shoe={shoe} index={i} showDealIndicator />)}
      </div>
    </section>
  );
}