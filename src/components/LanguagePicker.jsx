import { useState, useEffect, useRef } from "react";
import { Globe } from "lucide-react";
import { LANGUAGES, getLanguage, setLanguage, subscribeLanguage } from "../lib/languageStore";

export default function LanguagePicker({ compact = false }) {
  const [current, setCurrent] = useState(getLanguage());
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => subscribeLanguage(setCurrent), []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (code) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
        title="Change language"
      >
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        {compact ? (
          <span className="text-base leading-none">{current.flag}</span>
        ) : (
          <span className="font-medium">{current.flag} {current.label}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-2xl shadow-xl py-1.5 w-44 z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors ${
                lang.code === current.code ? "text-primary font-semibold" : "text-foreground"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              {lang.label}
              {lang.code === current.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}