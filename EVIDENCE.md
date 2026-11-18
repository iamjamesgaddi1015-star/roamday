# Pilot verification · 18 November 2026

Frontend production build and strict TypeScript checks passed. All 15 frontend/data tests passed, covering round-trip fit, unknown cost handling, hours, chat refinement, local timezone lookup, unsafe links, provider failure and venue guide enrichment. Production npm audit returned zero reported vulnerabilities.

Desktop browser checks exercised the illustrated discovery screen, chat budget/category changes, live lookup, live weather, saved-guide fallback, real menu link, stale-result invalidation, theme switching and unavailable-local-model feedback. Live Overpass failed during that check; the app displayed the sourced Makati guide and left routes unverified. A full mobile/tablet, accessibility and successful worldwide live provider matrix remains open. Actual model inference was unavailable in the test browser.

The Java 21 gateway compiles and packages successfully. API integration tests cover health, missing credentials, invalid search input, rejected origin and oversized JSON.

Independent QA and security agents identified integration defects and bounded-data issues; fixes were applied. Their final reviews were interrupted by usage limits. Final independent sign-off remains OPEN. The current result is a private evaluation pilot, with public release readiness pending these checks.

The static pilot has no Java deployment or Geoapify secret. Its default read-only public-source path is subject to rate limits and can return unverified discoveries. A production deployment requires a configured single outbound gateway (or centralized multi-instance limits), suitable provider capacity and an eligible weather license.

Generated images are sample illustrations. No reservations or purchases occur inside Roamday. No paid provider or automatic billing was activated.
