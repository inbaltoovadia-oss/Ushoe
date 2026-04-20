import { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { invalidateProfileCache } from "../../lib/userProfileStore";

const BRANDS = ["Nike", "Adidas", "Jordan", "New Balance", "Puma", "Reebok", "Converse", "Vans", "Hoka", "Asics", "Saucony", "Brooks", "On Running", "Salomon"];
const USES = ["Running", "Basketball", "Casual", "Training", "Lifestyle", "Walking", "Hiking", "Tennis", "Skateboarding"];
const STYLES = ["Minimalist", "Bold", "Classic", "Techy", "Streetwear", "Athletic"];
const GENDERS = ["Men", "Women", "Unisex"];

export default function PreferencesPanel({ onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [prefs, setPrefs] = useState({
    preferred_brands: [],
    budget_max: "",
    main_use: [],
    style_preference: [],
    gender: "",
  });

  useEffect(() => {
    base44.entities.UserProfile.list("-created_date", 1).then((profiles) => {
      if (profiles[0]) {
        const p = profiles[0];
        setProfileId(p.id);
        setPrefs({
          preferred_brands: p.preferred_brands || [],
          budget_max: p.budget_max || "",
          main_use: p.main_use || [],
          style_preference: p.style_preference || [],
          gender: p.gender || "",
        });
      }
      setLoading(false);
    });
  }, []);

  const toggle = (field, val) => {
    setPrefs(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...prefs,
      budget_max: prefs.budget_max ? Number(prefs.budget_max) : null,
      survey_completed: true,
    };
    if (profileId) {
      await base44.entities.UserProfile.update(profileId, data);
    } else {
      await base44.entities.UserProfile.create(data);
    }
    invalidateProfileCache();
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: "#13131A", border: "1px solid #2A2A35" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #2A2A35" }}>
          <h2 className="font-heading font-bold text-base" style={{ color: "#E8EAF6" }}>My AI Preferences</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#5B8BF5" }} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
            {/* Gender */}
            <Section label="I shop for">
              <div className="flex gap-2 flex-wrap">
                {GENDERS.map(g => (
                  <Chip key={g} active={prefs.gender === g} onClick={() => setPrefs(p => ({ ...p, gender: p.gender === g ? "" : g }))}>
                    {g}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Brands */}
            <Section label="Favourite Brands">
              <div className="flex gap-2 flex-wrap">
                {BRANDS.map(b => (
                  <Chip key={b} active={prefs.preferred_brands.includes(b)} onClick={() => toggle("preferred_brands", b)}>
                    {b}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Main Use */}
            <Section label="Main Use">
              <div className="flex gap-2 flex-wrap">
                {USES.map(u => (
                  <Chip key={u} active={prefs.main_use.includes(u)} onClick={() => toggle("main_use", u)}>
                    {u}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Style */}
            <Section label="Style Preference">
              <div className="flex gap-2 flex-wrap">
                {STYLES.map(s => (
                  <Chip key={s} active={prefs.style_preference.includes(s)} onClick={() => toggle("style_preference", s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Budget */}
            <Section label="Max Budget (USD)">
              <div className="flex gap-2 flex-wrap">
                {[50, 100, 150, 200, 300, 500].map(val => (
                  <Chip key={val} active={Number(prefs.budget_max) === val} onClick={() => setPrefs(p => ({ ...p, budget_max: p.budget_max === val ? "" : val }))}>
                    ${val}
                  </Chip>
                ))}
                <input
                  type="number"
                  placeholder="Custom"
                  value={[50,100,150,200,300,500].includes(Number(prefs.budget_max)) ? "" : prefs.budget_max}
                  onChange={e => setPrefs(p => ({ ...p, budget_max: e.target.value }))}
                  className="w-24 rounded-xl px-3 py-1.5 text-sm outline-none"
                  style={{ background: "#1A1A1F", border: "1px solid #2A2A35", color: "#E8EAF6" }}
                />
              </div>
            </Section>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: "1px solid #2A2A35" }}>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: "#3B5BDB", color: "#fff" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
      style={active
        ? { background: "#3B5BDB", color: "#fff", border: "1px solid #3B5BDB" }
        : { background: "#1A1A1F", color: "#9CA3AF", border: "1px solid #2A2A35" }
      }
    >
      {children}
    </button>
  );
}