import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, Brain, Zap, ArrowRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getUserProfile } from "../lib/userProfileStore";
import { rankShoes } from "../lib/personalizationEngine";
import ShoeCard from "../components/ShoeCard";
import ReactMarkdown from "react-markdown";
import PreferencesPanel from "../components/assistant/PreferencesPanel";
import { AnimatePresence as AP } from "framer-motion";

const STARTER_PROMPTS = [
  "What's the best running shoe for me right now?",
  "I need a comfortable everyday sneaker under $120",
  "What's trending in basketball shoes?",
  "Compare Nike vs Adidas for training",
  "Best shoe for wide feet?",
  "What shoes should I get for a gym and street combo?",
];

function isRTL(text) {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(text);
}

function MessageBubble({ msg, bestPickShoe, onFollowUp }) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
          style={{ background: "rgba(59,91,219,0.18)", border: "1px solid rgba(59,91,219,0.3)" }}>
          <Brain className="w-4 h-4" style={{ color: "#5B8BF5" }} />
        </div>
      )}

      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end flex flex-col" : ""}`}>
        {/* Message bubble */}
        {msg.content && (
          <div
            className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
            style={isUser
              ? { background: "#3B5BDB", color: "#fff" }
              : { background: "#1E2035", borderLeft: "3px solid #3B5BDB", color: "#E8EAF6" }
            }
            dir={isRTL(msg.content) ? "rtl" : "ltr"}
          >
            {isUser ? (
              <p>{msg.content}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed" style={{ color: "#E8EAF6" }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ color: "#5B8BF5", fontWeight: 700 }}>{children}</strong>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc" style={{ color: "#E8EAF6" }}>{children}</ul>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Best pick shoe — compact horizontal strip */}
        {!isUser && bestPickShoe && (
          <div className="w-full max-w-xs">
            <p className="text-[10px] mb-1.5 flex items-center gap-1" style={{ color: "#F59E0B" }}>
              <Zap className="w-3 h-3" /> Best Pick
            </p>
            <ShoeCard shoe={bestPickShoe} index={0} />
          </div>
        )}

        {/* Follow-up chips */}
        {!isUser && msg.followUps?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(q)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ background: "rgba(59,91,219,0.18)", color: "#7BA4F5", border: "1px solid rgba(59,91,219,0.3)" }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {!isUser && msg.usedWeb && (
          <p className="text-[10px] flex items-center gap-1" style={{ color: "#555" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Live web data used
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [catalogShoes, setCatalogShoes] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const init = async () => {
    const [shoes, profile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 80),
      getUserProfile(),
    ]);
    const ranked = rankShoes(shoes, profile, { limit: 50 });
    setCatalogShoes(ranked);
    setUserProfile(profile);
    setProfileLoaded(true);

    const hasProfile = profile?.survey_completed || profile?.recent_queries?.length > 0;
    const welcomeText = hasProfile
      ? `Hey! I'm your uShoe AI — I've been learning your style. You seem to like **${
          profile.preferred_brands?.[0] || profile.searched_brands?.[0] || "great shoes"
        }** and ${profile.main_use?.[0]?.toLowerCase() || "quality kicks"}. What are you looking for today?`
      : `Hey! I'm your uShoe AI — a real shoe specialist, not a chatbot. Tell me what you need and I'll give you one perfect pick. What are you shopping for?`;

    setMessages([{ role: "assistant", content: welcomeText, followUps: STARTER_PROMPTS.slice(0, 3) }]);
  };

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", content: q };
    const history = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const conversationHistory = history.map(m => ({ role: m.role, content: m.content }));

    const res = await base44.functions.invoke("shoeAssistant", {
      message: q,
      conversationHistory,
      userProfile,
      catalogSnapshot: catalogShoes.slice(0, 20).map(s => ({
        brand: s.brand, name: s.name, price: s.price,
        category: s.category, is_trending: s.is_trending, _score: s._score, id: s.id,
      })),
    });

    const data = res.data;
    const bestPick = data.best_pick_index >= 0 ? catalogShoes[data.best_pick_index] : null;

    const assistantMsg = {
      role: "assistant",
      content: data.reply || "I couldn't find a good answer. Try rephrasing!",
      bestPickShoe: bestPick,
      followUps: data.follow_up_questions || [],
      usedWeb: data.used_web,
    };

    await base44.entities.SearchHistory.create({ query: q, results_count: bestPick ? 1 : 0 });

    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const reset = () => {
    setMessages([]);
    init();
  };

  const hasSignals = userProfile?.survey_completed || userProfile?.recent_queries?.length > 0;

  return (
    <div
      className="flex flex-col"
      style={{
        height: "calc(100vh - 64px)",
        background: "#0D0D0F",
        width: "100%",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 pt-5 pb-3 flex-shrink-0 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(59,91,219,0.18)", border: "1px solid rgba(59,91,219,0.3)" }}
          >
            <Brain className="w-5 h-5" style={{ color: "#5B8BF5" }} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl" style={{ color: "#FFFFFF" }}>uShoe AI</h1>
            <p className="text-xs flex items-center gap-1.5" style={{ color: "#6B7280" }}>
              {profileLoaded ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  <span style={{ color: "#9CA3AF" }}>
                    {hasSignals ? "Personalized to you · learning from your behavior" : "Shoe expert · ready to help"}
                  </span>
                </>
              ) : (
                <><Loader2 className="w-3 h-3 animate-spin" style={{ color: "#5B8BF5" }} /> Loading your profile…</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPrefs(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "#6B7280" }}
            title="Edit preferences"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={reset}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "#6B7280" }}
            title="New conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile signal badges */}
      {profileLoaded && hasSignals && (
        <div className="flex flex-wrap gap-1.5 px-4 sm:px-8 pb-3 flex-shrink-0 max-w-3xl w-full mx-auto">
          {userProfile?.preferred_brands?.slice(0, 2).map(b => (
            <span key={b} className="text-[11px] px-3 py-1 rounded-full font-medium"
              style={{ background: "rgba(59,91,219,0.15)", color: "#7BA4F5", border: "1px solid rgba(59,91,219,0.2)" }}>
              {b}
            </span>
          ))}
          {userProfile?.main_use?.slice(0, 2).map(u => (
            <span key={u} className="text-[11px] px-3 py-1 rounded-full"
              style={{ background: "#1A1A1F", color: "#9CA3AF", border: "1px solid #2A2A35" }}>
              {u}
            </span>
          ))}
          {(userProfile?.budget_max || userProfile?.budget_behavioral) && (
            <span className="text-[11px] px-3 py-1 rounded-full"
              style={{ background: "#1A1A1F", color: "#9CA3AF", border: "1px solid #2A2A35" }}>
              ~${userProfile.budget_max || userProfile.budget_behavioral}
            </span>
          )}
          <span className="text-[11px] px-3 py-1 rounded-full flex items-center gap-1"
            style={{ background: "rgba(16,185,129,0.1)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Sparkles className="w-2.5 h-2.5" /> personalized
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 space-y-4 scrollbar-hide">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              bestPickShoe={msg.bestPickShoe}
              onFollowUp={sendMessage}
            />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,91,219,0.18)", border: "1px solid rgba(59,91,219,0.3)" }}>
              <Brain className="w-4 h-4" style={{ color: "#5B8BF5" }} />
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: "#1E2035", borderLeft: "3px solid #3B5BDB" }}>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: "#5B8BF5", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
      </div>

      {/* Starter prompts */}
      {messages.length <= 1 && !loading && (
        <div className="flex-shrink-0 px-4 sm:px-8 pb-3 max-w-3xl w-full mx-auto">
          <p className="text-xs mb-2" style={{ color: "#6B7280" }}>Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.slice(3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs px-4 py-2 rounded-full flex items-center gap-1.5 transition-all"
                style={{ background: "#1A1A1F", color: "#D1D5DB", border: "1px solid #2A2A35" }}
              >
                {prompt} <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Caption */}
      <p className="text-center text-[11px] flex-shrink-0 pb-2" style={{ color: "#4B5563" }}>
        Learns from your searches · improves with every conversation
      </p>

      {/* Preferences Panel */}
      <AP>
        {showPrefs && (
          <PreferencesPanel
            onClose={() => setShowPrefs(false)}
            onSaved={() => { init(); }}
          />
        )}
      </AP>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 sm:px-8 pb-5 pt-1 max-w-3xl w-full mx-auto">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: "#1A1A1F", border: "1px solid #2A2A35" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about shoes..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#E8EAF6" }}
            disabled={loading || !profileLoaded}
            dir={isRTL(input) ? "rtl" : "ltr"}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !profileLoaded}
            className="p-2 rounded-xl transition-all disabled:opacity-30"
            style={{ color: "#5B8BF5" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}