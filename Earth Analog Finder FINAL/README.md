# Earth Analog Finder

A website for finding places on Earth that mirror possible Moon and Mars landing or base sites, explained in plain language.
The site has three steps, shown one at a time: **1. Select a Potential Area** (pins on a Moon or Mars map), **2. Tuning** (optional sliders), and
**3. The Closest Places on Earth** (all 806 Earth land areas ranked by similarity, on a map, with what matches and where the comparison breaks down).

**Version 6 (final)** (built on 5.4.1): the "Sources & how it was built" page was reorganised into five sections (data sources as cards grouped by Earth / Moon and Mars / maps; a table of the 11 Earth scores with formula, source and grid-or-proxy tag; a step-by-step build flow; a collapsible version history; limits grouped by topic) with a jump menu and an at-a-glance row. Mars/Moon cold wording was made consistent with the data (Mars cold checked against the Mars Climate Database for every Mars target). It also states openly that the Vemaps coastline licence is unconfirmed. No score, ranking or data changed.

**Version 5.4.1** (built on 5.4): layout only. Step descriptions sit below their titles; in Step 3 the target description, stability note and map layer menu moved into the left column so the list of areas starts at the top.

**Version 5.4** (built on 5.3): layout only. Score sits beside the area name, facts panel is a 3 x 3 grid, like-for-like table fills its card, page width 1320 px. Only `css/style.css`, a footer/version line and the notes changed.

**Version 5.3** (built on 5.2): bug fixes only, no score changes. Fixed a crash in Step 3 when the Antarctic-station filter left fewer than 35 areas (map, list, headings and "Show all" button now adapt), and a sideways scroll on phone-width screens caused by the Map layer menu.

**Version 5.2** (built on 5.1): Wikidata removed. Craters now come from NASA JSC ARES's Earth Impact Database table (182 structures; one longitude typo corrected), research stations from the COMNAP Antarctic Facilities list (75 open stations; Antarctic filter only), and the lava-tube term was dropped from the caves score (basaltic volcanoes only, since no reliable global lava-tube list exists). Natural Earth and Macrostrat remain, with the reason stated on the Sources page. OpenTopoData is only a delivery service for NOAA ETOPO1; 60 points matched NOAA's own service to a median of 3 m. Scripts: `tools/build-v52.js`.

**Version 5.1** (built on 5): the small-site correction was measured instead of guessed. 36 random cells were re-scored as 1° boxes (`tools/sample_*.json`, `tools/calibrate-v51.js`, `tools/build-v51.js`). Climate (cold, dryness, ice) is identical at both scales; boxes score slightly lower on height variation, remoteness and salts, so the fitted corrections nudge small-site scores *up*, not down. Counts (volcanoes, craters, caves) could not be fitted because almost no sampled box had any. The v5 guess that boxes are "more extreme" was not supported. Small sites still show up in the top 35 more often than a random draw would (0.95 vs 0.7 per target after v5.2; 1.35 in v5.1) because they were chosen as known analogs.

