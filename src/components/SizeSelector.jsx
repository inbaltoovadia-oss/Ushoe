import { useState, useEffect } from "react";
import { Ruler, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSize, setSize, subscribeSize, US_SIZES, EU_SIZES, UK_SIZES, convertSize, getSizeLabel } from "../lib/sizeStore";

const SYSTEMS = ["US", "EU", "UK"];

export default function SizeSelector({ onClose, inline = false }) {
  const [pref, setPref] = useState(getSize());
  const [system, setSystem] = useState(getSize().system || "US");
  const [selected, setSelected] = useState(getSize().us);

  useEffect(() => subscribeSize(setPref), []);

  const sizes = system === "US" ? US_SIZES : system === "EU" ? EU_SIZES : UK_SIZES;

  const handleSelect = (val) => {
    // Convert to US as base
    let usSize = val;
    if (system === "EU") usSize = convertSize(val, "EU", "US");
    if (system === "UK") usSize = convertSize(val, "UK", "US");
    setSelected(usSize);
    setSize(usSize, system);
  };

  const displayVal = (usSize) => {
    if (!usSize) return null;
    if (system === "EU") return convertSize(usSize, "US", "EU");
    if (system === "UK") return convertSize(usSize, "US", "UK");
    return usSize;
  };

  const currentDisplay = displayVal(pref.us);

  const content = (
    <div className="space-y-4">
      {/* System toggle */}
      <div>
        <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Size System</p>
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {SYSTEMS.map(s => (
            <button
              key={s}
              onClick={() => setSystem(s)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                system === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Size grid */}
      <div>
        <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Select Your Size</p>
        <div className="grid grid-cols-6 gap-1.5">
          {sizes.map(sz => {
            const isActive = currentDisplay === sz || (system === "US" && pref.us === sz);
            return (
              <button
                key={sz}
                onClick={() => handleSelect(sz)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
              >
                {sz}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversion preview */}
      {pref.us && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Your size across systems:</p>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="font-heading font-bold text-lg text-foreground">{pref.us}</p>
              <p className="text-[10px] text-muted-foreground">US</p>
            </div>
            <div className="text-center">
              <p className="font-heading font-bold text-lg text-foreground">{pref.eu || "—"}</p>
              <p className="text-[10px] text-muted-foreground">EU</p>
            </div>
            <div className="text-center">
              <p className="font-heading font-bold text-lg text-foreground">{pref.uk || "—"}</p>
              <p className="text-[10px] text-muted-foreground">UK</p>
            </div>
          </div>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity"
        >
          {pref.us ? `Save — ${getSizeLabel()}` : "Save"}
        </button>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm flex flex-col max-h-[90dvh]"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Ruler className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-heading font-bold text-xl">My Shoe Size</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          {content}
        </div>
      </motion.div>
    </div>
  );
}