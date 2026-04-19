import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Flame, Heart, Settings } from "lucide-react";

const TABS = [
  { to: "/",         label: "Home",     icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function MobileBottomTabs() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} style={{ pointerEvents: "none" }} />
            <span className={`text-[10px] font-medium ${active ? "text-primary" : ""}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}