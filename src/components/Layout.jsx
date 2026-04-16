import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import CompareBar from "./CompareBar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 pb-20">
        <Outlet />
      </main>
      <CompareBar />
    </div>
  );
}