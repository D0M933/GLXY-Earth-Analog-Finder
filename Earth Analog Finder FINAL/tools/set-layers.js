/* v2.3: defines the live map layers in data/data.js (ATLAS.rasters).  Run: node tools/set-layers.js
 * Layers are NOT stored in this folder. The browser loads them from NASA when a layer is chosen:
 *   Moon and Mars: NASA Trek WMTS tiles   https://trek.nasa.gov/tiles/<Body>/EQ/<layer>/1.0.0/default/default028mm/{z}/{row}/{col}.<ext>
 *   Earth:         NASA GIBS WMS (the service behind Worldview), one equirectangular image per layer.
 * 'file' is a small probe image: the layer is listed in the menu only if that image loads (so offline, the menu just omits them).
 */
'use strict';
const fs = require('fs'), path = require('path');
const dataFile = path.join(__dirname, '..', 'data', 'data.js');
global.window = {}; require(dataFile); const A = window.ATLAS;
const TREK = 'https://trek.nasa.gov/tiles/', Z = 2;
// Mars TES thermal inertia and albedo only have tiles down to zoom 1 (checked on Trek); the others go to zoom 2 or deeper.
const tile = (body, layer, ext) => ({ base: TREK + body + '/EQ/' + layer + '/1.0.0/default/default028mm/', ext, z: /^(TES_Thermal_Inertia|Mars_MGS_TES_Albedo)/.test(layer) ? 1 : Z });
const trek = (body, id, label, layer, ext, note, source, url) => { const t = tile(body, layer, ext);
  return { id, label, tiles: t, file: t.base + '1/0/1.' + ext, note, source, url }; };
const gibs = (id, label, layer, time, note, source) => { const u = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=' + layer + '&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/png&TRANSPARENT=TRUE' + (time ? '&TIME=' + time : '');
  return { id, label, file: u, note, source, url: 'https://worldview.earthdata.nasa.gov/' }; };
A.rasters = {
  Moon: [
    trek('Moon', 'elev', 'Elevation (LRO LOLA)', 'LRO_LOLA_ClrShade_Global_256ppd_v06', 'png', 'Cool colours are low ground (crater floors), warm colours are high ground, with shading to show the slopes.', 'LRO LOLA via NASA Moon Trek', 'https://trek.nasa.gov/moon/'),
    trek('Moon', 'temp', 'Night-time temperature (LRO Diviner)', 'LRO_Diviner_ST_Avg_Clr_Global_32ppd', 'png', 'Surface temperature at night compared with the Moon-wide average for the same time of night: blue is colder, green to yellow and red is warmer. Only 60°S to 60°N is mapped, so the poles are blank, and the dark streaks are gaps in coverage.', 'LRO Diviner via NASA Moon Trek', 'https://trek.nasa.gov/moon/'),
    trek('Moon', 'slope', 'Steepness (LRO LOLA slope)', 'LRO_LOLA_ClrSlope_Global_16ppd', 'png', 'Colours show how steep the ground is. The exact colour scale is on NASA Moon Trek. Smooth mare plains differ clearly from the rough highlands.', 'LRO LOLA via NASA Moon Trek', 'https://trek.nasa.gov/moon/'),
    trek('Moon', 'rough', 'Roughness (LRO LOLA)', 'LRO_LOLA_ClrRoughness_Global_16ppd', 'png', 'Colours show how bumpy the ground is over short distances. The exact colour scale is on NASA Moon Trek.', 'LRO LOLA via NASA Moon Trek', 'https://trek.nasa.gov/moon/'),
    trek('Moon', 'rock', 'Rock abundance (LRO Diviner)', 'Diviner_avg_RockAbundance', 'png', 'How much of the surface is covered by boulders instead of fine dust. Fresh craters stand out. The exact colour scale is on NASA Moon Trek.', 'LRO Diviner via NASA Moon Trek', 'https://trek.nasa.gov/moon/'),
  ],
  Mars: [
    trek('Mars', 'elev', 'Elevation (MGS MOLA)', 'Mars_MGS_MOLA_ClrShade_merge_global_463m', 'jpg', 'Blue and purple are low ground (the northern plains, Hellas), green and yellow are in between, red and white are the high volcanoes and highlands.', 'MGS MOLA via NASA Mars Trek', 'https://trek.nasa.gov/mars/'),
    trek('Mars', 'thermal', 'Thermal inertia (MGS TES)', 'TES_Thermal_Inertia', 'png', 'This is a thermal map: how quickly the ground heats up and cools down. Purple and blue are fine dust, which changes temperature fast. Red is solid rock, which holds its heat. It is not a temperature map.', 'MGS TES via NASA Mars Trek', 'https://trek.nasa.gov/mars/'),
    trek('Mars', 'albedo', 'Brightness (MGS TES albedo)', 'Mars_MGS_TES_Albedo_mosaic_global_7410m', 'png', 'How much sunlight the ground reflects. Bright areas are dust-covered, dark areas are bare dark rock and sand.', 'MGS TES via NASA Mars Trek', 'https://trek.nasa.gov/mars/'),
  ],
  Earth: [
    gibs('temp', 'Daytime ground temperature, July 2025 (MODIS)', 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day', '2025-07-01', 'Land surface temperature in the daytime, averaged over July 2025: blue and purple are cold, green and yellow are mild, orange and red are hot. Cloud-covered or missing areas are blank.', 'NASA MODIS Terra via GIBS / Worldview'),
    gibs('tempn', 'Night-time ground temperature, July 2025 (MODIS)', 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_Night', '2025-07-01', 'Land surface temperature at night, averaged over July 2025: blue and purple are cold, green and yellow are mild, orange and red are warm. Compare with the daytime map to see how much each place swings between day and night.', 'NASA MODIS Terra via GIBS / Worldview'),
    gibs('elev', 'Elevation (ASTER GDEM)', 'ASTER_GDEM_Color_Index', '', 'Colour-coded height above sea level: green is low, then yellow and brown, with white and grey at the highest peaks. Antarctica and the far north are not covered.', 'NASA/METI ASTER GDEM via GIBS / Worldview'),
    gibs('snow', 'Snow cover, January 2025 (MODIS)', 'MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct', '2025-01-01', 'Share of the month the ground was under snow: warmer red means more, pale means partly, blank means little or none.', 'NASA MODIS Terra via GIBS / Worldview'),
    gibs('veg', 'Greenness (plant cover), July 2025 (MODIS)', 'MODIS_Terra_L3_NDVI_Monthly', '2025-07-01', 'How much green plant life covers the ground. Dark green is dense vegetation, pale areas are deserts and bare ground, which are the dry places most like Mars and the Moon.', 'NASA MODIS Terra via GIBS / Worldview'),
    gibs('relief', 'Natural-colour relief (Blue Marble)', 'BlueMarble_ShadedRelief_Bathymetry', '', 'A natural-colour picture of Earth with shaded relief and sea floor.', 'NASA Blue Marble via GIBS / Worldview'),
  ],
};
fs.writeFileSync(dataFile, '// Moon/Mars targets from tools/build-data.js (team prototype). Earth sites from tools/select-sites.js + tools/build-sites.js (v2.2). Map layers from tools/set-layers.js (v2.3).\nwindow.ATLAS = ' + JSON.stringify(A) + ';\n');
console.log('layers:', Object.entries(A.rasters).map(([k, v]) => k + ' ' + v.length).join(', '));
