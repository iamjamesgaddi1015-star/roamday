import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_ORIGIN, defaultFilters } from "./discovery";
import { addVenueGuide } from "./venue-guide";

test("saved guide keeps route estimates unknown and links to real official menus and tickets", () => {
  const places = addVenueGuide([], DEMO_ORIGIN, defaultFilters());
  const cafe = places.find((place) => place.category === "Café");
  assert.equal(cafe?.menu[1].price, 180);
  assert.ok(cafe?.menuUrl?.startsWith("https://cdn.shopify.com/"));
  assert.equal(
    places.find((place) => place.category === "Museum")?.bookingUrl,
    "https://www.ayalamuseum.org/visit",
  );
  assert.ok(
    places.every(
      (place) => place.status === "uncertain" && place.minutesBack === null,
    ),
  );
});

test("guide applies location, budget, category, hours and minimum visit length", () => {
  const filters = defaultFilters();
  assert.equal(
    addVenueGuide([], { lat: 0, lon: 0, label: "Elsewhere" }, filters).length,
    0,
  );
  assert.deepEqual(
    addVenueGuide([], DEMO_ORIGIN, {
      ...filters,
      budget: 0,
      interests: ["Outdoors"],
    }).map((p) => p.name),
    ["Ayala Triangle Gardens"],
  );
  assert.equal(
    addVenueGuide([], DEMO_ORIGIN, {
      ...filters,
      time: "21:00",
      interests: ["Cafés"],
    }).length,
    0,
  );
  assert.equal(
    addVenueGuide([], DEMO_ORIGIN, { ...filters, minutes: 15 }).length,
    0,
  );
});

test("nearby branches stay distinct and guide enrichment is idempotent", () => {
  const filters = defaultFilters();
  const first = addVenueGuide([], DEMO_ORIGIN, filters);
  assert.equal(addVenueGuide(first, DEMO_ORIGIN, filters).length, first.length);
  const nearbyOtherBranch = {
    ...first[0],
    id: "other",
    lat: first[0].lat + 0.004,
  };
  assert.ok(
    addVenueGuide([nearbyOtherBranch], DEMO_ORIGIN, filters).some(
      (p) => p.id === "other" && p.lat === nearbyOtherBranch.lat,
    ),
  );
});
