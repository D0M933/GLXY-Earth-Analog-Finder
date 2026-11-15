/* v4: adds 3 Moon and 3 Mars potential areas and re-checks every Mars cold value. Run once: node tools/add-targets-v4.js  (it rewrites data/data.js; running it twice is safe).
 *
 * Where the new areas come from (official lists):
 *   Moon: NASA's 13 Artemis III candidate landing regions (NASA Scientific Visualization Studio, https://svs.gsfc.nasa.gov/5013).
 *         The four already in the app (Connecting Ridge, Faustini Rim A, Haworth, Malapert Massif) were kept; we added three of the remaining nine
 *         that have an identifiable crater: Nobile Rim, Amundsen Rim, de Gerlache Rim. The position shown is the crater centre (USGS/IAU Gazetteer of Planetary
 *         Nomenclature for Nobile; de Gerlache and Amundsen from their Wikipedia entries, which cite the IAU); the landing regions themselves are on the rims.
 *   Mars: landing sites chosen or shortlisted by NASA and ESA: Oxia Planum (ESA's ExoMars rover landing site), Mawrth Vallis (ESA ExoMars candidate), Gusev crater (NASA Spirit rover site, considered for Mars 2020).
 *         Coordinates and geology are taken from ESA's Exploration pages and, for Gusev, from the Gusev crater article; see README.
 * Cold values: Mars cold is computed from the Mars Climate Database yearly mean air temperature with the same scale as Earth: 100 at -50 C (223.15 K) or colder.
 * Other scores of the new areas were assigned on the same 0 to 100 scale as the existing targets from the facts in each source, and are estimates for the team to review (scoreNote says so).
 */
'use strict';
const fs = require('fs'), path = require('path');
const dir = __dirname;
global.window = {}; require(path.join(dir, '..', 'data', 'data.js'));
const A = window.ATLAS;
const mcd = JSON.parse(fs.readFileSync(path.join(dir, 'mcd_v4.json'), 'utf8'));
const coldFromK = k => Math.max(0, Math.min(100, Math.round((25 - (k - 273.15)) / 75 * 100)));
const T = id => A.targets.filter(t => t.id === id)[0];

// 1. Re-check cold values of every Mars target (the new ones are added below)
for (const [id, k] of Object.entries(mcd.annualMeanAirK)) {
  const t = T(id); if (!t) continue;
  t.f[0] = coldFromK(k); t.coldBasis = 'derived';
  t.coldWhy = 'Checked in v4 against the Mars Climate Database: yearly mean 2 m air temperature ' + k + ' K (' + (k - 273.15).toFixed(1) + ' C) at the target position, 96 runs (12 seasons x 8 times of day). Cold is 100 at -50 C or colder.';
}

