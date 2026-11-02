import { Lightbulb, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const MYSTERIES = [
  { title: "The Nature of Consciousness", description: "How do ancient traditions explain the origin of awareness and the soul?" },
  { title: "Life After Death", description: "What do scriptures from every tradition say about what happens when we die?" },
  { title: "The Problem of Evil", description: "If God is good and all-powerful, why does suffering exist? Explore every tradition's answer." },
  { title: "The Origin of the Universe", description: "Genesis, the Vedas, and Buddhist cosmology — creation from nothing or eternal cycles?" },
  { title: "Free Will vs. Divine Predestination", description: "Do humans choose their fate, or is everything written by a higher power?" },
  { title: "The Nature of Prayer", description: "Does prayer change God's mind? What are we actually doing when we pray?" },
  { title: "Miracles and the Supernatural", description: "How do different traditions understand divine intervention in the natural world?" },
];

export default function MysteriesPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-3 mb-2">
          <Lightbulb size={20} className="text-gray-700" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Exploration Mode</span>
        </div>
        <h1 className="font-serif text-4xl text-gray-900 mb-3">Biggest Unsolved Mysteries</h1>
        <p className="text-gray-500 text-base mb-10 leading-relaxed">
          The questions humanity has wrestled with across every tradition, culture, and millennium.
          Ask your AI guide to explore them through scripture.
        </p>
        <div className="space-y-4">
          {MYSTERIES.map((m) => (
            <button
              key={m.title}
              onClick={() => navigate(`/?q=${encodeURIComponent(m.title)}`)}
              className="w-full text-left rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              <p className="font-serif text-lg text-gray-900 mb-1">{m.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{m.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
