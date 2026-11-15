/* Chooses the Earth sites for v2.2 from measured data. Run:  node tools/select-sites.js
 *
 * Inputs (all in tools/):
 *   power_cells.txt  NASA POWER (MERRA-2) annual climatology per 5-degree land cell:
 *                    "lat/lon:elevation_m|T2M_C|rain_mm_per_day|snow_depth_cm;" (empty snow = land ice, no snow field reported)
 *   rough.txt        terrain roughness per cell: standard deviation (m) of 9 elevation samples, ocean depths set to 0 (the cell centre and 8 points
 *                    0.5 degrees away) from ETOPO1 via the OpenTopoData public API: "lat/lon:sd_m;"
 * Measured features (scores 0-100, same scales as the rest of the site):
 *   cold   100 at -50 C or colder, 0 at +25 C or warmer (annual mean 2 m air temperature)
 *   arid   log scale on rain: 100 at <=0.03 mm/day, 0 at >=6 mm/day
 *   relief standard deviation of the 9 elevation samples: 0 m -> 0, 800 m or more -> 100
 *   ice    land-ice cells (no snow field) -> 100; otherwise mean snow depth: 0 cm -> 0, 50 cm or more -> 100
 * Selection rule (a design choice, open to change): greedy coverage.
 *   Each Moon/Mars target is compared with every cell on the four measured features only (target signature features
 *   weigh 3, as in js/match.js). A cell is added to the set if it most increases the sum, over targets, of the
 *   scores of each target's three best sites in the set. Cells must be at least MIN_KM apart. Stops at N_SITES.
 */
'use strict';
const fs = require('fs'), path = require('path');
const N_SITES = 35, MIN_KM = 1000;
const dir = __dirname;
global.window = {}; require(path.join(dir, '..', 'data', 'data.js'));
const A = window.ATLAS;
const FEATS = A.features.map(f => f.id || null);
const IDX = { cold: 0, arid: 1, relief: 2, ice: 5 };           // positions in the 12-feature vector
const ids = ['cold', 'arid', 'relief', 'volc', 'impact', 'ice', 'voids', 'dust', 'remote', 'brine', 'anor', 'crew'];

const rd = f => fs.readFileSync(path.join(dir, f), 'utf8').trim().replace(/;$/, '').split(';');
const cells = {};
for (const s of rd('power_cells.txt')) { const [k, v] = s.split(':'); const [e, t, p, sn] = v.split('|'); const [la, lo] = k.split('/').map(Number);
  cells[k] = { lat: la, lon: lo, elev: +e, tC: +t, rain: +p, snow: sn === '' ? null : +sn }; }
for (const s of rd('rough.txt')) { const [k, v] = s.split(':'); cells[k].sd = +v; }
const clamp = x => Math.max(0, Math.min(100, x));
for (const c of Object.values(cells)) {
  c.cold = clamp((25 - c.tC) / 75 * 100);
  c.arid = clamp(100 * (1 - Math.log(Math.max(c.rain, 0.03) / 0.03) / Math.log(6 / 0.03)));
  c.relief = clamp(c.sd / 800 * 100);
  c.ice = c.snow === null ? 100 : clamp(c.snow / 50 * 100);
  c.m = { cold: c.cold, arid: c.arid, relief: c.relief, ice: c.ice };
}
const list = Object.values(cells);
const km = (a, b) => { const r = Math.PI / 180, dl = (b.lon - a.lon) * r, p1 = a.lat * r, p2 = b.lat * r;
  return 6371 * Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl))); };
function score(t, c) {            // match on the four measured features only
  let sw = 0, s = 0;
  for (const f of ['cold', 'arid', 'relief', 'ice']) {
    const w = t.focus.includes(f) ? 3 : 1, tv = t.f[ids.indexOf(f)];
    s += w * (1 - Math.abs(tv - c.m[f]) / 100); sw += w; }
  return 100 * s / sw;
}
const T = A.targets, S = list.map(c => T.map(t => score(t, c)));
const chosen = [], best = T.map(() => [0, 0, 0]);
const top3 = (arr, v) => { const a = [...arr, v].sort((x, y) => y - x).slice(0, 3); return a; };
while (chosen.length < N_SITES) {
  let bi = -1, bg = -1;
  for (let i = 0; i < list.length; i++) {
    if (chosen.includes(i) || chosen.some(j => km(list[i], list[j]) < MIN_KM)) continue;
    let g = 0; for (let k = 0; k < T.length; k++) g += top3(best[k], S[i][k]).reduce((x, y) => x + y) - best[k].reduce((x, y) => x + y);
    if (g > bg) { bg = g; bi = i; }
  }
  chosen.push(bi); for (let k = 0; k < T.length; k++) best[k] = top3(best[k], S[bi][k]);
}
const out = chosen.map(i => { const c = list[i]; return { lat: c.lat, lon: c.lon, elevM: c.elev, tempC: c.tC, rainMmDay: c.rain, snowCm: c.snow, reliefSdM: Math.round(c.sd),
  cold: Math.round(c.cold), arid: Math.round(c.arid), relief: Math.round(c.relief), ice: Math.round(c.ice), bestFor: T.map((t, k) => [t.id, Math.round(S[i][k])]).sort((a, b) => b[1] - a[1]).slice(0, 3) }; });
fs.writeFileSync(path.join(dir, 'selected.json'), JSON.stringify(out, null, 1));
console.log(out.map(o => [o.lat, o.lon, o.elevM + 'm', o.tempC + 'C', o.rainMmDay + 'mm', 'snow' + o.snowCm, 'sd' + o.reliefSdM, `c${o.cold} a${o.arid} r${o.relief} i${o.ice}`, o.bestFor.map(x => x.join(':')).join(',')].join(' | ')).join('\n'));
console.log('per-target best three scores:', T.map((t, k) => t.id + ' ' + best[k].map(Math.round).join('/')).join('  '));
