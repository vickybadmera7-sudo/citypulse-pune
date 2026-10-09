/* CityPulse Pune — application UI. Depends on data.js, nlp.js, scoring.js (and Leaflet for the map). */
(function () {
  'use strict';

  const D = window.CITYPULSE_DATA;
  const NLP = window.CityNLP;
  const S = window.CityScore;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const METRICS = [
    ['rating', 'Rating'], ['safety', 'Safety'], ['cleanliness', 'Cleanliness'], ['affordability', 'Affordability'], ['accessibility', 'Accessibility']
  ];
  const HAZARD_STYLE = {
    accident: { color: '#dc2626', icon: '💥', label: 'Accident-prone' },
    traffic: { color: '#f97316', icon: '🚦', label: 'Congestion' },
    unsafe: { color: '#7c3aed', icon: '⚠️', label: 'Unsafe area' },
    flood: { color: '#0284c7', icon: '🌊', label: 'Waterlogging' }
  };
  const REPORT_STYLE = {
    accident: '💥', safety: '⚠️', traffic: '🚦', flood: '🌊', cleanliness: '🗑️', infrastructure: '🚧', praise: '👍', other: '📌'
  };
  const REPORTS_KEY = 'citypulse.reports.v1';
  const VOTES_KEY = 'citypulse.votes.v1';

  const hr = new Date().getHours();
  const state = {
    cat: 'all', q: '', budget: 0, sort: 'score', night: hr >= 19 || hr < 6,
    weights: Object.assign({}, S.DEFAULT_WEIGHTS), compare: [], cmpCat: 'all',
    wx: null, aqi: null, wxAt: 0, reports: [], votes: {},
    rGps: null, rPhoto: null, rVoice: null, layers: { place: true, hazard: true, report: false }
  };

  /* ---------- utilities ---------- */
  function load(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
  function ago(ts) { const m = Math.max(1, Math.round((Date.now() - ts) / 60000)); if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); return h < 48 ? h + ' h ago' : Math.round(h / 24) + ' d ago'; }
  function band(v) { return v >= 7.5 ? 'good' : v >= 5.5 ? 'warn' : 'bad'; }
  function tier(n) { return '₹'.repeat(n); }
  function placeById(id) { return D.places.find((p) => p.id === id); }
  function fetchJSON(url, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 12000);
    return fetch(url, { signal: ctl.signal }).then((r) => { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function bar(value, max, cls) { return '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.max(2, Math.min(100, (value / max) * 100)) + '%"></i></div>'; }

  /* ---------- reports store ---------- */
  function initReports() {
    state.votes = load(VOTES_KEY, {});
    const mine = load(REPORTS_KEY, []);
    const seeds = D.seedReports.map((r) => Object.assign({}, r, { ts: Date.now() - r.minutesAgo * 60000 }));
    state.reports = mine.concat(seeds);
    // Votes on sample reports are replayed from the vote log; user reports already persist their counts.
    state.reports.forEach((r) => { const v = r.sample && state.votes[r.id]; if (v) { r.confirms = (r.confirms || 0) + (v === 'c' ? 1 : 0); r.disputes = (r.disputes || 0) + (v === 'd' ? 1 : 0); } });
  }
  function persistUserReports() {
    const ok = save(REPORTS_KEY, state.reports.filter((r) => !r.sample).map((r) => { const c = Object.assign({}, r); delete c._cls; return c; }));
    if (!ok) toast('Storage is full — report kept for this session only.');
  }
  function view(r) {
    const cls = NLP.classifyReport(r.text);
    return Object.assign({}, r, { cls, category: cls.category, severity: cls.severity, trust: NLP.trustScore(r) });
  }
  function activeReports() { return state.reports.map(view).filter((r) => Date.now() - r.ts < 72 * 3600000); }

  /* ---------- navigation ---------- */
  function switchTab(name) {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
    $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    window.scrollTo({ top: 0 });
    if (name === 'map') { initMap(); setTimeout(() => map && map.invalidateSize(), 60); }
    if (name === 'safety') renderSafety();
    if (name === 'compare') { renderWeights(); renderBestWorst(); renderCompare(); }
    if (name === 'insights') { renderInsights(); if (Date.now() - state.wxAt > 600000) loadLive(); }
    if (name === 'report') renderReports();
  }

  /* ---------- Discover ---------- */
  function renderCatChips() {
    const cats = [['all', '✨ All']].concat(Object.entries(D.categories).map(([k, v]) => [k, v.icon + ' ' + v.label]));
    $('#catChips').innerHTML = cats.map(([k, l]) => '<button class="chip' + (state.cat === k ? ' on' : '') + '" data-cat="' + k + '">' + l + '</button>').join('');
    $('#cmpCat').innerHTML = cats.map(([k, l]) => '<button class="chip' + (state.cmpCat === k ? ' on' : '') + '" data-cmpcat="' + k + '">' + l + '</button>').join('');
  }

  function filteredPlaces() {
    const q = state.q.trim().toLowerCase();
    let list = D.places.filter((p) => {
      if (state.cat !== 'all' && p.category !== state.cat) return false;
      if (state.budget && p.priceTier > state.budget) return false;
      if (q) {
        const hay = (p.name + ' ' + p.area + ' ' + p.tags.join(' ') + ' ' + p.blurb + ' ' + p.history + ' ' + D.categories[p.category].label).toLowerCase();
        return q.split(/\s+/).every((w) => hay.includes(w));
      }
      return true;
    });
    const keyFn = state.sort === 'score' ? (p) => S.compositeScore(p, state.weights) : state.sort === 'rating' ? (p) => p.scores.rating : (p) => p.scores[state.sort];
    return list.sort((a, b) => keyFn(b) - keyFn(a));
  }

  function placeCard(p) {
    const c = D.categories[p.category];
    const sc = S.compositeScore(p, state.weights);
    const safe = p.scores.safety;
    return '<div class="place" role="button" tabindex="0" data-place="' + p.id + '">' +
      '<div class="ico" style="background:' + c.color + '">' + c.icon + '</div>' +
      '<div><h3>' + esc(p.name) + '</h3><div class="meta">' + esc(p.area) + ' · ' + tier(p.priceTier) + ' · ★ ' + p.scores.rating.toFixed(1) + '</div>' +
      '<div class="pills"><span class="pill ' + band(safe) + '">Safety ' + safe + '/10</span><span class="pill ' + band(p.scores.cleanliness) + '">Clean ' + p.scores.cleanliness + '</span>' +
      (p.history ? '<span class="pill">History</span>' : '') + '</div></div>' +
      '<div class="score"><b>' + Math.round(sc) + '</b><small>score</small></div></div>';
  }

  function renderDiscover() {
    const list = filteredPlaces();
    $('#placeList').innerHTML = list.length ? list.map(placeCard).join('') : '<div class="card muted">No places match. Try clearing filters.</div>';
    renderPlan();
  }

  function renderPlan() {
    const el = $('#planCard');
    if (!state.wx) { el.innerHTML = '<h3>🧠 Today’s smart plan</h3><p class="muted loading">Checking live weather and air quality…</p>'; return; }
    const adv = S.dayAdvice(state.wx, state.aqi, new Date());
    const picks = D.places.map((p) => {
      let s = S.compositeScore(p, state.weights);
      if (p.tags.some((t) => adv.prefer.includes(t))) s += 12;
      if (p.tags.some((t) => adv.avoid.includes(t))) s -= 25;
      if (state.night && p.scores.safety < 7) s -= 10;
      return { p, s };
    }).filter((x) => x.p.category !== 'hotel').sort((a, b) => b.s - a.s).slice(0, 3);
    el.innerHTML = '<h3>🧠 Today’s smart plan</h3>' +
      adv.tips.map((t) => '<div class="tip ' + t.level + '">' + esc(t.text) + '</div>').join('') +
      '<p class="muted" style="margin-top:8px">Suggested right now:</p><div class="pills">' +
      picks.map((x) => '<button class="chip" data-place="' + x.p.id + '">' + D.categories[x.p.category].icon + ' ' + esc(x.p.name) + '</button>').join('') + '</div>';
  }

  function showPlace(id) {
    const p = placeById(id);
    if (!p) return;
    const c = D.categories[p.category];
    const near = D.hazards.map((h) => ({ h, d: S.haversine([p.lat, p.lng], [h.lat, h.lng]) })).filter((x) => x.d < 1500 + x.h.radius).sort((a, b) => a.d - b.d).slice(0, 3);
    const inCmp = state.compare.includes(p.id);
    $('#mBody').innerHTML =
      '<h2 id="mTitle">' + c.icon + ' ' + esc(p.name) + '</h2>' +
      '<p class="muted">' + esc(c.label) + ' · ' + esc(p.area) + ' · ' + tier(p.priceTier) + '</p>' +
      '<p>' + esc(p.blurb) + '</p>' +
      (p.history ? '<h3>History &amp; culture</h3><p>' + esc(p.history) + '</p>' : '') +
      '<p><strong>Best time:</strong> ' + esc(p.bestTime) + '</p>' +
      '<h3>Scores <span class="muted">(overall ' + Math.round(S.compositeScore(p, state.weights)) + '/100)</span></h3>' +
      METRICS.map(([k, l]) => { const v = k === 'rating' ? p.scores.rating * 2 : p.scores[k]; return '<div class="barrow"><span>' + l + '</span>' + bar(v, 10, v < 5.5 ? 'bad' : v < 7.5 ? 'warn' : '') + '<b>' + (k === 'rating' ? p.scores.rating.toFixed(1) : v) + '</b></div>'; }).join('') +
      (near.length ? '<h3>Nearby cautions</h3>' + near.map((x) => '<div class="tip warn">' + HAZARD_STYLE[x.h.type].icon + ' <strong>' + esc(x.h.name) + '</strong> — ' + esc(x.h.note) + '</div>').join('') : '<div class="tip">No known hazard zones close to this place in the sample data.</div>') +
      '<div class="row" style="margin-top:12px">' +
      '<button class="btn" data-act="map" data-id="' + p.id + '">🗺️ On map</button>' +
      '<button class="btn" data-act="route" data-id="' + p.id + '">🧭 Safer route here</button>' +
      '<button class="btn" data-act="cmp" data-id="' + p.id + '">' + (inCmp ? '✓ In compare' : '＋ Compare') + '</button>' +
      '<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng + '">Open in Maps ↗</a></div>';
    $('#modal').hidden = false;
    $('#mClose').focus();
  }
  function closeModal() { $('#modal').hidden = true; }

  /* ---------- Map & routes ---------- */
  let map = null, placeLayer, hazardLayer, reportLayer, routeLayer;

  function pinIcon(color, icon) { return L.divIcon({ className: '', html: '<div class="pin" style="background:' + color + '"><span>' + icon + '</span></div>', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] }); }

  function initMap() {
    if (map) return;
    if (typeof L === 'undefined') { $('#map').innerHTML = '<div class="card muted">The map library could not load (check your internet connection) — the rest of the app still works.</div>'; return; }
    map = L.map('map', { zoomControl: true }).setView(D.city.center, D.city.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    placeLayer = L.layerGroup(); hazardLayer = L.layerGroup(); reportLayer = L.layerGroup(); routeLayer = L.layerGroup().addTo(map);
    D.places.forEach((p) => {
      const c = D.categories[p.category];
      L.marker([p.lat, p.lng], { icon: pinIcon(c.color, c.icon), title: p.name, keyboard: true }).on('click', () => showPlace(p.id)).addTo(placeLayer);
    });
    D.hazards.forEach((h) => {
      const st = HAZARD_STYLE[h.type];
      L.circle([h.lat, h.lng], { radius: h.radius, color: st.color, weight: 1, fillColor: st.color, fillOpacity: 0.18 })
        .bindPopup('<strong>' + st.icon + ' ' + esc(h.name) + '</strong><br>' + esc(st.label) + ' · severity ' + h.severity + '/5' + (h.nightOnly ? ' · night risk' : '') + '<br>' + esc(h.note)).addTo(hazardLayer);
    });
    refreshReportLayer();
    syncLayers();
    renderLayerChips();
  }
  function refreshReportLayer() {
    if (!map) return;
    reportLayer.clearLayers();
    activeReports().forEach((r) => {
      L.marker([r.lat, r.lng], { icon: pinIcon(r.category === 'praise' ? '#16a34a' : '#475569', REPORT_STYLE[r.category] || '📌') })
        .bindPopup('<strong>' + esc(r.category) + '</strong> · trust ' + r.trust + '%<br>' + esc(r.text)).addTo(reportLayer);
    });
  }
  function syncLayers() {
    if (!map) return;
    [['place', placeLayer], ['hazard', hazardLayer], ['report', reportLayer]].forEach(([k, g]) => { if (state.layers[k]) g.addTo(map); else map.removeLayer(g); });
  }
  function renderLayerChips() {
    $('#layerChips').innerHTML = [['place', '📍 Places'], ['hazard', '⚠️ Hazard zones'], ['report', '📝 Citizen reports']]
      .map(([k, l]) => '<button class="chip' + (state.layers[k] ? ' on' : '') + '" data-layer="' + k + '">' + l + '</button>').join('');
  }

  function fillRouteSelects() {
    const opts = (withMe) => (withMe ? '<option value="me">📍 My location</option>' : '') + D.places.map((p) => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('');
    $('#routeFrom').innerHTML = opts(true);
    $('#routeTo').innerHTML = opts(false);
    $('#routeFrom').value = 'stay-hinjewadi';
    $('#routeTo').value = 'shaniwar-wada';
  }

  function getPoint(val) {
    if (val !== 'me') { const p = placeById(val); return Promise.resolve([p.lat, p.lng]); }
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation is not available on this device.'));
      navigator.geolocation.getCurrentPosition((pos) => resolve([pos.coords.latitude, pos.coords.longitude]), () => reject(new Error('Could not get your location — allow location access or choose a place.')), { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  function routeBox(kind, r, extra) {
    const label = kind === 'fast' ? '⚡ Fastest' : '🛡️ Safest';
    const risk = r.risk;
    const cls = risk.safety >= 75 ? 'good' : risk.safety >= 50 ? 'warn' : 'bad';
    const names = risk.hazardIds.map((id) => { const h = D.hazards.find((x) => x.id === id); return h ? h.name : 'citizen report'; });
    return '<div class="route-box ' + kind + '"><div class="between"><strong>' + label + (extra || '') + '</strong><span class="pill ' + cls + '">Safety ' + risk.safety + '/100</span></div>' +
      '<div class="muted">' + (r.distanceM / 1000).toFixed(1) + ' km · ' + Math.round(r.durationS / 60) + ' min' + (state.night ? ' · night scoring' : '') + '</div>' +
      '<div class="muted">' + (names.length ? 'Passes near: ' + esc([...new Set(names)].slice(0, 4).join(', ')) : 'Avoids all known hazard zones') + '</div></div>';
  }

  async function compareRoutes() {
    initMap();
    if (!map) return;
    const btn = $('#routeBtn'), out = $('#routeResult');
    if ($('#routeFrom').value === $('#routeTo').value) { out.innerHTML = '<div class="tip warn">Choose two different places.</div>'; return; }
    btn.disabled = true; out.innerHTML = '<p class="loading">Finding routes…</p>';
    routeLayer.clearLayers();
    try {
      const [a, b] = await Promise.all([getPoint($('#routeFrom').value), getPoint($('#routeTo').value)]);
      let routes;
      let note = '';
      try {
        const url = 'https://router.project-osrm.org/route/v1/driving/' + a[1] + ',' + a[0] + ';' + b[1] + ',' + b[0] + '?alternatives=true&overview=full&geometries=geojson';
        const data = await fetchJSON(url, 15000);
        if (data.code !== 'Ok' || !data.routes.length) throw new Error('No route');
        routes = data.routes.map((r) => ({ coords: r.geometry.coordinates.map((c) => [c[1], c[0]]), durationS: r.duration, distanceM: r.distance }));
      } catch (e) {
        const d = S.haversine(a, b) * 1.3;
        routes = [{ coords: [a, b], durationS: d / 8.3, distanceM: d }];
        note = '<div class="tip warn">Routing service unreachable — showing a straight-line estimate only.</div>';
      }
      const res = S.chooseRoutes(routes, D.hazards, activeReports(), { night: state.night });
      res.scored.forEach((r) => { if (r.index !== res.fastest.index && r.index !== res.safest.index) L.polyline(r.coords, { color: '#94a3b8', weight: 4, opacity: 0.6, dashArray: '6 8' }).addTo(routeLayer); });
      if (!res.same) L.polyline(res.fastest.coords, { color: '#475569', weight: 5, opacity: 0.85 }).bindTooltip('Fastest').addTo(routeLayer);
      const safeLine = L.polyline(res.safest.coords, { color: '#16a34a', weight: 6, opacity: 0.95 }).bindTooltip('Safest').addTo(routeLayer);
      L.marker(a, { icon: pinIcon('#0f766e', 'A') }).addTo(routeLayer);
      L.marker(b, { icon: pinIcon('#b91c1c', 'B') }).addTo(routeLayer);
      map.fitBounds(safeLine.getBounds().extend(res.fastest.coords), { padding: [30, 30] });
      let html = note;
      if (res.same) html += routeBox('safe', res.safest, ' (also the fastest)') + '<div class="tip">The fastest option is also the safest of the routes found.</div>';
      else {
        const extra = Math.round((res.safest.durationS - res.fastest.durationS) / 60);
        html += routeBox('fast', res.fastest) + routeBox('safe', res.safest, extra > 0 ? ' (+' + extra + ' min)' : '') +
          '<div class="tip">The safest route scores <strong>' + (res.safest.risk.safety - res.fastest.risk.safety) + ' safety points</strong> higher' + (extra > 0 ? ', at the cost of about ' + extra + ' extra minute' + (extra === 1 ? '' : 's') + '.' : ' and is not slower.') + '</div>';
      }
      out.innerHTML = html;
    } catch (e) {
      out.innerHTML = '<div class="tip alert">' + esc(e.message || 'Could not find a route.') + '</div>';
    } finally { btn.disabled = false; }
  }

  /* ---------- Safety ---------- */
  function renderSafety() {
    const reps = activeReports();
    const bad = reps.filter((r) => r.category !== 'praise');
    $('#safetySummary').innerHTML =
      '<div class="stat"><b>' + D.hazards.length + '</b><small>Hazard zones</small></div>' +
      '<div class="stat"><b>' + D.hazards.filter((h) => h.type === 'accident').length + '</b><small>Accident-prone</small></div>' +
      '<div class="stat"><b>' + bad.length + '</b><small>Active reports (72h)</small></div>';
    const w = (h) => h.severity * (h.nightOnly ? (state.night ? 1.4 : 0.15) : 1);
    $('#hazardList').innerHTML = D.hazards.slice().sort((a, b) => w(b) - w(a)).map((h) => {
      const st = HAZARD_STYLE[h.type];
      const dim = h.nightOnly && !state.night ? ' <span class="pill">Mostly after dark</span>' : '';
      return '<div class="hazard sev' + h.severity + '"><div class="between"><h3>' + st.icon + ' ' + esc(h.name) + '</h3><span class="pill">' + esc(st.label) + '</span></div>' +
        '<div class="muted">Severity ' + '●'.repeat(h.severity) + '○'.repeat(5 - h.severity) + dim + '</div><p>' + esc(h.note) + '</p>' +
        '<button class="btn small" data-act="hz" data-id="' + h.id + '">View on map</button></div>';
    }).join('');
  }

  /* ---------- Compare ---------- */
  function renderWeights() {
    $('#weights').innerHTML = METRICS.map(([k, l]) => '<label>' + l + '<input type="range" min="0" max="100" step="5" value="' + state.weights[k] + '" data-w="' + k + '" aria-label="' + l + ' weight"><b>' + state.weights[k] + '</b></label>').join('');
  }
  function renderBestWorst() {
    const bw = S.bestWorst(D.places, state.weights, 5, state.cmpCat);
    const item = (x) => '<div class="rank-item" data-place="' + x.place.id + '"><span>' + D.categories[x.place.category].icon + ' ' + esc(x.place.name) + '</span><b>' + Math.round(x.score) + '</b></div>';
    $('#bestWorst').innerHTML = '<div><h3>✅ Best picks</h3><div class="rank">' + bw.best.map(item).join('') + '</div></div><div><h3>⚠️ Lowest scoring</h3><div class="rank">' + bw.worst.map(item).join('') + '</div></div>';
  }
  function renderCompare() {
    const el = $('#compareTable');
    const ps = state.compare.map(placeById).filter(Boolean);
    if (!ps.length) { el.innerHTML = '<p class="muted">Nothing selected yet.</p>'; return; }
    const rows = [['Overall /100', (p) => Math.round(S.compositeScore(p, state.weights))]].concat(METRICS.map(([k, l]) => [l, (p) => (k === 'rating' ? p.scores.rating : p.scores[k])])).concat([['Price', (p) => 4 - p.priceTier, (p) => tier(p.priceTier)]]);
    let h = '<div class="table-wrap"><table class="cmp"><thead><tr><th></th>' + ps.map((p) => '<th>' + esc(p.name) + '<br><button class="btn small" data-rm="' + p.id + '">Remove</button></th>').join('') + '</tr></thead><tbody>';
    rows.forEach(([label, fn, disp]) => {
      const vals = ps.map(fn); const best = Math.max.apply(null, vals);
      h += '<tr><td>' + label + '</td>' + ps.map((p, i) => '<td class="' + (ps.length > 1 && vals[i] === best ? 'win' : '') + '">' + (disp ? disp(p) : vals[i]) + '</td>').join('') + '</tr>';
    });
    el.innerHTML = h + '</tbody></table></div>';
  }
  function toggleCompare(id) {
    const i = state.compare.indexOf(id);
    if (i >= 0) state.compare.splice(i, 1);
    else if (state.compare.length >= 3) { toast('Compare up to 3 places — remove one first.'); return false; }
    else state.compare.push(id);
    renderCompare();
    toast(i >= 0 ? 'Removed from compare' : 'Added to compare (Compare tab)');
    return true;
  }

  /* ---------- Live data & Insights ---------- */
  async function loadLive() {
    const [lat, lng] = D.city.center;
    try {
      const [wx, aq] = await Promise.allSettled([
        fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability&forecast_days=2&timezone=auto'),
        fetchJSON('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lng + '&current=us_aqi,pm2_5,pm10&timezone=auto')
      ]);
      if (wx.status === 'fulfilled') {
        const d = wx.value; const c = d.current;
        let i = d.hourly.time.findIndex((t) => t >= c.time.slice(0, 13) + ':00');
        if (i < 0) i = 0;
        const next = d.hourly.precipitation_probability.slice(i, i + 6);
        state.wx = {
          temp: c.temperature_2m, feels: c.apparent_temperature, humidity: c.relative_humidity_2m, precip: c.precipitation, code: c.weather_code, wind: c.wind_speed_10m,
          rainProb: next.length ? Math.max.apply(null, next) : 0,
          hourly: d.hourly.time.slice(i, i + 8).map((t, k) => ({ t: t.slice(11, 16), temp: d.hourly.temperature_2m[i + k], pop: d.hourly.precipitation_probability[i + k] }))
        };
        state.wxAt = Date.now();
      }
      if (aq.status === 'fulfilled') { state.aqi = aq.value.current.us_aqi; state.pm25 = aq.value.current.pm2_5; }
    } catch (e) { /* offline: UI shows graceful fallback */ }
    renderWxChip(); renderPlan();
    if ($('#tab-insights').classList.contains('active')) renderInsights();
  }
  function renderWxChip() {
    const el = $('#wxChip');
    if (!state.wx) { el.textContent = 'Weather —'; return; }
    el.textContent = Math.round(state.wx.temp) + '° ' + S.wmoText(state.wx.code) + (state.aqi != null ? ' · AQI ' + Math.round(state.aqi) : '');
  }

  function renderInsights() {
    // Live conditions
    const wx = state.wx;
    const aqb = S.aqiBand(state.aqi);
    let live = '<h2>🌦️ Live conditions</h2>';
    if (!wx) live += '<p class="muted">Live weather is unavailable right now (offline or blocked). Retry from a connected network.</p><button class="btn small" id="retryLive">Retry</button>';
    else {
      const adv = S.dayAdvice(wx, state.aqi, new Date());
      live += '<div class="stat-row"><div class="stat"><b>' + Math.round(wx.temp) + '°C</b><small>' + S.wmoText(wx.code) + ' · feels ' + Math.round(wx.feels) + '°</small></div>' +
        '<div class="stat"><b>' + wx.rainProb + '%</b><small>Rain chance (6 h)</small></div>' +
        '<div class="stat"><b>' + (state.aqi != null ? Math.round(state.aqi) : '—') + '</b><small>AQI · ' + aqb.label + '</small></div></div>' +
        '<h3 style="margin-top:10px">Next hours</h3><div class="hourly">' + wx.hourly.map((h) => '<div class="hour">' + h.t + '<b>' + Math.round(h.temp) + '°</b>' + h.pop + '%💧</div>').join('') + '</div>' +
        '<h3 style="margin-top:10px">Alerts &amp; advice</h3>' + adv.tips.map((t) => '<div class="tip ' + t.level + '">' + esc(t.text) + '</div>').join('');
    }
    $('#liveCard').innerHTML = live;

    // Traffic (heuristic)
    const lvl = S.trafficLevel(new Date());
    const day = new Date();
    const hours = Array.from({ length: 24 }, (_, h) => { const d = new Date(day); d.setHours(h, 30, 0, 0); return S.trafficLevel(d); });
    $('#trafficCard').innerHTML = '<h2>🚦 Traffic outlook</h2><p class="muted">Estimated from typical weekday/weekend patterns plus known hotspots — not a live feed.</p>' +
      '<div class="traffic-dial">' + [0, 1, 2, 3].map((i) => '<i class="' + (i <= lvl ? 'on' + lvl : '') + '"></i>').join('') + '</div>' +
      '<p><strong>' + S.TRAFFIC_LABELS[lvl] + '</strong> congestion expected now.</p>' +
      '<div class="hourly">' + hours.map((v, h) => '<div class="hour">' + String(h).padStart(2, '0') + '<b style="color:' + ['#16a34a', '#ca8a04', '#ea580c', '#dc2626'][v] + '">●</b></div>').join('') + '</div>' +
      '<h3 style="margin-top:10px">Congestion hotspots</h3>' + D.hazards.filter((h) => h.type === 'traffic').map((h) => '<div class="tip warn"><strong>' + esc(h.name) + '</strong> — ' + esc(h.note) + '</div>').join('');

    // Dataset analytics
    const cats = Object.keys(D.categories);
    const avg = (ps, k) => ps.reduce((s, p) => s + p.scores[k], 0) / (ps.length || 1);
    let an = '<h2>📈 City analytics</h2><p class="muted">Average scores by category across ' + D.places.length + ' curated places.</p>';
    ['safety', 'cleanliness', 'affordability', 'accessibility'].forEach((k) => {
      an += '<h3 style="margin-top:8px;text-transform:capitalize">' + k + '</h3>';
      cats.forEach((c) => { const v = avg(D.places.filter((p) => p.category === c), k); an += '<div class="barrow"><span>' + D.categories[c].icon + ' ' + D.categories[c].label + '</span>' + bar(v, 10, v < 5.5 ? 'bad' : v < 7.5 ? 'warn' : '') + '<b>' + v.toFixed(1) + '</b></div>'; });
    });
    const top = (k, n, desc) => D.places.slice().sort((a, b) => (desc ? 1 : -1) * (b.scores[k] - a.scores[k])).slice(0, n).map((p) => esc(p.name)).join(', ');
    an += '<div class="tip"><strong>Safest:</strong> ' + top('safety', 3, true) + '</div><div class="tip warn"><strong>Needs most care:</strong> ' + top('safety', 3, false) + '</div>';
    $('#analyticsCard').innerHTML = an;

    // Citizen report insights (NLP)
    const reps = activeReports();
    const counts = {}; const sent = { positive: 0, neutral: 0, negative: 0 }; let trust = 0; const kw = {};
    reps.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; sent[r.cls.sentiment]++; trust += r.trust; r.cls.keywords.forEach((k) => { kw[k] = (kw[k] || 0) + 1; }); });
    const max = Math.max(1, ...Object.values(counts));
    let sc = '<h2>🗣️ Citizen voice (NLP)</h2>';
    if (!reps.length) sc += '<p class="muted">No recent reports yet. Submit one from the Report tab.</p>';
    else {
      sc += '<p class="muted">' + reps.length + ' reports in the last 72 h · average trust ' + Math.round(trust / reps.length) + '%</p>' +
        Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div class="barrow"><span>' + (REPORT_STYLE[k] || '📌') + ' ' + k + '</span>' + bar(v, max) + '<b>' + v + '</b></div>').join('') +
        '<div class="pills" style="margin-top:8px"><span class="pill bad">Negative ' + sent.negative + '</span><span class="pill">Neutral ' + sent.neutral + '</span><span class="pill good">Positive ' + sent.positive + '</span></div>' +
        '<p class="muted" style="margin-top:8px">Top keywords: ' + (Object.entries(kw).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => esc(k)).join(', ') || '—') + '</p>';
    }
    $('#sentimentCard').innerHTML = sc;
  }

  /* ---------- Reports ---------- */
  function fillAreas() {
    const seen = {};
    D.places.forEach((p) => { if (!seen[p.area]) seen[p.area] = p; });
    $('#rArea').innerHTML = Object.keys(seen).sort().map((a) => '<option value="' + esc(a) + '">' + esc(a) + '</option>').join('');
  }
  function locationForReport() {
    if (state.rGps) return { lat: state.rGps.lat, lng: state.rGps.lng, gps: true };
    const area = $('#rArea').value; const p = D.places.find((x) => x.area === area) || { lat: D.city.center[0], lng: D.city.center[1] };
    return { lat: p.lat, lng: p.lng, gps: false };
  }
  function renderPreview() {
    const t = $('#rText').value;
    if (!t.trim()) { $('#rPreview').innerHTML = ''; return; }
    const c = NLP.classifyReport(t);
    $('#rPreview').innerHTML = '<span class="pill">' + (REPORT_STYLE[c.category] || '📌') + ' ' + c.category + '</span><span class="pill ' + (c.severity >= 4 ? 'bad' : c.severity >= 3 ? 'warn' : 'good') + '">Severity ' + c.severity + '/5</span><span class="pill">' + c.sentiment + '</span>';
  }
  function renderMedia() {
    $('#rMedia').innerHTML = (state.rPhoto ? '<img alt="Attached photo" src="' + state.rPhoto + '">' : '') + (state.rVoice ? '<audio controls src="' + state.rVoice + '"></audio>' : '');
  }
  function renderReports() {
    const list = state.reports.slice().sort((a, b) => b.ts - a.ts).map(view);
    $('#reportList').innerHTML = list.length ? list.map((r) => {
      const voted = state.votes[r.id];
      return '<div class="report"><div class="between"><div class="pills"><span class="pill">' + (REPORT_STYLE[r.category] || '📌') + ' ' + esc(r.category) + '</span><span class="pill ' + (r.severity >= 4 ? 'bad' : r.severity >= 3 ? 'warn' : '') + '">Sev ' + r.severity + '</span>' + (r.sample ? '<span class="pill">sample</span>' : '') + '</div><span class="muted">' + ago(r.ts) + '</span></div>' +
        '<p>' + esc(r.text) + '</p><div class="barrow" style="grid-template-columns:60px 1fr 38px"><span class="muted">Trust</span>' + bar(r.trust, 100, r.trust < 40 ? 'bad' : r.trust < 70 ? 'warn' : '') + '<b>' + r.trust + '</b></div>' +
        (r.photo ? '<img alt="Report photo" src="' + r.photo + '">' : '') + (r.voice ? '<audio controls src="' + r.voice + '"></audio>' : '') +
        '<div class="row" style="margin-top:6px"><button class="btn small" data-vote="c" data-id="' + r.id + '"' + (voted ? ' disabled' : '') + '>✓ Confirm (' + (r.confirms || 0) + ')</button>' +
        '<button class="btn small" data-vote="d" data-id="' + r.id + '"' + (voted ? ' disabled' : '') + '>✗ Dispute (' + (r.disputes || 0) + ')</button>' +
        '<button class="btn small" data-act="rep" data-id="' + r.id + '">📍 Locate</button>' +
        (!r.sample ? '<button class="btn small" data-del="' + r.id + '">Delete</button>' : '') + '</div></div>';
    }).join('') : '<p class="muted">No reports yet.</p>';
  }
  function afterReportChange() { renderReports(); refreshReportLayer(); if ($('#tab-insights').classList.contains('active')) renderInsights(); }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 640; const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); resolve(cv.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be read')); };
      img.src = url;
    });
  }

  let recorder = null, recStream = null, recognizer = null;
  async function toggleVoice() {
    const btn = $('#rVoice');
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Voice notes are not supported in this browser.'); return; }
    try {
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      recorder = new MediaRecorder(recStream);
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        recStream.getTracks().forEach((t) => t.stop());
        if (recognizer) { try { recognizer.stop(); } catch (e) { /* ignore */ } }
        btn.textContent = '🎙️ Voice note';
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const fr = new FileReader(); fr.onload = () => { state.rVoice = fr.result; renderMedia(); }; fr.readAsDataURL(blob);
      };
      recorder.start(); btn.textContent = '⏹ Stop (max 15s)';
      setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 15000);
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        recognizer = new SR(); recognizer.lang = 'en-IN'; recognizer.interimResults = false; recognizer.continuous = true;
        recognizer.onresult = (e) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript + ' '; const ta = $('#rText'); ta.value = (ta.value + ' ' + t).trim(); renderPreview(); };
        recognizer.onerror = () => {}; try { recognizer.start(); } catch (e) { /* ignore */ }
      }
    } catch (e) { toast('Microphone permission was denied.'); }
  }

  function voiceSearch() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Voice search is not supported in this browser.'); return; }
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = false;
    toast('Listening…');
    r.onresult = (e) => { state.q = e.results[0][0].transcript; $('#q').value = state.q; renderDiscover(); };
    r.onerror = () => toast('Could not hear that — try again.');
    try { r.start(); } catch (e) { /* ignore */ }
  }

  function flyTo(lat, lng, zoom) { switchTab('map'); setTimeout(() => map && map.setView([lat, lng], zoom || 15), 120); }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('button, [data-place], a');
      if (!t) return;
      if (t.dataset.tab) return switchTab(t.dataset.tab);
      if (t.dataset.cat) { state.cat = t.dataset.cat; renderCatChips(); return renderDiscover(); }
      if (t.dataset.cmpcat) { state.cmpCat = t.dataset.cmpcat; renderCatChips(); return renderBestWorst(); }
      if (t.dataset.layer) { state.layers[t.dataset.layer] = !state.layers[t.dataset.layer]; renderLayerChips(); return syncLayers(); }
      if (t.dataset.place) return showPlace(t.dataset.place);
      if (t.dataset.rm) { toggleCompare(t.dataset.rm); return; }
      if (t.dataset.vote) {
        const id = t.dataset.id; const r = state.reports.find((x) => x.id === id); if (!r || state.votes[id]) return;
        state.votes[id] = t.dataset.vote; save(VOTES_KEY, state.votes);
        if (t.dataset.vote === 'c') r.confirms = (r.confirms || 0) + 1; else r.disputes = (r.disputes || 0) + 1;
        persistUserReports(); toast(t.dataset.vote === 'c' ? 'Thanks — confirmation recorded' : 'Dispute recorded'); return afterReportChange();
      }
      if (t.dataset.del) { state.reports = state.reports.filter((r) => r.id !== t.dataset.del); persistUserReports(); toast('Report deleted'); return afterReportChange(); }
      const act = t.dataset.act;
      if (act === 'map') { closeModal(); const p = placeById(t.dataset.id); return flyTo(p.lat, p.lng); }
      if (act === 'route') { closeModal(); $('#routeTo').value = t.dataset.id; if ($('#routeFrom').value === t.dataset.id) $('#routeFrom').value = 'me'; switchTab('map'); return; }
      if (act === 'cmp') { const ok = toggleCompare(t.dataset.id); if (ok) showPlace(t.dataset.id); return; }
      if (act === 'hz') { const h = D.hazards.find((x) => x.id === t.dataset.id); state.layers.hazard = true; renderLayerChips(); flyTo(h.lat, h.lng, 14); return; }
      if (act === 'rep') { const r = state.reports.find((x) => x.id === t.dataset.id); state.layers.report = true; flyTo(r.lat, r.lng, 16); setTimeout(() => { renderLayerChips(); syncLayers(); }, 200); return; }
      if (t.id === 'retryLive') { loadLive(); return; }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.place')) { e.preventDefault(); showPlace(e.target.dataset.place); }
    });
    $('#mClose').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    $('#q').addEventListener('input', (e) => { state.q = e.target.value; renderDiscover(); });
    $('#budget').addEventListener('change', (e) => { state.budget = +e.target.value; renderDiscover(); });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderDiscover(); });
    $('#voiceBtn').addEventListener('click', voiceSearch);
    $('#routeBtn').addEventListener('click', compareRoutes);
    $('#nightToggle').addEventListener('click', () => {
      state.night = !state.night; $('#nightToggle').setAttribute('aria-pressed', String(state.night));
      toast(state.night ? 'Night mode: after-dark risks weighted higher' : 'Daytime scoring'); renderSafety(); renderPlan();
    });
    $('#weights').addEventListener('input', (e) => {
      const k = e.target.dataset.w; if (!k) return; state.weights[k] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value;
      renderBestWorst(); renderDiscover(); renderCompare();
    });
    $('#rText').addEventListener('input', renderPreview);
    $('#rGps').addEventListener('click', () => {
      if (!navigator.geolocation) return toast('Geolocation is not available.');
      $('#rLoc').textContent = 'Getting GPS…';
      navigator.geolocation.getCurrentPosition((pos) => { state.rGps = { lat: pos.coords.latitude, lng: pos.coords.longitude }; $('#rLoc').textContent = '📍 GPS location attached (' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4) + ')'; },
        () => { $('#rLoc').textContent = 'Could not read GPS — using the selected area instead.'; }, { enableHighAccuracy: true, timeout: 10000 });
    });
    $('#rArea').addEventListener('change', () => { state.rGps = null; $('#rLoc').textContent = ''; });
    $('#rPhoto').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { state.rPhoto = await resizeImage(f); renderMedia(); } catch (err) { toast(err.message); } });
    $('#rVoice').addEventListener('click', toggleVoice);
    $('#reportForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('#rText').value.trim(); if (!text) return;
      const loc = locationForReport();
      state.reports.unshift({ id: 'u-' + Date.now().toString(36), text, lat: loc.lat, lng: loc.lng, ts: Date.now(), confirms: 0, disputes: 0, hasPhoto: !!state.rPhoto, hasVoice: !!state.rVoice, gps: loc.gps, photo: state.rPhoto, voice: state.rVoice });
      persistUserReports();
      e.target.reset(); state.rPhoto = null; state.rVoice = null; state.rGps = null; $('#rLoc').textContent = ''; renderMedia(); renderPreview();
      toast('Report submitted — thank you!'); afterReportChange();
    });
    $('#exportBtn').addEventListener('click', () => {
      const mine = state.reports.filter((r) => !r.sample).map((r) => ({ id: r.id, text: r.text, lat: r.lat, lng: r.lng, time: new Date(r.ts).toISOString(), classification: NLP.classifyReport(r.text), confirms: r.confirms, disputes: r.disputes }));
      if (!mine.length) return toast('No reports of your own to export yet.');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(mine, null, 2)], { type: 'application/json' })); a.download = 'citypulse-reports.json'; a.click(); URL.revokeObjectURL(a.href);
    });
  }

  /* ---------- boot ---------- */
  function init() {
    initReports();
    renderCatChips(); fillRouteSelects(); fillAreas(); bind();
    $('#nightToggle').setAttribute('aria-pressed', String(state.night));
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) $('#voiceBtn').hidden = true;
    renderDiscover(); renderReports();
    loadLive();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
