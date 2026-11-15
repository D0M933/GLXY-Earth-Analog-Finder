/* Version 5.1: measured correction for the small named sites.
 * Problem: a 1 degree box has sharper, more extreme values than the 5 degree cell around it, so small sites out-ranked cells (see README).
 * Measurement: 36 random 5 degree cells (tools/sample_cells.json, seeded draw from the 806) were re-scored as 1 degree boxes at the cell
 * centre with exactly the pipeline used for the small sites (tools/sample_boxes_raw.json, gathered 15 Nov 2026), and compared with the
 * cell's own score. For each feature we fit  cell score = a + b * box score  (ordinary least squares). That line answers "what would a
 * 5 degree area that looks like this box score?", so it pulls extreme box scores toward the middle by the amount we measured.
 * Output: tools/calibration_v51.json = { feature: {a, b, r2, n, used, reason} }, applied by tools/build-v51.js.
 * A feature's correction is used only if the fit is usable (r2 >= 0.25 and 0 < b <= 1.5 and the box scores vary); otherwise the raw box score is kept and the page says so.
 */
'use strict';
const fs = require('fs'), path = require('path');
const dir = __dirname;
global.window = {}; require(path.join(dir, '..', 'data', 'data.js'));
const A = window.ATLAS, keys = A.features.map(f => f.key);
const clamp = x => Math.max(0, Math.min(100, x));
const lg = (n, ref) => clamp(100 * Math.log(1 + n) / Math.log(1 + ref));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };

/* same formulas as build-v5.js for small sites; r = raw box record with wd {cr, tb, st} */
function boxScores(r) {
  const z9 = r.z9.map(v => Math.max(0, v)), f = {};
  const snow = r.SN === null || r.SN === -999 ? null : r.SN;
  f.cold = clamp((25 - r.T) / 75 * 100);
  f.arid = clamp(100 * (1 - Math.log(Math.max(r.P, 0.03) / 0.03) / Math.log(6 / 0.03)));
  f.relief = clamp(sd(z9) / 800 * 100);
  const surfIce = snow === null ? 100 : clamp(snow / 50 * 100), groundIce = clamp((-1 - r.T) / 7 * 100);
  f.ice = Math.max(surfIce, groundIce);
  const impKm = r.wd.cr.reduce((a, c) => a + (c[1] == null ? 3 : c[1]), 0), tubes = r.wd.tb.length;
  f.volc = lg(r.vb + 0.25 * r.vo, 10);
  f.impact = lg(impKm, 100);
  f.voids = lg(2 * tubes + 0.5 * r.vb, 10);
  const q = r.n ? r.q / r.n : 0, an = r.n ? r.an / r.n : 0, ev = r.n ? r.ev / r.n : 0, cb = r.n ? r.cb / r.n : 0;
  f.dust = clamp(100 * q * Math.sqrt(f.arid / 100));
  f.remote = clamp(100 * Math.log(Math.max(r.rem, 30) / 30) / Math.log(1500 / 30));
  f.brine = clamp(100 * Math.min(1, 0.5 * cb + 2 * ev + Math.min(0.5, 0.25 * r.pl)));
  f.anor = clamp(100 * Math.min(1, 3 * an));
  return f;
}
module.exports = { boxScores };
if (require.main === module) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'sample_boxes_raw.json'), 'utf8')).sites;
  const byId = {}; A.sites.forEach(s => { byId[s.id] = s; });
  const rows = raw.map(r => ({ id: r.id, box: boxScores(r), cell: byId[r.id].f }));
  const out = {}, lines = [];
  keys.forEach((k, j) => {
    const x = rows.map(r => r.box[k]), y = rows.map(r => r.cell[j]), n = x.length, mx = mean(x), my = mean(y);
    const sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0), sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0), syy = y.reduce((a, v) => a + (v - my) ** 2, 0);
    const b = sxx > 0 ? sxy / sxx : 0, a = my - b * mx, r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
    const ok = r2 >= 0.25 && b > 0 && b <= 1.5 && sd(x) >= 5;
    out[k] = { a: +a.toFixed(3), b: +b.toFixed(3), r2: +r2.toFixed(3), n, sdBox: +sd(x).toFixed(1), sdCell: +sd(y).toFixed(1), meanBox: +mx.toFixed(1), meanCell: +my.toFixed(1), used: ok };
    lines.push(k.padEnd(7) + 'n=' + n + ' meanBox ' + mx.toFixed(1) + ' meanCell ' + my.toFixed(1) + ' sdBox ' + sd(x).toFixed(1) + ' sdCell ' + sd(y).toFixed(1) + '  cell = ' + a.toFixed(1) + ' + ' + b.toFixed(2) + '*box  r2 ' + r2.toFixed(2) + (ok ? '  USED' : '  kept raw'));
  });
  fs.writeFileSync(path.join(dir, 'calibration_v51.json'), JSON.stringify(out, null, 1));
  console.log(lines.join('\n'));
}
