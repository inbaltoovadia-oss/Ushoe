import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Sun, Moon, Sparkles, Menu, X, Wand2, ChevronDown, Settings } from "lucide-react";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import LocationPicker from "./LocationPicker";

export default function Navbar() {
  const location = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [loc, setLoc] = useState(getLocation());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsRef = useRef(null);

  useEffect(() => subscribeLocation(setLoc), []);

  // Close tools menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setShowToolsMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  };

  const handleNavClick = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/discover", label: "Discover" },
    { to: "/trending", label: "Trending" },
    { to: "/deals", label: "Deals" },
    { to: "/wishlist", label: "Wishlist" },
    { to: "/price-drops", label: "Price Drops" },
  ];

  const toolLinks = [
    { to: "/fit-predictor", label: "Fit Predictor", emoji: "👟" },
    { to: "/outfit-matcher", label: "Outfit Matcher", emoji: "✨" },
    { to: "/style-quiz", label: "Style Quiz", emoji: "🎯" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" onClick={handleNavClick}>
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg tracking-tight">
                U<span className="text-primary">shoe</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={handleNavClick}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* AI Tools Dropdown */}
              <div className="relative" ref={toolsRef}>
                <button
                  onClick={() => setShowToolsMenu((v) => !v)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    showToolsMenu ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  AI Tools
                  <ChevronDown className={`w-3 h-3 transition-transform ${showToolsMenu ? "rotate-180" : ""}`} />
                </button>
                {showToolsMenu && (
                  <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-2xl shadow-xl py-2 w-48 z-50">
                    {toolLinks.map((t) => (
                      <Link
                        key={t.to}
                        to={t.to}
                        onClick={() => { setShowToolsMenu(false); handleNavClick(); }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                      >
                        <span>{t.emoji}</span>
                        {t.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Location */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowLocationPicker((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-secondary/50"
                >
                  <MapPin className="w-3 h-3" />
                  <span className="max-w-[80px] truncate">{loc.city}</span>
                </button>
                {showLocationPicker && (
                  <div className="absolute top-full mt-2 right-0 z-50">
                    <LocationPicker onClose={() => setShowLocationPicker(false)} />
                  </div>
                )}
              </div>

              <Link to="/search" onClick={handleNavClick} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <Search className="w-5 h-5 text-muted-foreground" />
              </Link>
              <Link to="/settings" onClick={handleNavClick} className="p-2 rounded-xl hover:bg-secondary transition-colors hidden sm:block">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Link>

              <button onClick={toggleDark} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                {dark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
              </button>

              <button
                className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => { setMobileOpen(false); handleNavClick(); }}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.to) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 pb-1">
                <p className="text-xs text-muted-foreground px-4 pb-1 font-medium uppercase tracking-wider">AI Tools</p>
                {toolLinks.map((t) => (
                  <Link
                    key={t.to}
                    to={t.to}
                    onClick={() => { setMobileOpen(false); handleNavClick(); }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </Link>
                ))}
              </div>
              <Link
                to="/settings"
                onClick={() => { setMobileOpen(false); handleNavClick(); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground rounded-xl hover:bg-secondary"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <button
                onClick={() => { setShowLocationPicker(true); setMobileOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground rounded-xl hover:bg-secondary"
              >
                <MapPin className="w-4 h-4" />
                {loc.city} — tap to update
              </button>
            </div>
          </div>
        )}
      </nav>
      {showLocationPicker && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowLocationPicker(false)} />
      )}
    </>
  );
}