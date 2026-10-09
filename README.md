# 🏙️ CityPulse Pune

> **Explore · Experience · Navigate** — a smart, mobile-first city exploration platform that turns scattered city data into verified, actionable insights for exploring Pune smarter, safer and more enjoyably.

Built for the **“City Life: Exploring, Experiencing & Navigating the Chaos We Call Home”** challenge.

**🔗 Live demo:** _add your deployed URL here_  ·  **📦 Repository:** _add your GitHub URL here_

---

## ✨ What it does

| Challenge requirement | CityPulse feature |
|---|---|
| **Exploration & Hospitality** | Search and filter attractions, local food and stays by category, budget tier and score; “Today’s smart plan” suggests places based on live weather, air quality, time of day and traffic. |
| **History & Culture** | Heritage places (Shaniwar Wada, Aga Khan Palace, Pataleshwar, Sinhagad, Dagdusheth Ganpati…) with short history notes, best time to visit and cultural context. |
| **Safety & Security** | Hazard layer for accident-prone, congested, unsafe-at-night and waterlogging zones. **Safer-route finder** compares the fastest route against alternatives scored on hazard exposure and live citizen reports. Night mode re-weights after-dark risks. |
| **Best vs. Worst Places** | Adjustable weights (rating, safety, cleanliness, affordability, accessibility) drive a live **best / lowest-scoring** ranking and a side-by-side comparison of up to 3 places. |
| **Smart City Insights** | Live weather + AQI (Open-Meteo), weather alerts and advice, traffic outlook, analytics dashboards, and an NLP-powered **citizen voice** panel built from reports with photos, GPS and **voice notes**. |

### Technologies used
- **AI / NLP** — on-device lexicon-based NLP (English + Hinglish/Marathi cues) that classifies report category, sentiment and severity; speech-to-text for voice notes and voice search (Web Speech API); a rule-based decision engine for recommendations.
- **Geolocation & maps** — Leaflet + OpenStreetMap, browser Geolocation API, OSRM routing.
- **APIs** — Open-Meteo (weather, air quality), OSRM (routes), OSM tiles. All free, **no API keys required**.
- **Data analytics** — weighted multi-criteria scoring, route-risk modelling, trust scoring of reports, category/sentiment analytics.
- **Web platform** — installable PWA (manifest + service worker), responsive/mobile-first, accessible (keyboard, ARIA, reduced-motion, dark mode).

## 🧠 How the intelligence works

- **Place score** = weighted average of rating, safety, cleanliness, affordability and accessibility (weights are user-adjustable).
- **Route risk** — each candidate route is densified to ~100 m steps; every step accumulates `severity × (1 − distance/radius)` for hazard zones in range (night-only zones count more after dark) plus recent citizen reports weighted by trust. The route with lowest total exposure is the “safest”.
- **Report NLP** — keyword/lexicon classifier with negation handling and urgency/intensifier cues → category, sentiment, severity (1–5).
- **Report trust (0–100)** — rises with community confirmations, photo/voice evidence and GPS; drops with disputes and age.
- **Traffic outlook** — typical weekday/weekend pattern heuristic (clearly labelled as an estimate, not a live feed).

## ⚠️ Data note (please read)

The place scores, hazard zones and seed reports in `public/js/data.js` are a **curated, illustrative sample** for the prototype — they are *not* official statistics. Coordinates are approximate. Historical blurbs summarise widely documented facts. For production, connect verified sources (police/RTO accident data, municipal cleanliness surveys, ratings APIs, a citizen-report backend). The app is structured so this is a data swap, not a rewrite.

## 🚀 Run locally

```bash
git clone https://github.com/<your-username>/citypulse-pune.git
cd citypulse-pune
npm start          # serves ./public at http://localhost:8080 (no dependencies)
npm test           # 17 unit tests (Node ≥ 18)
```
You can also just open `public/index.html` in a browser (an internet connection is needed for the map, weather and routing).

## ☁️ Deploy

**Netlify** — connect the repo (build command: none, publish directory: `public`; already set in `netlify.toml`), or drag the `public` folder onto <https://app.netlify.com/drop>.

**GitHub Pages** — Settings → Pages → Source: *GitHub Actions*. The included workflow `.github/workflows/pages.yml` publishes `public/` on every push to `main`.

## 🗂️ Project structure

```
public/            static site (deployed)
  index.html       app shell
  css/styles.css   mobile-first styles, dark mode
  js/data.js       curated Pune dataset (replace with real sources)
  js/nlp.js        report classification, sentiment, trust score
  js/scoring.js    place ranking, route risk, traffic, weather advice
  js/app.js        UI, map, routing, reports, insights
  sw.js, manifest  PWA support
tests/             node:test unit tests for NLP + scoring
docs/              architecture and roadmap
.github/workflows  CI (tests) and Pages deploy
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design details and the roadmap.

## 🔒 Privacy & security

- No accounts, no tracking, no API keys. Reports (text, photos, voice) are stored **only in your browser’s localStorage**; “Export JSON” lets you take them with you.
- Location is requested only when you tap “Use GPS” or “My location”.
- All user text is HTML-escaped before display.

## 🛣️ Roadmap

Real-time traffic feed · backend for shared, moderated citizen reports · ML-trained classifier (e.g. multilingual transformer) · public-transport routing · more cities (data-driven, see architecture doc) · offline map tiles.

## 🙏 Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · [Leaflet](https://leafletjs.com) · [Open-Meteo](https://open-meteo.com) · [OSRM](https://project-osrm.org).

## 📄 License

MIT — see [LICENSE](LICENSE).
