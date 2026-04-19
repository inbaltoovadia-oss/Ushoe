import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72; // px pulled before triggering

/**
 * Wrap page content with this to add pull-to-refresh on mobile.
 * Props:
 *   onRefresh: async () => void
 *   children: ReactNode
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    // Only activate at top of scroll
    if (window.scrollY > 4) return;
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (startYRef.current === null || refreshing) return;
    if (window.scrollY > 4) { startYRef.current = null; return; }
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      // Dampen pull with rubber-band feel
      setPullY(Math.min(THRESHOLD * 1.4, delta * 0.45));
    }
  };

  const handleTouchEnd = async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    if (pullY >= THRESHOLD) {
      setRefreshing(true);
      setPullY(THRESHOLD * 0.7);
      await onRefresh?.();
      setRefreshing(false);
    }
    setPullY(0);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullY > 8 || refreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex justify-center z-30 pointer-events-none"
            style={{ transform: `translateY(${refreshing ? 16 : Math.max(0, pullY - 20)}px)` }}
          >
            <div className="flex items-center gap-2 bg-card border border-border shadow-lg px-4 py-2 rounded-full text-sm font-medium text-muted-foreground">
              <motion.div animate={{ rotate: refreshing ? 360 : pullY * 3 }} transition={refreshing ? { repeat: Infinity, duration: 0.6, ease: "linear" } : { duration: 0 }}>
                <RefreshCw className="w-4 h-4 text-primary" />
              </motion.div>
              {refreshing ? "Refreshing…" : pullY >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content — shift down while pulling */}
      <motion.div
        animate={{ y: pullY > 0 || refreshing ? Math.min(THRESHOLD * 0.7, pullY) : 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  );
}