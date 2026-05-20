import { useState, useEffect } from "react";
import { MessageSquare, Loader2, CheckCircle, ExternalLink, Bell, BellOff, Trash2, Info, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DiscordAlertsSection() {
  const [profile, setProfile] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [trackedCount, setTrackedCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [profiles, tracked] = await Promise.all([
      base44.entities.UserProfile.list("-created_date", 1),
      base44.entities.PriceTrack.list("-created_date", 100),
    ]);
    const p = profiles[0] || null;
    setProfile(p);
    setWebhookUrl(p?.discord_webhook_url || "");
    setEnabled(p?.discord_alerts_enabled || false);
    setTrackedCount(tracked.length);
    setLoading(false);
  };

  const save = async () => {
    if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      toast.error("Please enter a valid Discord webhook URL (starts with https://discord.com/api/webhooks/)");
      return;
    }
    setSaving(true);
    const data = { discord_webhook_url: webhookUrl, discord_alerts_enabled: enabled };
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, data);
    } else {
      const newProfile = await base44.entities.UserProfile.create(data);
      setProfile(newProfile);
    }
    setSaving(false);
    toast.success("Discord settings saved!");
  };

  const toggle = async () => {
    if (!webhookUrl && !enabled) {
      toast.error("Add a webhook URL first");
      return;
    }
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, { discord_alerts_enabled: newEnabled });
      toast.success(newEnabled ? "Discord alerts enabled!" : "Discord alerts paused.");
    }
  };

  const sendTest = async () => {
    if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      toast.error("Please save a valid webhook URL first");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "✅ uShoe Test Notification",
            description: `Your Discord alerts are working! uShoe will notify you here whenever a size becomes available on your ${trackedCount} tracked shoe${trackedCount !== 1 ? "s" : ""}.`,
            color: 0x3b82f6,
            fields: [
              { name: "📋 Tracked Shoes", value: String(trackedCount), inline: true },
              { name: "⏱️ Check Frequency", value: "Every 30 minutes", inline: true },
            ],
            footer: { text: "uShoe Stock Alerts" },
            timestamp: new Date().toISOString(),
          }]
        }),
      });
      if (res.ok) {
        toast.success("Test message sent to Discord! Check your channel.");
      } else {
        toast.error("Failed to send — check your webhook URL.");
      }
    } catch {
      toast.error("Could not reach Discord. Check the URL.");
    }
    setTesting(false);
  };

  const clearWebhook = async () => {
    setWebhookUrl("");
    setEnabled(false);
    if (profile) {
      await base44.entities.UserProfile.update(profile.id, { discord_webhook_url: "", discord_alerts_enabled: false });
    }
    toast.success("Discord webhook removed.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const isConfigured = webhookUrl.startsWith("https://discord.com/api/webhooks/");

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground mb-1">Real-time Discord stock alerts</p>
          <p className="text-muted-foreground">
            Get notified in your Discord server the moment a size becomes available for any of your {trackedCount} tracked shoe{trackedCount !== 1 ? "s" : ""}. Checks every 30 minutes using live web data.
          </p>
        </div>
      </div>

      {/* How to get webhook */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-heading font-semibold text-sm">How to set up</h3>
        </div>
        <ol className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2"><span className="font-bold text-foreground">1.</span> Open Discord and go to your server (or create a private one)</li>
          <li className="flex items-start gap-2"><span className="font-bold text-foreground">2.</span> Right-click a channel → Edit Channel → Integrations → Webhooks</li>
          <li className="flex items-start gap-2"><span className="font-bold text-foreground">3.</span> Click "New Webhook" → Copy Webhook URL</li>
          <li className="flex items-start gap-2"><span className="font-bold text-foreground">4.</span> Paste it below and save</li>
        </ol>
        <a
          href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Discord webhook guide <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Webhook Input */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="font-heading font-semibold">Webhook URL</h3>
        <div className="flex gap-2">
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors font-mono"
          />
          {webhookUrl && (
            <button
              onClick={clearWebhook}
              className="p-3 rounded-xl border border-border hover:bg-destructive/10 hover:border-destructive/40 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={save}
            disabled={saving || !webhookUrl}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Webhook"}
          </button>

          {isConfigured && (
            <button
              onClick={sendTest}
              disabled={testing}
              className="flex items-center gap-2 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-40 transition-colors"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {testing ? "Sending…" : "Send Test Message"}
            </button>
          )}
        </div>
      </div>

      {/* Enable / Disable toggle */}
      {isConfigured && (
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {enabled
              ? <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              : <BellOff className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="font-semibold text-sm">{enabled ? "Alerts Active" : "Alerts Paused"}</p>
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? `Monitoring ${trackedCount} shoe${trackedCount !== 1 ? "s" : ""} — checks every 30 minutes`
                  : "Enable to start receiving Discord notifications"}
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-indigo-600" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      )}

      {/* No tracked shoes warning */}
      {trackedCount === 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-sm text-amber-800 dark:text-amber-300">
          <BellOff className="w-4 h-4 flex-shrink-0" />
          <p>You're not tracking any shoes yet. <a href="/price-drops" className="font-semibold underline">Add some →</a></p>
        </div>
      )}
    </div>
  );
}