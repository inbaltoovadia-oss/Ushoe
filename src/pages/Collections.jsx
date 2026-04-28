import { useState, useEffect } from "react";
import { FolderOpen, Plus, ChevronRight, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getCollections, subscribeCollections, createCollection, deleteCollection } from "../lib/collectionsStore";
import { base44 } from "@/api/base44Client";
import ShoeImage from "../components/ShoeImage";

const EMOJIS = ["👟", "🏃", "🏀", "⚽", "💪", "🌊", "🏔️", "✨", "🎯", "💎"];

export default function Collections() {
  const [collections, setCollections] = useState(getCollections());
  const [shoes, setShoes] = useState({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("👟");

  useEffect(() => {
    const unsub = subscribeCollections(cols => setCollections(Object.values(cols)));
    return unsub;
  }, []);

  // Load shoes referenced by collections
  useEffect(() => {
    const allIds = [...new Set(collections.flatMap(c => c.shoeIds))];
    if (!allIds.length) return;
    base44.entities.Shoe.list("-created_date", 100).then(all => {
      const map = {};
      all.forEach(s => { map[s.id] = s; });
      setShoes(map);
    });
  }, [collections.map(c => c.id).join(",")]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCollection(newName.trim(), newEmoji);
    setNewName("");
    setNewEmoji("👟");
    setCreating(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl">Collections</h1>
              <p className="text-sm text-muted-foreground">{collections.length} folder{collections.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-card border border-border rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">New Collection</p>
                <button onClick={() => setCreating(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewEmoji(e)} className={`text-xl p-1.5 rounded-lg transition-all ${newEmoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-secondary"}`}>{e}</button>
                ))}
              </div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Dream Sneakers, Summer Shoes…"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button onClick={handleCreate} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90">
                Create Collection
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {collections.length === 0 ? (
          <div className="text-center py-24">
            <FolderOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-xl">No collections yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">Organize your saved shoes into folders</p>
            <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90">
              <Plus className="w-4 h-4" />
              Create Your First Collection
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((col, i) => {
              const preview = col.shoeIds.slice(0, 4).map(id => shoes[id]).filter(Boolean);
              return (
                <motion.div
                  key={col.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{col.emoji}</span>
                      <div>
                        <h3 className="font-heading font-semibold text-base">{col.name}</h3>
                        <p className="text-xs text-muted-foreground">{col.shoeIds.length} shoe{col.shoeIds.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => deleteCollection(col.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  {preview.length > 0 ? (
                    <div className="flex gap-2">
                      {preview.map(s => (
                        <Link key={s.id} to={`/shoe/${s.id}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-secondary/40 hover:opacity-80 transition-opacity">
                          <ShoeImage src={s.image_url} brand={s.brand} name={s.name} className="w-full h-full object-cover" />
                        </Link>
                      ))}
                      {col.shoeIds.length > 4 && (
                        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-xs text-muted-foreground font-medium flex-shrink-0">
                          +{col.shoeIds.length - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shoes added yet. Browse and save shoes to this collection.</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}