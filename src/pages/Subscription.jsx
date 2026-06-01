import { useState, useEffect } from "react";
import { Check, Crown, Zap, Rocket, Star, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getPlan, subscribePlan } from "@/lib/planStore";
import { base44 } from "@/api/base44Client";

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
      "Browse shoes catalog",
      "Basic AI search (5/day)",
      "Wishlist (up to 10 items)",
      "Community deals",
    ],
    limitations: [
      "No price drop alerts",
      "No advanced filters",
      "No outfit matcher",
      "No fit predictor",
    ],
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
      "Unlimited AI searches",
      "Unlimited wishlist",
      "Price drop & restock alerts",
      "Advanced filters & sorting",
      "Outfit matcher AI",
      "Fit predictor AI",
      "Best deal near you",
      "Exact store availability",
    ],
    limitations: [],
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
      "Up to 5 sponsored shoes",
      "Brand badge on listings",
      "Priority support",
    ],
    limitations: [],
  },
];

function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

export default function Subscription() {
  const [currentPlan, setCurrentPlan] = useState(getPlan());
  const [loadingPlan, setLoadingPlan] = useState(null);

  useEffect(() => subscribePlan(setCurrentPlan), []);

  // Handle success/cancel redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      toast.success("Payment successful! Your plan has been upgraded. 🎉");
      window.history.replaceState({}, "", "/subscription");
    }
    if (params.get("canceled") === "1") {
      toast.info("Payment canceled.");
      window.history.replaceState({}, "", "/subscription");
    }
  }, []);

  const handleSelectPlan = async (planId) => {
    if (planId === "free" || planId === currentPlan) return;

    if (isInIframe()) {
      alert("Checkout only works from the published app. Please open the app directly.");
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await base44.functions.invoke("createCheckout", {
        planId,
        successUrl: `${window.location.origin}/subscription?success=1`,
        cancelUrl:  `${window.location.origin}/subscription?canceled=1`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Could not start checkout. Please try again.");
      }
    } catch (err) {
      toast.error("Checkout failed: " + err.message);
    }
    setLoadingPlan(null);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            Choose Your Plan
          </div>
          <h1 className="font-heading font-bold text-3xl">Subscription Plans</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Currently on: <span className="font-bold text-primary capitalize">{currentPlan}</span> plan
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid gap-4">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isActive = currentPlan === plan.id;
            const isLoading = loadingPlan === plan.id;
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
                    disabled={isActive || plan.id === "free" || isLoading}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 flex items-center gap-2 ${
                      isActive || plan.id === "free"
                        ? "bg-secondary text-muted-foreground cursor-default"
                        : plan.id === "pro"
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : plan.id === "brand"
                        ? "bg-accent text-accent-foreground hover:opacity-90"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isActive ? "Current Plan" : plan.id === "free" ? "Free" : `Upgrade to ${plan.name}`}
                  </button>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {plan.benefits.map((b) => (
                    <div key={b} className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                  {plan.limitations.map((l) => (
                    <div key={l} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-3.5 flex-shrink-0 text-xs text-center">✕</span>
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Secure payments via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}