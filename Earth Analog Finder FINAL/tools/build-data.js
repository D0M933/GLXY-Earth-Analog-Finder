// Builds data/data.js from the team's earlier prototype. DATA ONLY: target and site lists, hand-assigned feature
// scores, NASA POWER climate numbers and coastline polygons. No prototype code or images are used.
// Usage: node tools/build-data.js <path-to-prototype.html>
const fs = require('fs'), vm = require('vm'), path = require('path');
const L = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const seg = (a, b) => L.slice(a - 1, b).join('\n');
const c = {}; vm.createContext(c);
vm.runInContext([seg(863, 1008), seg(1010, 1109), seg(674, 687), seg(689, 733), seg(735, 739), seg(745, 853), seg(1116, 1117), seg(1122, 1124),
  seg(1141, 1157), seg(1218, 1299), seg(1301, 1328),
  'this.o={PROFILES,EARTH,FEATURES,TARGETS,TARGET_POS,SITES,CLIM,CLIM_SRC,SITE_HEIGHT,STATION,TGT_CA,TGT_ARID,LAND,SEAS};'].join('\n'), c);
const o = c.o, K = o.FEATURES.map(f => f.key), iCold = K.indexOf('cold'), iArid = K.indexOf('arid');
const clamp = x => Math.max(0, Math.min(100, x));
// Same scales as the prototype's methods note: cold 100 at -50 C or colder, 0 at +25 C or warmer;
// dryness is logarithmic in rainfall, 100 at 0.03 mm/day or less, 0 at 6 mm/day or more.
const coldScore = t => Math.round(clamp((25 - t) / 75 * 100));
const aridScore = p => Math.round(clamp((Math.log(6) - Math.log(Math.max(p, 0.03))) / (Math.log(6) - Math.log(0.03)) * 100));
// Measured elevation lines: distance in km, height in m. Moon: LRO LOLA, Mars: MGS MOLA, Earth: SRTM / ASTER GDEM.
const prof = p => ({ name: p.name, label: p.label, src: p.src, d: p.d.map(v => +(+v).toFixed(2)), z: p.z.map(v => Math.round(v)) });
const sites = o.SITES.map(s => {
  const [t, p, h] = o.CLIM[s.id]; let T = t, note = 'NASA POWER climate cell';
  if (o.STATION[s.id]) { T = o.STATION[s.id].t; note = o.STATION[s.id].src; }
  else if (o.SITE_HEIGHT[s.id]) { T = t - 6.5 * (o.SITE_HEIGHT[s.id] - h) / 1000; note = 'NASA POWER, corrected to site height'; }
  const f = s.f.slice(); f[iCold] = coldScore(T); f[iArid] = aridScore(p);
  return { id: s.id, name: s.name, place: s.place, lat: s.lat, lon: s.lon, tags: s.tags || [], access: s.access, note: s.note, f,
    profiles: o.EARTH[s.id] ? [prof(o.EARTH[s.id])] : [],
    climate: { tempC: +T.toFixed(1), rainMmDay: p, source: note } };
});
const targets = o.TARGETS.map(t => {
  const f = t.f.slice(); const ca = o.TGT_CA[t.id];
  f[iCold] = ca[0]; f[iArid] = o.TGT_ARID[0];
  return { id: t.id, body: t.body, name: t.name, place: t.place, note: t.note, pos: o.TARGET_POS[t.id], f, focus: t.focus,
    coldBasis: ca[1], coldWhy: ca[2], profiles: (o.PROFILES[t.id] || []).map(prof) };
});
const features = o.FEATURES.map(({ key, label, hint }) => ({ key, label, hint }));
const BASE = { Moon: 'assets/moon.jpg', Mars: 'assets/mars.jpg' };
// Optional full-map raster layers. Each one appears in the layer menu only if its image file exists in assets/layers/.
// Images must be equirectangular: longitude -180 to 180 left to right, latitude 90 to -90 top to bottom.
const RASTERS = {
  Moon: [
    { id: 'elev', label: 'Elevation (LRO LOLA)', file: 'assets/layers/moon-elevation.jpg', legend: ['lower', 'higher'], source: 'LRO LOLA via NASA Moon Trek', url: 'https://trek.nasa.gov/moon/' },
    { id: 'temp', label: 'Temperature (LRO Diviner)', file: 'assets/layers/moon-temperature.jpg', legend: ['colder', 'warmer'], source: 'LRO Diviner, NASA PDS', url: 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm' }
  ],
  Mars: [
    { id: 'elev', label: 'Elevation (MGS MOLA)', file: 'assets/layers/mars-elevation.jpg', legend: ['lower', 'higher'], source: 'MGS MOLA via NASA Mars Trek', url: 'https://trek.nasa.gov/mars/' },
    { id: 'thermal', label: 'Thermal map', file: 'assets/layers/mars-thermal.jpg', legend: ['colder', 'warmer'], source: 'NASA Mars Trek', url: 'https://trek.nasa.gov/mars/' }
  ],
  Earth: [
    { id: 'temp', label: 'Temperature map (NASA Earthdata)', file: 'assets/layers/earth-temperature.jpg', legend: ['colder', 'warmer'], source: 'NASA Earthdata / Worldview', url: 'https://worldview.earthdata.nasa.gov/index.html' },
    { id: 'elev', label: 'Elevation map (NASA Earthdata)', file: 'assets/layers/earth-elevation.jpg', legend: ['lower', 'higher'], source: 'NASA Earthdata Search', url: 'https://search.earthdata.nasa.gov' }
  ]
};
// Base maps for the target picker. assets/moon.jpg (NASA SVS LROC color map) and assets/mars.jpg (Hubble Mars map) were replaced by hand in v2,
// so the prototype's older maps are written only if those files are missing.
const bm = /Moon: *'data:image\/jpeg;base64,([^']+)'[^]*?Mars: *'data:image\/jpeg;base64,([^']+)'/.exec(L.slice(741, 743).join('\n'));
fs.mkdirSync(path.join(__dirname, '..', 'assets', 'layers'), { recursive: true });
if (!fs.existsSync(path.join(__dirname, '..', 'assets', 'moon.jpg'))) fs.writeFileSync(path.join(__dirname, '..', 'assets', 'moon.jpg'), Buffer.from(bm[1], 'base64'));
if (!fs.existsSync(path.join(__dirname, '..', 'assets', 'mars.jpg'))) fs.writeFileSync(path.join(__dirname, '..', 'assets', 'mars.jpg'), Buffer.from(bm[2], 'base64'));
const out = '// Generated by tools/build-data.js. Edit freely: this file is the data the site reads.\n' +
  'window.ATLAS = ' + JSON.stringify({ base: BASE, rasters: RASTERS, features, targets, sites, land: o.LAND, seas: o.SEAS, climateSource: o.CLIM_SRC }) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'data', 'data.js'), out);
console.log('wrote data.js', (out.length / 1024).toFixed(0) + ' KB;', targets.length, 'targets', sites.length, 'sites');
