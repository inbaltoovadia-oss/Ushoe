/**
 * CollectionsManager — modal to manage shoe collections/folders.
 * Fully client-side, localStorage.
 */
import { useState, useEffect } from "react";
import { X, Plus, FolderOpen, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCollections, subscribeCollections, createCollection,
  deleteCollection, addToCollection, removeFromCollection, getCollectionsForShoe,
} from "../lib/collectionsStore";

const EMOJIS = ["👟", "🏃", "🏀", "⚽", "💪", "🌊", "🏔️", "✨", "🎯", "💎"];

export default function CollectionsManager({ shoe, onClose }) {
  const [collections, setCollections] = useState(getCollections());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("👟");
  const [shoeCollections, setShoeCollections] = useState(getCollectionsForShoe(shoe.id).map(c => c.id));

  useEffect(() => {
    return subscribeCollections(cols => {
      setCollections(Object.values(cols));
      setShoeCollections(getCollectionsForShoe(shoe.id).map(c => c.id));
    });
  }, [shoe.id]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createCollection(newName.trim(), newEmoji);
    addToCollection(id, shoe.id);
    setNewName("");
    setNewEmoji("👟");
    setCreating(false);
  };

  const toggleCollection = (col) => {
    if (shoeCollections.includes(col.id)) {
      removeFromCollection(col.id, shoe.id);
    } else {
      addToCollection(col.id, shoe.id);
    }
    setShoeCollections(getCollectionsForShoe(shoe.id).map(c => c.id));
  };

  return (
    <div className="fixed inset-0 z-[45] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-lg">Save to Collection</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground px-5 pb-3">{shoe.brand} {shoe.name}</p>

        <div className="px-5 space-y-2 max-h-60 overflow-y-auto">
          {collections.length === 0 && !creating && (
            <p className="text-sm text-muted-foreground py-4 text-center">No collections yet. Create one below!</p>
          )}
          {collections.map(col => {
            const inCol = shoeCollections.includes(col.id);
            return (
              <div key={col.id} className="flex items-center gap-3">
                <button
                  onClick={() => toggleCollection(col)}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                    inCol ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:border-primary/30"
                  }`}
                >
                  <span className="text-xl">{col.emoji}</span>
                  <span className="flex-1 text-left">{col.name}</span>
                  <span className="text-xs text-muted-foreground">{col.shoeIds.length}</span>
                  {inCol && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
                <button onClick={() => deleteCollection(col.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-5 pt-3 pb-5">
          {creating ? (
            <div className="space-y-3">
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
                placeholder="Collection name…"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90">Create & Add</button>
                <button onClick={() => setCreating(false)} className="px-4 py-2.5 rounded-xl bg-secondary text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all text-sm font-medium mt-1"
            >
              <Plus className="w-4 h-4" />
              New Collection
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}