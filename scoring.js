/*
 * CityPulse scoring — place ranking, hazard-aware route risk, traffic and weather advice.
 * Pure functions, no DOM. UMD so it can be unit-tested in Node and reused in the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CityScore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_WEIGHTS = { rating: 25, safety: 25, cleanliness: 15, affordability: 15, accessibility: 20 };

  /** Great-circle distance in metres between [lat,lng] points. */
  function haversine(a, b) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /** Normalise every metric to 0..10 (rating is 0..5 -> doubled). */
  function metrics(place) {
    const s = place.scores;
    return { rating: s.rating * 2, safety: s.safety, cleanliness: s.cleanliness, affordability: s.affordability, accessibility: s.accessibility };
  }

  /** Weighted composite on a 0..100 scale. Weights are relative (need not sum to 100). */
  function compositeScore(place, weights) {
    const w = Object.assign({}, DEFAULT_WEIGHTS, weights || {});
    const m = metrics(place);
    let total = 0;
    let sum = 0;
    for (const k of Object.keys(DEFAULT_WEIGHTS)) {
      total += m[k] * w[k];
      sum += w[k];
    }
    return sum === 0 ? 0 : Math.round((total / sum) * 10 * 10) / 10;
  }

  function rankPlaces(places, weights, opts) {
    opts = opts || {};
    let list = places.map((p) => ({ place: p, score: compositeScore(p, weights) }));
    if (opts.category && opts.category !== 'all') list = list.filter((x) => x.place.category === opts.category);
    list.sort((a, b) => b.score - a.score);
    return list;
  }

  function bestWorst(places, weights, n, category) {
    const ranked = rankPlaces(places, weights, { category });
    n = n || 5;
    return { best: ranked.slice(0, n), worst: ranked.slice(-n).reverse() };
  }

  function nightFactor(hazard, night) {
    // Hazards flagged nightOnly are weighted up after dark and mostly ignored by day.
    if (hazard.nightOnly) return night ? 1.4 : 0.15;
    return night ? 1.15 : 1;
  }

  /** Risk contributed by hazard zones near a single point. */
  function pointRisk(pt, hazards, night) {
    let r = 0;
    for (const h of hazards) {
      const d = haversine(pt, [h.lat, h.lng]);
      if (d < h.radius) r += h.severity * (1 - d / h.radius) * nightFactor(h, night);
    }
    return r;
  }

  /** Resample a polyline ([lat,lng] array) so consecutive points are at most stepM apart. */
  function densify(coords, stepM) {
    stepM = stepM || 100;
    const out = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      const d = haversine(a, b);
      const n = Math.max(1, Math.ceil(d / stepM));
      for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    if (coords.length) out.push(coords[coords.length - 1]);
    return out;
  }

  function polylineLength(coords) {
    let m = 0;
    for (let i = 0; i < coords.length - 1; i++) m += haversine(coords[i], coords[i + 1]);
    return m;
  }

  /**
   * Score a route against hazard zones and live citizen reports.
   * Returns total risk exposure, riskPerKm and a 0..100 safety score (higher is safer).
   * Reports must carry {lat,lng,severity,trust}; they act as small temporary hazards (150 m).
   */
  function routeRisk(coords, hazards, reports, opts) {
    opts = opts || {};
    const night = !!opts.night;
    const pts = densify(coords, 100);
    const stepKm = 0.1;
    let total = 0;
    const hits = new Set();
    const reportHazards = (reports || [])
      .filter((r) => r.category !== 'praise')
      .map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, radius: 150, severity: Math.max(1, r.severity * ((r.trust || 50) / 100) * 1.2) }));
    const all = hazards.concat(reportHazards);
    for (const p of pts) {
      const r = pointRisk(p, all, night);
      total += r * stepKm;
      if (r > 0) for (const h of all) if (haversine(p, [h.lat, h.lng]) < h.radius) hits.add(h.id);
    }
    const km = Math.max(0.1, polylineLength(coords) / 1000);
    const riskPerKm = total / km;
    // Score on total exposure (severity-weighted km spent inside hazard zones) so long routes are not diluted.
    const safety = Math.max(0, Math.round(100 - Math.min(100, total * 12)));
    return { risk: total, riskPerKm, safety, km, hazardIds: [...hits] };
  }

  /**
   * Pick fastest and safest among routes: [{coords, durationS, distanceM}].
   * The safest route has the lowest total hazard exposure; ties are broken by duration.
   */
  function chooseRoutes(routes, hazards, reports, opts) {
    const scored = routes.map((r, i) => Object.assign({ index: i }, r, { risk: routeRisk(r.coords, hazards, reports, opts) }));
    const fastest = scored.slice().sort((a, b) => a.durationS - b.durationS)[0];
    const safest = scored.slice().sort((a, b) => a.risk.risk - b.risk.risk || a.durationS - b.durationS)[0];
    return { scored, fastest, safest, same: fastest.index === safest.index };
  }

  /** Typical-pattern congestion level 0..3 (heuristic — no live traffic feed is used). */
  function trafficLevel(date) {
    const d = date || new Date();
    const day = d.getDay();
    const h = d.getHours() + d.getMinutes() / 60;
    const weekend = day === 0 || day === 6;
    if (weekend) return h >= 17 && h < 21 ? 2 : h >= 11 && h < 17 ? 1 : 0;
    if ((h >= 8.5 && h < 11) || (h >= 17.5 && h < 21)) return 3;
    if ((h >= 8 && h < 8.5) || (h >= 11 && h < 12) || (h >= 17 && h < 17.5) || (h >= 21 && h < 22)) return 2;
    if (h >= 12 && h < 17) return 1;
    return 0;
  }

  const TRAFFIC_LABELS = ['Light', 'Moderate', 'Heavy', 'Peak'];

  function aqiBand(aqi) {
    if (aqi == null || isNaN(aqi)) return { label: 'Unknown', level: -1 };
    if (aqi <= 50) return { label: 'Good', level: 0 };
    if (aqi <= 100) return { label: 'Moderate', level: 1 };
    if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', level: 2 };
    if (aqi <= 200) return { label: 'Unhealthy', level: 3 };
    return { label: 'Very unhealthy', level: 4 };
  }

  /**
   * Rule engine: turns weather + air quality + time of day into advice and place filters.
   * wx: {temp, feels, rainProb (max % next 6h), precip, code}; aqi: number|null
   */
  function dayAdvice(wx, aqi, date) {
    const tips = [];
    const prefer = new Set();
    const avoid = new Set();
    const d = date || new Date();
    const hour = d.getHours();
    const stormy = wx && (wx.code >= 95 || (wx.code >= 80 && wx.code <= 82));
    const rainy = wx && (wx.rainProb >= 50 || wx.precip > 0.2 || (wx.code >= 51 && wx.code <= 82));
    const hot = wx && wx.feels >= 35;
    const poorAir = aqiBand(aqi).level >= 2;

    if (stormy) { tips.push({ level: 'alert', text: 'Thunderstorm risk — avoid hill forts and open-air spots; stay off waterlogged underpasses.' }); avoid.add('outdoor'); }
    if (rainy) { tips.push({ level: 'warn', text: 'Rain likely — good day for museums, cafés and covered markets. Allow extra time for travel.' }); prefer.add('indoor'); avoid.add('hill'); }
    if (hot) { tips.push({ level: 'warn', text: 'Feels very hot — visit outdoor sights before 10 am or after 5 pm and carry water.' }); prefer.add('indoor'); }
    if (poorAir) { tips.push({ level: 'warn', text: 'Air quality is poor — limit long outdoor walks, sensitive groups should take care.' }); prefer.add('indoor'); avoid.add('outdoor'); }
    if (!rainy && !hot && !poorAir && !stormy) { tips.push({ level: 'good', text: 'Conditions look good for outdoor exploring.' }); prefer.add('outdoor'); }
    if (hour >= 19 || hour < 6) tips.push({ level: 'warn', text: 'It is night — prefer busy, well-lit routes and the safest-route option on the map.' });
    const t = trafficLevel(d);
    if (t >= 2) tips.push({ level: 'warn', text: TRAFFIC_LABELS[t] + ' traffic expected right now — consider public transport or shifting plans by an hour.' });
    return { tips, prefer: [...prefer], avoid: [...avoid] };
  }

  /** Map a WMO weather code to short text. */
  function wmoText(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code >= 61 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Cloudy';
  }

  return { DEFAULT_WEIGHTS, haversine, compositeScore, rankPlaces, bestWorst, pointRisk, densify, polylineLength, routeRisk, chooseRoutes, trafficLevel, TRAFFIC_LABELS, aqiBand, dayAdvice, wmoText };
});
