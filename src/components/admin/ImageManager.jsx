import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ImageOff, RefreshCw, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

export default function ImageManager() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState({}); // { [shoe_id]: true }
  const [results, setResults] = useState({});    // { [shoe_id]: result }

  useEffect(() => { loadShoes(); }, []);

  const loadShoes = async () => {
    setLoading(true);
    const all = await base44.entities.Shoe.list("-created_date", 100);
    setShoes(all);
    setLoading(false);
  };

  const hasValidImage = (shoe) =>
    shoe.image_url && shoe.image_url.startsWith("http");

  const missingImages = shoes.filter(s => !hasValidImage(s));
  const hasImages = shoes.filter(s => hasValidImage(s));

  const resolveOne = async (shoe) => {
    setResolving(prev => ({ ...prev, [shoe.id]: true }));
    setResults(prev => ({ ...prev, [shoe.id]: null }));
    const res = await base44.functions.invoke("resolveShoeImages", { shoe_id: shoe.id });
    const data = res.data;
    setResults(prev => ({ ...prev, [shoe.id]: data }));
    setResolving(prev => ({ ...prev, [shoe.id]: false }));
    if (data.status === "updated") {
      setShoes(prev => prev.map(s => s.id === shoe.id ? { ...s, image_url: data.image_url } : s));
    }
  };

  const resolveAll = async () => {
    for (const shoe of missingImages) {
      await resolveOne(shoe);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-heading font-bold">{shoes.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Shoes</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40 rounded-2xl p-4 text-center">
          <p className="text-2xl font-heading font-bold text-green-700 dark:text-green-400">{hasImages.length}</p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">Have Images</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-4 text-center">
          <p className="text-2xl font-heading font-bold text-amber-700 dark:text-amber-400">{missingImages.length}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Missing Images</p>
        </div>
      </div>

      {missingImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm">Shoes Without Images</h3>
            <button
              onClick={resolveAll}
              disabled={Object.values(resolving).some(Boolean)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resolve All ({missingImages.length})
            </button>
          </div>

          <div className="space-y-2">
            {missingImages.map(shoe => {
              const isLoading = resolving[shoe.id];
              const result = results[shoe.id];
              return (
                <div key={shoe.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <ImageOff className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{shoe.name}</p>
                    <p className="text-[11px] text-muted-foreground">{shoe.brand} · {shoe.category}</p>
                    {result && (
                      <div className={`flex items-center gap-1 mt-1 text-[11px] ${
                        result.status === "updated" ? "text-green-600" : "text-amber-600"
                      }`}>
                        {result.status === "updated"
                          ? <><CheckCircle className="w-3 h-3" /> Updated from {result.source_domain} ({Math.round((result.confidence || 0) * 100)}% confidence)</>
                          : <><AlertCircle className="w-3 h-3" /> {result.reason || result.error}</>
                        }
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => resolveOne(shoe)}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {isLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />
                    }
                    {isLoading ? "Searching…" : "Find Image"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {missingImages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="font-heading font-semibold">All shoes have images!</p>
          <p className="text-sm text-muted-foreground">Every shoe in the catalog has an image URL assigned.</p>
        </div>
      )}

      {/* Refresh catalog button */}
      <div className="flex justify-end">
        <button
          onClick={loadShoes}
          className="flex items-center gap-1.5 text-xs px-3 py-2 border border-border rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh List
        </button>
      </div>
    </div>
  );
}