import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Check, Bell, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboarding, isOnboardingComplete, type Goal, type ReadingRhythm, type FontSize } from "@/hooks/useOnboarding";
import type { Religion } from "@shared/schema";

const GOALS: { id: Goal; label: string; emoji: string }[] = [
  { id: "deepen_faith",        label: "Deepen my faith",              emoji: "🌿" },
  { id: "compare_traditions",  label: "Explore other traditions",     emoji: "🌍" },
  { id: "daily_habit",         label: "Build a daily reading habit",  emoji: "📅" },
  { id: "find_peace",          label: "Find peace and guidance",      emoji: "☮️" },
  { id: "share",               label: "Share what I learn",            emoji: "🤝" },
  { id: "learn",               label: "Learn about religions",        emoji: "📚" },
];

const TRADITIONS: { id: Religion; label: string; emoji: string }[] = [
  { id: "christianity", label: "Christianity", emoji: "✝️" },
  { id: "islam",        label: "Islam",         emoji: "☪️" },
  { id: "judaism",      label: "Judaism",       emoji: "✡️" },
  { id: "hinduism",     label: "Hinduism",      emoji: "🕉️" },
  { id: "buddhism",     label: "Buddhism",      emoji: "☸️" },
  { id: "shintoism",    label: "Shintoism",     emoji: "⛩️" },
  { id: "sikhism",      label: "Sikhism",       emoji: "☬" },
];

const TOPICS = [
  { id: "prayer",      label: "Prayer",          emoji: "🙏" },
  { id: "meditation",  label: "Meditation",      emoji: "🧘" },
  { id: "wisdom",      label: "Wisdom",          emoji: "💡" },
  { id: "fellowship",  label: "Fellowship",      emoji: "👥" },
  { id: "history",     label: "Sacred History",  emoji: "📜" },
  { id: "philosophy",  label: "Philosophy",      emoji: "⚖️" },
  { id: "prophecy",    label: "Prophecy",        emoji: "🔮" },
  { id: "healing",     label: "Healing",         emoji: "✨" },
  { id: "gratitude",   label: "Gratitude",       emoji: "💛" },
  { id: "purpose",     label: "Life Purpose",    emoji: "🎯" },
];

const RHYTHMS: { id: ReadingRhythm; label: string; description: string }[] = [
  { id: "daily",           label: "Every day",             description: "A consistent spiritual anchor" },
  { id: "few_times_week",  label: "A few times a week",    description: "Steady, gentle progress" },
  { id: "weekends",        label: "Weekends only",         description: "Deep dives when time allows" },
  { id: "casual",          label: "When I feel called",    description: "Intuitive and free-flowing" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "pt", label: "Português" },
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="w-full h-1 rounded-full bg-gray-200">
      <div
        className="h-full rounded-full bg-black transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all duration-200 select-none text-left",
        selected
          ? "border-black bg-gray-100 text-black"
          : "border-gray-200 text-gray-700 hover:border-gray-400 hover:text-black bg-white"
      )}
    >
      {children}
      {selected && <Check size={14} className="ml-auto text-black flex-shrink-0" />}
    </button>
  );
}

function ContinueBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 rounded-2xl text-base font-semibold bg-black text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
    >
      {children}
      <ChevronRight size={20} />
    </button>
  );
}

