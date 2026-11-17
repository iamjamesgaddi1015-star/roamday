# Roamday pilot build plan

17 November 2026 · Proposed for James’s implementation approval

A visitor with 90 minutes and ₱300 should be able to pick a nearby place, see why it works in the weather and get back on time. Worldwide search means accepting any valid origin and reporting the evidence available there. A thinly mapped town can legitimately return zero matches.

[Startup and ownership](PROJECT-START.md) · [Council decision](COUNCIL-REVIEW.md) · [Screen design](DESIGN.md)

## What a visitor can do

1. Use current location once, search an area or place a pin. Choose today, the upcoming weekend or a specific local date and time. Show the destination time zone.
2. Set distance, currency and per-person spending range, available time, travel mode and interests. Suggested pilot travel modes are walking, cycling and driving. Include known mandatory travel and admission costs. Explicitly separate unknowns such as parking or food prices when a strict cap is applied.
3. Compare up to three strong matches and browse more on the map. Apply hard constraints before ranking by weather, interest, duration and diversity. With no interests, vary categories and favor a mix of free and moderately priced options. Do not backfill with unsuitable venues.
4. Open a place to see the round-trip breakdown, expected return time, weather for the outing, venue hours, price assumptions and source links. Offer the venue’s official menu or booking channel when available. Identify walk-ins only when supported. Completing a reservation stays with the venue.
5. Type “90 minutes, under ₱300, somewhere dry” and refine with “only cafés.” Both the local model and the basic parser produce the same editable filter changes. Unknown phrases invite clarification. Neither path supplies venue facts. On-device AI is optional, with a user-initiated download where required. Search works immediately without a model or an AI key.

## Delivery stages and checks

| Stage / owner | Deliverable | Acceptance example |
|---|---|---|
| 1 · Architecture and UX | Normalize provider fields, define availability and freshness states, measure pilot coverage using public venue sources in Makati, a smaller town and another country. Build representative fixtures. | Each field has a source, timestamp and unknown state. Denying GPS still allows a search. |
| 2 · Engineering | Map, local-time filters, shortlist, responsive detail page and preference reset. | Selecting a result selects its marker. Returning from details restores filters. The journey works by keyboard and without interacting with pins. |
| 3 · Engineering | Place and route queries, weather ranking, menu/booking handoff and budget evidence. | In a 90-minute window, 15 minutes out + 55 there + 20 back fits exactly. One additional minute excludes it. Check asymmetric routes, closure during visit, overnight hours, DST and currency mismatches. |
| 4 · Engineering | Local conversational search and deterministic fallback. | An unsupported device, unavailable model, canceled download or malformed AI output leaves filters usable. A café-only follow-up preserves time, radius and budget. |
| 5 · Independent QA, security and release | Exercise city/rural coverage, quota exhaustion, poor connectivity, permission denial and accessibility. Run load tests with synthetic provider responses. | A rain forecast can reorder eligible picks. A missing forecast says unavailable. A missing return route, price or applicable hours cannot become a confirmed strict fit. Repeated requests cannot trigger paid fallback. |

## Architecture and scale

React/strict TypeScript renders a single shared search state for the map, list, form and chat. Java 21/Spring Boot normalizes provider results and enforces quotas before outbound calls. The proposed search request carries origin, radius, local window and zone, travel mode, currency, spend bounds and interests. Results carry a source ID, coordinates, evidence for price and hours, timestamped forecast, travel legs, estimated visit duration and reasons for inclusion or uncertainty. Validate at both boundaries. Limit radius and candidate count, deduplicate by source ID and location, route only shortlisted candidates, cancel obsolete searches and honor rate-limit responses. Cache reusable public results by coarse area, forecast hour and source version where terms permit. Never share user preferences or private origins through a cache. Version adapters so a source can be replaced independently. Horizontal scaling requires a shared quota counter or a single outbound gateway. Traffic capacity and latency targets require a measured baseline before public release.

## Service feasibility and data handling

| Candidate | Pilot use and boundary | Failure or launch condition |
|---|---|---|
| Geoapify | Worldwide map, geocoding, places and mode-specific routes. Free plan lists 3,000 credits/day and 5 requests/second. Estimate search cost including tiles and both route legs. | Restrict keys by purpose/origin. Use a non-billed project and no upgrade. Validate credits per operation and remaining capacity before live use. Cache only permitted responses. |
| Open-Meteo | Hourly weather at coarse location and planned time for a noncommercial evaluation. | Show unavailable outside forecast horizon. Commercial launch needs a permitted zero-cost source or a new budget decision. |
| Public venue and tourism sources | Prefer licensed feeds, official linked menus, published admission fees and date-specific events. Use permission-compatible, bounded retrieval of public sources when available. | Keep provenance and retrieval date. No exhaustive web-coverage promise, arbitrary URL fetching or invented booking availability. |
| Browser-local model, e.g. built-in Prompt API | Capability-check at runtime. User chooses whether to download. Parse intentions locally and validate structured edits. | Never require a model for basic use. No Gemini/Grok cloud key or chat transfer. Check device and language coverage before release. |
| Device storage | Save interests, currency and budget on explicit choice. Keep origin and conversation in session memory. | One reset removes preferences. No account, payment details, analytics identifiers or saved precise-location history. |

The browser and map/routing providers necessarily handle location information. Explain the recipients before live lookup, offer manual origin, and minimize coordinate precision for forecasts. Do not log coordinates, raw prompts, addresses or request URLs. Provider retention, data region, key restrictions, licenses and library advisories remain to verify against the selected versions. Unverified data paths stay behind fixtures. Venue content is untrusted display data. Permit verified HTTPS handoffs, sanitize text, and never let model output execute instructions or open a booking. Apply bounded requests, timeouts and a quota stop. Test blocked schemes, missing fields, unsafe provider responses, logging exclusions and repeated searches. With no account or server-held personal records, account recovery and database migrations are outside the pilot.

Sources reviewed on 17 November 2026: [Geoapify pricing](https://www.geoapify.com/pricing/), [Places](https://apidocs.geoapify.com/docs/places/), [routing](https://www.geoapify.com/routing-api/), [Open-Meteo](https://open-meteo.com/en/pricing), [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api), [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js), [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Release boundary

All acceptance checks above are planned. Build locally after approval. Verify availability, quota and disclosure behavior on a release candidate before proposing a public rollout. If a live source fails, disable that adapter and preserve the map/list or show an explicit unavailable state. The existing unpublished site does not establish Java hosting or public capacity. Native reservations, payment processing, online AI and ongoing paid API usage are outside this version.
