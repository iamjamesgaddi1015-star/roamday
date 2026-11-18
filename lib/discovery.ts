export interface Origin {
  lat: number;
  lon: number;
  label: string;
  timezone?: string;
  countryCode?: string;
}
export interface Filters {
  date: string;
  time: string;
  minutes: number;
  radiusKm: number;
  budget: number | null;
  budgetMin?: number;
  currency: string;
  mode: "walking" | "cycling" | "driving";
  interests: string[];
  indoors: boolean;
  timeZone?: string;
}
export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
  indoor: boolean | null;
  description: string;
  neighborhood: string;
  photo: string | null;
  price: number | null;
  priceMax: number | null;
  currency: string;
  minutesOut: number | null;
  minutesBack: number | null;
  visitMinutes: number;
  distanceKm: number;
  menuUrl: string | null;
  bookingUrl: string | null;
  website: string | null;
  menu: { name: string; price: number }[];
  reasons: string[];
  status: "match" | "uncertain";
  hours: string | null;
  sourceUrl?: string;
  asOf?: string;
}
export interface SearchResult {
  places: Place[];
  weather: string;
  notice: string;
  source: "demo" | "live";
}
export const DEMO_ORIGIN: Origin = {
  lat: 14.5558,
  lon: 121.0201,
  label: "Makati",
  timezone: "Asia/Manila",
  countryCode: "PH",
};
export function dateInZone(zone = "Asia/Manila", date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)?.value)
    .join("-");
}
export function defaultFilters(): Filters {
  return {
    date: dateInZone(),
    time: "14:00",
    minutes: 90,
    radiusKm: 3,
    budget: 300,
    budgetMin: 0,
    currency: "PHP",
    mode: "walking",
    interests: [],
    indoors: false,
  };
}
const currencies: Record<string, string> = {
  PH: "PHP",
  US: "USD",
  CA: "CAD",
  JP: "JPY",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  KR: "KRW",
  SG: "SGD",
  MY: "MYR",
  TH: "THB",
  VN: "VND",
  ID: "IDR",
  CN: "CNY",
  HK: "HKD",
  TW: "TWD",
  IN: "INR",
  CH: "CHF",
  AE: "AED",
  SA: "SAR",
  BR: "BRL",
  MX: "MXN",
  ZA: "ZAR",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  TR: "TRY",
  KE: "KES",
  IS: "ISK",
  IL: "ILS",
  CL: "CLP",
  AR: "ARS",
  CO: "COP",
  PE: "PEN",
};
export function currencyForCountry(code?: string): string | undefined {
  const cc = code?.toUpperCase() ?? "";
  if (
    "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK"
      .split(" ")
      .includes(cc)
  )
    return "EUR";
  return currencies[cc];
}
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}
const basic = {
  currency: "PHP",
  menuUrl: null,
  bookingUrl: null,
  website: null,
  reasons: [],
  status: "match" as const,
};
const fixtures: Place[] = [
  {
    ...basic,
    id: "demo-coffee",
    name: "Esteban Coffee",
    lat: 14.55465,
    lon: 121.0165,
    category: "Café",
    indoor: true,
    description: "A quiet coffee stop with a sheltered dining room.",
    neighborhood: "Legazpi Village",
    photo: "/images/cafe.webp",
    price: 180,
    priceMax: 180,
    minutesOut: 15,
    minutesBack: 15,
    visitMinutes: 50,
    distanceKm: 0.41,
    menu: [
      { name: "Flat white", price: 160 },
      { name: "Iced latte", price: 180 },
    ],
    hours: "08:00–20:00",
  },
  {
    ...basic,
    id: "demo-gallery",
    name: "Legazpi Gallery",
    lat: 14.5584,
    lon: 121.0148,
    category: "Art gallery",
    indoor: true,
    description: "A compact exhibition with time to browse at your own pace.",
    neighborhood: "Legazpi Village",
    photo: "/images/gallery.webp",
    price: 150,
    priceMax: 150,
    minutesOut: 17,
    minutesBack: 19,
    visitMinutes: 40,
    distanceKm: 0.65,
    menu: [],
    hours: "10:00–18:00",
  },
  {
    ...basic,
    id: "demo-arcade",
    name: "Garden Arcade",
    lat: 14.5526,
    lon: 121.0232,
    category: "Covered courtyard",
    indoor: true,
    description: "A covered courtyard for an easy stroll and a snack.",
    neighborhood: "Greenbelt",
    photo: "/images/arcade.webp",
    price: 200,
    priceMax: 200,
    minutesOut: 13,
    minutesBack: 14,
    visitMinutes: 35,
    distanceKm: 0.49,
    menu: [],
    hours: "10:00–21:00",
  },
  {
    ...basic,
    id: "demo-park",
    name: "Legazpi Pocket Park",
    lat: 14.55585,
    lon: 121.0157,
    category: "Park",
    indoor: false,
    description: "A free outdoor walk among trees and shaded benches.",
    neighborhood: "Legazpi Village",
    photo: null,
    price: 0,
    priceMax: 0,
    minutesOut: 12,
    minutesBack: 13,
    visitMinutes: 25,
    distanceKm: 0.48,
    menu: [],
    hours: "06:00–18:00",
  },
];
export const interestGroups: Record<string, string[]> = {
  Cafés: ["cafe", "coffee", "tea"],
  Food: [
    "food",
    "restaurant",
    "dining",
    "bakery",
    "market",
    "courtyard",
    "food court",
  ],
  "Art & culture": [
    "art",
    "gallery",
    "museum",
    "culture",
    "exhibit",
    "theatre",
    "theater",
    "library",
  ],
  Outdoors: [
    "park",
    "garden",
    "outdoor",
    "trail",
    "nature",
    "viewpoint",
    "beach",
  ],
  Shopping: ["shop", "market", "mall", "boutique", "arcade"],
  Fitness: ["fitness", "gym", "sport", "swimming", "recreation"],
};
export const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function categoryMatches(place: Place, interests: string[]) {
  if (!interests.length) return true;
  const corpus = normalizeText(place.category + " " + place.name);
  return interests.some((i) => {
    const key = Object.keys(interestGroups).find(
      (k) =>
        normalizeText(k) === normalizeText(i) ||
        interestGroups[k].includes(normalizeText(i)),
    );
    return (key ? interestGroups[key] : [normalizeText(i)]).some((w) =>
      corpus.includes(w),
    );
  });
}
export function demoSearch(filters: Filters): SearchResult {
  const [h, m] = filters.time.split(":").map(Number);
  const start = h * 60 + m;
  const places = fixtures
    .flatMap((p, index) => {
      if (
        (filters.indoors && !p.indoor) ||
        !categoryMatches(p, filters.interests) ||
        distanceKm(DEMO_ORIGIN, p) > filters.radiusKm
      )
        return [];
      const modeFactor = { walking: 1, cycling: 0.48, driving: 0.6 }[
        filters.mode
      ];
      const out = Math.ceil(p.minutesOut! * modeFactor),
        back = Math.ceil(p.minutesBack! * modeFactor);
      if (out + p.visitMinutes + back > filters.minutes) return [];
      const [open, close] = p
        .hours!.split("–")
        .map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
      if (start + out < open || start + out + p.visitMinutes > close) return [];
      const strict = filters.budget !== null || (filters.budgetMin ?? 0) > 0;
      if (
        strict &&
        filters.currency === p.currency &&
        (p.price! < (filters.budgetMin ?? 0) ||
          (filters.budget !== null && p.price! > filters.budget))
      )
        return [];
      const uncertain =
        strict &&
        (filters.currency !== p.currency || filters.mode === "driving");
      return [
        {
          ...p,
          minutesOut: out,
          minutesBack: back,
          status: uncertain ? ("uncertain" as const) : ("match" as const),
          score: (start >= 720 && p.indoor ? 10 : 0) + (index === 0 ? 2 : 0),
          reasons: uncertain
            ? [
                "Total spend in your selected currency or travel mode needs checking.",
              ]
            : [
                "Illustrative hours, visit and travel estimates fit your window.",
              ],
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
  return {
    places,
    weather: "Showers after 3 PM",
    notice: "Makati preview · illustrative places, prices and forecast",
    source: "demo",
  };
}
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function validPoint(v: { lat: number; lon: number }) {
  return (
    Number.isFinite(v.lat) &&
    Math.abs(v.lat) <= 90 &&
    Number.isFinite(v.lon) &&
    Math.abs(v.lon) <= 180
  );
}
export function getCurrentOrigin(): Promise<Origin> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(
        new Error(
          "Location is unavailable. Search for a city or choose a map pin.",
        ),
      );
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          label: "Your location",
        }),
      () =>
        reject(
          new Error(
            "Location was unavailable. Search for a city or choose a map pin.",
          ),
        ),
      { timeout: 11000, maximumAge: 60000 },
    );
  });
}
export { searchNearby, findLocations, locationTimezone } from "./providers";
