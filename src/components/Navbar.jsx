import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Search, Heart, MapPin, Sun, Moon, Sparkles, Menu, X, ShoppingBag } from "lucide-react";
import { getLocation, subscribeLocation, detectLocation } from "../lib/locationStore";
import { getCartCount, subscribeCart } from "../lib/cartStore";
import CartDrawer from "./CartDrawer";

export default function Navbar() {
  const location = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [loc, setLoc] = useState(getLocation());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(getCartCount());
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => subscribeCart(() => setCartCount(getCartCount())), []);
  useEffect(() => subscribeLocation(setLoc), []);

  const handleLocationClick = async () => {
    setLocLoading(true);
    await detectLocation();
    setLocLoading(false);
  };

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/discover", label: "Discover" },
    { to: "/trending", label: "Trending" },
    { to: "/wishlist", label: "Wishlist" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-lg tracking-tight">
                U<span className="text-primary">shoe</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Location */}
              <button
                onClick={handleLocationClick}
                disabled={locLoading}
                className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-secondary/50 disabled:opacity-50"
              >
                {locLoading ? (
                  <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MapPin className="w-3 h-3" />
                )}
                <span className="max-w-[80px] truncate">{loc.city}</span>
              </button>

              <Link to="/search" className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <Search className="w-5 h-5 text-muted-foreground" />
              </Link>

              <button onClick={toggleDark} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                {dark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
              </button>

              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                className="md:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.to)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLocationClick}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground rounded-xl hover:bg-secondary"
              >
                <MapPin className="w-4 h-4" />
                {loc.city} — tap to update
              </button>
            </div>
          </div>
        )}
      </nav>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}