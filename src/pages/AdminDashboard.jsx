import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Search, Heart, TrendingUp, DollarSign, Rocket, ShieldAlert, RefreshCw, Loader2, Users, Image, MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";
import UserManagement from "../components/admin/UserManagement";
import ImageManager from "../components/admin/ImageManager";
import AddShoePanel from "../components/admin/AddShoePanel";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    base44.entities.Feedback.list("-created_date", 50).then(setFeedbacks).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("adminAnalytics", {});
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load analytics");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive/40" />
        <h1 className="font-heading font-bold text-2xl">Access Denied</h1>
        <p className="text-muted-foreground">This page is for admins only.</p>
        <Link to="/" className="text-primary text-sm hover:underline">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Add Shoe */}
        <div className="mb-8">
          <AddShoePanel onAdded={load} />
        </div>

        {/* User Management */}
        <div className="mb-8">
          <UserManagement />
        </div>

        {/* Image Manager */}
        <div className="mb-8 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" /> Image Manager
          </h2>
          <ImageManager />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-3xl">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Analytics & platform management</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl px-5 py-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          </div>
        ) : data && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
              <StatCard icon={Search} label="Total Searches" value={data.totals.searches} color="text-primary" />
              <StatCard icon={Heart} label="Wishlists" value={data.totals.wishlists} color="text-red-500" />
              <StatCard icon={TrendingUp} label="Price Tracks" value={data.totals.price_tracks} color="text-blue-500" />
              <StatCard icon={Rocket} label="Sponsored" value={data.totals.sponsored_shoes} color="text-amber-500" />
              <StatCard icon={DollarSign} label="Revenue" value={`$${data.totals.sponsored_revenue}`} color="text-green-500" />
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-10">
              {/* Top Searches Chart */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" /> Top Searches
                </h2>
                {data.top_searches.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.top_searches} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="query" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {data.top_searches.map((_, i) => (
                          <Cell key={i} fill={`hsl(${220 + i * 8}, 80%, ${55 + i * 2}%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No searches yet.</p>
                )}
              </div>

              {/* Top Wishlisted */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" /> Most Wishlisted
                </h2>
                {data.top_wishlisted.length > 0 ? (
                  <div className="space-y-3">
                    {data.top_wishlisted.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${(item.count / data.top_wishlisted[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-36 truncate text-right">{item.name}</span>
                        <span className="text-xs font-bold w-6 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No wishlist data yet.</p>
                )}
              </div>
            </div>

            {/* Sponsored Shoes */}
            {data.sponsored_shoes.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-amber-500" /> Active Sponsored Listings
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="pb-3 pr-4">Shoe</th>
                        <th className="pb-3 pr-4">Brand</th>
                        <th className="pb-3 pr-4">Plan</th>
                        <th className="pb-3 pr-4">Price</th>
                        <th className="pb-3">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sponsored_shoes.map((s) => (
                        <tr key={s.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 pr-4 font-medium">{s.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{s.brand}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              s.plan === "premium" ? "bg-amber-100 text-amber-700" :
                              s.plan === "featured" ? "bg-primary/10 text-primary" :
                              "bg-secondary text-muted-foreground"
                            }`}>{s.plan}</span>
                          </td>
                          <td className="py-3 pr-4 font-bold">${s.price}</td>
                          <td className="py-3 text-muted-foreground text-xs">
                            {new Date(s.until).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Searches */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-8">
              <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" /> Recent Searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.recent_searches.map((s, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 bg-secondary rounded-full text-muted-foreground">
                    {s.query}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* User Feedback */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> User Feedback
            {feedbacks.length > 0 && (
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                {feedbacks.length}
              </span>
            )}
          </h2>
          {feedbacks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No feedback submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        fb.category === "Bug Report" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" :
                        fb.category === "Feature Request" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" :
                        fb.category === "Praise" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" :
                        fb.category === "Complaint" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" :
                        "bg-secondary text-muted-foreground"
                      }`}>{fb.category || "General"}</span>
                      {fb.user_name && <span className="text-xs text-muted-foreground">{fb.user_name}</span>}
                      {fb.user_email && <span className="text-xs text-muted-foreground">({fb.user_email})</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        fb.status === "Done" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" :
                        fb.status === "In Progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" :
                        fb.status === "Reviewed" ? "bg-secondary text-muted-foreground" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>{fb.status || "New"}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(fb.created_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{fb.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <Icon className={`w-5 h-5 ${color} mb-3`} />
      <p className="text-2xl font-heading font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}