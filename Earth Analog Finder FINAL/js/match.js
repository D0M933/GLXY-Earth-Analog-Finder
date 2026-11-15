/* Matching logic. Pure functions, no DOM, so it can be tested in Node.
 *
 * Every Moon/Mars target and every Earth site has 12 scores (0 to 100), one per feature in ATLAS.features.
 * A site's match to a target is a weighted average of how close the two scores are on each feature:
 *     closeness(feature) = 1 - |target score - site score| / 100
 *     match = 100 * sum(weight * closeness) / sum(weight)
 * A feature's weight is 3 if it is one of the target's "focus" features (what makes that target special),
 * otherwise 1, then multiplied by the visitor's own priority slider (0 = ignore, 1 = normal, 3 = very important).
 */
(function (root) {
  'use strict';
  var FOCUS_WEIGHT = 3;
  var GRID_KEYS = ['cold', 'arid', 'relief']; // read straight from climate / height grids; the other nine are counted from datasets

  function weights(features, target, userMult) {
    return features.map(function (f) {
      var m = userMult && userMult[f.key] != null ? userMult[f.key] : 1;
      return (target.focus.indexOf(f.key) >= 0 ? FOCUS_WEIGHT : 1) * m;
    });
  }

  function score(target, site, w) {
    var num = 0, den = 0;
    for (var i = 0; i < w.length; i++) {
      num += w[i] * (1 - Math.abs(target.f[i] - site.f[i]) / 100);
      den += w[i];
    }
    return den > 0 ? (100 * num) / den : 0;
  }

  function rank(features, target, sites, userMult) {
    var w = weights(features, target, userMult);
    return sites
      .map(function (s) { return { site: s, score: score(target, s, w) }; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  /* Bands (v3.2): 0-33 Loose, 34-66 Partial, 67-100 Close. The score is a similarity on a 0-100 scale, not a probability. */
  function verdict(s) {
    var r = Math.round(s);
    if (r >= 67) return 'Close';
    if (r >= 34) return 'Partial';
    return 'Loose';
  }

  /* Where a score sits among all the scores in a ranking (0-100, share of areas scoring lower). */
  function percentile(ranked, s) {
    var below = 0;
    for (var i = 0; i < ranked.length; i++) if (ranked[i].score < s) below++;
    return Math.floor(100 * below / ranked.length);
  }

  function clamp100(v) { return v < 0 ? 0 : v > 100 ? 100 : v; }
  function rng(seed) { // mulberry32, so the stability line gives the same numbers every time
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* How stable is the top of the ranking? Re-rank 1000 times with small random changes and count how often each area is first / in the top five.
     Changes: every feature weight times a random 0.5 to 1.5; every target score +/-5; every area score +/-3 (cold, aridity, relief: read straight from
     climate and height grids) or +/-5 (the other features, which are counted from datasets and are proxies). */
  function stability(features, target, sites, userMult, opts) {
    opts = opts || {};
    var runs = opts.runs || 1000, rand = rng(opts.seed || 12345), n = features.length;
    var base = weights(features, target, userMult);
    var noise = features.map(function (f) { return GRID_KEYS.indexOf(f.key) >= 0 ? 3 : 5; });
    var first = {}, top5 = {};
    for (var r = 0; r < runs; r++) {
      var w = base.map(function (x) { return x * (0.5 + rand()); });
      var t = { f: target.f.map(function (v) { return clamp100(v + (rand() * 2 - 1) * 5); }) };
      var best = [];
      for (var k = 0; k < sites.length; k++) {
        var s = sites[k], num = 0, den = 0;
        for (var i = 0; i < n; i++) {
          var sv = clamp100(s.f[i] + (rand() * 2 - 1) * noise[i]);
          num += w[i] * (1 - Math.abs(t.f[i] - sv) / 100); den += w[i];
        }
        best.push({ id: s.id, v: den > 0 ? num / den : 0 });
      }
      best.sort(function (a, b) { return b.v - a.v; });
      first[best[0].id] = (first[best[0].id] || 0) + 1;
      for (var j = 0; j < 5; j++) top5[best[j].id] = (top5[best[j].id] || 0) + 1;
    }
    return { runs: runs, first: first, top5: top5 };
  }

  /* Plain-language reasons. "Matches": features where both are alike and at least one is meaningfully present.
     "Differs": features where the scores are far apart (35+ points). */
  function explain(features, target, site, w) {
    var matches = [], differs = [];
    features.forEach(function (f, i) {
      var t = target.f[i], s = site.f[i], gap = Math.abs(t - s);
      if (gap <= 15 && Math.max(t, s) >= 50) {
        matches.push({ key: f.key, label: f.label, t: t, s: s, weight: w[i] * (1 - gap / 100) * Math.max(t, s) });
      } else if (gap >= 35) {
        differs.push({ key: f.key, label: f.label, t: t, s: s, gap: gap, targetHigher: t > s, weight: w[i] * gap });
      }
    });
    matches.sort(function (a, b) { return b.weight - a.weight; });
    differs.sort(function (a, b) { return b.weight - a.weight; });
    return { matches: matches, differs: differs };
  }

  var api = { FOCUS_WEIGHT: FOCUS_WEIGHT, weights: weights, score: score, rank: rank, verdict: verdict, percentile: percentile, stability: stability, explain: explain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AtlasMatch = api;
})(typeof window !== 'undefined' ? window : globalThis);
