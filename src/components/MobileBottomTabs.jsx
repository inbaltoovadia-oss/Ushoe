import { useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, Flame, Heart, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { to: "/",         label: "Home",     icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function MobileBottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Liquid Glass bar */}
      <div
        className="flex w-full border-t border-white/10 dark:border-white/5 liquid-glass-bar"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
        }}
      >
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <motion.button
              key={to}
              onClick={() => navigate(to, { replace: active })}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative"
              whileTap={{ scale: 0.82 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
            >
              {/* Active pill glow background */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="tabPill"
                    className="absolute inset-x-2 inset-y-1 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.10) 100%)",
                      boxShadow: "0 2px 16px 0 rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.45)",
                      border: "1px solid rgba(255,255,255,0.35)",
                    }}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  />
                )}
              </AnimatePresence>

              {/* Icon with 3D flip on activation */}
              <motion.div
                animate={active ? { rotateY: [0, -20, 0], scale: [1, 1.15, 1] } : { rotateY: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{ transformStyle: "preserve-3d", position: "relative", zIndex: 1 }}
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  style={{
                    color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    filter: active ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" : "none",
                    transition: "color 0.2s, filter 0.2s",
                    pointerEvents: "none",
                  }}
                />
              </motion.div>

              <span
                className="text-[9.5px] font-semibold relative z-10 tracking-tight"
                style={{
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  transition: "color 0.2s",
                }}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}