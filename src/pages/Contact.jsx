import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Twitter, Instagram, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all fields.");
      return;
    }
    // In a real app this would POST to a backend / email service
    setSent(true);
    toast.success("Message sent! We'll get back to you soon.");
  };

  const SOCIALS = [
    { icon: Twitter,   label: "@ushoeapp",      href: "https://twitter.com/ushoeapp",    color: "text-sky-500" },
    { icon: Instagram, label: "@ushoe",          href: "https://instagram.com/ushoe",     color: "text-pink-500" },
    { icon: Mail,      label: "hello@ushoe.app", href: "mailto:hello@ushoe.app",          color: "text-primary" },
  ];

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="py-12 text-center">
          <span className="text-4xl mb-4 block">💬</span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl mb-4">Contact Us</h1>
          <p className="text-muted-foreground text-lg">
            Have a question, suggestion, or just want to say hi? We'd love to hear from you.
          </p>
        </div>

        {/* Social / email links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {SOCIALS.map(({ icon: Icon, label, href, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
              <span className="text-sm font-medium truncate">{label}</span>
            </a>
          ))}
        </div>

        {/* Contact form */}
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-xl">Send a Message</h2>
          </div>

          {sent ? (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="font-heading font-bold text-xl">Thanks for reaching out!</p>
              <p className="text-muted-foreground text-sm">We typically respond within 1–2 business days.</p>
              <button
                onClick={() => { setSent(false); setForm({ name: "", email: "", message: "" }); }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Message</label>
                <textarea
                  rows={5}
                  placeholder="What's on your mind?"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}