import { useLocation, useNavigationType, Link, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";
import Navbar from "./Navbar";
import CompareBar from "./CompareBar";
import MobileBottomTabs from "./MobileBottomTabs";

// Root tabs navigate horizontally; child pages slide in from the right
const ROOT_PATHS = ["/", "/discover", "/trending", "/wishlist", "/settings"];
const ROOT_ORDER = ["/", "/discover", "/trending", "/wishlist", "/settings"];

const FULLSCREEN_PATHS = ["/assistant"];

export default function Layout() {
  const location = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef(location.pathname);
  const isFullscreen = FULLSCREEN_PATHS.includes(location.pathname);

  const isRoot = ROOT_PATHS.includes(location.pathname);
  const wasRoot = ROOT_PATHS.includes(prevPath.current);

  // Determine slide direction
  let xIn = 40, xOut = -40;
  if (isRoot && wasRoot) {
    // Tab switch — slide left/right based on tab order
    const prevIdx = ROOT_ORDER.indexOf(prevPath.current);
    const nextIdx = ROOT_ORDER.indexOf(location.pathname);
    if (nextIdx > prevIdx) { xIn = 40; xOut = -40; }
    else { xIn = -40; xOut = 40; }
  } else if (!isRoot && wasRoot) {
    // Drill into child — slide in from right
    xIn = 48; xOut = -24;
  } else if (isRoot && !wasRoot) {
    // Back to root — slide in from left
    xIn = -24; xOut = 48;
  } else if (navType === "POP") {
    // Browser back
    xIn = -40; xOut = 40;
  }

  // Update prevPath after computing direction
  const key = location.pathname;
  prevPath.current = location.pathname;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      {/* Persistent ambient orbs — the "backdrop" liquid glass requires */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-8%] w-[55vw] h-[55vw] rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-8%] w-[50vw] h-[50vw] rounded-full bg-violet-500/8 dark:bg-violet-600/14 blur-[90px]" />
        <div className="absolute top-[40%] left-[55%] w-[30vw] h-[30vw] rounded-full bg-teal-400/6 dark:bg-teal-400/10 blur-[80px]" />
      </div>
      <Navbar />
      <main className={`pt-16 relative z-10 ${isFullscreen ? "overflow-hidden" : "pb-20 md:pb-20"}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ x: xIn, opacity: 0, scale: 0.98 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: xOut, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
            style={{ willChange: "transform, opacity" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <CompareBar />
      <MobileBottomTabs />
      {/* Footer — hidden on fullscreen pages */}
      {!isFullscreen && (
        <footer className="relative z-10 border-t border-border/40 py-6 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} uShoe. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </footer>
      )}
    </div>
  );
}