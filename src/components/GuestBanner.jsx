import { useState } from "react";
import { Ghost, X, LogIn } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isGuest } from "@/lib/guestStore";

export default function GuestBanner() {
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (isAuthenticated || !isGuest() || dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-2 relative z-20">
      <div className="flex items-center gap-2 text-xs min-w-0">
        <Ghost className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-amber-700 dark:text-amber-400 font-medium truncate">
          Guest mode — your data won't be saved
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={navigateToLogin}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <LogIn className="w-3.5 h-3.5" /> Sign In
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}