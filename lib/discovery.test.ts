import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultFilters,
  demoSearch,
  dateInZone,
  safeUrl,
  categoryMatches,
  DEMO_ORIGIN,
} from "./discovery";
import { parseChat, interpretChat } from "./chat";
import { searchNearby, findLocations, locationTimezone } from "./providers";

test("a precise total duration includes both travel legs", () => {
  const f = defaultFilters();
  assert.ok(
    demoSearch({ ...f, minutes: 80 }).places.some(
      (p) => p.id === "demo-coffee",
    ),
  );
  assert.ok(
    !demoSearch({ ...f, minutes: 79 }).places.some(
      (p) => p.id === "demo-coffee",
    ),
  );
});
test("unknown currency and driving spend cannot be confirmed", () => {
  for (const patch of [{ currency: "USD" }, { mode: "driving" as const }]) {
    assert.ok(
      demoSearch({ ...defaultFilters(), ...patch }).places.every(
        (p) => p.status === "uncertain",
      ),
    );
  }
});
test("early arrivals and late visits cannot claim to fit closing hours", () => {
  assert.equal(
    demoSearch({ ...defaultFilters(), time: "22:00" }).places.length,
    0,
  );
  assert.equal(
    demoSearch({ ...defaultFilters(), time: "03:00" }).places.length,
    0,
  );
});
test("subsequent chat edits preserve unspecified filters", () => {
  const f = { ...defaultFilters(), budget: 250, minutes: 65 };
  const result = parseChat("Only cafés", f);
  assert.deepEqual(result.changes, { interests: ["Cafés"] });
  assert.equal({ ...f, ...result.changes }.budget, 250);
  assert.deepEqual(parseChat("90 minutes, ₱300, somewhere dry", f).changes, {
    minutes: 90,
    budget: 300,
    currency: "PHP",
    indoors: true,
  });
});
test("free time and time limits are not spending or activity requests", () => {
  assert.deepEqual(
    parseChat("I am starting in under 90 minutes", defaultFilters()).changes,
    { minutes: 90 },
  );
  assert.deepEqual(parseChat("I have free time", defaultFilters()).changes, {});
  assert.deepEqual(parseChat("instead", defaultFilters()).changes, {});
});
test("explicit return deadline bounds the outing", () => {
  assert.equal(
    parseChat("Starting at 2 pm, back by 3:15 pm", defaultFilters()).changes
      .minutes,
    75,
  );
});
test("timezone lookup works without disclosing coordinates", async () => {
  assert.equal(
    await locationTimezone({ ...DEMO_ORIGIN, timezone: undefined }),
    "Asia/Manila",
  );
  assert.equal(
    dateInZone("Asia/Manila", new Date("2026-11-17T23:30:00Z")),
    "2026-11-18",
  );
});
test("handoffs reject executable URLs and credential URLs", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,a",
    "https://user:secret@example.com",
    "http://example.com",
    null,
  ])
    assert.equal(safeUrl(value), null);
  assert.equal(safeUrl("https://example.com/menu"), "https://example.com/menu");
});
test("disabled or unsupported local model preserves parser behavior", async () => {
  assert.deepEqual(
    await interpretChat("Only cafes", defaultFilters()),
    parseChat("Only cafes", defaultFilters()),
  );
});
test("live unknown costs and route durations remain uncertain; malformed source data is rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: URL | Request | string) => {
    const url = String(input);
    if (url.includes("overpass"))
      return Response.json({
        elements: [
          {
            id: 1,
            type: "node",
            lat: 51.5001,
            lon: -0.12,
            tags: {
              name: "Local cafe",
              amenity: "cafe",
              website: "javascript:alert(1)",
            },
          },
          {
            id: 2,
            type: "node",
            lat: "bad",
            lon: -0.12,
            tags: { name: "Bad cafe", amenity: "cafe" },
          },
          {
            id: 3,
            type: "way",
            center: { lat: 51.5002, lon: -0.12 },
            tags: { name: "Local park", leisure: "park", fee: "no" },
          },
        ],
      });
    return Response.json({
      hourly: {
        time: ["2026-11-18T14:00", "2026-11-18T15:00"],
        precipitation_probability: [40, 70],
        temperature_2m: [12, 11],
      },
    });
  });
  const result = await searchNearby(
    { lat: 51.5, lon: -0.12, label: "London" },
    { ...defaultFilters(), date: "2026-11-18" },
  );
  assert.equal(result.places.length, 2);
  assert.ok(
    result.places.every(
      (p) => p.status === "uncertain" && p.minutesBack === null,
    ),
  );
  assert.equal(result.places[0].website, null);
  assert.equal(result.weather, "12°C · 70% peak rain chance");
});
test("provider failure can show only a labeled local saved guide", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 429 }),
  );
  const result = await searchNearby(DEMO_ORIGIN, defaultFilters());
  assert.match(result.notice, /Saved Makati venue guide/);
  assert.ok(
    result.places.length > 0 &&
      result.places.every((p) => p.status === "uncertain"),
  );
  await assert.rejects(
    searchNearby({ lat: 51.5, lon: -0.12, label: "London" }, defaultFilters()),
    /unavailable/,
  );
});
test("coordinate search validates without a provider request", async () => {
  assert.equal((await findLocations("14.55, 121.02"))[0]?.lat, 14.55);
  assert.deepEqual(await findLocations("95.5, 121.02"), []);
});