// 2. New targets
const ART = { name: 'NASA Artemis III candidate landing regions', url: 'https://svs.gsfc.nasa.gov/5013' };
const NEW = [
  { id: 'nb', body: 'Moon', name: 'Nobile Rim', place: 'South polar region, near Amundsen', pos: [-85.2, 53.5],
    note: 'A 73 km crater near the south pole whose floor sits in near-constant shadow. NASA lists two regions on its rim (Nobile Rim 1 and 2) as Artemis III candidates. The dot marks the crater centre.',
    f: [100, 100, 55, 10, 85, 80, 0, 95, 100, 0, 90, 100], focus: ['ice', 'cold', 'impact'],
    source: { why: 'It is one of the 13 regions NASA named for the Artemis III landing.', ...ART }, cold: ['bounded', 'Polar rim next to permanently shadowed ground; LRO Diviner polar results show yearly means far below -50 C. Not measured for this crater.'] },
  { id: 'am2', body: 'Moon', name: 'Amundsen Rim', place: 'South polar region', pos: [-84.5, 82.8],
    note: 'A 103 km crater near the south pole. Most of its floor stays in shadow while the central peaks and parts of the rim catch sunlight. NASA lists Amundsen Rim as an Artemis III candidate region. The dot marks the crater centre.',
    f: [100, 100, 65, 10, 90, 75, 0, 95, 100, 0, 90, 100], focus: ['ice', 'cold', 'impact'],
    source: { why: 'It is one of the 13 regions NASA named for the Artemis III landing.', ...ART }, cold: ['bounded', 'Polar crater with a mostly shadowed floor; LRO Diviner polar results show yearly means far below -50 C. Not measured for this crater.'] },
  { id: 'dg', body: 'Moon', name: 'de Gerlache Rim', place: 'South polar region, next to Shackleton', pos: [-88.5, -87.1],
    note: 'A 32 km crater within one crater width of Shackleton, in near-permanent darkness. NASA lists two regions on its rim (de Gerlache Rim 1 and 2) as Artemis III candidates. The dot marks the crater centre.',
    f: [100, 100, 65, 10, 80, 85, 0, 95, 100, 0, 90, 100], focus: ['cold', 'ice'],
    source: { why: 'It is one of the 13 regions NASA named for the Artemis III landing.', ...ART }, cold: ['bounded', 'Polar crater in near-permanent darkness; LRO Diviner polar results show yearly means far below -50 C. Not measured for this crater.'] },
  { id: 'ox', body: 'Mars', name: 'Oxia Planum', place: 'Edge of Chryse Planitia', pos: [18.2, -24.55],
    note: 'A shallow basin at the mouth of the Coogoon Valles channels, with wide exposures of iron and magnesium clays under a thin dark layer that may be volcanic. ESA chose it as the ExoMars Rosalind Franklin rover landing site (landing ellipse about 104 km by 19 km).',
    f: [100, 100, 25, 35, 35, 5, 0, 75, 100, 75, 0, 100], focus: ['brine', 'volc'], mcd: 'ox',
    source: { why: 'ESA picked it as the landing site for its ExoMars rover.', name: 'ESA Exploration: Oxia Planum', url: 'https://exploration.esa.int/mars/54724-oxia-planum/' } },
  { id: 'mv', body: 'Mars', name: 'Mawrth Vallis', place: 'Arabia Terra to Chryse Planitia', pos: [22, -18],
    note: 'A large outflow channel cut through one of the biggest clay-mineral exposures on Mars, with layers that are iron-rich at the bottom and aluminium-rich on top, under a thin dark cap. It was a shortlisted ExoMars landing site (ellipse about 170 km by 19 km).',
    f: [100, 100, 45, 30, 45, 5, 0, 75, 100, 85, 0, 100], focus: ['brine', 'relief'], mcd: 'mv',
    source: { why: 'It was on ESA\'s shortlist of ExoMars landing sites.', name: 'ESA Exploration: Mawrth Vallis', url: 'https://exploration.esa.int/mars/54721-mawrth-vallis' } },
  { id: 'gu', body: 'Mars', name: 'Gusev Crater', place: 'Aeolis, near the Columbia Hills', pos: [-14.5, 175.4],
    note: 'A crater about 166 km across, explored by the Spirit rover from January 2004. Its plains are olivine basalt, and the nearby Columbia Hills show sulfates, goethite and carbonates. It was also considered for the Mars 2020 rover.',
    f: [100, 100, 40, 70, 75, 5, 5, 80, 100, 45, 0, 100], focus: ['volc', 'brine'], mcd: 'gu',
    source: { why: 'It is NASA\'s Spirit rover landing site and was considered for Mars 2020.', name: 'Gusev crater (Wikipedia, citing NASA mission results)', url: 'https://en.wikipedia.org/wiki/Gusev_(Martian_crater)' } }
];
const keep = A.targets.filter(t => !NEW.some(n => n.id === t.id));
const added = NEW.map(n => {
  const t = { id: n.id, body: n.body, name: n.name, place: n.place, note: n.note, pos: n.pos, f: n.f.slice(), focus: n.focus, source: n.source, profiles: [],
    scoreNote: 'Chosen from an official list; the scores use the same 0 to 100 scale as the other targets and are estimates for the team to review (no elevation line has been added for this one yet).' };
  if (n.cold) { t.coldBasis = n.cold[0]; t.coldWhy = n.cold[1]; }
  else {
    const k = mcd.annualMeanAirK[n.mcd]; if (k == null) throw new Error('missing MCD value for ' + n.id);
    t.f[0] = coldFromK(k); t.coldBasis = 'derived';
    t.coldWhy = 'Checked in v4 against the Mars Climate Database: yearly mean 2 m air temperature ' + k + ' K (' + (k - 273.15).toFixed(1) + ' C), 96 runs. Cold is 100 at -50 C or colder.';
  }
  return t;
});
A.targets = keep.concat(added);
fs.writeFileSync(path.join(dir, '..', 'data', 'data.js'), '// Moon/Mars targets from tools/build-data.js (team prototype), plus 6 areas and corrected Mars cold values from tools/add-targets-v4.js (v4). Map layers from tools/set-layers.js. Earth areas (all 806 land cells) from tools/build-v32.js.\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
console.log(A.targets.length + ' targets; Moon ' + A.targets.filter(t => t.body === 'Moon').length + ', Mars ' + A.targets.filter(t => t.body === 'Mars').length);
