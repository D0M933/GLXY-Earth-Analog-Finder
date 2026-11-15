/* Version 5.1 data step. Run after build-v5.js and calibrate-v51.js:   node tools/build-v51.js   (idempotent)
 * Applies the measured calibration (tools/calibration_v51.json, made by tools/calibrate-v51.js) to the 16 small named sites:
 * for each feature where the fit was usable, calibrated score = a + b * box score, clamped to 0-100 and rounded.
 * The uncalibrated box scores are kept in site.fRaw (shown on the site's detail card); features whose fit was not usable are left as they were.
 */
'use strict';
const fs = require('fs'), path = require('path');
const dir = __dirname;
global.window = {}; require(path.join(dir, '..', 'data', 'data.js'));
const A = window.ATLAS, keys = A.features.map(f => f.key);
const cal = JSON.parse(fs.readFileSync(path.join(dir, 'calibration_v51.json'), 'utf8'));
const clamp = x => Math.max(0, Math.min(100, x));
let changed = 0;
A.sites.filter(s => s.small).forEach(s => {
  if (!s.fRaw) s.fRaw = s.f.slice();
  s.f = keys.map((k, i) => cal[k].used ? Math.round(clamp(cal[k].a + cal[k].b * s.fRaw[i])) : s.fRaw[i]);
  s.calibrated = keys.filter(k => cal[k].used);
  changed += s.f.filter((v, i) => v !== s.fRaw[i]).length;
});
A.calibration = cal;
fs.writeFileSync(path.join(dir, '..', 'data', 'data.js'), fs.readFileSync(path.join(dir, '..', 'data', 'data.js'), 'utf8').split('\n')[0] + '\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
console.log('calibrated features:', keys.filter(k => cal[k].used).join(', '), '| kept raw:', keys.filter(k => !cal[k].used).join(', '), '| values changed:', changed);
A.sites.filter(s => s.small).forEach(s => console.log(s.id.padEnd(5), 'raw', s.fRaw.join(','), '-> cal', s.f.join(',')));
