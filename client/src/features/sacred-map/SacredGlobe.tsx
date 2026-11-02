// Sacred Map — the interactive globe.
//
// Renders a bright, auto-rotating earth with religion-colored markers, pulsing
// rings on the most significant sites, and animated journey arcs. Religion
// chips and a time scrubber filter the globe live.

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSacredMap } from "./useSacredMap";
import { SacredStory } from "./SacredStory";
import type { EnrichedEvent, GlobeArc, GlobePoint, Religion } from "./types";

const EARTH_TEXTURE =
  "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";

// The globe needs WebGL. Some sandboxed/headless environments can't create a
// WebGL context, so we detect support up front and also guard against runtime
// failures with an error boundary — either way we degrade to a message instead
// of white-screening the whole page.
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

class GlobeBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // Swallow — the fallback UI explains the situation to the user.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function GlobeUnavailable() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center px-8 text-center">
      <p className="max-w-sm text-sm leading-relaxed text-slate-500">
        This view needs 3D graphics (WebGL), which isn&apos;t available here.
        Open the Sacred Map in a regular browser tab to explore the globe.
      </p>
    </div>
  );
}

// Convert a #rgb / #rrggbb hex string to an rgba() string at the given alpha.
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Human label for a timeline year. `date.year` is the integer anchor
// (negative = BCE); we only format the scrubber value, never event labels.
function formatYear(year: number): string {
  if (year >= 2020) return "Present";
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

const TICKS: { value: number; label: string }[] = [
  { value: -2000, label: "2000 BCE" },
  { value: -1000, label: "1000 BCE" },
  { value: 0, label: "0" },
  { value: 1000, label: "1000 CE" },
  { value: 2025, label: "2025 CE" },
];

const GOLD = "#bf9a3a";

// ─── Religion filter chips ───────────────────────────────────────────────────
function ReligionChips({
  religions,
  active,
  onToggle,
}: {
  religions: Religion[];
  active: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-4">
      {religions.map((r) => {
        const on = active.has(r.id);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onToggle(r.id)}
            aria-pressed={on}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-all ${
              on
                ? "border-slate-900/20 bg-white text-slate-800 shadow-sm"
                : "border-slate-900/10 bg-white/70 text-slate-500"
            }`}
            style={{ opacity: on ? 1 : 0.6 }}
            data-testid={`chip-religion-${r.id}`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: r.color }}
            />
            {r.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Time scrubber ───────────────────────────────────────────────────────────
function Timeline({
  year,
  onChange,
  visibleCount,
}: {
  year: number;
  onChange: (year: number) => void;
  visibleCount: number;
}) {
  return (
    <div className="pointer-events-auto mx-auto w-full max-w-2xl rounded-2xl border border-slate-900/10 bg-white/95 px-6 py-4 shadow-lg backdrop-blur">
      <div className="text-center">
        <div
          className="font-serif text-4xl tracking-wide"
          style={{ color: GOLD }}
          data-testid="text-year"
        >
          {formatYear(year)}
        </div>
        <div className="mt-1 text-xs text-slate-500" data-testid="text-visible-count">
          {visibleCount} sacred {visibleCount === 1 ? "site" : "sites"} visible
        </div>
      </div>

      <input
        type="range"
        min={-2000}
        max={2025}
        step={5}
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#bf9a3a]/20 accent-[#bf9a3a]"
        data-testid="input-timeline"
      />

      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-slate-400">
        {TICKS.map((t) => (
          <span key={t.value}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Site detail slide-over ──────────────────────────────────────────────────
function SiteSheet({
  site,
  open,
  onOpenChange,
  active,
  year,
  colorByReligion,
}: {
  site: GlobePoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: Set<string>;
  year: number;
  colorByReligion: Map<string, string>;
}) {
  // Events at this site, filtered by active religion AND emerged by the year.
  const visibleEvents = useMemo<EnrichedEvent[]>(() => {
    if (!site) return [];
    return site.events.filter(
      (e) => active.has(e.religion_id) && e.date.year <= year,
    );
  }, [site, active, year]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-slate-200 bg-slate-50/95 text-slate-800 shadow-[-12px_0_32px_rgba(15,23,42,0.1)] sm:max-w-md"
        data-testid="sheet-site"
      >
        {site && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="font-serif text-2xl text-slate-900">
                {site.name}
              </SheetTitle>
              {site.modern && site.modern !== site.name && (
                <div className="text-sm text-slate-500">{site.modern}</div>
              )}
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {!site.hasEvents ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-slate-700">
                    {site.summary}
                  </p>
                  <p className="text-[13px] italic leading-relaxed text-slate-500">
                    A continuously sacred place; no single dated event anchors it
                    on the timeline.
                  </p>
                </div>
              ) : visibleEvents.length > 0 ? (
                visibleEvents.map((e) => (
                  <SacredStory
                    key={e.id}
                    event={e}
                    color={colorByReligion.get(e.religion_id) ?? "#ffffff"}
                    siteName={site.name}
                  />
                ))
              ) : (
                <p className="text-sm leading-relaxed text-slate-500">
                  No events from the selected traditions have occurred by this
                  point on the timeline. Move the timeline forward or enable more
                  traditions to see this site&apos;s history.
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Globe ───────────────────────────────────────────────────────────────────
export default function SacredGlobe() {
  const { data, isLoading, isError } = useSacredMap();

  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [active, setActive] = useState<Set<string>>(new Set());
  const [year, setYear] = useState(2025);
  const [webglOk] = useState(() => hasWebGL());
  const [selected, setSelected] = useState<GlobePoint | null>(null);

  // Default all religions on once data arrives.
  useEffect(() => {
    if (data) setActive(new Set(data.religions.map((r) => r.id)));
  }, [data]);

  // Size the canvas to fill the parent.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    g.pointOfView({ lat: 20, lng: 40, altitude: 2.4 });
  }, []);

  const toggleReligion = useCallback((id: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const religionName = useMemo(() => {
    const map = new Map<string, string>();
    data?.religions.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [data]);

  const colorByReligion = useMemo(() => {
    const map = new Map<string, string>();
    data?.religions.forEach((r) => map.set(r.id, r.color));
    return map;
  }, [data]);

  // Tapping a marker opens its detail panel, pauses the auto-rotation, and
  // flies the camera in to frame the site.
  const handlePointClick = useCallback((point: GlobePoint) => {
    setSelected(point);
    const g = globeRef.current;
    if (g) {
      g.controls().autoRotate = false;
      g.pointOfView(
        { lat: point.lat, lng: point.lng, altitude: 1.7 },
        900,
      );
    }
  }, []);

  // Closing the panel resumes the gentle auto-rotation.
  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelected(null);
      const g = globeRef.current;
      if (g) g.controls().autoRotate = true;
    }
  }, []);

  // Filtered points: any of the site's religions is active AND it has emerged
  // by the selected year.
  const points = useMemo<GlobePoint[]>(() => {
    if (!data) return [];
    return data.points.filter(
      (p) => p.minYear <= year && p.religions.some((rid) => active.has(rid)),
    );
  }, [data, year, active]);

  // Filtered arcs: religion active AND the journey has happened by this year.
  const arcs = useMemo<GlobeArc[]>(() => {
    if (!data) return [];
    return data.arcs.filter((a) => active.has(a.religionId) && a.year <= year);
  }, [data, year, active]);

  // Rings pulse on the most significant visible sites.
  const rings = useMemo<GlobePoint[]>(
    () => points.filter((p) => p.sig >= 5),
    [points],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 860px at 60% -8%, #ffffff 0%, #f4f6fa 58%, #eaeef4 100%)",
      }}
      data-testid="container-sacred-globe"
    >
      {/* Title — gold, per the brief */}
      <div className="pointer-events-none absolute left-6 top-6 z-10">
        <h1 className="font-serif text-2xl tracking-wide" style={{ color: GOLD }}>
          Sacred Map
        </h1>
      </div>

      {/* Religion chips */}
      {data && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 sm:top-5">
          <ReligionChips
            religions={data.religions}
            active={active}
            onToggle={toggleReligion}
          />
        </div>
      )}

      {/* Globe */}
      {!webglOk && <GlobeUnavailable />}
      {webglOk && size.w > 0 && size.h > 0 && (
        <GlobeBoundary fallback={<GlobeUnavailable />}>
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          onGlobeReady={onGlobeReady}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={EARTH_TEXTURE}
          showAtmosphere
          atmosphereColor="#7aa3d6"
          atmosphereAltitude={0.16}
          pointsData={points}
          pointColor={(d) => (d as GlobePoint).color}
          pointAltitude={(d) => 0.012 + (d as GlobePoint).sig * 0.004}
          pointRadius={(d) => 0.16 + (d as GlobePoint).sig * 0.07}
          pointLabel={(d) => {
            const p = d as GlobePoint;
            return `<div style="background:rgba(8,12,22,0.92);border:1px solid rgba(255,255,255,0.14);color:#fff;padding:4px 9px;border-radius:8px;font-size:12px;font-family:ui-sans-serif,system-ui;white-space:nowrap;">${p.name}</div>`;
          }}
          onPointClick={(d) => handlePointClick(d as GlobePoint)}
          ringsData={rings}
          ringColor={(d) => {
            const c = (d as GlobePoint).color;
            return (t: number) => hexToRgba(c, 1 - t);
          }}
          ringMaxRadius={3.0}
          ringPropagationSpeed={1.4}
          ringRepeatPeriod={1100}
          arcsData={arcs}
          arcColor={(d) => (d as GlobeArc).color}
          arcDashLength={0.5}
          arcDashGap={0.2}
          arcDashAnimateTime={2600}
          arcStroke={0.6}
          arcLabel={(d) => {
            const a = d as GlobeArc;
            const name = religionName.get(a.religionId) ?? a.religionId;
            return `${name} journey`;
          }}
        />
        </GlobeBoundary>
      )}

      {/* Loading / error overlays */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
        </div>
      )}
      {isError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-slate-600">
          Could not load the Sacred Map data.
        </div>
      )}

      {/* Timeline */}
      {data && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10">
          <Timeline
            year={year}
            onChange={setYear}
            visibleCount={points.length}
          />
        </div>
      )}

      {/* Site detail slide-over */}
      <SiteSheet
        site={selected}
        open={selected !== null}
        onOpenChange={handleSheetOpenChange}
        active={active}
        year={year}
        colorByReligion={colorByReligion}
      />
    </div>
  );
}
