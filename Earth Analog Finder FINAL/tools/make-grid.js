// Builds the candidate pool: a regular 5-degree grid of cell centres, kept only where the cell centre is on land
// (coastline polygons in data/data.js, lakes removed). The pool is generic on purpose: no place is hand-picked.
// Usage: node tools/make-grid.js > tools/grid.json
global.window = {}; require('../data/data.js'); const A = window.ATLAS;
const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const land = (lat, lon) => A.land.some(r => inRing(lon, lat, r)) && !A.seas.some(r => inRing(lon, lat, r));
const pts = [];
for (let lat = -82.5; lat <= 82.5; lat += 5) for (let lon = -177.5; lon <= 177.5; lon += 5) if (land(lat, lon)) pts.push([lat, lon]);
console.log(JSON.stringify(pts));
