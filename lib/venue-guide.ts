import { categoryMatches, distanceKm, normalizeText } from "./discovery";
import type { Filters, Origin, Place } from "./discovery";

type GuideEntry = Pick<
  Place,
  | "id"
  | "name"
  | "lat"
  | "lon"
  | "category"
  | "indoor"
  | "description"
  | "neighborhood"
  | "menu"
  | "hours"
  | "menuUrl"
  | "bookingUrl"
  | "website"
  | "price"
  | "visitMinutes"
> & {
  namePrefix: string;
  openingWindow?: [number, number];
};

// Venue-published links and hours checked on 17 November 2026. Coordinates
// identify approximate venue locations. Visit durations are planning allowances.
const guide: GuideEntry[] = [
  {
    id: "guide-yardstick-esteban",
    name: "Yardstick Coffee · Legazpi",
    namePrefix: "yardstick",
    lat: 14.5568,
    lon: 121.0173,
    category: "Café",
    indoor: true,
    neighborhood: "106 Esteban Street, Legazpi Village",
    description:
      "Plan a flat white at the Esteban Street café. The suggested spend covers one regular flat white. Yardstick offers walk-in seating.",
    visitMinutes: 35,
    price: 180,
    hours: "Daily, 7 AM–8 PM",
    openingWindow: [7, 20],
    menu: [
      { name: "Long black", price: 160 },
      { name: "Flat white", price: 180 },
      { name: "Oat latte", price: 200 },
    ],
    website: "https://www.yardstickcoffee.com/pages/cafe",
    menuUrl:
      "https://cdn.shopify.com/s/files/1/1291/3853/files/Legazpi_Menu_Jan_2026.pdf?v=1769484265",
    bookingUrl: null,
  },
  {
    id: "guide-ayala-museum",
    name: "Ayala Museum",
    namePrefix: "ayala museum",
    lat: 14.5536,
    lon: 121.0232,
    category: "Museum",
    indoor: true,
    neighborhood: "Makati Avenue at De La Rosa Street, Greenbelt Park",
    description:
      "Browse the museum’s exhibitions and choose admission through its official visitor and ticket page. Check date-specific rates there.",
    visitMinutes: 55,
    price: null,
    hours: null,
    menu: [],
    menuUrl: null,
    website: "https://www.ayalamuseum.org/",
    bookingUrl: "https://www.ayalamuseum.org/visit",
  },
  {
    id: "guide-ayala-triangle",
    name: "Ayala Triangle Gardens",
    namePrefix: "ayala triangle garden",
    lat: 14.5568,
    lon: 121.0246,
    category: "Park",
    indoor: false,
    neighborhood: "Ayala Avenue, Paseo de Roxas and Makati Avenue",
    description:
      "Take a free walk on the garden paths. The estimate covers ordinary park admission. Refreshments and parking are extra.",
    visitMinutes: 25,
    price: 0,
    hours: "Daily, 6 AM–10 PM",
    openingWindow: [6, 22],
    menu: [],
    menuUrl: null,
    bookingUrl: null,
    website:
      "https://makeitmakati.com/contents/264-ayala-triangle-gardens.html",
    // Independent price confirmation: https://galatayo.app/places/makati/ayala-triangle-gardens
  },
];

function guidePlace(entry: GuideEntry, origin: Origin): Place {
  const { namePrefix: _namePrefix, openingWindow: _window, ...venue } = entry;
  return {
    ...venue,
    distanceKm: distanceKm(origin, venue),
    currency: "PHP",
    priceMax: venue.price,
    minutesOut: null,
    minutesBack: null,
    photo: null,
    status: "uncertain",
    sourceUrl: venue.website ?? undefined,
    asOf: "2026-11-17",
    reasons: [
      "Saved venue guide. Confirm the return journey and date-specific availability.",
    ],
  };
}

function eligible(place: Place, entry: GuideEntry, filters: Filters): boolean {
  if (place.distanceKm > filters.radiusKm || (filters.indoors && !place.indoor))
    return false;
  if (
    !categoryMatches(place, filters.interests) ||
    place.visitMinutes > filters.minutes
  )
    return false;
  if (place.price !== null && filters.currency === place.currency) {
    if (filters.budget !== null && place.price > filters.budget) return false;
    if (place.price < (filters.budgetMin ?? 0)) return false;
  }
  // Even a zero-minute outbound journey could not finish a visit past closing.
  if (
    entry.openingWindow &&
    (!filters.timeZone || filters.timeZone === "Asia/Manila")
  ) {
    const [hh, mm] = filters.time.split(":").map(Number);
    const start = hh * 60 + mm;
    const [open, close] = entry.openingWindow.map((hour) => hour * 60);
    const earliestArrival = Math.max(open, start + (place.minutesOut ?? 0));
    if (
      earliestArrival + place.visitMinutes > close ||
      earliestArrival + place.visitMinutes + (place.minutesBack ?? 0) >
        start + filters.minutes
    )
      return false;
  }
  return (
    (place.minutesOut ?? 0) + place.visitMinutes + (place.minutesBack ?? 0) <=
    filters.minutes
  );
}

/** A saved guide can supply venue facts without promoting an unverified outing to a confirmed match. */
export function addVenueGuide(
  places: Place[],
  origin: Origin,
  filters: Filters,
): Place[] {
  const result = [...places];
  for (const entry of guide) {
    const saved = guidePlace(entry, origin);
    if (saved.distanceKm > filters.radiusKm) continue;
    const sameVenue = (p: Place) =>
      normalizeText(p.name).startsWith(entry.namePrefix) &&
      distanceKm(p, entry) < 0.14;
    const i = result.findIndex(sameVenue);
    const existing = result[i];
    const merged = existing
      ? {
          ...existing,
          description: saved.description,
          website: saved.website,
          sourceUrl: saved.sourceUrl,
          menu: saved.menu,
          menuUrl: saved.menuUrl,
          bookingUrl: saved.bookingUrl,
          asOf: saved.asOf,
          hours: existing.hours ?? saved.hours,
          indoor: saved.indoor,
          category: saved.category,
          price: saved.price ?? existing.price,
          priceMax: saved.priceMax ?? existing.priceMax,
          currency: saved.price === null ? existing.currency : saved.currency,
          status: "uncertain" as const,
          reasons: Array.from(
            new Set([
              ...existing.reasons,
              "Venue information from the saved Makati guide. Verify current availability.",
            ]),
          ),
        }
      : saved;
    if (eligible(merged, entry, filters)) {
      if (i >= 0) result[i] = merged;
      else result.push(merged);
    } else if (i >= 0) result.splice(i, 1);
  }
  return result;
}
