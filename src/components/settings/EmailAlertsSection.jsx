import { useState, useEffect } from "react";
import { Mail, Bell, Loader2, CheckCircle, BellOff, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function EmailAlertsSection() {
  const [trackedItems, setTrackedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [user, items] = await Promise.all([
      base44.auth.me(),
      base44.entities.PriceTrack.list("-created_date", 50),
    ]);
    setUserEmail(user.email);
    setTrackedItems(items);
    setLoading(false);
  };

  const sendTestAlert = async () => {
    if (!trackedItems.length) {
      toast.error("You're not tracking any shoes yet.");
      return;
    }
    setSending(true);
    // Build a summary of tracked items to send
    const shoeList = trackedItems
      .map(t => `• ${t.shoe_brand} ${t.shoe_name} — tracked at $${t.tracked_price}, current price $${t.current_price ?? t.tracked_price}`)
      .join("\n");

    const drops = trackedItems.filter(t => (t.current_price ?? t.tracked_price) < t.tracked_price);

    const subject = drops.length > 0
      ? `🎉 Price Drop Alert — ${drops.length} shoe${drops.length > 1 ? "s" : ""} got cheaper!`
      : `👟 uShoe Price Tracker Update — ${trackedItems.length} shoe${trackedItems.length > 1 ? "s" : ""} tracked`;

    const dropsText = drops.length > 0
      ? `\n\n🔥 PRICE DROPS DETECTED:\n${drops.map(d => `• ${d.shoe_brand} ${d.shoe_name}: $${d.tracked_price} → $${d.current_price} (save $${(d.tracked_price - d.current_price).toFixed(0)})`).join("\n")}`
      : "";

    const body = `Hi there! Here's your uShoe price tracking update:
${dropsText}

📋 All tracked shoes:
${shoeList}

${drops.length > 0 ? "🛒 Head to uShoe now to grab these deals before they sell out!" : "We'll email you as soon as any of these drop in price."}

— The uShoe Team`;

    await base44.integrations.Core.SendEmail({
      to: userEmail,
      subject,
      body,
      from_name: "uShoe Price Alerts",
    });

    setSending(false);
    setLastSent(new Date());
    toast.success(`Price alert sent to ${userEmail}!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const drops = trackedItems.filter(t => (t.current_price ?? t.tracked_price) < t.tracked_price);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground mb-1">Automatic daily email alerts</p>
          <p className="text-muted-foreground">
            uShoe checks for price drops daily and emails you at <strong>{userEmail}</strong> whenever a tracked shoe goes on sale.
            Alerts are sent automatically — no action needed.
          </p>
        </div>
      </div>

      {/* Tracked Shoes Summary */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">Tracked Shoes</h3>
          <Link to="/price-drops" className="text-xs text-primary hover:underline">Manage →</Link>
        </div>

        {trackedItems.length === 0 ? (
          <div className="text-center py-6">
            <BellOff className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No shoes tracked yet.</p>
            <Link to="/" className="text-xs text-primary hover:underline mt-1 inline-block">Browse shoes to track →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {drops.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  {drops.length} price drop{drops.length > 1 ? "s" : ""} detected! Check your email.
                </p>
              </div>
            )}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {trackedItems.map(item => {
                const isDrop = (item.current_price ?? item.tracked_price) < item.tracked_price;
                return (
                  <div key={item.id} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl ${isDrop ? "bg-green-50/50 dark:bg-green-950/10" : "bg-secondary/40"}`}>
                    <Bell className={`w-3.5 h-3.5 flex-shrink-0 ${isDrop ? "text-green-600" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.shoe_brand} {item.shoe_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isDrop ? (
                        <span className="text-xs font-bold text-green-600">${item.current_price} <span className="line-through text-muted-foreground font-normal">${item.tracked_price}</span></span>
                      ) : (
                        <span className="text-xs text-muted-foreground">${item.tracked_price}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Send Alert */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-heading font-semibold mb-1">Send Alert Now</h3>
          <p className="text-sm text-muted-foreground">
            Manually trigger a price summary email to <strong>{userEmail}</strong>
          </p>
        </div>

        <button
          onClick={sendTestAlert}
          disabled={sending || trackedItems.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {sending ? "Sending…" : "Send Price Update Email"}
        </button>

        {lastSent && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            Last sent at {lastSent.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Auto Schedule Info */}
      <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-2xl text-sm text-muted-foreground">
        <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-foreground">Auto alerts:</strong> uShoe checks prices daily at 9:00 AM and automatically emails you when any tracked shoe drops in price.
        </p>
      </div>
    </div>
  );
}