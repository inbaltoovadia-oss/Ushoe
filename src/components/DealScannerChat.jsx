/**
 * DealScannerChat — inline chat UI for the Deal Scanner Agent.
 * User picks a shoe from the catalog (or types a query), agent finds deals.
 */
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bot, Send, Loader2, Tag, Sparkles, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const STARTER_PROMPTS = [
  "Find the best deals on Nike running shoes",
  "Where can I buy Adidas Samba for cheapest?",
  "Any coupons for New Balance sneakers?",
  "Show me clearance basketball shoes",
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Tag className="w-3.5 h-3.5 text-accent" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border/60"
      }`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>
              ),
              p: ({ children }) => <p className="my-1">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {message.tool_calls?.filter(t => t.status === "running" || t.status === "in_progress").map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Scanning catalog…
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DealScannerChat({ prefilledShoe = null }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Pre-fill query if a specific shoe is passed in
  useEffect(() => {
    if (prefilledShoe && !started) {
      setInput(`Find the best deals and where to buy: ${prefilledShoe.brand} ${prefilledShoe.name} ($${prefilledShoe.price})`);
    }
  }, [prefilledShoe]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async (firstMessage) => {
    setSending(true);
    setStarted(true);
    const conv = await base44.agents.createConversation({
      agent_name: "deal_scanner",
      metadata: { name: "Deal Scan" },
    });
    setConversation(conv);

    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });

    await base44.agents.addMessage(conv, { role: "user", content: firstMessage });
    setSending(false);

    return () => unsubscribe();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");

    if (!conversation) {
      await startConversation(text);
      return;
    }

    setSending(true);
    await base44.agents.addMessage(conversation, { role: "user", content: text });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setConversation(null);
    setMessages([]);
    setStarted(false);
    setInput(prefilledShoe ? `Find the best deals and where to buy: ${prefilledShoe.brand} ${prefilledShoe.name} ($${prefilledShoe.price})` : "");
  };

  if (!started) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-accent/10 rounded-xl">
            <Bot className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-base">Deal Scanner Agent</h3>
            <p className="text-xs text-muted-foreground">Ask me to find deals on any shoe — I'll search catalog & web</p>
          </div>
        </div>

        {/* Starter prompts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 0); }}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about deals on any shoe…"
            className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Scan Deals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "520px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent/10 rounded-lg">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <span className="font-heading font-semibold text-sm">Deal Scanner Agent</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <button onClick={reset} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            msg.content || msg.tool_calls?.length ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageBubble message={msg} />
              </motion.div>
            ) : null
          ))}
        </AnimatePresence>
        {sending && messages.length === 0 && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Tag className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="bg-card border border-border/60 rounded-2xl px-4 py-3 flex gap-1.5 items-center">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-3 flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up…"
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="p-2 bg-accent text-accent-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}