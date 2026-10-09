/*
 * CityPulse NLP — lightweight, dependency-free text analysis for citizen reports.
 * Rule/lexicon based so it runs fully in the browser (no API keys, works offline).
 * Understands English plus common Hinglish/Marathi words used in Indian city reports.
 * UMD: works in the browser (window.CityNLP) and in Node (require) for unit tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CityNLP = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CATEGORIES = {
    accident: ['accident', 'crash', 'collision', 'hit and run', 'injured', 'ambulance', 'overturned', 'skid', 'apghat', 'apaghat'],
    safety: ['unsafe', 'theft', 'robbery', 'snatch', 'snatching', 'harass', 'harassment', 'stalk', 'dark', 'andhera', 'poor lighting', 'no light', 'streetlight', 'drunk', 'fight', 'assault', 'pickpocket', 'scam', 'chori', 'lutmar'],
    traffic: ['traffic', 'jam', 'congestion', 'blocked', 'gridlock', 'slow moving', 'diversion', 'signal not working', 'bottleneck', 'wrong side', 'parking'],
    flood: ['flood', 'waterlogging', 'waterlogged', 'water logging', 'rain', 'paani', 'overflow', 'drain', 'submerged', 'knee deep'],
    cleanliness: ['garbage', 'kachra', 'trash', 'dirty', 'smell', 'stink', 'litter', 'sewage', 'open drain', 'filth', 'dump', 'unclean', 'toilet'],
    infrastructure: ['pothole', 'gadda', 'road damage', 'broken', 'footpath', 'manhole', 'construction', 'power cut', 'no water', 'bridge', 'crack'],
    praise: ['clean', 'well maintained', 'beautiful', 'safe', 'friendly', 'great', 'excellent', 'amazing', 'lovely', 'peaceful', 'helpful']
  };

  const NEGATIVE = ['unsafe', 'dangerous', 'bad', 'terrible', 'worst', 'dirty', 'broken', 'accident', 'crash', 'injured', 'theft', 'robbery', 'harass', 'jam', 'blocked', 'flood', 'stink', 'garbage', 'kachra', 'pothole', 'gadda', 'dark', 'andhera', 'scam', 'fight', 'assault', 'drunk', 'overflow', 'danger', 'avoid', 'delay', 'stuck', 'chaos', 'horrible'];
  const POSITIVE = ['good', 'great', 'safe', 'clean', 'beautiful', 'excellent', 'amazing', 'lovely', 'friendly', 'helpful', 'peaceful', 'well maintained', 'best', 'nice', 'smooth', 'tasty', 'recommend', 'worth'];
  const NEGATORS = ['not', 'no', 'never', "isn't", "wasn't", "don't", 'nahi', 'nahin'];
  const URGENT = ['urgent', 'emergency', 'immediately', 'help', 'fire', 'injured', 'bleeding', 'unconscious', 'weapon', 'knife', 'robbery', 'assault', 'ambulance', 'trapped', 'collapsed'];
  const INTENSIFIERS = ['very', 'extremely', 'really', 'completely', 'badly', 'serious', 'severe', 'huge', 'massive', 'many', 'multiple'];

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function countHits(norm, words) {
    let n = 0;
    const hits = [];
    for (const w of words) {
      const re = new RegExp('(^| )' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( |$|s |es )');
      if (re.test(norm)) { n++; hits.push(w); }
    }
    return { n, hits };
  }

  function sentiment(text) {
    const norm = normalize(text);
    const tokens = norm.split(' ');
    let score = 0;
    tokens.forEach((tok, i) => {
      const prev = tokens[i - 1] || '';
      const prev2 = tokens[i - 2] || '';
      const negated = NEGATORS.includes(prev) || NEGATORS.includes(prev2);
      if (POSITIVE.includes(tok)) score += negated ? -1 : 1;
      else if (NEGATIVE.some((w) => tok === w || tok.startsWith(w))) score += negated ? 1 : -1;
    });
    const label = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
    return { score, label };
  }

  /**
   * Classify a free-text citizen report.
   * @returns {{category:string, categories:string[], sentiment:string, sentimentScore:number, severity:number, keywords:string[]}}
   *   severity is 1 (minor) .. 5 (critical)
   */
  function classifyReport(text) {
    const norm = normalize(text);
    if (!norm) return { category: 'other', categories: [], sentiment: 'neutral', sentimentScore: 0, severity: 1, keywords: [] };

    const scored = [];
    const keywords = [];
    for (const [cat, words] of Object.entries(CATEGORIES)) {
      const { n, hits } = countHits(norm, words);
      if (n > 0) { scored.push({ cat, n }); keywords.push(...hits); }
    }
    scored.sort((a, b) => b.n - a.n);

    // Praise only wins if nothing negative was detected
    let categories = scored.map((s) => s.cat);
    const sent = sentiment(norm);
    if (categories.includes('praise') && sent.label === 'negative') categories = categories.filter((c) => c !== 'praise');
    const category = categories[0] || 'other';

    let severity = 1;
    const base = { accident: 3, safety: 3, flood: 3, traffic: 2, infrastructure: 2, cleanliness: 1, praise: 1, other: 1 };
    severity = base[category] || 1;
    if (countHits(norm, URGENT).n > 0) severity += 2;
    if (countHits(norm, INTENSIFIERS).n > 0) severity += 1;
    if (category === 'praise') severity = 1;
    severity = Math.max(1, Math.min(5, severity));

    return {
      category,
      categories,
      sentiment: sent.label,
      sentimentScore: sent.score,
      severity,
      keywords: [...new Set(keywords)].slice(0, 6)
    };
  }

  /** Trust score 0..100 for a report: confirmations, evidence (photo/voice/GPS) and age decay. */
  function trustScore(report, now) {
    now = now || Date.now();
    let s = 30;
    s += Math.min(40, (report.confirms || 0) * 10);
    if (report.hasPhoto) s += 12;
    if (report.hasVoice) s += 6;
    if (report.gps) s += 12;
    s -= Math.min(20, (report.disputes || 0) * 10);
    const ageH = (now - (report.ts || now)) / 3600000;
    if (ageH > 72) s -= 15; else if (ageH > 24) s -= 6;
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  return { classifyReport, sentiment, trustScore, normalize };
});