const TOTAL_STEPS = 10;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();
  const { profile, update, complete } = useOnboarding();

  useEffect(() => {
    if (isOnboardingComplete()) navigate("/read");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [goals, setGoals] = useState<Goal[]>(profile.goals);
  const [traditions, setTraditions] = useState<string[]>(profile.traditions);
  const [topics, setTopics] = useState<string[]>(profile.topics);
  const [rhythm, setRhythm] = useState<ReadingRhythm>(profile.readingRhythm);
  const [reminderEnabled, setReminderEnabled] = useState(profile.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(profile.reminderTime);
  const [language, setLanguage] = useState(profile.language);
  const [fontSize, setFontSize] = useState<FontSize>(profile.fontSize);

  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 2200);
      return () => clearTimeout(t);
    }
  }, [step]);

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const goNext = () => {
    update({ goals, traditions, topics, readingRhythm: rhythm, reminderEnabled, reminderTime, language, fontSize });
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleComplete = async () => {
    await complete({ goals, traditions, topics, readingRhythm: rhythm, reminderEnabled, reminderTime, language, fontSize });
    setStep(9);
    // First-time skip-shelf: open the user's primary tradition's default book on next /read mount.
    try {
      if (traditions.length > 0) {
        localStorage.setItem("rellio.openDefaultBookOnce", traditions[0]);
      }
    } catch { /* ignore */ }
    setTimeout(() => navigate("/read"), 1800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {step > 1 && step < 9 && (
        <div className="px-6 pt-14 pb-4 flex items-center gap-4">
          <button onClick={goBack} className="text-gray-500 hover:text-black transition-colors">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <ProgressBar step={step - 1} total={TOTAL_STEPS - 2} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-6">

        {/* STEP 0 — Splash */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl border border-gray-200 bg-gray-50">
              🧭
            </div>
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">Rellio</h1>
              <p className="text-sm text-gray-500">Universal Wisdom Explorer</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-gray-400" />
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — Welcome */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center gap-8">
            <div>
              <div className="text-4xl mb-4">🌟</div>
              <h2 className="text-3xl font-bold text-black leading-tight mb-4">Your spiritual journey starts here</h2>
              <p className="text-base leading-relaxed text-gray-600">
                Rellio brings sacred texts from across traditions together in one beautiful,
                AI-guided space. Set your intentions in under 2 minutes.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                { icon: "📖", text: "Read scripture from 5+ traditions" },
                { icon: "🤖", text: "Ask AI scholar personas anything" },
                { icon: "⚖️", text: "Compare teachings across faiths" },
                { icon: "🌱", text: "Track your spiritual growth" },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-gray-800">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm">{text}</span>
                </li>
              ))}
            </ul>
            <div className="pb-8 flex flex-col gap-3">
              <ContinueBtn onClick={goNext}>Begin your journey</ContinueBtn>
              <button onClick={() => navigate("/read")} className="text-center text-sm text-gray-400 underline underline-offset-4">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Goals */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="pt-2">
              <h2 className="text-2xl font-bold text-black mb-2">What brings you here?</h2>
              <p className="text-sm text-gray-500">Choose what matters most.</p>
            </div>
            <div className="flex flex-col gap-3">
              {GOALS.map((g) => (
                <Chip key={g.id} selected={goals.includes(g.id)} onClick={() => setGoals((p) => toggle(p, g.id))}>
                  <span className="text-lg">{g.emoji}</span>
                  <span>{g.label}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-auto pb-8">
              {goals.length === 0 && (
                <p className="text-center text-xs mb-3 text-gray-500">Select at least one goal to continue</p>
              )}
              <ContinueBtn onClick={goNext} disabled={goals.length === 0}>Continue</ContinueBtn>
            </div>
          </div>
        )}

        {/* STEP 3 — Traditions */}
        {step === 3 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="pt-2">
              <h2 className="text-2xl font-bold text-black mb-2">Which traditions call to you?</h2>
              <p className="text-sm text-gray-500">Select one or several — all are welcome.</p>
            </div>
            <div className="flex flex-col gap-3">
              {TRADITIONS.map((t) => (
                <Chip key={t.id} selected={traditions.includes(t.id)} onClick={() => setTraditions((p) => toggle(p, t.id))}>
                  <span className="text-xl">{t.emoji}</span>
                  <span>{t.label}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-auto pb-8">
              <ContinueBtn onClick={goNext}>{traditions.length === 0 ? "Skip this step" : "Continue"}</ContinueBtn>
            </div>
          </div>
        )}

        {/* STEP 4 — Topics */}
        {step === 4 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="pt-2">
              <h2 className="text-2xl font-bold text-black mb-2">What themes interest you?</h2>
              <p className="text-sm text-gray-500">Your weekly spotlight topics will match your interests.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map((t) => (
                <Chip key={t.id} selected={topics.includes(t.id)} onClick={() => setTopics((p) => toggle(p, t.id))}>
                  <span className="text-base">{t.emoji}</span>
                  <span className="text-xs">{t.label}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-auto pb-8">
              <ContinueBtn onClick={goNext}>{topics.length === 0 ? "Skip this step" : "Continue"}</ContinueBtn>
            </div>
          </div>
        )}

        {/* STEP 5 — Reading Rhythm */}
        {step === 5 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="pt-2">
              <h2 className="text-2xl font-bold text-black mb-2">What's your reading rhythm?</h2>
              <p className="text-sm text-gray-500">We'll set gentle reminders around your schedule.</p>
            </div>
            <div className="flex flex-col gap-3">
              {RHYTHMS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRhythm(r.id)}
                  className={cn(
                    "flex flex-col items-start px-5 py-4 rounded-2xl border text-left transition-all duration-200",
                    rhythm === r.id ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400 bg-white"
                  )}
                >
                  <span className={cn("text-sm font-semibold mb-1", rhythm === r.id ? "text-black" : "text-gray-800")}>
                    {r.label}
                  </span>
                  <span className="text-xs text-gray-500">{r.description}</span>
                </button>
              ))}
            </div>
            <div className="mt-auto pb-8">
              <ContinueBtn onClick={goNext}>Continue</ContinueBtn>
            </div>
          </div>
        )}

        {/* STEP 6 — Reminders */}
        {step === 6 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="pt-2">
              <h2 className="text-2xl font-bold text-black mb-2">Set a daily reminder?</h2>
              <p className="text-sm text-gray-500">A gentle nudge helps keep the habit alive.</p>
            </div>

            <button
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={cn(
                "flex items-center justify-between px-5 py-5 rounded-2xl border transition-all duration-200",
                reminderEnabled ? "border-black bg-gray-50" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Bell size={22} className={reminderEnabled ? "text-black" : "text-gray-400"} />
                <div className="text-left">
                  <div className={cn("text-sm font-semibold", reminderEnabled ? "text-black" : "text-gray-700")}>
                    Daily reminder
                  </div>
                  <div className="text-xs text-gray-500">{reminderEnabled ? "Enabled" : "Disabled"}</div>
                </div>
              </div>
              <div className={cn("w-12 h-6 rounded-full transition-all duration-300 relative", reminderEnabled ? "bg-black" : "bg-gray-200")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm", reminderEnabled ? "left-7" : "left-1")} />
              </div>
            </button>

            {reminderEnabled && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Reminder time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="rounded-xl px-4 py-3 text-black text-base outline-none border border-gray-300 bg-white"
                />
              </div>
            )}

            <div className="mt-auto pb-8">
              <ContinueBtn onClick={goNext}>Continue</ContinueBtn>
            </div>
          </div>
        )}

        {/* STEP 7 — Language & Reader Prefs */}
        {step === 7 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="pt-2">
              <h2 className="text-2xl font-bold text-black mb-2">Language & reading style</h2>
              <p className="text-sm text-gray-500">Choose your preferred language and text size.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Language</label>
              <div className="flex flex-col gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                      language === l.code ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400 bg-white"
                    )}
                  >
                    <span className={cn("text-sm", language === l.code ? "text-black font-semibold" : "text-gray-800")}>
                      {l.label}
                    </span>
                    {language === l.code && <Check size={16} className="text-black" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Text size</label>
              <div className="grid grid-cols-3 gap-2">
                {(["small", "medium", "large"] as FontSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    className={cn(
                      "py-3 rounded-xl border text-center transition-all capitalize",
                      fontSize === s ? "border-black bg-gray-50 text-black font-semibold" : "border-gray-200 text-gray-600 hover:border-gray-400 bg-white"
                    )}
                    style={{ fontSize: s === "small" ? 12 : s === "medium" ? 14 : 17 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pb-8">
              <ContinueBtn onClick={goNext}>Continue</ContinueBtn>
            </div>
          </div>
        )}

        {/* STEP 8 — Summary */}
        {step === 8 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="pt-2">
              <div className="text-3xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-black mb-2">Your SoulSet is ready</h2>
              <p className="text-sm text-gray-500">Here's how Rellio will personalize your experience:</p>
            </div>

            <div className="space-y-3">
              <SummaryRow label="Goals" value={goals.length > 0 ? GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label).join(", ") : "Not set"} />
              <SummaryRow label="Traditions" value={traditions.length > 0 ? TRADITIONS.filter((t) => traditions.includes(t.id)).map((t) => t.label).join(", ") : "All traditions"} />
              <SummaryRow label="Topics" value={topics.length > 0 ? TOPICS.filter((t) => topics.includes(t.id)).map((t) => t.label).join(", ") : "All topics"} />
              <SummaryRow label="Rhythm" value={RHYTHMS.find((r) => r.id === rhythm)?.label ?? rhythm} />
              <SummaryRow label="Reminders" value={reminderEnabled ? `Daily at ${reminderTime}` : "Off"} />
              <SummaryRow label="Language" value={LANGUAGES.find((l) => l.code === language)?.label ?? language} />
            </div>

            <div className="mt-auto pb-8">
              <button
                onClick={handleComplete}
                className="w-full h-14 rounded-2xl text-base font-semibold bg-black text-white flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                Enter Rellio
              </button>
            </div>
          </div>
        )}

        {/* STEP 9 — Transition */}
        {step === 9 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <div className="text-6xl">🧭</div>
            <div>
              <h2 className="text-2xl font-bold text-black mb-2">Setting up your journey…</h2>
              <p className="text-sm text-gray-500">Personalizing your home experience</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-gray-400" />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      <span className="text-sm text-black leading-snug">{value}</span>
    </div>
  );
}
