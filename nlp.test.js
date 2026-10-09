const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyReport, sentiment, trustScore } = require('../public/js/nlp.js');

test('classifies an accident report as high severity', () => {
  const r = classifyReport('Bike accident near the bridge, rider injured, ambulance needed urgently');
  assert.equal(r.category, 'accident');
  assert.ok(r.severity >= 4);
  assert.equal(r.sentiment, 'negative');
});

test('classifies garbage complaints as cleanliness', () => {
  const r = classifyReport('Huge kachra dump and bad smell near the market');
  assert.equal(r.category, 'cleanliness');
});

test('detects waterlogging', () => {
  assert.equal(classifyReport('Underpass is waterlogged, knee deep water').category, 'flood');
});

test('praise stays praise when positive and low severity', () => {
  const r = classifyReport('Beautiful, well maintained garden and very friendly staff');
  assert.equal(r.category, 'praise');
  assert.equal(r.severity, 1);
  assert.equal(r.sentiment, 'positive');
});

test('negation flips sentiment', () => {
  assert.equal(sentiment('this place is not safe').label, 'negative');
  assert.equal(sentiment('the road is not bad').label, 'positive');
});

test('empty text is handled', () => {
  const r = classifyReport('   ');
  assert.equal(r.category, 'other');
  assert.equal(r.severity, 1);
});

test('trust score rewards evidence and confirmations, decays with age', () => {
  const now = Date.now();
  const weak = trustScore({ ts: now }, now);
  const strong = trustScore({ ts: now, confirms: 3, hasPhoto: true, gps: true }, now);
  const old = trustScore({ ts: now - 100 * 3600000, confirms: 3, hasPhoto: true, gps: true }, now);
  assert.ok(strong > weak);
  assert.ok(old < strong);
  assert.ok(strong <= 100 && weak >= 0);
});
