import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GitCompare, X } from "lucide-react";
import { subscribeCompare, getCompareShoes, toggleCompare, clearCompare } from "../lib/compareStore";
import { motion, AnimatePresence } from "framer-motion";

export default function CompareBar() {
  const [shoes, setShoes] = useState(getCompareShoes());
  const navigate = useNavigate();

  useEffect(() => subscribeCompare(setShoes), []);

  if (shoes.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            <GitCompare className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-muted-foreground flex-shrink-0">Compare:</span>
            {shoes.map(shoe => (
              <div key={shoe.id} className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1 flex-shrink-0">
                <img src={shoe.image_url} alt={shoe.name} className="w-6 h-6 rounded object-cover" />
                <span className="text-xs font-medium max-w-[80px] truncate">{shoe.name}</span>
                <button onClick={() => toggleCompare(shoe)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={clearCompare}
            className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            Clear
          </button>
          <button
            onClick={() => navigate("/compare")}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <GitCompare className="w-4 h-4" />
            Compare {shoes.length}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}