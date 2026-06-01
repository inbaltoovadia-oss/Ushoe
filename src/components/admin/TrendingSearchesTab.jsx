import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, Search, Flame } from "lucide-react";

const BRAND_COLORS = [
  "#3B82F6","#8B5CF6","#F59E0B","#10B981","#EF4444",
  "#06B6D4","#F97316","#6366F1","#EC4899","#84CC16"
];

export default function TrendingSearchesTab({ data }) {
  if (!data) return null;

  const brands = data.trending_brands || [];
  const models = data.trending_models || [];
  const volume = data.search_volume || [];

  return (
    <div className="space-y-8">
      {/* Search Volume Over Time */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Search Volume — Last 14 Days
        </h2>
        {volume.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={volume} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No search data yet.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Trending Brands */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" /> Trending Brands
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Last 30 days</span>
          </h2>
          {brands.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={brands} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="brand" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`${v} searches`, "Count"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {brands.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No brand data yet. Searches need to include brand names.</p>
          )}
        </div>

        {/* Trending Models */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" /> Top Searched Models
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Last 30 days</span>
          </h2>
          {models.length > 0 ? (
            <div className="space-y-2.5">
              {models.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate pr-2">{item.model}</span>
                      <span className="text-xs font-bold text-muted-foreground flex-shrink-0">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(item.count / models[0].count) * 100}%`,
                          background: BRAND_COLORS[i % BRAND_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No model search data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}