**Version 5** (built on 4.1):
- Crew facilities is no longer a match feature (every target scored 100 on it, which pulled results toward Antarctic stations). It is a Step 2 filter instead: all areas / only areas with a research station / only areas without (station counts come from Wikidata).
- 16 small named sites (1° x 1° boxes, about 110 km) are ranked in the same list as the 806 cells and tagged "small site", each with a reference to a NASA, ESA, USGS, National Park Service, NASA-funded or scientific page (two are from a museum and a news page and are labelled). Mauna Kea, Kilauea, Craters of the Moon, San Francisco Volcanic Field, Haughton crater, Yungay (Atacama), Rio Tinto, Danakil (Dallol), Askja, Lanzarote, McMurdo Dry Valleys, Svalbard, Death Valley, Nordlinger Ries, Lofoten, Bletterbach. Built by `tools/build-v5.js` from `tools/small_sites_raw.json` with the same formulas as the cells (differences are listed in that script's header and on the Sources page). Small boxes score more extremely: across the 20 Moon/Mars targets they average 1.1 of the top 35 (0.7 expected) and are first for 3 of 20 targets (all McMurdo Dry Valleys).
- Step 3 facts come only from NASA POWER, NOAA ETOPO1 and the NOAA NCEI volcano database. Craters, caves, stations, playas and nearest-town distance are no longer shown as facts (they still feed some scores).
- Step 1 shows 5 sites at a time (1-5 / 6-10). Labels read "Step 1", "Step 2", "Step 3".
- A site shows a name only if it has a specific one (a Natural Earth region name, or the small site's name); otherwise its coordinates.
- The Sources page has a new "How the maps were made, and what they needed" section.

**Version 4.1** is a fix release after a reviewer's comments: stability uses 1,000 runs and keeps the noise within 0-100 (before, a 63% first-place rate could read as unstable and a different seed could flip it across the 70% line); the 14 original targets now carry a "why it is on the list" and score-basis note like the six added in v4 (`tools/source-notes-v41.js`); and the stability panel warns when most of the top 10 are neighbouring polar cells. Not changed, and still limits: one 40 km elevation line per cell, no like-for-like table for lines under 8 km, and Antarctica supplying 171 of the 806 cells. **Version 4** adds six more potential areas (10 per world), a facts panel and a NASA satellite image for every Earth area directly under the Step 3 map, a lighter Earth map, smoother animations, and corrected Mars cold values (see "What changed in V4"). **Version 3.2.2** fixes long source tags overlapping the similarity bars in the feature-by-feature list. **Version 3.2.1** ranks every Earth land area (806 cells of 5 x 5 degrees) instead of 35 pre-chosen ones, computes all 12 Earth scores from named datasets, adds a ranking-stability line, like-for-like elevation comparison, separate marking of ice sheets / permafrost / snow, new similarity bands, and corrected cold scores for two Mars targets (see "What changed in 3.2").
The page is themed per world: black and grey for the Moon, red for Mars.

Built for the NASA Space Apps Challenge.

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

### Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. Repository **Settings > Pages > Build and deployment**: source "Deploy from a branch", branch `main`, folder `/ (root)`.
3. The site goes live at `https://<user>.github.io/<repo>/`.

## What is in the folder

| Path | What it does |
| --- | --- |
| `index.html` | Page structure and all the written text (explanations, limits, sources). |
| `css/style.css` | All styling. Colors are variables at the top of the file. |
| `js/match.js` | The matching maths and the plain-language reasons. No page code, so it is easy to test. |
| `js/map.js` | Small SVG map helper shared by the Step 1 and Step 3 maps (zoom buttons, scroll-wheel zoom, drag to pan). |
| `js/app.js` | Page behaviour: the three steps, pins, layer menus, ranked list, detail panel, sliders. |
| `assets/` | Moon and Mars base maps. Optional full-map layer images go in `assets/layers/` (see below). |
| `data/data.js` | The data the site reads (targets, Earth sites, scores, coastlines). Edit this to change results. |
| `tools/build-data.js` | Script that generated the Moon and Mars part of `data/data.js` from the team's earlier prototype lists. Do not re-run it on v2.2: it would restore the old Earth sites. |
| `tools/make-grid.js`, `tools/grid.json` | Builds the 806 land cells (5 degree grid) from the coastline polygons. |
| `tools/power_cells.txt`, `tools/rough.txt` | Downloaded data: NASA POWER values per cell and terrain roughness per cell. |
| `tools/cells_dict.json`, `tools/cells_rows_1..3.txt`, `tools/cells_crater_patch.txt` | Per-cell counts gathered 14 Nov 2026: nearest town, playas, country and region, volcanoes, impact craters, lava tubes and caves, research stations, and rock-type counts. |
| `tools/profiles_1..3.txt` | One 40 km north-south elevation line per cell (11 points 4 km apart, plus relief and slope on a finer 2 km line). |
| `tools/add-targets-v4.js`, `tools/mcd_v4.json` | V4: adds the six new areas and writes the Mars Climate Database cold values. |
| `tools/cold_check.json` | Corrected cold values and their reasons for Hellas, Valles Marineris and Lacus Mortis (v3.2). |
| `tools/build-v32.js` | **Builds all 806 Earth areas and their 12 scores into `data/data.js`.** The scoring formulas are written in its header comment. |
| `tools/select-sites.js`, `tools/build-sites.js`, `tools/profiles.txt` | Old v2.2 method (35 hand-chosen areas). Kept for history, not used by v3.2. Do not run them. |

## How the matching works

Every Moon/Mars target and every Earth site has 11 scores from 0 to 100: extreme cold, dryness, rugged ground, volcanic basalt,
crater-impact geology, ice, lava tubes and caves, abrasive dust, remoteness, water-altered minerals, pale highland rock
(crew-practice facilities was the twelfth score until v4.1; v5 turned it into a filter).

```
closeness(feature) = 1 - |target score - site score| / 100
match = 100 * sum(weight * closeness) / sum(weight)
```

A target's signature features have weight 3, all others 1, and the visitor's sliders multiply those weights (0 = ignore, 3 = very important).
Bands (v3.2): **Loose 0-33, Partial 34-66, Close 67-100**. The number is a similarity, not a probability. The page also says what share of the 806 areas score lower.

"Why it matches" lists features where both scores are within 15 points and at least one is 50 or higher. "Where it breaks down" lists
features that are 35 or more points apart.

## Map layers

The layer menu above each map always offers: the surface map, a colour-by-feature view for each of the 12 features, and (Earth) measured
yearly temperature and rainfall from NASA POWER. These work offline.

Full-map layers (v2.3) are loaded live from NASA in the visitor's browser, so nothing large is stored in this folder and the page needs internet for them. A layer only appears in the menu if its image loads.

| World | Layers | Source |
| --- | --- | --- |
| Moon | Elevation, night-time temperature (Diviner, 60S-60N), slope, roughness, rock abundance | NASA Moon Trek tiles (LRO LOLA, Diviner) |
| Mars | Elevation, thermal inertia (not temperature), albedo | NASA Mars Trek tiles (MGS MOLA, TES) |
| Earth | Day and night land temperature (July 2025), elevation, snow (Jan 2025), vegetation, shaded relief | NASA GIBS / Worldview (MODIS, ASTER GDEM, Blue Marble) |

The list lives in `tools/set-layers.js` (run `node tools/set-layers.js` to rewrite `data/data.js` rasters). Check NASA's image-use and credit guidance before publishing.

## What changed in V4

1. **Ten potential areas per world.** Added 3 Moon and 3 Mars areas chosen from official lists (`tools/add-targets-v4.js`, which also documents the sources):
   - Moon, from NASA's 13 Artemis III candidate landing regions (https://svs.gsfc.nasa.gov/5013): Nobile Rim, Amundsen Rim, de Gerlache Rim. The other four polar areas were already in the app. Positions are crater centres (Nobile: USGS Gazetteer of Planetary Nomenclature; Amundsen and de Gerlache: Wikipedia entries citing the IAU names). The regions themselves are on the rims.
   - Mars, from landing sites chosen or shortlisted by NASA and ESA: Oxia Planum (ESA ExoMars landing site, https://exploration.esa.int/mars/54724-oxia-planum/), Mawrth Vallis (ESA ExoMars candidate, https://exploration.esa.int/mars/54721-mawrth-vallis), Gusev crater (NASA Spirit site, considered for Mars 2020).
   - The 12 scores of the new areas use the same scale as the existing ones and are estimates written from the facts in those sources, except Mars *cold*, which is computed. They carry a "Scores" note on the page. They have no elevation line yet, so Step 3 skips the like-for-like height table for them. Leibnitz Beta Plateau (also on NASA's list) was not added because no coordinates could be found.
2. **Mars cold values checked for all Mars targets** against the Mars Climate Database (yearly mean 2 m air temperature, 96 runs each: 12 seasons x 8 times of day; values in `tools/mcd_v4.json`). Every Mars target is colder than -50 C, so all score 100. This changes Gale (80 to 100), Jezero (67 to 100), Arcadia, Arsia Mons and Deuteronilus (80 to 100); Hellas and Valles Marineris were already corrected in 3.2.
3. **Facts panel under the map.** Selecting an Earth area shows its yearly temperature, rainfall, snow, kind of ice, average height, roughness, 40 km height range and slope, distance to the nearest town, and counts of volcanoes, craters, caves, stations and playas, each with its source. The ranked list also shows temperature, rainfall and height.
4. **Satellite image for every Earth area:** NASA Blue Marble Next Generation (2004 monthly composite, 500 m) fetched live from NASA GIBS for the area's 5 x 5 degree box (local-summer month so polar areas are lit). It needs an internet connection; if NASA does not answer, the page says so.
5. **Lighter Earth map** (step 3 only) and **smoother motion** (hover growth on titles and the brand, lift on cards and buttons, fade-in for panels, pin growth). Motion is switched off for visitors who ask their device to reduce motion.

## What changed in 3.2

1. **No more pre-chosen Earth sites.** In v2.2 the 35 Earth areas were picked because they matched the targets on four scores, and were then ranked against the same targets (circular). Now all 806 cells are ranked live and nothing is pre-selected.
2. **All 12 Earth scores are computed from data** (formulas in the header of `tools/build-v32.js`):
   - *cold*: (25 - yearly air temperature C) / 75; NASA POWER. *dryness*: log scale on rain, 100 at 0.03 mm/day or less, 0 at 6 or more; NASA POWER. *rugged terrain*: standard deviation of 9 ETOPO1 heights, 800 m or more = 100.
   - *ice*: the larger of surface ice (ice-sheet cell = 100, otherwise snow depth / 50 cm) and ground ice (permafrost likelihood from yearly air temperature: 0 at -1 C, 100 at -8 C or colder). Each area is labelled ice sheet / snow / permafrost. Permafrost is inferred from air temperature, not observed.
   - *volcanic basalt*: NOAA NCEI Volcano Location Database (Smithsonian GVP list) (basaltic types count 1, others 0.25), log scale. *impact geology*: total diameter of craters in NASA's Earth Impact Database table, log scale (v5.2). *lava tubes and caves*: half-weight basaltic volcanoes only, log scale (v5.2; the Wikidata lava-tube list was dropped). *crew facilities*: removed from the match in v5; COMNAP Antarctic stations are a filter only (v5.2).
   - *dust*: share of 9 sample points that Macrostrat maps as young loose surface units, scaled by dryness. *salts and minerals*: share of points with carbonate/clay/mudstone and evaporite/gypsum/salt rock (Macrostrat) plus playas (Natural Earth). *highland rock*: share of points with anorthosite, gabbro, norite or troctolite (Macrostrat).
   - *remoteness*: mean distance from 9 points to the nearest town of 20,000 or more (Natural Earth populated places), log scale: 0 at 30 km, 100 at 1,500 km.
3. **Stability line.** The ranking is redone 1,000 times (v4.1; 200 before) with random nudges (seeded, so repeatable): weights times 0.5 to 1.5, target scores +/-5, Earth scores +/-3 (cold, dryness, relief) or +/-5 (the rest), all clamped to 0-100 (v4.1). At 1,000 runs each percentage has a sampling error of about +/-3 points. The page shows how often the top area is first and in the top five.
4. **Like-for-like elevation comparison.** Earth lines are 40 km long with 4 km spacing; Moon and Mars lines are 1 to 330 km long with finer spacing. The page puts both on a 4 km spacing and the same window (target lines of 80 km or more are cut into 40 km windows and the median is used; lines under 8 km are reported as too short). Each chart still shows its own spacing and length.
5. **Ice kinds.** Ice sheets/glaciers, seasonal snow and permafrost are marked differently in the list, the detail panel and the ice map layer.
6. **Cold values.** Hellas and Valles Marineris were re-checked against the Mars Climate Database (see `coldWhy` in `data/data.js`). Lacus Mortis could not be verified and stays an estimate.
7. **Wording.** Similarity bands Loose 0-33, Partial 34-66, Close 67-100; "similarity" replaces "match".

## What is computed and what is estimated

- **Earth, v3.2:** all 12 scores are computed, but eight are proxies, not direct measurements: they count things that datasets happen to list (volcanoes, craters, lava tubes, research stations) or sample a rock map at 9 points. Since v5.2 stations cover Antarctica only and the crater table lists confirmed impact structures only. Values describe a whole 5 degree cell (about 550 km), not one spot.
- **Moon and Mars:** every score is a hand-assigned estimate by the team, except that the cold values use published numbers (basis marked in `data/data.js`: `coldBasis`, `coldWhy`).

### Known limits and next steps

- The similarity number is not calibrated. A random target-area pair scores about 40 to 50, and the best areas score 66 to 83; the "Close" band (67+) holds very few areas for some targets and over 200 for others (for example Arcadia and Deuteronilus, which are cold and icy).
- Moon temperature and ice scores are informed by published Diviner results but are **not yet computed from the Diviner files** on the PDS.
- Each Earth area is a whole 5 degree cell, so islands, craters, lava tubes and other small features are mostly not captured.
- Since v5.2 the caves score is purely a basaltic-volcano proxy (no lava-tube list). Highland rock (anorthosite) is near zero almost everywhere on Earth.
- Mars cold values are saturated: every Mars target colder than -50 C annual mean scores 100.
- Moon and Mars lines shorter than 8 km (the pit sites) cannot be compared like-for-like with a 4 km Earth line.
- ETOPO1, OpenTopoData, Macrostrat and Natural Earth are not among the challenge's listed sources; NASA POWER is.
- **Check before submitting:** the world coastlines in `data/data.js` were traced from a Vemaps world map. Confirm that map's license allows this use,
  or replace the coastline with a public-domain source such as Natural Earth.

## Data sources

- NASA Planetary Data System: https://pds.nasa.gov
- LRO data on the PDS Geosciences Node: https://pds-geosciences.wustl.edu/missions/lro/
- LRO Diviner: https://pds-geosciences.wustl.edu/missions/lro/diviner.htm
- NASA Earthdata Search: https://search.earthdata.nasa.gov
- NASA Worldview: https://worldview.earthdata.nasa.gov/index.html
- NASA Trek (Moon/Mars layers): https://trek.nasa.gov
- NASA Worldview / GIBS (Earth layers): https://worldview.earthdata.nasa.gov
- NASA POWER: https://power.larc.nasa.gov (Earth climate: temperature, rainfall, snow)
- NASA Artemis III candidate landing regions: https://svs.gsfc.nasa.gov/5013
- ESA Exploration, Oxia Planum and Mawrth Vallis: https://exploration.esa.int/mars/54724-oxia-planum/ and https://exploration.esa.int/mars/54721-mawrth-vallis
- USGS Gazetteer of Planetary Nomenclature: https://planetarynames.wr.usgs.gov
- NASA Blue Marble Next Generation via GIBS (satellite images): https://visibleearth.nasa.gov/collection/1484/blue-marble
- Mars Climate Database (LMD / Open University / IAA / ESA / CNES): https://www-mars.lmd.jussieu.fr/mcd_python/ (checking Mars cold values)
- NOAA NCEI Volcano Location Database (Smithsonian GVP list): https://www.ngdc.noaa.gov/hazel/view/hazards/volcano/loc-search
- NASA JSC ARES Earth Impact Database table (craters, v5.2): https://ares.jsc.nasa.gov/engagement/activities/resources/crater-comparisons/earth-impact-database.pdf
- COMNAP Antarctic Facilities (stations, v5.2; cite "COMNAP 2017"): https://github.com/PolarGeospatialCenter/comnap-antarctic-facilities
- (Wikidata was used in v3.2-v5.1 and is no longer used; older tool files still document that.)
- Natural Earth (populated places, playas, countries): https://www.naturalearthdata.com
- Macrostrat (rock units): https://macrostrat.org
- NOAA ETOPO1: https://www.ngdc.noaa.gov/mgg/global/ via OpenTopoData: https://www.opentopodata.org
- NASA Moon Trek: https://trek.nasa.gov/moon/ and Mars Trek: https://trek.nasa.gov/mars/
- LROC Pits Atlas: https://www.lroc.asu.edu/atlases/pits/1
- USGS Mars cave candidate catalog: https://astrogeology.usgs.gov/search/map/mars_global_cave_candidate_catalog_v1_cushing
- CRISM: https://crism.jhuapl.edu/
- Smithsonian Global Volcanism Program: https://volcano.si.edu/
- Earth Impact Database: http://www.passc.net/EarthImpactDatabase/
- Global Aridity Index: https://figshare.com/articles/dataset/Global_Aridity_Index_and_Potential_Evapotranspiration_ET0_Climate_Database_v2/7504448/3
- NASA analog missions: https://www.nasa.gov/analog-missions/
- Coastlines: Vemaps world map (https://www.vemaps.com), see the note above.

## How it was built

The concept, the Moon and Mars target lists and their scores are the team's. In v3.2 Claude wrote the scripts that gather the Earth data and compute the 12 scores for all 806 areas, and the area names are generated from the data (region and coordinates), not written by hand. The code in this folder (HTML, CSS, JavaScript and the data
script) was written by Claude, an AI assistant made by Anthropic, from the team's design, in line with the event's policy on AI tools.
The page uses plain HTML, CSS and JavaScript with no libraries. The map is an SVG drawn from coastline polygons.
The data lists, the measured elevation lines and the Moon/Mars base maps come from the team's earlier prototype through `tools/build-data.js`; no prototype page code was reused.
Base maps: Moon, the LROC color map from NASA's Scientific Visualization Studio (https://svs.gsfc.nasa.gov/4720/, credit "NASA's Scientific Visualization Studio", adapted from the LROC WAC mosaic by Arizona State University; made for looks, not for science); Mars, the Hubble Space Telescope map of Mars (https://science.nasa.gov/asset/hubble/mars-projection-map/, credit NASA, ESA, J. Bell and M. Wolff). The Hubble map covers about 82 degrees north to south, so the polar edges in `assets/mars.jpg` are blurred fill. Both are resized to 1440 x 720.
