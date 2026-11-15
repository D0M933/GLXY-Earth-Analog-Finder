/* Version 5 data step. Run after build-v32.js, add-targets-v4.js and source-notes-v41.js:   node tools/build-v5.js
 * (idempotent: it reads data/data.js, which already holds the V4.1 data on the first run, and rewrites it.)
 *
 * 1. Crew facilities is no longer a match feature. The 12th score is removed from A.features, from every target and from every Earth
 *    site; the station count stays in site.raw.stations and is used by the Step 2 filter instead.
 * 2. Names: a site keeps a name only if it has a specific one (the Natural Earth region name, e.g. "Dome C" or "Canadian Shield").
 *    Cells whose only "name" was the country, or that had none, get name '' and show their coordinates instead.
 * 3. 16 small named sites (1 degree x 1 degree boxes, about 110 km) are added with the SAME formulas as the 806 cells (see build-v32.js header).
 *    Raw numbers are in tools/small_sites_raw.json (collected 15 Nov 2026 in the browser from NASA POWER, NOAA ETOPO1, NOAA NCEI volcano
 *    database, Wikidata, Natural Earth and Macrostrat). Differences from the 5 degree cells, all disclosed on the Sources page:
 *      - the 9 sample points are a 3 x 3 grid about 37 km apart (not 1.7 degrees apart);
 *      - NASA POWER values are the point climatology of the roughly 50 km MERRA-2 grid cell that contains the box centre;
 *      - average height = mean of the 9 ETOPO1 heights (sea set to 0), like roughness (standard deviation of the same 9 heights, sea set to 0);
 *      - the height line is 40 km long, north-south, centred on the box centre, one point every 2 km from ETOPO1 (the 4 km line is every second point);
 *      - Macrostrat: the first (most detailed) unit returned at each point, with keyword tests on its rock type and description.
 */
'use strict';
const fs = require('fs'), path = require('path');
const dir = __dirname;
global.window = {}; require(path.join(dir, '..', 'data', 'data.js'));
const A = window.ATLAS;
const clamp = x => Math.max(0, Math.min(100, x));
const lg = (n, ref) => clamp(100 * Math.log(1 + n) / Math.log(1 + ref));
const latS = v => Math.abs(v) + '°' + (v < 0 ? 'S' : 'N'), lonS = v => Math.abs(v) + '°' + (v < 0 ? 'W' : 'E');

/* ---- 1. drop the crew feature (only if still there) ---- */
const ci = A.features.map(f => f.key).indexOf('crew');
if (ci >= 0) {
  A.features.splice(ci, 1);
  A.targets.forEach(t => { t.f.splice(ci, 1); t.focus = t.focus.filter(k => k !== 'crew'); });
  A.sites.forEach(s => { s.f.splice(ci, 1); });
}
A.measuredKeys = A.features.map(f => f.key);
const keys = A.measuredKeys;

/* ---- 2. names ---- */
A.sites.forEach(s => {
  if (s.coord) return;   // already converted
  const m = /^(.*) \((.*)\)$/.exec(s.name);
  const base = m[1], coord = m[2];
  s.coord = coord;
  const country = s.place.indexOf('No country') === 0 ? '' : s.place;
  s.name = (base === 'Area' || base === country) ? '' : base;
  const m2 = /^A 5° × 5° area (?:about )?(?:in (.*?)|at this spot) \((.*?)\)\. /.exec(s.note);
  const lead = s.name ? 'A 5° × 5° area in ' + s.name + ' (' + country + '). ' : (country ? 'A 5° × 5° area in ' + country + '. ' : 'A 5° × 5° area on a coast, ice edge or island with no country polygon. ');
  s.note = (m2 ? lead + s.note.slice(m2[0].length) : s.note).replace(/All twelve scores/, 'All eleven scores');
});

