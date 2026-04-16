import { useState } from "react";
import { Check, Crown, Zap, Rocket, Star } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Star,
    color: "border-border",
    badgeColor: "bg-secondary text-muted-foreground",
    iconColor: "text-muted-foreground",
    description: "Get started with basic shoe discovery",
    benefits: [
      "Browse up to 50 shoes",
      "Basic AI search (5/day)",
      "Wishlist (up to 10 items)",
      "Community deals",
    ],
    limitations: [
      "No price drop alerts",
      "No sponsored listings",
      "No advanced filters",
      "No outfit matcher",
    ],
    cta: "Current Free Plan",
    disabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/ month",
    icon: Zap,
    color: "border-primary",
    badgeColor: "bg-primary/10 text-primary",
    iconColor: "text-primary",
    description: "Everything you need for serious sneakerheads",
    benefits: [
      "Unlimited shoe browsing",
      "Unlimited AI searches",
      "Unlimited wishlist",
      "Price drop alerts",
      "Advanced filters & sorting",
      "Outfit matcher AI",
      "Fit predictor AI",
      "Web live results",
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    id: "brand",
    name: "Brand",
    price: "$29",
    period: "/ month",
    icon: Rocket,
    color: "border-accent",
    badgeColor: "bg-accent/10 text-accent",
    iconColor: "text-accent",
    description: "For brands & retailers wanting maximum exposure",
    benefits: [
      "Everything in Pro",
      "Sponsored shoe listings",
      "Featured placement on homepage",
      "Analytics dashboard",
      "Priority support",
      "Up to 5 sponsored shoes",
      "Brand badge on listings",
    ],
    limitations: [],
    cta: "Upgrade to Brand",
  },
];

const PLAN_KEY = "ushoe_plan";

export default function PlansSection() {
  const [currentPlan, setCurrentPlan] = useState(() => localStorage.getItem(PLAN_KEY) || "free");

  const handleSelectPlan = (planId) => {
    if (planId === currentPlan) return;
    setCurrentPlan(planId);
    localStorage.setItem(PLAN_KEY, planId);
    const plan = PLANS.find(p => p.id === planId);
    toast.success(`Switched to ${plan.name} plan! 🎉`);
  };

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
        <Crown className="w-5 h-5 text-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">
            Current plan: <span className="text-primary font-bold capitalize">{currentPlan}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Beta mode — switching plans is instant and free for now</p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const isActive = currentPlan === plan.id;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative bg-card border-2 rounded-2xl p-5 transition-all ${
                isActive ? "border-primary shadow-lg shadow-primary/10" : plan.color + " hover:shadow-md"
              }`}
            >
              {plan.popular && !isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold">
                  Most Popular
                </div>
              )}
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Active
                </div>
              )}

              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${plan.badgeColor}`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="font-heading font-bold text-xl">{plan.name}</h3>
                      <span className="font-heading font-bold text-2xl">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isActive}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-secondary text-muted-foreground cursor-default"
                      : plan.id === "pro"
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : plan.id === "brand"
                      ? "bg-accent text-accent-foreground hover:opacity-90"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {isActive ? "Current Plan" : plan.cta}
                </button>
              </div>

              {/* Benefits */}
              <div className="mt-4 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {plan.benefits.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
                {plan.limitations.map((l) => (
                  <div key={l} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-3.5 h-3.5 flex-shrink-0 text-center leading-none text-xs">✕</span>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        🚧 Beta — all plans are free during testing. Real billing coming soon.
      </p>
    </div>
  );
}