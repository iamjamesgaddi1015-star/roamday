import {
  categoryMatches,
  distanceKm,
  safeUrl,
  validPoint,
  type Filters,
  type Origin,
  type Place,
  type SearchResult,
} from "./discovery";

import { addVenueGuide } from "./venue-guide";
import { localZone } from "./local-zone";

const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object"
    ? (v as Record<string, unknown>)
    : {};
}
function array(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
async function json(
  url: string,
  signal?: AbortSignal,
  options: RequestInit = {},
): Promise<Record<string, unknown>> {
  const control = new AbortController();
  const cancel = () => control.abort();
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 14000);
  try {
    const r = await fetch(url, {
      ...options,
      signal: control.signal,
      credentials: "omit",
    });
    if (!r.ok)
      throw new Error(
        r.status === 429
          ? "The place provider is busy. Try again later."
          : "Live information is temporarily unavailable.",
      );
    return obj(await r.json());
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
export async function findLocations(
  query: string,
  signal?: AbortSignal,
): Promise<Origin[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const coordinate = /^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/.exec(
    q,
  );
  if (coordinate) {
    const origin = {
      lat: +coordinate[1],
      lon: +coordinate[2],
      label: "Map pin",
    };
    return validPoint(origin) ? [origin] : [];
  }
  const doc = await json(
    base
      ? base + "/api/geocode?q=" + encodeURIComponent(q)
      : "https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&name=" +
          encodeURIComponent(q),
    signal,
  );
  return array(base ? doc.places : doc.results).flatMap((e) => {
    const p = obj(e),
      lat = num(p.lat ?? p.latitude),
      lon = num(p.lon ?? p.longitude);
    if (
      lat === null ||
      lon === null ||
      !validPoint({ lat, lon }) ||
      !str(p.name)
    )
      return [];
    return [
      {
        lat,
        lon,
        label: [str(p.name), str(p.admin1), str(p.country)]
          .filter(Boolean)
          .join(", "),
        timezone: str(p.timeZone ?? p.timezone) || undefined,
        countryCode: str(p.countryCode ?? p.country_code) || undefined,
      },
    ];
  });
}
export async function locationTimezone(
  origin: Origin,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
  return origin.timezone || localZone(origin.lat, origin.lon);
}
function fromBackend(
  v: unknown,
  origin: Origin,
  currency: string,
): Place | null {
  const p = obj(v),
    lat = num(p.lat),
    lon = num(p.lon);
  if (
    lat === null ||
    lon === null ||
    !validPoint({ lat, lon }) ||
    !str(p.name) ||
    !str(p.id)
  )
    return null;
  return {
    id: str(p.id),
    name: str(p.name),
    lat,
    lon,
    category: str(p.category),
    indoor: typeof p.indoor === "boolean" ? p.indoor : null,
    description: str(p.source),
    neighborhood: str(p.address),
    photo: null,
    price: num(p.priceMin),
    priceMax: num(p.priceMax),
    currency: str(p.currency) || currency,
    minutesOut: num(p.outboundMin),
    minutesBack: num(p.returnMin),
    visitMinutes: num(p.visitMin) ?? 30,
    distanceKm: num(p.distanceKm) ?? distanceKm(origin, { lat, lon }),
    menuUrl: safeUrl(p.menuUrl),
    bookingUrl: safeUrl(p.bookingUrl),
    website: safeUrl(p.website),
    menu: [],
    reasons: array(p.reasons).map(str).filter(Boolean),
    status: p.fit === "match" ? "match" : "uncertain",
    hours: str(p.hours) || null,
    sourceUrl: safeUrl(p.sourceUrl) ?? undefined,
  };
}
async function weather(origin: Origin, f: Filters, signal?: AbortSignal) {
  const p = new URLSearchParams({
    latitude: origin.lat.toFixed(2),
    longitude: origin.lon.toFixed(2),
    hourly: "precipitation_probability,temperature_2m",
    timezone: "auto",
    forecast_days: "16",
  });
  const a = await json("https://api.open-meteo.com/v1/forecast?" + p, signal);
  const hours = obj(a.hourly),
    index = array(hours.time).indexOf(
      f.date + "T" + f.time.slice(0, 2) + ":00",
    );
  const samples = Math.ceil((Number(f.time.slice(3)) + f.minutes) / 60);
  const rain = array(hours.precipitation_probability)
    .slice(index, index + samples)
    .map(num)
    .filter((x): x is number => x !== null);
  if (index < 0 || !rain.length || rain.length !== samples)
    return { text: "Forecast unavailable for this window", wet: false };
  const risk = Math.max(...rain),
    temp = num(array(hours.temperature_2m)[index]);
  return {
    text:
      (temp === null ? "" : Math.round(temp) + "°C · ") +
      risk +
      "% peak rain chance",
    wet: risk >= 50,
  };
}
async function osm(
  origin: Origin,
  f: Filters,
  signal?: AbortSignal,
): Promise<Place[]> {
  const radius = Math.ceil(Math.max(0.1, Math.min(20, f.radiusKm)) * 1000);
  const near =
    "(around:" +
    radius +
    "," +
    origin.lat.toFixed(5) +
    "," +
    origin.lon.toFixed(5) +
    ")";
  const q =
    '[out:json][timeout:9];(nwr["name"]["amenity"~"^(cafe|restaurant|library|arts_centre|theatre|marketplace)$"]' +
    near +
    ';nwr["name"]["tourism"~"^(museum|gallery|attraction|viewpoint)$"]' +
    near +
    ';nwr["name"]["leisure"~"^(park|garden|fitness_centre|sports_centre)$"]' +
    near +
    ";);out tags center 100;";
  const doc = await json("https://overpass-api.de/api/interpreter", signal, {
    method: "POST",
    body: new URLSearchParams({ data: q }),
  });
  if (!Array.isArray(doc.elements))
    throw new Error("Place discovery is temporarily unavailable.");
  const seen = new Set<string>();
  return doc.elements
    .flatMap((v: unknown) => {
      const n = obj(v),
        t = obj(n.tags),
        c = obj(n.center),
        lat = num(n.lat ?? c.lat),
        lon = num(n.lon ?? c.lon);
      if (lat === null || lon === null || !validPoint({ lat, lon })) return [];
      const distance = distanceKm(origin, { lat, lon });
      if (distance > f.radiusKm) return [];
      const kind = str(t.amenity ?? t.tourism ?? t.leisure),
        name = str(t.name),
        key = name.toLowerCase() + "|" + lat.toFixed(3) + "|" + lon.toFixed(3);
      if (!name || seen.has(key)) return [];
      seen.add(key);
      const category = kind === "cafe" ? "Café" : kind.replace(/_/g, " ");
      const indoor =
        t.indoor === "yes"
          ? true
          : t.indoor === "no" || ["park", "garden", "viewpoint"].includes(kind)
            ? false
            : null;
      if (f.indoors && indoor === false) return [];
      const free = t.fee === "no",
        visit = ["museum", "gallery", "park", "restaurant"].includes(kind)
          ? 45
          : 30;
      if (visit > f.minutes) return [];
      if (
        free &&
        (f.budgetMin ?? 0) > 0 &&
        !["restaurant", "cafe", "marketplace"].includes(kind) &&
        f.mode !== "driving"
      )
        return [];
      const type = str(n.type);
      const id = num(n.id);
      if (!["node", "way", "relation"].includes(type) || id === null) return [];
      const source = "https://www.openstreetmap.org/" + type + "/" + id;
      const p: Place = {
        id: "osm-" + type + "-" + id,
        name,
        lat,
        lon,
        category,
        indoor,
        description:
          "Mapped " +
          category.toLowerCase() +
          ". Visit duration is a planning estimate.",
        neighborhood: [str(t["addr:street"]), str(t["addr:city"])]
          .filter(Boolean)
          .join(", "),
        photo: null,
        price: free ? 0 : null,
        priceMax: null,
        currency: f.currency,
        minutesOut: null,
        minutesBack: null,
        visitMinutes: visit,
        distanceKm: distance,
        menuUrl: safeUrl(t["website:menu"] ?? t["contact:menu"]),
        bookingUrl: safeUrl(t["reservation:website"]),
        website: safeUrl(t.website ?? t["contact:website"]),
        menu: [],
        reasons: [
          "Round-trip route, hours and total price need checking." +
            (free ? " The map lists free entry." : ""),
        ],
        status: "uncertain",
        hours: str(t.opening_hours) || null,
        sourceUrl: source,
      };
      return categoryMatches(p, f.interests) ? [p] : [];
    })
    .sort((a: Place, b: Place) => a.distanceKm - b.distanceKm);
}
export async function searchNearby(
  origin: Origin,
  f: Filters,
  signal?: AbortSignal,
): Promise<SearchResult> {
  if (
    !validPoint(origin) ||
    !Number.isFinite(f.radiusKm) ||
    f.radiusKm <= 0 ||
    f.radiusKm > 20 ||
    !Number.isFinite(f.minutes) ||
    f.minutes <= 0
  )
    throw new Error(
      "Choose a valid origin, a radius up to 20 km and a positive time window.",
    );
  if (base) {
    const timeZone =
      origin.timezone || f.timeZone || (await locationTimezone(origin, signal));
    const query = {
      lat: origin.lat,
      lon: origin.lon,
      date: f.date,
      time: f.time,
      timeZone,
      radiusKm: f.radiusKm,
      minutes: f.minutes,
      budgetMin: f.budgetMin ?? 0,
      budgetMax: f.budget,
      currency: f.currency,
      mode: { walking: "walk", cycling: "bicycle", driving: "drive" }[f.mode],
      interests: f.interests,
      indoor: f.indoors,
    };
    const r = await json(base + "/api/search", signal, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    const places = addVenueGuide(
      array(r.places)
        .map((p) => fromBackend(p, origin, f.currency))
        .filter((p): p is Place => p !== null),
      origin,
      f,
    );
    return {
      places,
      weather: str(obj(r.weather).summary) || "Forecast unavailable",
      notice: str(r.message),
      source: "live",
    };
  }
  const [items, forecast] = await Promise.allSettled([
    osm(origin, f, signal),
    weather(origin, f, signal),
  ]);
  if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
  const w =
    forecast.status === "fulfilled"
      ? forecast.value
      : { wet: false, text: "Forecast unavailable" };
  const places = addVenueGuide(
    items.status === "fulfilled" ? items.value : [],
    origin,
    f,
  )
    .sort(
      (a, b) =>
        (w.wet ? Number(b.indoor === true) - Number(a.indoor === true) : 0) ||
        a.distanceKm - b.distanceKm,
    )
    .slice(0, 24);
  if (items.status === "rejected" && !places.length)
    throw new Error(
      "Nearby places are unavailable. Try again or choose another area.",
    );
  return {
    places,
    source: "live",
    weather: w.text,
    notice:
      items.status === "rejected"
        ? "Saved Makati venue guide · live discovery is unavailable. Confirm routes and current availability."
        : "OpenStreetMap places and saved venue information · route times, opening hours and total prices need confirmation.",
  };
}
