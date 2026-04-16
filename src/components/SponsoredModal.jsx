import { X, Rocket, Star, Check, Zap } from "lucide-react";
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

export default function SponsoredModal({ shoe, onClose, onSponsorComplete }) {
  const [selected, setSelected] = useState("featured");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSponsor = async () => {
    if (!shoe?.id) return;
    setLoading(true);

    const plan = SPONSOR_PLANS.find((p) => p.id === selected);
    const sponsoredUntil = new Date();
    sponsoredUntil.setDate(sponsoredUntil.getDate() + plan.durationDays);

    try {
      await base44.entities.Shoe.update(shoe.id, {
        is_sponsored: true,
        sponsored_plan: selected,
        sponsored_until: sponsoredUntil.toISOString(),
      });

      setDone(true);
      toast.success(`${shoe?.name || "Shoe"} sponsored for ${plan.durationDays} days! 🚀`);
      onSponsorComplete?.();
      setTimeout(onClose, 1800);
    } catch (error) {
      toast.error("Failed to sponsor shoe. Please try again.");
    }
    setLoading(false);
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
                  <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-semibold">BETA</span>
                </div>
                <h2 className="font-heading font-bold text-xl">
                  {shoe ? `Boost "${shoe.name}"` : "Boost Your Shoe"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Get more eyes on your shoe. Beta sponsorships are free — no charge will be made.
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Plans */}
          {!done ? (
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
                {loading ? (
                  <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                Sponsor Now (Beta — Free)
              </button>
              <p className="text-center text-xs text-muted-foreground">
                🚧 No payment processed during beta
              </p>
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-heading font-bold text-xl">You're live! 🚀</h3>
              <p className="text-muted-foreground text-sm mt-2">Your shoe is now sponsored on uShoe.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}