/* Builds the v2.2 Earth sites into data/data.js.  Run:  node tools/build-sites.js   (after tools/select-sites.js)
 *
 * What is MEASURED (from tools/selected.json, which comes from NASA POWER and ETOPO1 data, see select-sites.js):
 *   f[0] cold, f[1] arid, f[2] relief, f[5] ice, plus climate.tempC, climate.rainMmDay and the elevation profile.
 * What is NOT measured (written here by Claude from general knowledge, for the team to review and correct):
 *   the region name, the place, the note, and eight scores: volc, impact, voids, dust, remote, brine, anor, crew.
 * Each row of INFO is keyed by the cell centre "lat/lon". Order of the eight scores: volc, impact, voids, dust, remote, brine, anor, crew.
 */
'use strict';
const fs = require('fs'), path = require('path');
const dir = __dirname, dataFile = path.join(dir, '..', 'data', 'data.js');
const INFO = {
  '-72.5/22.5': ['dml', 'Dronning Maud Land mountains', 'East Antarctica', ['polar', 'mountain'], [5, 5, 0, 20, 97, 5, 0, 40],
    'Ice-sheet edge and rock peaks in East Antarctica, near the Belgian Princess Elisabeth research station. Very cold and very dry, with exposed frost-shattered rock.'],
  '-77.5/162.5': ['mcmurdo', 'McMurdo Dry Valleys and Transantarctic Mountains', 'Victoria Land, Antarctica', ['polar', 'nasa'], [40, 5, 20, 45, 80, 85, 0, 85],
    'Ice-free valleys with salty ponds and frozen ground, long studied by NASA as a Mars analog, beside the McMurdo and Scott Base research stations.'],
  '82.5/-72.5': ['ellesmere', 'Northern Ellesmere Island', 'Nunavut, Canada', ['polar'], [0, 0, 0, 25, 98, 20, 0, 20],
    'The far northern tip of Canada: polar desert with ice caps, bare rock and almost no people.'],
  '37.5/87.5': ['qaidam', 'Altun Mountains and western Qaidam Basin', 'Qinghai and Xinjiang, China', ['desert', 'mountain'], [5, 0, 0, 65, 85, 85, 0, 55],
    'A high, cold desert of wind-carved ridges and salt lakes. Chinese teams already use the Qaidam Basin to practice for Mars.'],
  '27.5/37.5': ['harrat', 'Harrat lava fields', 'Northwest Saudi Arabia', ['volcanic', 'desert'], [90, 10, 80, 75, 55, 15, 0, 10],
    'A hot, dry desert covered in black basalt lava fields, a place where lava tubes are known to exist.'],
  '22.5/17.5': ['tibesti', 'Tibesti volcanic massif', 'Chad and Libya', ['volcanic', 'desert'], [90, 20, 35, 80, 95, 40, 0, 5],
    'Remote Saharan mountains built from volcanoes, with basalt, ash and dune sand all around.'],
  '-82.5/77.5': ['domea', 'East Antarctic Plateau near Dome A', 'East Antarctica', ['polar'], [0, 0, 0, 5, 100, 0, 0, 20],
    'A flat, high ice plateau and one of the coldest, driest places on Earth. China runs the Kunlun research station in this area.'],
  '37.5/72.5': ['pamir', 'Pamir Mountains', 'Tajikistan and Afghanistan', ['mountain'], [5, 5, 5, 40, 80, 15, 0, 5],
    'High, cold, steep mountains with glaciers and bare rock. Very few people live here.'],
  '-72.5/107.5': ['wilkes', 'Wilkes Land interior', 'East Antarctica', ['polar'], [0, 0, 0, 5, 100, 0, 0, 5],
    'A vast, almost flat stretch of the East Antarctic ice sheet, extremely cold and dry.'],
  '22.5/27.5': ['selima', 'Eastern Sahara (Selima Sand Sheet)', 'Egypt and Sudan', ['desert'], [5, 25, 0, 95, 95, 20, 0, 5],
    'Some of the driest ground on Earth: flat sand and bare rock with essentially no rain.'],
  '47.5/92.5': ['mongaltai', 'Mongolian Altai and Great Lakes Basin', 'Western Mongolia', ['mountain', 'desert'], [10, 0, 5, 45, 85, 25, 0, 5],
    'Cold mountains with high steppe, salt lakes and very few roads.'],
  '77.5/-22.5': ['negreenland', 'Northeast Greenland', 'Greenland', ['polar'], [0, 0, 0, 15, 98, 5, 0, 20],
    'A cold polar coast of rock, glaciers and sea ice. Almost no one lives here; a few weather and research stations are nearby.'],
  '-82.5/2.5': ['polarplateau', 'Polar plateau south of Dronning Maud Land', 'Antarctica', ['polar'], [0, 0, 0, 5, 100, 0, 0, 5],
    'A high, flat ice plateau deep inside Antarctica, very cold and very dry.'],
  '72.5/-112.5': ['victoria', 'Victoria Island', 'Nunavut, Canada', ['polar'], [0, 5, 0, 25, 85, 10, 0, 30],
    'Flat, cold Arctic tundra with frozen ground, small lakes and very few people.'],
  '-22.5/-67.5': ['altiplano', 'Altiplano volcanic belt (Ollagüe)', 'Chile and Bolivia', ['volcanic', 'desert'], [90, 0, 25, 70, 80, 90, 0, 15],
    'A high, dry plateau with volcanoes and bright salt flats. Often compared with Mars.'],
  '-82.5/-97.5': ['wais', 'West Antarctic Ice Sheet interior', 'West Antarctica', ['polar'], [0, 0, 0, 5, 100, 0, 0, 10],
    'A cold, flat ice sheet far from any coast.'],
  '-72.5/-62.5': ['peninsula', 'Antarctic Peninsula plateau', 'Palmer Land, Antarctica', ['polar', 'mountain'], [5, 0, 0, 10, 95, 0, 0, 15],
    'A high ice plateau with rock ridges poking through, the warmest and snowiest part of the Antarctic mainland.'],
  '37.5/102.5': ['qilian', 'Qilian Mountains', 'Qinghai and Gansu, China', ['mountain', 'desert'], [5, 0, 5, 40, 60, 55, 0, 15],
    'High mountains and dry basins on the edge of the Tibetan Plateau, with salt lakes and snow.'],
  '-72.5/62.5': ['princecharles', 'Prince Charles Mountains', 'East Antarctica', ['polar', 'mountain'], [0, 0, 0, 20, 98, 0, 0, 10],
    'Rocky ranges rising out of the East Antarctic ice, at the head of the world’s biggest glacier system.'],
  '42.5/47.5': ['caucasus', 'Eastern Greater Caucasus', 'Dagestan, Russia', ['mountain'], [15, 0, 20, 15, 30, 25, 0, 5],
    'Steep mountains running down to the Caspian Sea coast. Much wetter and greener than the Moon or Mars, but a very rugged landscape.'],
  '-42.5/-67.5': ['patagonia', 'Northern Patagonian plateau (Somuncurá basalt)', 'Chubut and Río Negro, Argentina', ['volcanic', 'desert'], [70, 0, 40, 70, 75, 25, 0, 5],
    'A windswept steppe with large basalt lava plateaus and sparse population.'],
  '67.5/167.5': ['chukotka', 'Chukotka tundra', 'Far East Russia', ['polar'], [20, 5, 0, 25, 95, 5, 0, 5],
    'Cold, treeless tundra with frozen ground and very few people.'],
  '-77.5/-147.5': ['rossmargin', 'Ross Ice Shelf margin and Marie Byrd Land', 'Antarctica', ['polar'], [0, 0, 0, 5, 100, 0, 0, 10],
    'Where the huge Ross Ice Shelf meets the land: flat, windy and very cold.'],
  '-72.5/-97.5': ['amundsen', 'Amundsen Sea coast', 'West Antarctica', ['polar'], [15, 0, 0, 5, 100, 0, 0, 5],
    'A remote ice-covered coast, some of the least visited ground on the continent.'],
  '-67.5/132.5': ['wilkescoast', 'Wilkes Land coast', 'East Antarctica', ['polar'], [0, 0, 0, 15, 90, 0, 0, 15],
    'The edge of the East Antarctic ice sheet, with steep coastal ice and strong winds. A French research station lies to the east.'],
  '-52.5/-72.5': ['magallanes', 'Southern Patagonia', 'Magallánes, Chile', ['mountain'], [20, 0, 10, 20, 60, 10, 0, 5],
    'Cold, wet, windy mountains and fjords at the southern tip of South America. Not dry, but cold and rugged.'],
  '-42.5/147.5': ['tasmania', 'Central Tasmania', 'Tasmania, Australia', ['mountain'], [25, 5, 45, 10, 40, 5, 0, 5],
    'Cool highlands of dark volcanic rock (dolerite), limestone caves and thin forest.'],
  '-42.5/172.5': ['southernalps', 'Southern Alps', 'South Island, New Zealand', ['mountain'], [30, 5, 40, 15, 40, 5, 0, 15],
    'Steep, snowy mountains with glaciers. Much wetter than the Moon or Mars, but strongly shaped by ice and rock.'],
  '-37.5/-57.5': ['pampas', 'Argentine Pampas', 'Buenos Aires province, Argentina', ['lowland'], [0, 0, 0, 35, 15, 10, 0, 10],
    'Very flat grassland and farmland. Included as a gentle, low-contrast comparison.'],
  '-32.5/-67.5': ['monte', 'Monte desert and Andean foothills', 'Mendoza and San Juan, Argentina', ['desert', 'mountain'], [20, 0, 15, 65, 55, 35, 0, 10],
    'Dry scrub desert at the foot of the Andes, with dust, gravel plains and salt pans.'],
  '-32.5/22.5': ['karoo', 'Great Karoo', 'South Africa', ['desert'], [15, 5, 5, 50, 60, 20, 0, 25],
    'Dry, wide-open semi-desert with flat-topped hills. It hosts large telescope arrays.'],
  '-32.5/117.5': ['yilgarn', 'Yilgarn craton', 'Western Australia', ['lowland'], [5, 20, 5, 45, 50, 50, 20, 10],
    'Very old, flat, weathered land dotted with salt lakes. Among the oldest rocks on Earth.'],
  '-32.5/137.5': ['gawler', 'Gawler Ranges and Lake Torrens', 'South Australia', ['desert', 'impact'], [40, 60, 5, 55, 55, 60, 0, 15],
    'Dry volcanic hills and huge salt lakes, including the eroded Lake Acraman impact structure.'],
  '-32.5/152.5': ['hunter', 'Hunter Valley and NSW coast', 'New South Wales, Australia', ['lowland'], [25, 0, 10, 10, 15, 0, 0, 10],
    'A green, wet coastal region. Included as a clearly different comparison to dry or cold targets.'],
  '-27.5/-57.5': ['chaco', 'Chaco lowlands', 'Argentina and Paraguay', ['lowland'], [0, 0, 0, 20, 30, 20, 0, 5],
    'A hot, flat, humid plain. Included as the opposite of most Moon and Mars targets.'],
};
global.window = {}; require(dataFile); const A = window.ATLAS;
const sel = require('./selected.json');
const prof = {}; for (const l of fs.readFileSync(path.join(dir, 'profiles.txt'), 'utf8').trim().split('\n')) { const [k, v] = l.split(':'); prof[k] = v.split(',').map(Number); }
const sites = sel.map(o => {
  const key = o.lat + '/' + o.lon, I = INFO[key]; if (!I) throw new Error('no INFO for ' + key);
  const [id, name, place, tags, est, note] = I, z = prof[key]; if (!z) throw new Error('no profile for ' + key);
  const km = Math.round(111.32 * Math.cos(o.lat * Math.PI / 180) * 100) / 100;      // 1 degree of longitude in km at this latitude
  const d = z.map((_, i) => Math.round(km * i / (z.length - 1) * 100) / 100);
  const [volc, impact, voids, dust, remote, brine, anor, crew] = est;
  return { id, name, place, lat: o.lat, lon: o.lon, tags, access: Math.max(0, 100 - remote), note,
    f: [o.cold, o.arid, o.relief, volc, impact, o.ice, voids, dust, remote, brine, anor, crew],
    cell: { sizeDeg: 5, elevationM: o.elevM, snowDepthCm: o.snowCm, roughnessM: o.reliefSdM },
    profiles: [{ name: 'West to east through the cell centre, ' + Math.abs(o.lat) + '°' + (o.lat < 0 ? 'S' : 'N'),
      label: 'Line along ' + Math.abs(o.lat) + '°' + (o.lat < 0 ? 'S' : 'N') + ' from ' + Math.abs(o.lon - 0.5) + '°' + (o.lon - 0.5 < 0 ? 'W' : 'E') + ' to ' + Math.abs(o.lon + 0.5) + '°' + (o.lon + 0.5 < 0 ? 'W' : 'E') + ', about ' + Math.round(km) + ' km (ETOPO1, about 2 km resolution)',
      src: 'NOAA ETOPO1 global relief model, served by OpenTopoData', d, z }],
    climate: { tempC: o.tempC, rainMmDay: o.rainMmDay, source: 'NASA POWER climate cell, 5° grid' } };
});
A.sites = sites;
A.climateSource = 'NASA POWER (MERRA-2) climatology, 2001 to 2025, one value per 5° land cell';
A.measuredKeys = ['cold', 'arid', 'relief', 'ice'];
fs.writeFileSync(dataFile, '// Moon/Mars targets from tools/build-data.js (team prototype). Earth sites from tools/select-sites.js + tools/build-sites.js (v2.2).\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
console.log('wrote', sites.length, 'sites; ids unique:', new Set(sites.map(s => s.id)).size === sites.length);
