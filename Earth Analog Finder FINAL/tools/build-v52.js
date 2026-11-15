/* Version 5.2 data step. Run after build-v51.js:   node tools/build-v52.js   (idempotent; recomputes from the two data files below)
 * Removes Wikidata (crowd-sourced, uneven coverage) from the Earth data and replaces it:
 *  - impact craters: NASA JSC ARES "Earth Impact Database" table, 182 confirmed impact structures with latitude, longitude and diameter
 *      (tools/eid_nasa_ares.csv.txt, read from https://ares.jsc.nasa.gov/engagement/activities/resources/crater-comparisons/earth-impact-database.pdf on 15 Nov 2026;
 *       one longitude typo in that PDF, Ames in Oklahoma printed as 98.2E, was corrected to 98.2W). Score = 100*ln(1+sum of diameters in km)/ln(101), as before.
 *  - research stations: COMNAP Antarctic Facilities list (Council of Managers of National Antarctic Programs, hosted by the Polar Geospatial Center),
 *      type "Station" with status "Open" (75 stations; tools/comnap_facilities.csv.txt). It covers Antarctica and the sub-Antarctic only, so the Step 2 filter
 *      is now an Antarctic-stations filter. No station list with the same quality exists for the rest of the world, so stations elsewhere are not counted.
 *  - lava tubes and caves: no reliable global list exists, so the lava-tube term is dropped. Voids score = 100*ln(1+0.5*basaltic volcanoes)/ln(11),
 *      i.e. basaltic volcanoes (NOAA NCEI) as the proxy for where lava tubes can form.
 * Boxes: a 5 degree cell is [centre-2.5, centre+2.5) in both directions; a small site is +-0.5 degree in latitude and +-0.5/cos(lat) in longitude.
 */
'use strict';
const fs = require('fs'), path = require('path');
const dir = __dirname;
global.window = {}; require(path.join(dir, '..', 'data', 'data.js'));
const A = window.ATLAS, keys = A.features.map(f => f.key), iImp = keys.indexOf('impact'), iVoid = keys.indexOf('voids');
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split(';').map(r => r.split(','));
const EID = rd('eid_nasa_ares.csv.txt').map(r => ({ la: +r[0], lo: +r[1], d: +r[2] }));
const STA = rd('comnap_facilities.csv.txt').filter(r => r[2] === 'Sta' && r[3] === 'Open').map(r => ({ la: +r[0], lo: +r[1] }));
if (EID.length !== 182 || STA.length !== 75) throw new Error('data file counts changed: ' + EID.length + ' ' + STA.length);
const clamp = x => Math.max(0, Math.min(100, x)), lg = (n, ref) => clamp(100 * Math.log(1 + n) / Math.log(1 + ref));
const inBox = (s, p) => {
  if (s.small) { const dx = 0.5 / Math.max(0.2, Math.cos(s.lat * Math.PI / 180)); return Math.abs(p.la - s.lat) <= 0.5 && Math.abs(p.lo - s.lon) <= dx; }
  return p.la >= s.lat - 2.5 && p.la < s.lat + 2.5 && p.lo >= s.lon - 2.5 && p.lo < s.lon + 2.5;
};
let before = { craters: 0, stations: 0, tubes: 0 }, after = { craters: 0, stations: 0 }, cellsWithCraters = 0;
A.sites.forEach(s => {
  before.craters += s.raw.craters || 0; before.stations += s.raw.stations || 0; before.tubes += s.raw.lavaTubes || 0;
  const c = EID.filter(p => inBox(s, p)), km = c.reduce((a, p) => a + p.d, 0), st = STA.filter(p => inBox(s, p)).length;
  s.raw.craters = c.length; s.raw.craterKm = Math.round(km * 10) / 10; s.raw.stations = st; delete s.raw.lavaTubes;
  after.craters += c.length; after.stations += st; if (c.length) cellsWithCraters++;
  const imp = Math.round(lg(km, 100)), vo = Math.round(lg(0.5 * s.raw.volcBasaltic, 10));
  s.f[iImp] = imp; s.f[iVoid] = vo;
  if (s.fRaw) { s.fRaw[iImp] = imp; s.fRaw[iVoid] = vo; }
});
A.dataSources = { craters: 'NASA JSC ARES Earth Impact Database table (182 structures)', stations: 'COMNAP Antarctic Facilities (75 open stations)', voids: 'NOAA NCEI basaltic volcanoes only' };
fs.writeFileSync(path.join(dir, '..', 'data', 'data.js'), fs.readFileSync(path.join(dir, '..', 'data', 'data.js'), 'utf8').split('\n')[0] + '\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
console.log('before (Wikidata): craters', before.craters, 'stations', before.stations, 'lava tubes', before.tubes);
console.log('after  (NASA / COMNAP): craters', after.craters, 'in', cellsWithCraters, 'areas; stations', after.stations, 'in', A.sites.filter(s => s.raw.stations > 0).length, 'areas (', A.sites.filter(s => s.raw.stations > 0 && s.small).length, 'small)');
const nz = i => A.sites.filter(s => s.f[i] > 0).length;
console.log('areas with impact>0:', nz(iImp), ' voids>0:', nz(iVoid));
A.sites.filter(s => s.small).forEach(s => console.log(s.id.padEnd(5), 'craters', s.raw.craters, 'km', s.raw.craterKm, 'stations', s.raw.stations, 'impact', s.f[iImp], 'voids', s.f[iVoid]));
