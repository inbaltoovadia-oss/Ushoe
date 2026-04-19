import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, RefreshCw, Brain, Zap, ArrowRight, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getUserProfile } from "../lib/userProfileStore";
import { rankShoes } from "../lib/personalizationEngine";
import { getLanguage, subscribeLanguage, LANGUAGES } from "../lib/languageStore";
import LanguagePicker from "../components/LanguagePicker";
import { t } from "../lib/translations";
import ShoeCard from "../components/ShoeCard";
import ReactMarkdown from "react-markdown";

const STARTER_PROMPTS = [
  "What's the best running shoe for me right now?",
  "I need a comfortable everyday sneaker under $120",
  "What's trending in basketball shoes?",
  "Compare Nike vs Adidas for training",
  "Best shoe for wide feet?",
  "What shoes should I get for a gym and street combo?",
];

// Detect if text is RTL (Hebrew, Arabic, etc.)
function isRTL(text) {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(text);
}

function MessageBubble({ msg, bestPickShoe }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
          <Brain className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[80%] space-y-3 ${isUser ? "items-end flex flex-col" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground"
          }`}
          dir={isRTL(msg.content) ? "rtl" : "ltr"}
        >
          {isUser ? (
            <p>{msg.content}</p>
          ) : (
            <ReactMarkdown
              className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Best Pick shoe card */}
        {!isUser && bestPickShoe && (
          <div className="w-full max-w-xs">
            <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Best Pick
            </p>
            <ShoeCard shoe={bestPickShoe} index={0} />
          </div>
        )}

        {/* Follow-up suggestions */}
        {!isUser && msg.followUps?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => msg.onFollowUp?.(q)}
                className="text-xs px-3 py-1.5 bg-secondary hover:bg-primary/10 hover:text-primary border border-border rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {!isUser && msg.usedWeb && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
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
  const [language, setLanguageState] = useState(getLanguage());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => subscribeLanguage(setLanguageState), []);

  useEffect(() => {
    init();
  }, []);

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

    // Welcome message
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
      forcedLanguage: language.label,
      catalogSnapshot: catalogShoes.slice(0, 20).map(s => ({
        brand: s.brand,
        name: s.name,
        price: s.price,
        category: s.category,
        is_trending: s.is_trending,
        _score: s._score,
        id: s.id,
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
      onFollowUp: (q) => sendMessage(q),
    };

    // Save search to history
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
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl">uShoe AI</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {profileLoaded ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {hasSignals ? t("personalizedTo", language) : t("shoeExpertReady", language)}
                </>
              ) : (
                <><Loader2 className="w-3 h-3 animate-spin" /> {t("loadingProfile", language)}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguagePicker />
          <button
            onClick={reset}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
            title={t("newConversation", language)}
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Profile signal badges */}
      {profileLoaded && hasSignals && (
        <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
          {userProfile?.preferred_brands?.slice(0, 2).map(b => (
            <span key={b} className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">{b}</span>
          ))}
          {userProfile?.main_use?.slice(0, 2).map(u => (
            <span key={u} className="text-[10px] px-2.5 py-1 bg-secondary text-muted-foreground rounded-full">{u}</span>
          ))}
          {(userProfile?.budget_max || userProfile?.budget_behavioral) && (
            <span className="text-[10px] px-2.5 py-1 bg-secondary text-muted-foreground rounded-full">
              ~${userProfile.budget_max || userProfile.budget_behavioral}
            </span>
          )}
          <span className="text-[10px] px-2.5 py-1 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> {t("personalized", language)}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={{
                ...msg,
                onFollowUp: sendMessage,
              }}
              bestPickShoe={msg.bestPickShoe}
            />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("thinking", language)}</span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Starter prompts (only at start) */}
      {messages.length <= 1 && !loading && (
        <div className="flex-shrink-0 pb-2">
          <p className="text-xs text-muted-foreground mb-2">{t("tryAsking", language)}</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.slice(3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs px-3 py-1.5 bg-card border border-border rounded-full hover:border-primary/40 hover:text-primary transition-all flex items-center gap-1"
              >
                {prompt} <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 pb-4 pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("askMeAnything", language)}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/50"
            disabled={loading || !profileLoaded}
            dir={isRTL(input) ? "rtl" : "ltr"}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !profileLoaded}
            className="flex-shrink-0 bg-primary text-primary-foreground p-2 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          {t("learnsFromSearches", language)}
        </p>
      </div>
    </div>
  );
}