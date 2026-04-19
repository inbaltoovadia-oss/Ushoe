import { useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar";
import CompareBar from "./CompareBar";
import MobileBottomTabs from "./MobileBottomTabs";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <main className="pt-16 pb-20 md:pb-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <CompareBar />
      <MobileBottomTabs />
    </div>
  );
}