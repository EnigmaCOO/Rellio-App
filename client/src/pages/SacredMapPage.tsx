import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import SacredGlobe from "@/features/sacred-map/SacredGlobe";

export default function SacredMapPage() {
  const [, navigate] = useLocation();
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <button
        onClick={() => navigate("/")}
        className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white/70 backdrop-blur transition-colors hover:text-white"
        data-testid="button-back"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <SacredGlobe />
    </div>
  );
}
