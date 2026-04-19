import { useState } from "react";
import { Crown, Zap, Ruler, UserX, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PlansSection from "../components/settings/PlansSection";
import WebhooksSection from "../components/settings/WebhooksSection";
import SizeSection from "../components/settings/SizeSection";
import { base44 } from "@/api/base44Client";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("size");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const TABS = [
    { id: "size", label: "My Size", icon: Ruler },
    { id: "plan", label: "My Plan", icon: Crown },
    { id: "webhooks", label: "Webhooks", icon: Zap },
  ];

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== "delete") return;
    setDeleting(true);
    await base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading font-bold text-3xl">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your size, plan and integrations</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-secondary rounded-2xl p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {activeTab === "size" && <SizeSection />}
        {activeTab === "plan" && <PlansSection />}
        {activeTab === "webhooks" && <WebhooksSection />}

        {/* Account Management */}
        <div className="mt-10 border border-destructive/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <UserX className="w-5 h-5 text-destructive" />
            <h2 className="font-heading font-semibold text-base text-destructive">Account Management</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-xl text-sm font-semibold hover:bg-destructive/20 transition-colors"
          >
            <UserX className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-destructive/10 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <h3 className="font-heading font-bold text-lg">Delete Account?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  This will permanently delete your account, wishlist, preferences and all data. Type <strong>delete</strong> to confirm.
                </p>
                <input
                  type="text"
                  placeholder="Type 'delete' to confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-destructive mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm.toLowerCase() !== "delete" || deleting}
                    className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}