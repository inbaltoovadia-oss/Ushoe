import { Ruler } from "lucide-react";
import { motion } from "framer-motion";
import SizeSelector from "../SizeSelector";
import { getSize, getSizeLabel, subscribeSize } from "../../lib/sizeStore";
import { useState, useEffect } from "react";

export default function SizeSection() {
  const [pref, setPref] = useState(getSize());
  useEffect(() => subscribeSize(setPref), []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {pref.us ? (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <Ruler className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Saved size: <span className="text-primary font-bold">{getSizeLabel()}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Used for filtering search results & store availability</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <Ruler className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">No size saved yet — select yours below to enable size filtering.</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6">
          <SizeSelector inline />
        </div>
      </motion.div>
    </div>
  );
}