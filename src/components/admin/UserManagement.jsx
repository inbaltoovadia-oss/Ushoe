import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Shield, User, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await base44.entities.User.list("-created_date", 100);
    setUsers(data);
    setLoading(false);
  };

  const toggleRole = async (user) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setUpdating(user.id);
    await base44.entities.User.update(user.id, { role: newRole });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    setUpdating(null);
  };

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> User Management
          <span className="text-xs text-muted-foreground font-normal">({users.length} users)</span>
        </h2>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 mb-4">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="bg-transparent border-none outline-none text-sm flex-1 placeholder:text-muted-foreground/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">No users found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {(user.full_name || user.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  user.role === "admin"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}>
                  {user.role === "admin" ? (
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>
                  ) : "User"}
                </span>
                <button
                  onClick={() => toggleRole(user)}
                  disabled={updating === user.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                >
                  {updating === user.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : user.role === "admin" ? "Make User" : "Make Admin"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}