/* ---- 3. small named sites ---- */
A.sites = A.sites.filter(s => !s.small);
const RAW = JSON.parse(fs.readFileSync(path.join(dir, 'small_sites_raw.json'), 'utf8')).sites;
const META = {
  mk: ['United States (Hawaii)', 'It is the home of PISCES, which tests lunar and Mars field equipment on the Big Island of Hawaii. (A Pacific Space Center article, not a NASA page.)', 'Pacific Space Center: why Hawaii is a great analog for Mars', 'https://pacificspacecenter.com/2018/12/05/why-is-hawaii-a-great-analog-for-mars/'],
  kl: ['United States (Hawaii)', 'NASA lists Kīlauea as a place where geologists and astronauts test how a small team would work on a volcanic surface like the Moon\'s.', 'NASA: Analog missions', 'https://www.nasa.gov/analog-missions/'],
  cm: ['United States (Idaho)', 'Apollo astronauts trained in this lava field for the Moon landings.', 'US National Park Service: Space exploration research and astronaut training', 'https://www.nps.gov/crmo/learn/historyculture/space-exploration-research-and-astronaut-training.htm'],
  sf: ['United States (Arizona)', 'Apollo astronauts trained here, including on the Cinder Lake crater field, which was made to look like the Moon.', 'USGS: Walk in the footsteps of the Apollo astronauts (field guide to northern Arizona training sites)', 'https://pubs.usgs.gov/publication/70206910'],
  hc: ['Canada (Nunavut)', 'NASA\'s Haughton-Mars Project runs Mars-analog research from a base on Devon Island, next to the Haughton impact crater.', 'NASA: Haughton-Mars Project', 'https://www.nasa.gov/mission/haughton-mars-project-hmp'],
  yg: ['Chile', 'NASA describes the Atacama Desert as the driest place on the planet and a place to study how microbes survive for future Mars visits.', 'NASA: Analog missions', 'https://www.nasa.gov/analog-missions/'],
  rt: ['Spain', 'NASA and Spanish scientists drilled near the acidic Río Tinto to test ways of finding underground life on Mars.', 'NASA Astrobiology: scientists practice Mars drilling near an acidic Spanish river', 'https://astrobiology.nasa.gov/news/scientists-practice-mars-drilling-near-acidic-spanish-river/'],
  dk: ['Ethiopia', 'A scientific paper calls the Dallol area an exceptional planetary field analog (acid pools, salts and volcanic heat).', 'Astrobiology journal: The Dallol geothermal area, northern Afar (Ethiopia)', 'https://read.qxmd.com/read/30653331/the-dallol-geothermal-area-northern-afar-ethiopia-an-exceptional-planetary-field-analog-on-earth'],
  ak: ['Iceland', 'Apollo astronauts trained in the Askja area in the 1960s because of its Moon-like volcanic ground. (Exploration Museum, Húsavík; not a NASA page.)', 'Exploration Museum: astronaut training in Iceland', 'https://www.explorationmuseum.com/astronaut-training/'],
  lz: ['Spain (Canary Islands)', 'ESA\'s PANGAEA course trains astronauts here in field geology and astrobiology on volcanic ground.', 'ESA: What is PANGAEA?', 'https://www.esa.int/Our_Activities/Human_Spaceflight/Caves/What_is_Pangaea'],
  dv: ['Antarctica', 'A NASA paper presents the Dry Valleys as the best-known Earth stand-in for the Mars Phoenix landing area.', 'NASA Technical Reports Server: McMurdo Dry Valleys, Antarctica, a Mars Phoenix mission analog', 'https://ntrs.nasa.gov/citations/20100003844'],
  sv: ['Norway (Svalbard)', 'NASA-funded Arctic Mars Analog Svalbard Expedition (AMASE) tests Mars instruments here.', 'NASA JPL: AMASE', 'https://robotics.jpl.nasa.gov/what-we-do/research-tasks/amase-arctic-mars-analogue-svalbard-expedition/'],
  dh: ['United States (California)', 'NASA has tested Mars drone technology in Death Valley. (News report, not a NASA page.)', 'Astrobiology.com: NASA tests future Mars droids in Death Valley', 'https://astrobiology.com/2025/12/02/nasa-tests-future-mars-droids-in-death-valley/'],
  ri: ['Germany', 'ESA\'s PANGAEA astronaut course uses the Ries impact crater to teach lunar geology and impact cratering.', 'ESA: What is PANGAEA?', 'https://www.esa.int/Our_Activities/Human_Spaceflight/Caves/What_is_Pangaea'],
  lo: ['Norway', 'ESA\'s PANGAEA course uses Lofoten to teach magma differentiation and the lunar highlands.', 'ESA: What is PANGAEA?', 'https://www.esa.int/Our_Activities/Human_Spaceflight/Caves/What_is_Pangaea'],
  bl: ['Italy', 'ESA\'s PANGAEA course uses Bletterbach Canyon to teach Martian sedimentary geology.', 'ESA: What is PANGAEA?', 'https://www.esa.int/Our_Activities/Human_Spaceflight/Caves/What_is_Pangaea']
};
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const small = RAW.map((r, i) => {
  const z9 = r.z9.map(v => Math.max(0, v));
  // NASA POWER has no snow value (land-ice mask) for the Dry Valleys cell; the valley floors are ice-free but have ground ice, so no surface snow is assumed and the ice score comes from the permafrost estimate (which is 100 at -27 C either way)
  const snow = r.id === 'dv' ? 0 : (r.SN === null || r.SN === -999 ? null : r.SN);
  const rough = sd(z9), elev = Math.round(mean(z9));
  const f = {};
  f.cold = clamp((25 - r.T) / 75 * 100);
  f.arid = clamp(100 * (1 - Math.log(Math.max(r.P, 0.03) / 0.03) / Math.log(6 / 0.03)));
  f.relief = clamp(rough / 800 * 100);
  const surfIce = snow === null ? 100 : clamp(snow / 50 * 100), groundIce = clamp((-1 - r.T) / 7 * 100);
  f.ice = Math.max(surfIce, groundIce);
  const iceKind = snow === null ? 'glacier' : groundIce >= 50 && groundIce >= surfIce ? 'permafrost' : surfIce >= 10 ? 'snow' : groundIce > 0 ? 'permafrost-weak' : 'none';
  const cr = r.wd.cr, impKm = cr.reduce((a, c) => a + (c[1] == null ? 3 : c[1]), 0);
  const tubes = r.wd.tb.length, stations = r.wd.st.length;
  f.volc = lg(r.vb + 0.25 * r.vo, 10);
  f.impact = lg(impKm, 100);
  f.voids = lg(2 * tubes + 0.5 * r.vb, 10);
  const q = r.n ? r.q / r.n : 0, an = r.n ? r.an / r.n : 0, ev = r.n ? r.ev / r.n : 0, cb = r.n ? r.cb / r.n : 0;
  f.dust = clamp(100 * q * Math.sqrt(f.arid / 100));
  f.remote = clamp(100 * Math.log(Math.max(r.rem, 30) / 30) / Math.log(1500 / 30));
  f.brine = clamp(100 * Math.min(1, 0.5 * cb + 2 * ev + Math.min(0.5, 0.25 * r.pl)));
  f.anor = clamp(100 * Math.min(1, 3 * an));
  const p21 = r.prof, p11 = p21.filter((_, k) => k % 2 === 0);
  const slopes = []; for (let k = 1; k < p21.length; k++) slopes.push(Math.atan(Math.abs(p21[k] - p21[k - 1]) / 2000) * 180 / Math.PI);
  const iceTxt = { glacier: 'covered by an ice sheet or glacier', snow: 'seasonal snow cover (average depth ' + snow + ' cm)', permafrost: 'cold enough for likely permafrost (ground ice)', 'permafrost-weak': 'cold enough for patchy permafrost', none: 'little snow or ice' }[iceKind];
  const m = META[r.id];
  return {
    id: 's_' + r.id, name: r.name, coord: latS(r.la) + ' ' + lonS(r.lo), place: m[0], lat: r.la, lon: r.lo, small: true,
    f: keys.map(k => Math.round(f[k])), iceKind,
    note: 'A small named site: a 1° × 1° box (about 110 km across) around ' + r.name + '. Yearly average air temperature ' + r.T + ' °C, rainfall ' + r.P + ' mm a day (both for the roughly 50 km climate grid cell at the centre), average height ' + elev + ' m, ' + iceTxt + '. Small boxes average over less ground than the 5° areas, so their scores can be more extreme. All eleven scores are computed from the datasets listed on the Sources page.' + (r.id === 'dv' ? ' NASA POWER has no snow value for this cell (it is masked as land ice), so no surface snow is assumed and the ice score comes from the ground-ice estimate.' : ''),
    why: { text: m[1], name: m[2], url: m[3] },
    cell: { sizeDeg: 1, elevationM: elev, snowDepthCm: snow, roughnessM: Math.round(rough) },
    climate: { tempC: r.T, rainMmDay: r.P, source: 'NASA POWER climate point, about 50 km grid cell' },
    raw: { remoteKm: r.rem, playas: r.pl, volcBasaltic: r.vb, volcOther: r.vo, craters: cr.length, craterKm: Math.round(impKm * 10) / 10, lavaTubes: tubes, stations, geoPoints: r.n, geoQuatSed: r.q, geoAnor: r.an, geoEvap: r.ev, geoCarb: r.cb },
    profile: { spacingKm: 4, lengthKm: 40, z: p11, relief2kmM: Math.max(...p21) - Math.min(...p21), slope2kmDeg: Math.round(mean(slopes) * 10) / 10 }
  };
});
A.sites = A.sites.concat(small);
A.climateSource = 'NASA POWER (MERRA-2) climatology, 2001 to 2025: one value per 5° land cell, and one point value for each of the 16 small named sites';

fs.writeFileSync(path.join(dir, '..', 'data', 'data.js'),
  '// Moon/Mars targets from tools/build-data.js, plus 6 areas and corrected Mars cold values from tools/add-targets-v4.js and source notes from tools/source-notes-v41.js. Map layers from tools/set-layers.js. Earth areas: 806 land cells from tools/build-v32.js, and in v5 (tools/build-v5.js) crew facilities removed from the match features, names tidied, and 16 small named sites added.\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
console.log(A.features.length + ' features, ' + A.sites.length + ' sites (' + small.length + ' small); unnamed cells: ' + A.sites.filter(s => !s.name).length);
small.forEach(s => console.log(s.id, s.coord, s.f.join(','), s.iceKind));
