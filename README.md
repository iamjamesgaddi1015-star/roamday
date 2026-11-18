# Roamday

Nearby outing discovery with a map, budget and time filters, weather, venue menus and booking handoffs. The first screen is an explicitly labeled Makati sample matching the approved visual design. Select Search live places or choose an origin for sourced results.

## Run

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Tests run with npm test, type checking with npm run typecheck, and the static production build with npm run build. Serve the generated out/ directory over HTTPS for geolocation and optional local AI.

## Data and pilot limitations

The default browser path uses OpenStreetMap tiles, bounded Overpass queries, Open-Meteo geocoding/weather and a small sourced Makati guide. No API key is required. Providers have limited capacity and variable coverage. Failed lookup displays an explicit error or a labeled saved venue guide. Unknown journey, price and hours never establish a confirmed time/budget match. The Java gateway supports Geoapify route lookups when configured.

The on-device chat option uses the browser's LanguageModel capability where available. The standard parser works without a model. Enabling AI may require a large browser-managed download. Prompts remain on the device. Model availability varies by device/browser. Preferences are optional local storage and can be reset. Location and conversations are session-only.

Use map tiles with required attribution and respect provider policies. Open-Meteo's free endpoint is for noncommercial evaluation. A commercial launch requires an eligible weather service and capacity assessment. Zero paid API usage is the current limit.

## Backend

See backend/README.md. The hosted static pilot does not provision Java hosting, Geoapify credentials or a shared quota service. Route integration therefore remains optional. Running multiple gateway replicas requires a centralized quota/rate limiter before public traffic. This pilot has no account system or payment processing.

## Assets

Generated illustrative café/gallery/arcade photography is restricted to sample venue cards. Live records use verified source data and neutral placeholders. Fonts are self-hosted Instrument Sans and DM Serif Display. The local illustrated map is visibly marked as a preview.

## Verification

See EVIDENCE.md for executed checks and pending release work.
