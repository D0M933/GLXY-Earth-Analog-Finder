/* Builds the Earth sites for v3.2: ALL 806 land cells are candidate sites, and all 12 feature scores are computed from data.
 * Run:  node tools/build-v32.js        (rewrites data/data.js; do not run build-data.js, build-sites.js or set-layers.js afterwards without checking)
 *
 * Inputs in tools/:
 *   power_cells.txt   NASA POWER (MERRA-2) per 5-degree land cell: "lat/lon:elevation_m|T2M_C|rain_mm_per_day|snow_depth_cm;" (empty snow = land ice)
 *   rough.txt         terrain roughness per cell, standard deviation (m) of 9 ETOPO1 elevations (ocean set to 0): "lat/lon:sd_m;"
 *   cells_dict.json, cells_rows_1..3.txt, cells_crater_patch.txt   per cell, gathered 14 Nov 2026 (see README): remoteness, playas, country, region, volcanoes, craters, lava tubes, stations, Macrostrat rock counts
 *   profiles_1..3.txt  806 north-south lines through each cell centre from NOAA ETOPO1 (via OpenTopoData): 'relief_m;slope_x10;z0,d1..d10' = 11 points 4 km apart (z0 = first height, then height steps); relief and slope measured on a finer 2 km line
 *
 * Scores (0 to 100), written out so a reader can check every one:
 *   cold    100 at an annual mean air temperature of -50 C or colder, 0 at +25 C or warmer            NASA POWER
 *   arid    log scale on rain: 100 at <= 0.03 mm/day, 0 at >= 6 mm/day                                 NASA POWER
 *   relief  standard deviation of 9 elevations: 0 m -> 0, 800 m or more -> 100                         NOAA ETOPO1
 *   ice     the larger of: surface ice (land-ice cell 100, otherwise snow depth 0 to 50 cm -> 0 to 100)
 *           and ground ice (permafrost likelihood from air temperature: 0 at -1 C, 100 at -8 C or colder)
 *   volc    basaltic volcanoes (shield, cinder/scoria/pyroclastic cone, fissure, lava cone, volcanic field, crater row, maar) count 1,
 *           other volcanoes 0.25; 100*ln(1+n)/ln(11), capped at 100                                     Smithsonian GVP via NOAA NCEI
 *   impact  sum of impact-crater diameters in the cell (km, 3 km if unknown); 100*ln(1+km)/ln(101)      Wikidata (Earth Impact Database craters)
 *   voids   n = 2 * lava tubes/volcanic caves/pit craters + 0.5 * basaltic volcanoes; 100*ln(1+n)/ln(11)  Wikidata + GVP
 *   dust    share of 9 sample points where Macrostrat shows a Quaternary sedimentary/unconsolidated/ash surface unit,
 *           times sqrt(arid/100) (loose cover only stays loose where it is dry)                         Macrostrat + NASA POWER
 *   remote  mean distance from 9 sample points to the nearest place of 20,000+ people:
 *           0 at 30 km, 100 at 1,500 km (log scale)                                                     Natural Earth populated places
 *   brine   0.5 * share of points with carbonate/clay/mudstone + 2 * share with evaporite/gypsum/salt + up to 0.5 for playas (0.25 each); capped at 1   Macrostrat + Natural Earth playas
 *   anor    3 * share of points with anorthosite/gabbro/norite/troctolite, capped at 1                  Macrostrat
 *   crew    research stations in the cell (Wikidata); 100*ln(1+n)/ln(11), capped at 100               Wikidata
 */
