import { X, Rocket, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { base44 } from "@/api/base44Client";

const SPONSOR_PLANS = [
  {
    id: "starter",
    name: "Starter Boost",
    price: "$4.99",
    period: "/ week",
    durationDays: 7,
    description: "Get your shoe featured in search results",
    perks: ["Sponsored tag on shoe card", "Boosted in search results", "500+ impressions", "1 week duration"],
  },
  {
    id: "featured",
    name: "Homepage Feature",
    price: "$14.99",
    period: "/ 2 weeks",
    durationDays: 14,
    description: "Prime placement on the homepage",
    perks: ["Sponsored tag on homepage", "Top of trending feed", "2,000+ impressions", "Bold \"Featured\" badge", "2 weeks duration"],
    popular: true,
  },
  {
    id: "premium",
    name: "Max Visibility",
    price: "$29.99",
    period: "/ month",
    durationDays: 30,
    description: "Maximum exposure across the entire platform",
    perks: ["Homepage + search + discover", "Priority placement everywhere", "10,000+ impressions", "Custom brand badge", "Analytics report", "30 days duration"],
  },
];

function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

export default function SponsoredModal({ shoe, onClose, onSponsorComplete }) {
  const [selected, setSelected] = useState("featured");
  const [loading, setLoading] = useState(false);

  const handleSponsor = async () => {
    if (!shoe?.id) return;

    if (isInIframe()) {
      alert("Checkout only works from the published app. Please open the app directly.");
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke("createCheckout", {
        planId: selected,
        shoeId: shoe.id,
        shoeName: shoe.name,
        successUrl: `${window.location.origin}/admin?sponsored=1&shoeId=${shoe.id}&plan=${selected}`,
        cancelUrl:  `${window.location.origin}/admin?sponsored=canceled`,
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Could not start checkout. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      toast.error("Checkout failed: " + err.message);
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Rocket className="w-5 h-5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Sponsor a Shoe</span>
                </div>
                <h2 className="font-heading font-bold text-xl">
                  {shoe ? `Boost "${shoe.name}"` : "Boost Your Shoe"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Get more eyes on your shoe with a paid promotion.
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="p-6 space-y-3">
            {SPONSOR_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative ${
                  selected === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    Most Popular
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{plan.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {plan.perks.map((perk) => (
                        <span key={perk} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-green-500" /> {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-heading font-bold text-lg">{plan.price}</p>
                    <p className="text-xs text-muted-foreground">{plan.period}</p>
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={handleSponsor}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {loading ? "Redirecting to checkout…" : "Sponsor Now — Secure Payment"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Powered by Stripe · Secure checkout
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}