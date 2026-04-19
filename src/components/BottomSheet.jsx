import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

/**
 * Native-feel bottom sheet for mobile pickers.
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   title: string
 *   options: Array<{ label: string, value: any }>
 *   value: any
 *   onChange: (value) => void
 */
export default function BottomSheet({ open, onClose, title, options, value, onChange }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-heading font-semibold text-base">{title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {/* Options */}
            <div className="overflow-y-auto max-h-72 py-2">
              {options.map((opt) => {
                const active = opt.value === value || String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => { onChange(opt.value); onClose(); }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors ${
                      active ? "text-primary bg-primary/5" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                    {active && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}