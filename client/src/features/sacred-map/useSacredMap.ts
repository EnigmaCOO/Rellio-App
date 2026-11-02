// Sacred Map — data hook.
//
// Loads the four source collections from /data and derives globe-ready points
// and arcs. This is a pure client-side join: events are joined to locations at
// runtime (not duplicated in the source files), and figures are resolved onto
// each event for display.

import { useQuery } from "@tanstack/react-query";
import type {
  EnrichedEvent,
  Figure,
  GlobeArc,
  GlobePoint,
  Religion,
  ResolvedFigure,
  SacredEvent,
  SacredLocation,
  ReligionsFile,
  LocationsFile,
  EventsFile,
  FiguresFile,
} from "./types";

export interface SacredMapData {
  religions: Religion[];
  points: GlobePoint[];
  arcs: GlobeArc[];
}

// Sites with no events use this sentinel as their minYear so continuously
// sacred places stay visible across the entire timeline.
const NO_EVENT_MIN_YEAR = -100000;

// Default significance for a site that has no events.
const DEFAULT_SIGNIFICANCE = 2;

// Journey arcs to draw, each tagged with a religion + representative year so the
// timeline can filter them. Endpoints that are missing from the data are skipped.
interface ArcSpec {
  id: string;
  from: string;
  to: string;
  religionId: string;
  year: number;
}

const ARC_SPECS: ArcSpec[] = [
  { id: "arc_hijra", from: "loc_mecca", to: "loc_medina", religionId: "islam", year: 622 },
  { id: "arc_buddha_1", from: "loc_lumbini", to: "loc_bodh_gaya", religionId: "buddhism", year: -528 },
  { id: "arc_buddha_2", from: "loc_bodh_gaya", to: "loc_sarnath", religionId: "buddhism", year: -528 },
  { id: "arc_buddha_3", from: "loc_sarnath", to: "loc_kushinagar", religionId: "buddhism", year: -483 },
  { id: "arc_nanak", from: "loc_nankana_sahib", to: "loc_kartarpur", religionId: "sikhism", year: 1522 },
];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function loadSacredMap(): Promise<SacredMapData> {
  const [religionsFile, locationsFile, eventsFile, figuresFile] = await Promise.all([
    fetchJson<ReligionsFile>("/data/religions.json"),
    fetchJson<LocationsFile>("/data/locations.json"),
    fetchJson<EventsFile>("/data/events.json"),
    fetchJson<FiguresFile>("/data/figures.json"),
  ]);

  const religions = religionsFile.religions;
  const locations = locationsFile.locations;
  const events = eventsFile.events;
  const figures = figuresFile.figures;

  // relId -> color
  const colorByReligion = new Map<string, string>(
    religions.map((r) => [r.id, r.color]),
  );

  // figureId -> figure (for resolving figures onto events)
  const figureById = new Map<string, Figure>(
    figures.map((f) => [f.id, f]),
  );

  const resolveFigures = (figureIds: string[]): ResolvedFigure[] =>
    figureIds.flatMap((fid) => {
      const fig = figureById.get(fid);
      if (!fig) return [];
      return [{ name: fig.name, role: fig.role, historicity: fig.historicity }];
    });

  // Group events by location_id.
  const eventsByLocation = new Map<string, SacredEvent[]>();
  for (const ev of events) {
    const bucket = eventsByLocation.get(ev.location_id);
    if (bucket) {
      bucket.push(ev);
    } else {
      eventsByLocation.set(ev.location_id, [ev]);
    }
  }

  // locationId -> location (for arc endpoint lookup)
  const locationById = new Map<string, SacredLocation>(
    locations.map((l) => [l.id, l]),
  );

  // Build one GlobePoint per location.
  const points: GlobePoint[] = locations.map((loc) => {
    const locEvents = eventsByLocation.get(loc.id) ?? [];
    const hasEvents = locEvents.length > 0;

    const enriched: EnrichedEvent[] = locEvents
      .slice()
      .sort((a, b) => a.date.year - b.date.year)
      .map((ev) => ({ ...ev, figures: resolveFigures(ev.figure_ids) }));

    const sig = hasEvents
      ? Math.max(...locEvents.map((ev) => ev.significance))
      : DEFAULT_SIGNIFICANCE;

    const minYear = hasEvents
      ? Math.min(...locEvents.map((ev) => ev.date.year))
      : NO_EVENT_MIN_YEAR;

    const color =
      colorByReligion.get(loc.primary_religion_id) ?? "#ffffff";

    return {
      id: loc.id,
      name: loc.name,
      modern: loc.modern_name,
      lat: loc.coordinates.lat,
      lng: loc.coordinates.lng,
      color,
      religions: loc.religion_ids,
      sig,
      minYear,
      hasEvents,
      summary: loc.summary,
      events: enriched,
    };
  });

  // Build arcs, skipping any whose endpoints are missing.
  const arcs: GlobeArc[] = ARC_SPECS.flatMap((spec) => {
    const start = locationById.get(spec.from);
    const end = locationById.get(spec.to);
    if (!start || !end) return [];
    return [
      {
        id: spec.id,
        startLat: start.coordinates.lat,
        startLng: start.coordinates.lng,
        endLat: end.coordinates.lat,
        endLng: end.coordinates.lng,
        religionId: spec.religionId,
        color: colorByReligion.get(spec.religionId) ?? "#ffffff",
        year: spec.year,
      },
    ];
  });

  return { religions, points, arcs };
}

export function useSacredMap() {
  return useQuery<SacredMapData>({
    queryKey: ["sacred-map"],
    queryFn: loadSacredMap,
    staleTime: Infinity,
  });
}
