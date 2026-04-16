import { useState, useEffect } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Zap, CheckCircle2, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ALL_EVENTS = [
  { id: "price_drop",      label: "Price Drop",       desc: "When a tracked shoe drops in price" },
  { id: "wishlist_add",    label: "Wishlist Add",      desc: "When a shoe is saved to wishlist" },
  { id: "shoe_search",     label: "Shoe Search",       desc: "When a user runs an AI search" },
  { id: "new_deal",        label: "New Deal",          desc: "When a new deal is discovered" },
  { id: "price_track_add", label: "Price Track Add",   desc: "When a shoe is added to price tracking" },
];

function generateSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function WebhooksSection() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(null);
  const emptyForm = { name: "", url: "", events: [], secret: generateSecret(), is_active: true };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => { loadWebhooks(); }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    const data = await base44.entities.Webhook.list("-created_date", 50);
    setWebhooks(data);
    setLoading(false);
  };

  const toggleEvent = (id) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(id) ? f.events.filter((e) => e !== id) : [...f.events, id],
    }));
  };

  const saveWebhook = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return toast.error("Name and URL are required");
    if (form.events.length === 0) return toast.error("Select at least one event");
    setSaving(true);
    const created = await base44.entities.Webhook.create(form);
    setWebhooks((prev) => [created, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    toast.success("Webhook created!");
  };

  const deleteWebhook = async (id) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    await base44.entities.Webhook.delete(id);
    toast.success("Webhook removed");
  };

  const toggleActive = async (webhook) => {
    const updated = { ...webhook, is_active: !webhook.is_active };
    setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? updated : w)));
    await base44.entities.Webhook.update(webhook.id, { is_active: !webhook.is_active });
  };

  const testWebhook = async (webhook) => {
    setTesting(webhook.id);
    const body = JSON.stringify({
      event: "test",
      timestamp: new Date().toISOString(),
      data: { message: "This is a test ping from uShoe", webhook_name: webhook.name },
    });
    const headers = { "Content-Type": "application/json" };
    if (webhook.secret) headers["X-Webhook-Secret"] = webhook.secret;
    const res = await fetch(webhook.url, { method: "POST", headers, body }).catch(() => null);
    setTesting(null);
    if (res && res.ok) toast.success("Test ping delivered!");
    else toast.error("Delivery failed — check your endpoint URL");
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-lg">Webhooks</h2>
          <p className="text-sm text-muted-foreground">Forward events to Zapier, Make, Slack, or any HTTP endpoint</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setForm(emptyForm); setShowSecret(false); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Webhook
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={saveWebhook}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-5 overflow-hidden"
          >
            <h3 className="font-heading font-semibold">New Webhook</h3>

            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. My Zapier Hook"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Endpoint URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://hooks.zapier.com/..." type="url"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition font-mono" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Secret Token <span className="text-muted-foreground font-normal text-xs">(sent as X-Webhook-Secret header)</span></label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })}
                    type={showSecret ? "text" : "password"}
                    className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition font-mono pr-10" />
                  <button type="button" onClick={() => setShowSecret(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => setForm({ ...form, secret: generateSecret() })}
                  className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors" title="Regenerate">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => copy(form.secret)}
                  className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors" title="Copy">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trigger Events</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_EVENTS.map((ev) => {
                  const active = form.events.includes(ev.id);
                  return (
                    <button type="button" key={ev.id} onClick={() => toggleEvent(ev.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        active ? "border-primary bg-primary/5" : "border-border bg-secondary/50 hover:border-border/80"
                      }`}>
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${active ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                        {active && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{ev.label}</p>
                        <p className="text-xs text-muted-foreground">{ev.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Save Webhook
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-lg">No webhooks yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Connect to Zapier, Make, Slack or any HTTP endpoint</p>
          <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">
            Create First Webhook
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {webhooks.map((wh, i) => (
              <motion.div key={wh.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.04 }}
                className={`bg-card border rounded-2xl p-5 transition-all ${wh.is_active ? "border-border/60" : "border-border/30 opacity-60"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-semibold">{wh.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${wh.is_active ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-secondary text-muted-foreground"}`}>
                        {wh.is_active ? "Active" : "Paused"}
                      </span>
                      {wh.trigger_count > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{wh.trigger_count} triggers</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-sm text-muted-foreground font-mono truncate max-w-xs">{wh.url}</p>
                      <button onClick={() => copy(wh.url)} className="flex-shrink-0 text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                    {wh.events?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {wh.events.map((ev) => (
                          <span key={ev} className="text-[10px] px-2 py-0.5 bg-secondary rounded-full text-muted-foreground font-medium">
                            {ALL_EVENTS.find((e) => e.id === ev)?.label || ev}
                          </span>
                        ))}
                      </div>
                    )}
                    {wh.last_triggered && (
                      <p className="text-xs text-muted-foreground/70 mt-2">Last triggered: {new Date(wh.last_triggered).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => testWebhook(wh)} disabled={testing === wh.id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50">
                      {testing === wh.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      Test
                    </button>
                    <button onClick={() => toggleActive(wh)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      {wh.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    <button onClick={() => deleteWebhook(wh.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* How it works */}
      <div className="bg-secondary/50 border border-border rounded-2xl p-5 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">How it works</p>
        <p>When a matching event fires, a <code className="text-xs bg-background px-1 py-0.5 rounded border border-border">POST</code> is sent to your endpoint:</p>
        <pre className="text-xs bg-background rounded-xl p-3 overflow-x-auto font-mono border border-border">{`{
  "event": "price_drop",
  "timestamp": "2026-04-15T10:00:00Z",
  "data": { ... }
}`}</pre>
        <p>Works with <strong className="text-foreground">Zapier</strong>, <strong className="text-foreground">Make</strong>, <strong className="text-foreground">Slack</strong>, or any HTTP endpoint.</p>
      </div>
    </div>
  );
}