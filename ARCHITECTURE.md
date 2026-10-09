# Architecture

CityPulse is a dependency-free static web app. All logic runs in the browser; external services are free, keyless public APIs.

```
            ┌────────────── Browser (PWA) ──────────────┐
 data.js ──▶│ app.js (UI/state)                         │──▶ Open-Meteo  (weather, AQI)
 (places,   │   ├─ nlp.js      report NLP + trust       │──▶ OSRM        (route alternatives)
 hazards,   │   ├─ scoring.js  ranking, route risk,     │──▶ OSM tiles   (map)
 reports)   │   │              traffic, advice          │
            │   └─ Leaflet     map rendering            │
            │ localStorage: citizen reports, votes      │
            └───────────────────────────────────────────┘
```

## Modules

- **`nlp.js`** (`window.CityNLP` / `require`) — `classifyReport(text)` returns `{category, sentiment, severity, keywords}`; `trustScore(report)` returns 0–100. Pure functions, unit-tested.
- **`scoring.js`** (`window.CityScore` / `require`) — `compositeScore`, `bestWorst`, `routeRisk`, `chooseRoutes`, `trafficLevel`, `dayAdvice`. Pure functions, unit-tested.
- **`data.js`** — the only file that holds city content. Shape:
  - `places[]`: `id, name, category, area, lat, lng, priceTier, tags, blurb, history, bestTime, scores{rating(0–5), safety, cleanliness, affordability, accessibility (0–10)}`
  - `hazards[]`: `id, name, type(accident|traffic|unsafe|flood), lat, lng, radius(m), severity(1–5), nightOnly?, note`
  - `seedReports[]`: demo citizen reports.
- **`app.js`** — renders the six tabs (Discover, Map, Safety, Compare, Insights, Report), wires events, and talks to APIs.

## Safer-route algorithm

1. Request up to 3 driving alternatives from OSRM.
2. Densify each polyline to ≤100 m steps.
3. For each step add `Σ severity × (1 − d/radius) × nightFactor` for hazards in range, plus recent reports (150 m radius, severity × trust).
4. `safety = 100 − 12 × total exposure` (clamped). Safest = lowest exposure, ties broken by duration.

If OSRM is unreachable the UI falls back to a straight-line estimate and says so.

## Adding another city

Add a new dataset object (same shape as above) and set `window.CITYPULSE_DATA` to it (a city switcher can pick between datasets at load time). Nothing else is Pune-specific except copy in `index.html`.

## Testing

`npm test` runs unit tests for NLP and scoring using Node’s built-in test runner. The UI was additionally smoke-tested in headless Chromium (search, filters, modal, routing, compare, insights, report create/persist, XSS escape).

## Limitations

- Sample data (see README). Traffic is a heuristic, not live.
- OSRM public demo server is rate-limited and driving-only; self-host OSRM/Valhalla for production and add walking/transit.
- Reports are device-local; a backend with moderation is needed for shared verification.
- The NLP is rule-based; swap `classifyReport` for a hosted multilingual model without changing the UI.
