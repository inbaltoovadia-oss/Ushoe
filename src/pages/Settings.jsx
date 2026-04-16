import { useState, useEffect } from "react";
import { Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";
import PlansSection from "../components/settings/PlansSection";
import WebhooksSection from "../components/settings/WebhooksSection";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("plan");

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading font-bold text-3xl">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your plan and integrations</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-secondary rounded-2xl p-1.5">
          {[
            { id: "plan", label: "My Plan", icon: Crown },
            { id: "webhooks", label: "Webhooks", icon: Zap },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "plan" && <PlansSection />}
        {activeTab === "webhooks" && <WebhooksSection />}
      </div>
    </div>
  );
}