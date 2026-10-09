const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../public/js/scoring.js');

const mk = (id, scores) => ({ id, category: 'food', scores });
const good = mk('good', { rating: 5, safety: 9, cleanliness: 9, affordability: 8, accessibility: 8 });
const bad = mk('bad', { rating: 2, safety: 3, cleanliness: 3, affordability: 4, accessibility: 3 });

test('haversine: ~111 km per degree latitude', () => {
  const d = S.haversine([18, 73], [19, 73]);
  assert.ok(Math.abs(d - 111195) < 500);
  assert.equal(S.haversine([18.5, 73.8], [18.5, 73.8]), 0);
});

test('composite score orders good above bad and respects weights', () => {
  assert.ok(S.compositeScore(good) > S.compositeScore(bad));
  const safetyOnly = { rating: 0, safety: 100, cleanliness: 0, affordability: 0, accessibility: 0 };
  assert.equal(S.compositeScore(good, safetyOnly), 90);
  assert.equal(S.compositeScore(bad, safetyOnly), 30);
});

test('bestWorst splits the ranking', () => {
  const r = S.bestWorst([good, bad], null, 1);
  assert.equal(r.best[0].place.id, 'good');
  assert.equal(r.worst[0].place.id, 'bad');
});

const hazards = [{ id: 'h1', lat: 18.5, lng: 73.85, radius: 500, severity: 4 }];

test('route through a hazard is riskier than one that avoids it', () => {
  const through = [[18.5, 73.84], [18.5, 73.86]];
  const around = [[18.52, 73.84], [18.52, 73.86]];
  const a = S.routeRisk(through, hazards, [], {});
  const b = S.routeRisk(around, hazards, [], {});
  assert.ok(a.riskPerKm > b.riskPerKm);
  assert.ok(a.safety < b.safety);
  assert.deepEqual(a.hazardIds, ['h1']);
  assert.equal(b.safety, 100);
});

test('night-only hazards matter after dark, not by day', () => {
  const nh = [{ id: 'n', lat: 18.5, lng: 73.85, radius: 500, severity: 3, nightOnly: true }];
  const pt = [[18.5, 73.848], [18.5, 73.852]];
  assert.ok(S.routeRisk(pt, nh, [], { night: true }).risk > S.routeRisk(pt, nh, [], { night: false }).risk * 4);
});

test('citizen reports raise route risk; praise does not', () => {
  const route = [[18.5, 73.84], [18.5, 73.86]];
  const rep = [{ id: 'r', lat: 18.5, lng: 73.85, severity: 4, trust: 80, category: 'accident' }];
  const praise = [{ id: 'p', lat: 18.5, lng: 73.85, severity: 4, trust: 80, category: 'praise' }];
  assert.ok(S.routeRisk(route, [], rep).risk > 0);
  assert.equal(S.routeRisk(route, [], praise).risk, 0);
});

test('chooseRoutes picks the safer alternative when it is slower', () => {
  const fast = { coords: [[18.5, 73.84], [18.5, 73.86]], durationS: 600, distanceM: 2100 };
  const safe = { coords: [[18.52, 73.84], [18.52, 73.86]], durationS: 800, distanceM: 2100 };
  const r = S.chooseRoutes([fast, safe], hazards, [], {});
  assert.equal(r.fastest.index, 0);
  assert.equal(r.safest.index, 1);
  assert.equal(r.same, false);
});

test('traffic heuristic: weekday peak vs weekend morning', () => {
  assert.equal(S.trafficLevel(new Date(2026, 9, 7, 9, 30)), 3); // Wed 9:30
  assert.equal(S.trafficLevel(new Date(2026, 9, 10, 8, 0)), 0); // Sat 8:00
});

test('day advice reacts to rain and bad air', () => {
  const rainy = S.dayAdvice({ rainProb: 80, precip: 1, feels: 25, code: 63 }, 40, new Date(2026, 9, 7, 14));
  assert.ok(rainy.prefer.includes('indoor'));
  assert.ok(rainy.avoid.includes('hill'));
  const smog = S.dayAdvice({ rainProb: 0, precip: 0, feels: 28, code: 0 }, 180, new Date(2026, 9, 7, 14));
  assert.ok(smog.avoid.includes('outdoor'));
  const fine = S.dayAdvice({ rainProb: 0, precip: 0, feels: 28, code: 0 }, 40, new Date(2026, 9, 7, 14));
  assert.ok(fine.prefer.includes('outdoor'));
});

test('aqi bands', () => {
  assert.equal(S.aqiBand(30).label, 'Good');
  assert.equal(S.aqiBand(120).level, 2);
  assert.equal(S.aqiBand(null).level, -1);
});
