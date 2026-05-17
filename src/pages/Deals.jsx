/**
 * Deals page — validated deals only.
 * 1. Web Deals: non-catalog, live, shipping-validated via Deal Agent
 * 2. Catalog shoes with dynamic DealIndicator badges (only shown when deal confirmed)
 */
import { useState } from "react";
import { Tag, ShieldCheck, AlertCircle, Bot, Copy, ExternalLink, Search } from "lucide-react";
import { motion } from "framer-motion";
import WebDealsSection from "../components/WebDealsSection";
import DealScannerChat from "../components/DealScannerChat";
import { getLocation } from "../lib/locationStore";

export default function Deals() {
  const loc = getLocation();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 rounded-xl">
              <Tag className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl">Deals & Discounts</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Live deals shipping to {loc.city} · Direct retailer links
              </p>
            </div>
          </div>

          {/* Trust banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, color: "text-green-600", label: "Shipping Validated", desc: "Only shows deals that ship to you" },
              { icon: Tag,         color: "text-accent",    label: "Live Prices",         desc: "Direct links to retailer product pages" },
              { icon: AlertCircle, color: "text-primary",   label: "No Expired Deals",    desc: "Only active, purchasable offers" },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 bg-card border border-border/50 rounded-2xl px-4 py-3">
                <Icon className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Deal Scanner Agent — on-demand AI chat */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-accent" />
            <h2 className="font-heading font-bold text-xl">AI Deal Scanner</h2>
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Ask anything</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Ask the agent to scan the web for deals on any shoe, brand, or category.
          </p>
          <DealScannerChat />
        </section>

        {/* How-to Guide */}
        <section className="mb-10">
          <div className="bg-card border border-border/50 rounded-2xl p-5">
            <h2 className="font-heading font-bold text-base mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              How to Get a Deal in 3 Steps
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", icon: Copy, title: "Copy the shoe name", desc: "Each deal card has a copy button — tap it to copy the full shoe name to your clipboard." },
                { step: "2", icon: ExternalLink, title: "Open the retailer's site", desc: "Click 'Buy at [store]' to go directly to the retailer, then paste the name into their search bar." },
                { step: "3", icon: Tag, title: "Find & claim the deal", desc: "Search for your shoe, confirm the price matches, and complete your purchase." },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">{step}</div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <p className="text-sm font-semibold">{title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Web Deals — live, validated, direct retailer links */}
        <section className="mb-12">
          <WebDealsSection />
        </section>

      </div>
    </div>
  );
}