'use strict';
const fs = require('fs'), path = require('path');
const dir = __dirname;
global.window = {}; require(path.join(dir, '..', 'data', 'data.js'));
const A = window.ATLAS;
const ids = ['cold', 'arid', 'relief', 'volc', 'impact', 'ice', 'voids', 'dust', 'remote', 'brine', 'anor', 'crew'];
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8').trim().replace(/;$/, '').split(';');
const cells = {};
for (const s of rd('power_cells.txt')) { const [k, v] = s.split(':'); const [e, t, p, sn] = v.split('|'); const [la, lo] = k.split('/').map(Number); cells[k] = { lat: la, lon: lo, elev: +e, tC: +t, rain: +p, snow: sn === '' ? null : +sn }; }
for (const s of rd('rough.txt')) { const [k, v] = s.split(':'); cells[k].sd = +v; }
// cells_rows_1..3.txt: one row per cell, in power_cells.txt order: remoteKm, playas, countryIdx, regionIdx, volcBasaltic, volcOther, craters, craterKm, lavaTubes, stations, geoPts, geoQuatSed, geoAnor, geoEvap, geoCarb
// cells_crater_patch.txt: "cellIndex:craters:totalKm" for the cells with craters (de-duplicated Wikidata list, applied over columns 6 and 7)
const DICT = JSON.parse(fs.readFileSync(path.join(dir, 'cells_dict.json'), 'utf8'));
const rows = [1, 2, 3].flatMap(i => fs.readFileSync(path.join(dir, 'cells_rows_' + i + '.txt'), 'utf8').trim().split(';').map(r => r.split(',').map(Number)));
rows.forEach(r => { r[6] = 0; r[7] = 0; });
fs.readFileSync(path.join(dir, 'cells_crater_patch.txt'), 'utf8').trim().split(';').forEach(p => { const [i, n, k] = p.split(':'); rows[+i][6] = +n; rows[+i][7] = +k; });
const rawKeys = rd('power_cells.txt').map(s => s.split(':')[0].split('/').map(Number));
const raw = rows.map((r, i) => [rawKeys[i][0], rawKeys[i][1], r[0], r[1], r[2] >= 0 ? DICT.C[r[2]] : null, r[3] >= 0 ? DICT.R[r[3]] : null, r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], r[14]]);
const prof = [1, 2, 3].flatMap(i => fs.readFileSync(path.join(dir, 'profiles_' + i + '.txt'), 'utf8').trim().split('|')).map(str => { const [rl, sl, zs] = str.split(';'); const v = zs.split(',').map(Number); const z = [v[0]]; for (let j = 1; j < v.length; j++) z.push(z[j - 1] + v[j]); return { relief2km: +rl, slope2km: +sl / 10, z }; });
const keys = rd('power_cells.txt').map(s => s.split(':')[0]);
if (raw.length !== keys.length || prof.length !== keys.length) throw new Error('count mismatch ' + raw.length + ' ' + prof.length + ' ' + keys.length);
const clamp = x => Math.max(0, Math.min(100, x));
const lg = (n, ref) => clamp(100 * Math.log(1 + n) / Math.log(1 + ref));
const latS = v => Math.abs(v) + '°' + (v < 0 ? 'S' : 'N'), lonS = v => Math.abs(v) + '°' + (v < 0 ? 'W' : 'E');

