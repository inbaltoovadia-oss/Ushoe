import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Sun, Moon, Menu, X, Crown, ShieldCheck, Ruler, ArrowLeft, MessageSquare } from "lucide-react";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import LocationPicker from "./LocationPicker";
import { useAuth } from "@/lib/AuthContext";
import { getSizeLabel, subscribeSize } from "../lib/sizeStore";
import { AnimatePresence, motion } from "framer-motion";
import SizeSelector from "./SizeSelector";

const ROOT_PATHS = ["/", "/discover", "/for-you", "/trending", "/wishlist", "/settings", "/assistant", "/rotation", "/collections"];

const PAGE_TITLES = {
  "/search": "Search",
  "/shoe": "Shoe Details",
  "/nearby-stores": "Store Finder",
  "/compare": "Compare",
  "/price-drops": "Price Drops",
  "/deals": "Deals",
  "/style-quiz": "Style Quiz",
  "/fit-predictor": "Fit Predictor",
  "/outfit-matcher": "Outfit Matcher",
  "/survey": "Style Survey",
  "/subscription": "Plans",
  "/admin": "Admin",
  "/assistant": "AI Assistant",
  "/find-shoe": "Find This Shoe",
  "/rotation": "Best For",
  "/collections": "Collections"
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k + "/"));
  return prefix ? PAGE_TITLES[prefix] : "";
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const isRootScreen = ROOT_PATHS.includes(location.pathname);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [loc, setLoc] = useState(getLocation());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [sizeLabel, setSizeLabel] = useState(getSizeLabel());

  useEffect(() => subscribeSize(() => setSizeLabel(getSizeLabel())), []);
  useEffect(() => subscribeLocation(setLoc), []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  };

  const handleNavClick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const isActive = (path) => location.pathname === path;

  const navLinks = [
  { to: "/", label: "Home" },
  { to: "/discover", label: "Discover" },
  { to: "/for-you", label: "For You" },
  { to: "/find-shoe", label: "🔍 Find Shoe" },
  { to: "/assistant", label: "AI Assistant " },
  { to: "/trending", label: "Trending" },
  { to: "/deals", label: "Deals" },
  { to: "/nearby-stores", label: "Stores" },
  { to: "/wishlist", label: "Wishlist" },
  { to: "/price-drops", label: "Price Drops" },
  { to: "/rotation", label: "Best For" }];


  const toolLinks = [
  { to: "/nearby-stores", label: "Nearby Stores", emoji: "📍" },
  { to: "/fit-predictor", label: "Fit Predictor", emoji: "👟" },
  { to: "/outfit-matcher", label: "Outfit Matcher", emoji: "✨" },
  { to: "/style-quiz", label: "Style Quiz", emoji: "🎯" },
  { to: "/rotation", label: "Best For", emoji: "✨" },
  { to: "/collections", label: "Collections", emoji: "📂" }];


  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b pt-[env(safe-area-inset-top)] liquid-glass-bar">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Mobile: back button on child screens / logo on root screens */}
            <div className="md:hidden flex items-center">
              {isRootScreen ?
              <Link to="/" className="flex items-center gap-2" onClick={handleNavClick}>
                  <span className="text-2xl">👟</span>
                  <span className="font-heading font-bold text-lg tracking-tight">
                    u<span className="text-primary font-black">shoe</span>
                  </span>
                </Link> :

              <div className="flex items-center gap-2">
                  <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1 p-1.5 rounded-xl hover:bg-secondary transition-colors -ml-1">
                  
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="font-heading font-semibold text-base">
                    {getPageTitle(location.pathname)}
                  </span>
                </div>
              }
            </div>

            {/* Desktop logo */}
            <Link to="/" className="hidden md:flex items-center gap-2" onClick={handleNavClick}>
              <span className="text-2xl">👟</span>
              <span className="font-heading font-bold text-lg tracking-tight">
                u<span className="text-primary font-black">shoe</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) =>
              <Link
                key={link.to}
                to={link.to}
                onClick={handleNavClick}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(link.to) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`
                }>
                
                  {link.label}
                </Link>
              )}

              {/* AI Tools — visible inline on desktop */}
              {toolLinks.map((t) =>
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={handleNavClick}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(t.to) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`
                  }>
                  <span className="text-xs">{t.emoji}</span>
                  {t.label}
                </Link>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Location */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowLocationPicker((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-secondary/50">
                  
                  <MapPin className="w-3 h-3" />
                  <span className="max-w-[80px] truncate">{loc.city}</span>
                </button>
                {showLocationPicker &&
                <div className="absolute top-full mt-2 right-0 z-50">
                    <LocationPicker onClose={() => setShowLocationPicker(false)} />
                  </div>
                }
              </div>

              <Link to="/search" onClick={handleNavClick} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <Search className="w-5 h-5 text-muted-foreground" />
              </Link>

              {/* Size badge */}
              <button
                onClick={() => setShowSizePicker(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                title="My shoe size">
                
                <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={sizeLabel ? "text-primary font-semibold" : "text-muted-foreground"}>
                  {sizeLabel || "Set size"}
                </span>
              </button>

              <Link
                to="/subscription"
                onClick={handleNavClick}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive("/subscription") ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"}`
                }>
                
                <Crown className="w-3.5 h-3.5" />
                Plans
              </Link>

              {user?.role === "admin" &&
              <Link to="/admin" onClick={handleNavClick} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:opacity-80 transition-opacity">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              }

              {!isAuthenticated && (
                <button
                  onClick={navigateToLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Sign In
                </button>
              )}

              <button onClick={toggleDark} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                {dark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
              </button>

              <button
                className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}>
                
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen &&
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) =>
            <Link
              key={link.to}
              to={link.to}
              onClick={() => {setMobileOpen(false);handleNavClick();}}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isActive(link.to) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`
              }>
              
                  {link.label}
                </Link>
            )}
              <div className="pt-2 pb-1">
                <p className="text-xs text-muted-foreground px-4 pb-1 font-medium uppercase tracking-wider">AI Tools</p>
                {toolLinks.map((t) =>
              <Link
                key={t.to}
                to={t.to}
                onClick={() => {setMobileOpen(false);handleNavClick();}}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                
                    <span>{t.emoji}</span>
                    {t.label}
                  </Link>
              )}
              </div>
              <Link
              to="/subscription"
              onClick={() => {setMobileOpen(false);handleNavClick();}}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-primary rounded-xl hover:bg-secondary">
              
                <Crown className="w-4 h-4" />
                Plans & Subscription
              </Link>
              {user?.role === "admin" &&
            <Link
              to="/admin"
              onClick={() => {setMobileOpen(false);handleNavClick();}}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-400 rounded-xl hover:bg-secondary">
              
                  <ShieldCheck className="w-4 h-4" />
                  Admin Panel
                </Link>
            }
              <Link
              to="/feedback"
              onClick={() => {setMobileOpen(false);handleNavClick();}}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground rounded-xl hover:bg-secondary">
              
                <MessageSquare className="w-4 h-4" />
                Send Feedback
              </Link>
              <button
              onClick={() => {setShowLocationPicker(true);setMobileOpen(false);}}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground rounded-xl hover:bg-secondary">
              
                <MapPin className="w-4 h-4" />
                {loc.city} — tap to update
              </button>
            </div>
          </div>
        }
      </nav>
      {showLocationPicker &&
      <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowLocationPicker(false)} />
      }
      <AnimatePresence>
        {showSizePicker && <SizeSelector onClose={() => setShowSizePicker(false)} />}
      </AnimatePresence>
    </>);

}