import { Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Wrap any locked feature with this component.
 * If `locked` is true, shows an upsell overlay instead of children.
 */
export default function PlanGate({ locked, feature, description, children, inline = false }) {
  if (!locked) return children;

  if (inline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-sm">
        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-amber-800 dark:text-amber-300">{description || feature} — </span>
        <Link to="/settings" className="font-semibold text-primary hover:underline flex items-center gap-1">
          <Zap className="w-3 h-3" /> Upgrade
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10 p-8 flex flex-col items-center justify-center text-center gap-3"
    >
      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="font-heading font-bold text-base">{feature}</p>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <Link
        to="/settings"
        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
      >
        <Zap className="w-4 h-4" />
        Upgrade to Pro
      </Link>
    </motion.div>
  );
}