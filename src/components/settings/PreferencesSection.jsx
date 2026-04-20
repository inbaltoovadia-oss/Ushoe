import { useState, useEffect } from "react";
import { Check, Save, Loader2, Heart, Ruler } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { getInterests, setInterests, ALL_CATEGORIES } from "@/lib/interestStore";
import { getSize, setSize, getSizeLabel } from "@/lib/sizeStore";

const BRANDS = ["Nike", "Adidas", "Jordan", "New Balance", "Puma", "Converse", "Vans", "Hoka", "Asics", "Reebok", "Saucony", "Brooks"];
const USES = ["Running", "Casual", "Basketball", "Training", "Walking", "Lifestyle", "Hiking"];
const STYLES = ["Minimalist", "Bold & Colorful", "Classic", "Streetwear", "Athletic", "Retro"];
const GENDERS = ["Men", "Women", "Unisex"];

export default function PreferencesSection() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [brands, setBrands] = useState([]);
  const [uses, setUses] = useState([]);
  const [styles, setStyles] = useState([]);
  const [gender, setGender] = useState("");
  const [budget, setBudget] = useState("");
  const [interests, setInterests] = useState(getInterests());
  const [shoeSize, setShoeSize] = useState(getSize());
  const [sizeSys, setSizeSys] = useState("us");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      if (profiles.length > 0) {
        const p = profiles[0];
        setProfile(p);
        setBrands(p.preferred_brands || []);
        setUses(p.main_use || []);
        setStyles(p.style_preference || []);
        setGender(p.gender || "");
        setBudget(p.budget_max ? String(p.budget_max) : "");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggle = (list, setList, value) => {
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Save profile preferences
      const data = {
        preferred_brands: brands,
        main_use: uses,
        style_preference: styles,
        gender: gender || undefined,
        budget_max: budget ? parseFloat(budget) : undefined,
        survey_completed: true,
      };
      if (profile) {
        await base44.entities.UserProfile.update(profile.id, data);
      } else {
        const created = await base44.entities.UserProfile.create(data);
        setProfile(created);
      }
      
      // Save interests
      setInterests(interests);
      
      // Save size
      setSize(shoeSize);
      
      toast.success("All preferences saved!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const toggleInterest = (category) => {
    setInterests(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
        <Heart className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          These preferences power your personalized feed and AI recommendations.
        </p>
      </div>

      {/* Shoe Interests */}
      <Section title="🎯 Shoe Categories">
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map(cat => (
            <Chip 
              key={cat} 
              label={cat} 
              active={interests.includes(cat)} 
              onClick={() => toggleInterest(cat)}
            />
          ))}
        </div>
      </Section>

      {/* Shoe Size */}
      <Section title="👟 My Shoe Size">
        <div className="space-y-3">
          <div className="flex gap-2">
            {["us", "eu", "uk"].map(sys => (
              <button
                key={sys}
                onClick={() => setSizeSys(sys)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  sizeSys === sys ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {sys.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.5"
            value={shoeSize[sizeSys] || ""}
            onChange={e => setShoeSize({ ...shoeSize, [sizeSys]: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder={`Enter ${sizeSys.toUpperCase()} size`}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
      </Section>

      {/* Brands */}
      <Section title="Favourite Brands">
        <div className="flex flex-wrap gap-2">
          {BRANDS.map(b => (
            <Chip key={b} label={b} active={brands.includes(b)} onClick={() => toggle(brands, setBrands, b)} />
          ))}
        </div>
      </Section>

      {/* Budget */}
      <Section title="Max Budget (USD)">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">$</span>
          <input
            type="number"
            min="0"
            step="10"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            placeholder="e.g. 200"
            className="w-36 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
          />
          {budget && <span className="text-sm text-muted-foreground">Up to ${budget}</span>}
        </div>
      </Section>

      {/* Main Use */}
      <Section title="Main Use">
        <div className="flex flex-wrap gap-2">
          {USES.map(u => (
            <Chip key={u} label={u} active={uses.includes(u)} onClick={() => toggle(uses, setUses, u)} />
          ))}
        </div>
      </Section>

      {/* Style */}
      <Section title="Style Preference">
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <Chip key={s} label={s} active={styles.includes(s)} onClick={() => toggle(styles, setStyles, s)} />
          ))}
        </div>
      </Section>

      {/* Gender */}
      <Section title="Gender">
        <div className="flex gap-2">
          {GENDERS.map(g => (
            <button
              key={g}
              onClick={() => setGender(gender === g ? "" : g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                gender === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </Section>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? "Saving…" : "Save All Preferences"}
      </motion.button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}