const sites = keys.map((k, i) => {
  const c = cells[k], r = raw[i];
  if (r[0] !== c.lat || r[1] !== c.lon) throw new Error('order mismatch at ' + k);
  const [, , remoteKm, playas, country, region, volcB, volcO, impN, impKm, tubes, stations, gN, gQ, gAn, gEv, gCb] = r;
  const f = {};
  f.cold = clamp((25 - c.tC) / 75 * 100);
  f.arid = clamp(100 * (1 - Math.log(Math.max(c.rain, 0.03) / 0.03) / Math.log(6 / 0.03)));
  f.relief = clamp(c.sd / 800 * 100);
  const surfIce = c.snow === null ? 100 : clamp(c.snow / 50 * 100), groundIce = clamp((-1 - c.tC) / 7 * 100);
  f.ice = Math.max(surfIce, groundIce);
  const iceKind = c.snow === null ? 'glacier' : groundIce >= 50 && groundIce >= surfIce ? 'permafrost' : surfIce >= 10 ? 'snow' : groundIce > 0 ? 'permafrost-weak' : 'none';
  f.volc = lg(volcB + 0.25 * volcO, 10);
  f.impact = lg(impKm, 100);
  f.voids = lg(2 * tubes + 0.5 * volcB, 10);
  const q = gN ? gQ / gN : 0, an = gN ? gAn / gN : 0, ev = gN ? gEv / gN : 0, cb = gN ? gCb / gN : 0;
  f.dust = clamp(100 * q * Math.sqrt(f.arid / 100));
  f.remote = clamp(100 * Math.log(Math.max(remoteKm, 30) / 30) / Math.log(1500 / 30));
  f.brine = clamp(100 * Math.min(1, 0.5 * cb + 2 * ev + Math.min(0.5, 0.25 * playas)));
  f.anor = clamp(100 * Math.min(1, 3 * an));
  f.crew = lg(stations, 10);
  const area = region || country;
  const where = latS(c.lat) + ' ' + lonS(c.lon);
  const iceTxt = { glacier: 'covered by an ice sheet or glacier', snow: 'seasonal snow cover (average depth ' + c.snow + ' cm)', permafrost: 'cold enough for likely permafrost (ground ice)', 'permafrost-weak': 'cold enough for patchy permafrost', none: 'little snow or ice' }[iceKind];
  const note = 'A 5° × 5° area about ' + (area ? 'in ' + area : 'at this spot') + ' (' + (country || 'no country polygon') + '). Yearly average air temperature ' + c.tC + ' °C, rainfall ' + c.rain + ' mm a day, average height ' + c.elev + ' m, ' + iceTxt + '. All twelve scores below are computed from the datasets listed on the Sources page.';
  const pf = prof[i];
  return {
    id: 'c' + i, name: (area || 'Area') + ' (' + where + ')', place: country || 'No country (coast, ice or island edge)', lat: c.lat, lon: c.lon,
    f: ids.map(id => Math.round(f[id])), iceKind, note,
    cell: { sizeDeg: 5, elevationM: c.elev, snowDepthCm: c.snow, roughnessM: Math.round(c.sd) },
    climate: { tempC: c.tC, rainMmDay: c.rain, source: 'NASA POWER climate cell, 5° grid' },
    raw: { remoteKm, playas, volcBasaltic: volcB, volcOther: volcO, craters: impN, craterKm: impKm, lavaTubes: tubes, stations, geoPoints: gN, geoQuatSed: gQ, geoAnor: gAn, geoEvap: gEv, geoCarb: gCb },
    profile: { spacingKm: 4, lengthKm: 40, z: pf.z, relief2kmM: pf.relief2km, slope2kmDeg: pf.slope2km }
  };
});
A.sites = sites;
A.measuredKeys = ids;
A.climateSource = 'NASA POWER (MERRA-2) climatology, 2001 to 2025, one value per 5° land cell';

// Cold values of three targets, checked against published data (see tools/cold-check.md)
const T = id => A.targets.filter(t => t.id === id)[0];
const cc = JSON.parse(fs.readFileSync(path.join(dir, 'cold_check.json'), 'utf8'));
for (const id of Object.keys(cc)) { const t = T(id); t.f[0] = cc[id].cold; t.coldBasis = cc[id].basis; t.coldWhy = cc[id].why; }

fs.writeFileSync(path.join(dir, '..', 'data', 'data.js'),
  '// Moon/Mars targets from tools/build-data.js (team prototype; cold values of Hellas and Valles Marineris corrected in v3.2). Map layers from tools/set-layers.js. Earth areas (all 806 land cells, all 12 scores computed from data) from tools/build-v32.js (v3.2).\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
const stat = ids.map((id, j) => id + ' mean ' + (sites.reduce((a, s) => a + s.f[j], 0) / sites.length).toFixed(1) + ' nonzero ' + sites.filter(s => s.f[j] > 0).length + ' >=50 ' + sites.filter(s => s.f[j] >= 50).length);
console.log(sites.length + ' sites\n' + stat.join('\n'));
