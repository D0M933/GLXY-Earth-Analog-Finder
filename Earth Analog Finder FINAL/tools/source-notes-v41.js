/* v4.1: adds a "why it is on the list" note and a score-basis note to the 14 original targets, so they are described the same way as the six added in v4.
 * Only claims already in each target's own description are used. Links are given only where we opened the page; the others have no link (source not re-checked in v4.1).
 * Run once: node tools/source-notes-v41.js (safe to repeat). Rewrites data/data.js. */
'use strict';
const fs = require('fs'), path = require('path');
global.window = {}; require(path.join(__dirname, '..', 'data', 'data.js'));
const A = window.ATLAS;
const ART = { name: 'NASA Artemis III candidate landing regions', url: 'https://svs.gsfc.nasa.gov/5013' };
const S = {
  cr: { why: 'It was on NASA\'s 2022 list of 13 Artemis III candidate regions.', ...ART },
  mm: { why: 'It was on NASA\'s 2022 and 2024 Artemis III candidate lists.', ...ART },
  fa: { why: 'It was on NASA\'s 2022 list of 13 Artemis III candidate regions.', ...ART },
  hw: { why: 'It was on NASA\'s 2022 and 2024 Artemis III candidate lists.', ...ART },
  mh: { why: 'A pit seen in LRO images and studied as a possible lava-tube skylight (LROC pit atlas).', name: 'LROC lunar pit atlas, Arizona State University' },
  tp: { why: 'A pit seen in LRO images and studied as a possible lava-tube skylight (LROC pit atlas).', name: 'LROC lunar pit atlas, Arizona State University' },
  lm: { why: 'A pit seen in LRO images and studied as a possible lava-tube skylight (LROC pit atlas).', name: 'LROC lunar pit atlas, Arizona State University' },
  jz: { why: 'It is the landing site of the Perseverance rover (Mars 2020).', name: 'NASA Mars 2020 mission' },
  gc: { why: 'It is the landing site of the Curiosity rover.', name: 'NASA Mars Science Laboratory mission' },
  ap: { why: 'Candidate for water access on Mars: shallow buried ice in northern plains.', name: 'NASA Mars exploration zone studies' },
  am: { why: 'USGS lists more than a thousand Mars cave-entrance candidates; the Arsia Mons skylights are among them.', name: 'USGS Mars cave-entrance candidates' },
  dm: { why: 'Radar shows ice-rich glacier-like aprons here, a water-access candidate.', name: 'NASA Mars exploration zone studies' },
  hp: { why: 'A major Mars basin with radar signs of buried ice on its east side.', name: 'Mars orbiter radar and altimetry results' },
  vm: { why: 'The largest canyon on Mars, with sulfates found by CRISM in Tithonium Chasma.', name: 'NASA MRO CRISM results' }
};
for (const t of A.targets) if (S[t.id]) {
  t.source = S[t.id];
  t.scoreNote = 'These are the team\'s own estimates on a 0 to 100 scale, from the description above. Only the cold value comes from published data. The source named here was not re-checked in v4.1.';
}
fs.writeFileSync(path.join(__dirname, '..', 'data', 'data.js'), '// Moon/Mars targets from tools/build-data.js (team prototype), plus 6 areas and corrected Mars cold values from tools/add-targets-v4.js (v4) and source notes from tools/source-notes-v41.js (v4.1). Map layers from tools/set-layers.js. Earth areas (all 806 land cells) from tools/build-v32.js.\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
console.log(A.targets.filter(t => t.source).length + ' targets with source notes');
