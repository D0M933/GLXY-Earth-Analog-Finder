/* Earth Analog Finder: page behaviour.
 * Reads window.ATLAS (data/data.js), AtlasMatch (js/match.js) and AtlasMap (js/map.js).
 * One step is visible at a time: 1 Select a Potential Area, 2 Tuning, 3 The Closest Places on Earth.
 * The address hash records where you are, for example  #v=3&t=hw  (view 3, target Haworth). */
(function () {
  'use strict';
  var A = window.ATLAS, M = window.AtlasMatch, MAP = window.AtlasMap, mk = MAP.mk, px = MAP.px, py = MAP.py;

  // Plain-language names for the 11 match features (v5: crew facilities is now a filter, not a feature).
  var LABEL = {
    cold: 'Extreme cold', arid: 'Dryness', relief: 'Rugged ground', volc: 'Volcanic basalt rock',
    impact: 'Crater-impact geology', ice: 'Ice and frozen water', voids: 'Lava-tube terrain', dust: 'Fine, abrasive dust',
    remote: 'Remoteness', brine: 'Salts and water-altered minerals', anor: 'Pale highland rock'
  };
  var HINT = {
    cold: 'Yearly temperature', arid: 'Little or no liquid water', relief: 'Slopes and boulders', volc: 'Lava flows and cinder fields',
    impact: 'Craters and shocked rock', ice: 'Ice you could reach', voids: 'Natural underground shelter', dust: 'Ash, sand and loose soil',
    remote: 'Far from help and supplies', brine: 'Clays, sulfates and salts', anor: 'Feldspar-rich crust like the Moon\'s highlands'
  };
  A.features.forEach(function (f) { f.label = LABEL[f.key] || f.label; f.hint = HINT[f.key] || f.hint; });
  // Where each Earth score comes from (v3.2). "grid" = read from a gridded NASA/NOAA dataset; "counted" = counted from a dataset of places or rock maps (a proxy).
  var SRC = {
    cold: ['grid', 'NASA POWER air temperature'], arid: ['grid', 'NASA POWER rainfall'], relief: ['grid', 'NOAA ETOPO1 heights'], ice: ['grid', 'NASA POWER snow and air temperature'],
    volc: ['counted', 'NOAA NCEI volcano locations'], impact: ['counted', 'NASA Earth Impact Database'], voids: ['counted', 'NOAA NCEI basaltic volcanoes (where lava tubes can form)'],
    dust: ['counted', 'Macrostrat rock map, NASA POWER rainfall'], remote: ['counted', 'Natural Earth towns of 20,000+'], brine: ['counted', 'Macrostrat rock map, Natural Earth playas'],
    anor: ['counted', 'Macrostrat rock map']
  };
  var ICE = {
    glacier: ['Ice sheet or glacier', 'ik-glacier'], snow: ['Seasonal snow', 'ik-snow'], permafrost: ['Permafrost (ground ice)', 'ik-permafrost'],
    'permafrost-weak': ['Patchy permafrost', 'ik-permafrost'], none: ['Little snow or ice', 'ik-none']
  };
  var ICEIDX = A.features.map(function (f) { return f.key; }).indexOf('ice');
  var ICE_NOTE = { glacier: 'surface ice that stays all year', snow: 'seasonal snow on top of the ground', permafrost: 'ground that stays frozen (inferred from the yearly air temperature, not drilled)', 'permafrost-weak': 'ground that may be frozen in patches (inferred from the yearly air temperature)', none: 'little snow or ice' };

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var lower = function (s) { return s.charAt(0).toLowerCase() + s.slice(1); };
  var targetById = function (id) { return A.targets.filter(function (t) { return t.id === id; })[0]; };
  var nm = function (s) { return s.name || s.coord; };   // v5: a site with no specific name is shown by its coordinates only
  var subOf = function (s) { return (s.name ? s.coord + ' \u00b7 ' : '') + s.place; };
  var sizeTxt = function (s) { return s.cell.sizeDeg === 1 ? '1&deg; &times; 1&deg; box (about 110 km across)' : '5&deg; &times; 5&deg; area (about 550 km across)'; };
  var siteById = function (id) { return A.sites.filter(function (s) { return s.id === id; })[0]; };

  var TOP_N = 5, SHOWN = 10, SHOW_N = 35;   // v3.2.1: all areas are ranked and scored, but only the 35 most similar are drawn and listed
  var state = { view: '1', body: 'Moon', targetId: null, siteId: null, mult: {}, all: false, layer1: 'surface', layer3: 'match', tLine: 0, eLine: 0, page: 0, stations: 'any' };
  var rasters = { Moon: A.rasters.Moon.slice(), Mars: A.rasters.Mars.slice(), Earth: A.rasters.Earth.slice() };   // v3.1: every layer is always listed; a warning shows under the map if NASA's tiles do not load
  var layerFail = {};
  function failLayer(id) { layerFail[id] = true; Array.prototype.forEach.call(document.querySelectorAll('.rwarn[data-rid="' + id + '"]'), function (n) { n.hidden = false; }); }
  var pickMap, earthMap;
  function pool() {   // v5: crew facilities is a filter on the list of Earth areas, not one of the match features
    return A.sites.filter(function (s) { return state.stations === 'any' || (state.stations === 'with') === (s.raw.stations > 0); });
  }

  /* ---------- colour ramp for map layers (dark to bright, taken from the current theme) ---------- */
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function ramp(t) {
    t = Math.max(0, Math.min(1, t));
    var lo = rgb(cssVar('--ramp-lo')), hi = rgb(cssVar('--ramp-hi'));
    return 'rgb(' + lo.map(function (c, i) { return Math.round(c + (hi[i] - c) * t); }).join(',') + ')';
  }

  /* ---------- routing: one view at a time ---------- */
  function parseHash() {
    var o = {}; location.hash.replace(/^#/, '').split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) o[kv[0]] = decodeURIComponent(kv[1] || ''); });
    return o;
  }
  function go(v, t) { location.hash = 'v=' + v + (t || state.targetId ? '&t=' + (t || state.targetId) : ''); }

  function route() {
    var h = parseHash(), t = h.t && targetById(h.t) ? h.t : null, v = h.v || '1';
    if (t && t !== state.targetId) { state.targetId = t; state.siteId = null; state.tLine = 0; state.all = false; }
    if (t) { state.body = targetById(t).body; state.page = pageOf(t); }
    if ((v === '2' || v === '3') && !state.targetId) v = '1';
    if (['1', '2', '3', 'limits', 'sources'].indexOf(v) < 0) v = '1';
    state.view = v;
    document.documentElement.setAttribute('data-body', state.body);
    ['1', '2', '3', 'limits', 'sources'].forEach(function (k) { $('v' + k).hidden = k !== v; });
    Array.prototype.forEach.call(document.querySelectorAll('#stepper button'), function (b) {
      var s = b.getAttribute('data-step'), cur = s === v;
      b.disabled = s !== '1' && !state.targetId;
      if (cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('stepper').hidden = v === 'limits' || v === 'sources';
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === v); });
    if (v === '1') renderStep1(); else if (v === '2') renderStep2(); else if (v === '3') renderStep3();
    window.scrollTo(0, 0);
  }

  /* ---------- step 1: pick a place ---------- */
  function bodyTargets() { return A.targets.filter(function (t) { return t.body === state.body; }); }
  var PAGE_N = 5;   // v5: Step 1 shows 5 sites at a time (1-5 or 6-10)
  function pageTargets() { return bodyTargets().slice(state.page * PAGE_N, state.page * PAGE_N + PAGE_N); }
  function pageOf(id) { var i = bodyTargets().map(function (t) { return t.id; }).indexOf(id); return i < 0 ? 0 : Math.floor(i / PAGE_N); }

  function renderStep1() {
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-body') === state.body)); });
    $('pm-base').setAttribute('href', A.base[state.body]);
    fillLayerMenu1(); drawGrat($('grat1'));
    renderPager(); renderPins(); renderTargetList(); renderPicked();
    $('next1').disabled = !state.targetId;
  }

  function renderPager() {
    var n = bodyTargets().length;
    Array.prototype.forEach.call(document.querySelectorAll('#pager button'), function (b) {
      var pg = +b.getAttribute('data-page'), lo = pg * PAGE_N + 1, hi = Math.min(n, pg * PAGE_N + PAGE_N);
      b.textContent = 'Sites ' + lo + '\u2013' + hi; b.hidden = lo > n; b.setAttribute('aria-pressed', String(pg === state.page));
    });
  }

  function fillLayerMenu1() {
    var s = $('layer1'), cur = state.layer1; s.innerHTML = '';
    var g1 = el('optgroup'); g1.label = 'Map layers (live from NASA)';
    g1.appendChild(new Option('Surface map', 'surface'));
    rasters[state.body].forEach(function (r) { g1.appendChild(new Option(r.label, 'r:' + r.id)); });
    s.appendChild(g1);
    var g2 = el('optgroup'); g2.label = 'What each site scores (0 to 100)';
    A.features.forEach(function (f) { g2.appendChild(new Option(f.label, 'f:' + f.key)); });
    s.appendChild(g2);
    if (!Array.prototype.some.call(s.options, function (o) { return o.value === cur; })) cur = 'surface';
    state.layer1 = s.value = cur;
  }

  function drawGrat(g) {
    g.innerHTML = '';
    var i;
    for (i = -150; i <= 150; i += 30) mk('line', { 'class': 'grat', x1: px(i), y1: 0, x2: px(i), y2: 360 }, g);
    for (i = -60; i <= 60; i += 30) mk('line', { 'class': 'grat' + (i === 0 ? ' eq' : ''), x1: 0, y1: py(i), x2: 720, y2: py(i) }, g);
  }

  function setRaster(imgEl, list, value) {              // value like 'r:elev'
    var r = value.indexOf('r:') === 0 ? list.filter(function (x) { return 'r:' + x.id === value; })[0] : null;
    var tg = imgEl.nextElementSibling && imgEl.nextElementSibling.getAttribute('data-tiles') ? imgEl.nextElementSibling : null;
    if (!tg) { tg = mk('g', { 'data-tiles': '1', opacity: '.92' }); imgEl.parentNode.insertBefore(tg, imgEl.nextSibling); }
    var key = r ? r.id : '';
    if (tg.getAttribute('data-key') !== key) {            // rebuild only when the layer changed
      tg.setAttribute('data-key', key); while (tg.firstChild) tg.removeChild(tg.firstChild);
      if (r && r.tiles) {                                  // NASA Trek tiles: 2^(z+1) columns by 2^z rows, row 0 at the top
        var cols = Math.pow(2, r.tiles.z + 1), rows = Math.pow(2, r.tiles.z);
        for (var rw = 0; rw < rows; rw++) for (var c = 0; c < cols; c++)
          mk('image', { x: c * MAP.W / cols, y: rw * MAP.H / rows, width: MAP.W / cols + .4, height: MAP.H / rows + .4, preserveAspectRatio: 'none', href: r.tiles.base + r.tiles.z + '/' + rw + '/' + c + '.' + r.tiles.ext }, tg).addEventListener('error', function () { failLayer(r.id); });
      }
    }
    if (r && !r.tiles) { if (!imgEl._fl) { imgEl._fl = 1; imgEl.addEventListener('error', function () { if (imgEl._rid) failLayer(imgEl._rid); }); } imgEl._rid = r.id; imgEl.setAttribute('href', r.file); imgEl.setAttribute('visibility', 'visible'); } else imgEl.setAttribute('visibility', 'hidden');
    return r;
  }

  function renderPins() {
    var layer = pickMap.layer, list = pageTargets(), base = state.page * PAGE_N, L = state.layer1;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    var raster = setRaster($('pm-raster'), rasters[state.body], L);
    var fi = L.indexOf('f:') === 0 ? A.features.map(function (f) { return f.key; }).indexOf(L.slice(2)) : -1;
    // pins closer than 24 map units are fanned out upward, each with a thin leader line to its true position
    var pos = list.map(function (t) { return { t: t, x: px(t.pos[1]), y: py(t.pos[0]), ox: 0, oy: 0 }; });
    pos.forEach(function (a, i) {
      var group = pos.filter(function (b) { return Math.abs(a.x - b.x) < 24 && Math.abs(a.y - b.y) < 24; }).sort(function (b, c) { return b.x - c.x; });
      if (group.length > 1) { var k = group.indexOf(a); a.ox = (k - (group.length - 1) / 2) * 20; a.oy = -22 - (k % 2) * 14; }
    });
    pos.forEach(function (p, i) {
      var t = p.t, val = fi >= 0 ? t.f[fi] : null;
      var g = mk('g', { 'class': 'mk top' + (t.id === state.targetId ? ' sel' : ''), tabindex: 0, role: 'button',
        'aria-label': (base + i + 1) + '. ' + t.name + (val != null ? ', ' + A.features[fi].label + ' ' + val : ''), 'data-x': p.x.toFixed(1), 'data-y': p.y.toFixed(1) }, layer);
      if (p.ox || p.oy) { mk('line', { 'class': 'lead', x1: 0, y1: 0, x2: p.ox, y2: p.oy }, g); mk('circle', { 'class': 'tru', r: 2 }, g); }
      var inner = mk('g', { transform: 'translate(' + p.ox + ' ' + p.oy + ')' }, g);
      mk('circle', { 'class': 'hit', r: 14 }, inner); mk('circle', { 'class': 'ring', r: 13 }, inner);
      var dot = mk('circle', { 'class': 'dot', r: 10 }, inner);
      if (fi >= 0) dot.setAttribute('style', 'fill:' + ramp(val / 100));
      var n = mk('text', { 'class': 'num' + (fi >= 0 && val < 55 ? ' lt' : '') }, inner); n.textContent = String(fi >= 0 ? val : base + i + 1);
      var pick = function () { chooseTarget(t.id); };
      g.addEventListener('click', function (e) { e.stopPropagation(); pick(); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      g.addEventListener('mouseenter', function () { showTip('tip1', 'map1', g, t.name); });
      g.addEventListener('focus', function () { showTip('tip1', 'map1', g, t.name); });
      g.addEventListener('mouseleave', function () { $('tip1').hidden = true; }); g.addEventListener('blur', function () { $('tip1').hidden = true; });
    });
    pickMap.apply();
    // legend
    var lg = $('legend1');
    if (fi >= 0) lg.innerHTML = '<span>Each pin shows the site\'s score for <b>' + esc(A.features[fi].label) + '</b> (' + esc(A.features[fi].hint.toLowerCase()) + '). Brighter means more.</span>' + rampBar('0', '100');
    else if (raster) lg.innerHTML = '<span><b>' + esc(raster.label) + '</b>, from <a href="' + raster.url + '" target="_blank" rel="noopener">' + esc(raster.source) + '</a></span>' + rasterNote(raster);
    else lg.innerHTML = '<span>Pins are the candidate sites. Base map: ' + (state.body === 'Moon' ? 'LROC color map (NASA Scientific Visualization Studio)' : 'Hubble Mars map (NASA, ESA, J. Bell and M. Wolff; poles beyond about 82° are filled in)') + '.</span><span>Drag to move, scroll or use +/&minus; to zoom</span>';
  }

  function rasterNote(r) { return (r.note ? '<span class="rnote">' + esc(r.note) + '</span>' : rampBar(r.legend[0], r.legend[1])) + '<span class="rwarn" data-rid="' + r.id + '"' + (layerFail[r.id] ? '' : ' hidden') + '> Some of this layer could not be loaded from NASA in this browser (check your internet connection, or try again later).</span>'; }
  function rampBar(a, b) { return '<span class="rampbar"><small>' + esc(a) + '</small><i style="background:linear-gradient(90deg,' + ramp(0) + ',' + ramp(1) + ')"></i><small>' + esc(b) + '</small></span>'; }

  function showTip(tipId, boxId, g, text) {
    var tip = $(tipId), box = $(boxId).getBoundingClientRect(), r = g.getBoundingClientRect();
    tip.textContent = text; tip.hidden = false;
    tip.style.left = (r.left + r.width / 2 - box.left) + 'px'; tip.style.top = (r.top - box.top) + 'px';
  }

  function renderTargetList() {
    var ol = $('tlist'); ol.innerHTML = '';
    pageTargets().forEach(function (t, i) {
      var li = el('li'), b = el('button', 'tcard', '<span class="pin">' + (state.page * PAGE_N + i + 1) + '</span><span><b>' + esc(t.name) + '</b><small>' + esc(t.place) + '</small></span>');
      b.type = 'button'; b.setAttribute('aria-pressed', String(t.id === state.targetId));
      b.addEventListener('click', function () { chooseTarget(t.id); });
      li.appendChild(b); ol.appendChild(li);
    });
  }

  function chooseTarget(id) {
    state.targetId = id; state.siteId = null; state.tLine = 0; state.all = false;
    state.page = pageOf(id); renderPager(); renderPins(); renderTargetList(); renderPicked(); $('next1').disabled = false;
    try { history.replaceState(null, '', '#v=1&t=' + id); } catch (e) { /* ignore */ }
    var pk = $('picked'); if (window.matchMedia('(max-width: 999px)').matches) pk.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderPicked() {
    var box = $('picked'), t = state.targetId && targetById(state.targetId);
    if (!t) { box.innerHTML = '<p class="hint">Nothing selected yet. Click a pin or a name to choose your area.</p>'; return; }
    var chips = t.focus.map(function (k) { return '<span class="chip f">' + esc(LABEL[k]) + '</span>'; }).join('');
    box.innerHTML = '<span class="where">' + esc(t.body) + ' &middot; ' + esc(t.place) + '</span><h3>' + esc(t.name) + '</h3><p>' + esc(t.note) + '</p>' +
      '<div class="chips"><span class="chip">Signature features:</span>' + chips + '</div>' + (t.source ? '<p class="tsrc"><b>Why it is on the list:</b> ' + esc(t.source.why) + ' ' + (t.source.url ? '<a href="' + t.source.url + '" target="_blank" rel="noopener">' + esc(t.source.name) + '</a>' : esc(t.source.name)) + '</p>' : '') + (t.scoreNote ? '<p class="tsrc"><b>Scores:</b> ' + esc(t.scoreNote) + '</p>' : '') + '<div id="tprof"></div>';
    renderProfileBlock($('tprof'), t.profiles, state.tLine, function (i) { state.tLine = i; renderPicked(); }, t.body + ' elevation along a measured line');
  }

  /* ---------- elevation profile chart ---------- */
  function stats(p) {
    var mn = Math.min.apply(null, p.z), mx = Math.max.apply(null, p.z), s = [];
    for (var i = 1; i < p.d.length; i++) { var dd = (p.d[i] - p.d[i - 1]) * 1000; if (dd > 0) s.push(Math.atan(Math.abs(p.z[i] - p.z[i - 1]) / dd) * 180 / Math.PI); }
    s.sort(function (a, b) { return a - b; });
    var steps = []; for (var j = 1; j < p.d.length; j++) steps.push(p.d[j] - p.d[j - 1]); steps.sort(function (a, b) { return a - b; });
    return { min: mn, max: mx, relief: mx - mn, km: p.d[p.d.length - 1], slope: s.length ? s[Math.floor(s.length / 2)] : 0, step: steps.length ? steps[Math.floor(steps.length / 2)] : 0 };
  }
  function fmtKm2(k) { return k >= 1 ? (Math.round(k * 10) / 10) : k.toFixed(2); }
  function fmtKm(k) { return k >= 10 ? Math.round(k) : k.toFixed(1); }
  function profileSVG(p) {
    var W = 320, H = 130, L = 52, R = 8, T = 10, B = 24, st = stats(p), span = Math.max(st.relief, 1), pad = span * 0.08;
    var x = function (d) { return L + (d / (st.km || 1)) * (W - L - R); }, y = function (z) { return T + (1 - (z - (st.min - pad)) / (span + 2 * pad)) * (H - T - B); };
    var pts = p.d.map(function (d, i) { return x(d).toFixed(1) + ',' + y(p.z[i]).toFixed(1); }), base = (H - B).toFixed(1);
    return '<svg class="pf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Elevation from ' + st.min + ' to ' + st.max + ' metres over ' + fmtKm(st.km) + ' kilometres">' +
      '<line x1="' + L + '" y1="' + base + '" x2="' + (W - R) + '" y2="' + base + '" class="ax"/><line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + base + '" class="ax"/>' +
      '<polygon points="' + L + ',' + base + ' ' + pts.join(' ') + ' ' + (W - R) + ',' + base + '" class="ar"/><polyline points="' + pts.join(' ') + '" class="ln"/>' +
      '<text x="' + (L - 6) + '" y="' + (T + 8) + '" text-anchor="end">' + st.max + ' m</text><text x="' + (L - 6) + '" y="' + (H - B) + '" text-anchor="end">' + st.min + ' m</text>' +
      '<text x="' + L + '" y="' + (H - 6) + '">0 km</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + fmtKm(st.km) + ' km</text></svg>';
  }
  function renderProfileBlock(box, profiles, idx, onPick, title) {
    if (!profiles || !profiles.length) { box.innerHTML = '<p class="hint">No measured elevation line is available for this one yet.</p>'; return; }
    idx = Math.min(idx, profiles.length - 1);
    var p = profiles[idx], st = stats(p);
    box.innerHTML = '<h4 class="cmp-title">' + esc(title) + '</h4>';
    if (profiles.length > 1) {
      var sel = el('select', 'psel'); sel.setAttribute('aria-label', 'Choose a measured line');
      profiles.forEach(function (q, i) { sel.appendChild(new Option(q.name, i)); }); sel.value = idx;
      sel.addEventListener('change', function () { onPick(+sel.value); }); box.appendChild(sel);
    }
    var fig = el('div', 'pfwrap', profileSVG(p)); box.appendChild(fig);
    box.appendChild(el('p', 'pfnote', '<b>' + esc(p.name) + '.</b> Height range ' + st.relief + ' m over ' + fmtKm(st.km) + ' km (a point about every ' + fmtKm2(st.step) + ' km), typical slope about ' + st.slope.toFixed(1) + '&deg;. Source: ' + esc(p.src) + '.'));
  }

  /* Like-for-like comparison (v3.2). Moon and Mars lines are 1 to 330 km long with a point every few hundred metres to a few km; the Earth line is
     40 km long with a point every 4 km. To compare them fairly, both are put on the same 4 km spacing and the same window length.
     Long target lines are cut into 40 km windows and the middle (median) result is used. Target lines shorter than 8 km are too short to compare. */
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b.length ? b[Math.floor(b.length / 2)] : 0; }
  function resample(p, from, to, step) {
    var out = [], j = 0;
    for (var d = from; d <= to + 1e-9; d += step) {
      while (j < p.d.length - 2 && p.d[j + 1] < d) j++;
      var d0 = p.d[j], d1 = p.d[j + 1], u = d1 > d0 ? Math.min(1, Math.max(0, (d - d0) / (d1 - d0))) : 0;
      out.push(p.z[j] + u * (p.z[j + 1] - p.z[j]));
    }
    return out;
  }
  function relSlope(z, step) {
    var mn = Math.min.apply(null, z), mx = Math.max.apply(null, z), s = [];
    for (var i = 1; i < z.length; i++) s.push(Math.atan(Math.abs(z[i] - z[i - 1]) / (step * 1000)) * 180 / Math.PI);
    return { relief: mx - mn, slope: median(s) };
  }
  function likeForLike(tp, ep) {
    var STEP = 4, L = tp.d[tp.d.length - 1];
    if (L < 8) return { tooShort: true, km: L };
    var W = Math.min(40, Math.floor(L / STEP) * STEP), n = Math.max(1, Math.floor(L / 40)), tr = [], ts = [];
    if (L >= 80) { for (var k = 0; k < n; k++) { var r = relSlope(resample(tp, k * 40, k * 40 + 40, STEP), STEP); tr.push(r.relief); ts.push(r.slope); } }
    else { var r0 = relSlope(resample(tp, 0, W, STEP), STEP); tr.push(r0.relief); ts.push(r0.slope); }
    var ez = ep.z.slice(0, W / STEP + 1), er = relSlope(ez, STEP);
    return { W: W, windows: L >= 80 ? n : 1, t: { relief: median(tr), slope: median(ts) }, e: er };
  }
  function likeBlock(tp, ep, who) {
    var c = likeForLike(tp, ep);
    if (c.tooShort) return '<div class="lfl"><h4 class="cmp-title">Like-for-like height comparison</h4><p class="pfnote">The ' + esc(who) + ' line is only ' + fmtKm(c.km) + ' km long, too short to compare fairly with a line of 4 km spacing. Compare shapes by eye only, and note the Earth line spans 40 km.</p></div>';
    return '<div class="lfl"><h4 class="cmp-title">Like-for-like height comparison</h4><table class="lt"><thead><tr><th></th><th>' + esc(who) + ' target</th><th>This Earth area</th></tr></thead><tbody>' +
      '<tr><th>Height range over ' + c.W + ' km</th><td>' + Math.round(c.t.relief) + ' m</td><td>' + Math.round(c.e.relief) + ' m</td></tr>' +
      '<tr><th>Typical slope between points 4 km apart</th><td>' + c.t.slope.toFixed(1) + '&deg;</td><td>' + c.e.slope.toFixed(1) + '&deg;</td></tr></tbody></table>' +
      '<p class="pfnote">Both lines are put on the same 4 km spacing and the same ' + c.W + ' km window' + (c.windows > 1 ? ' (the target line is cut into ' + c.windows + ' windows of 40 km and the median is used)' : '') + ', so the numbers can be compared. The charts above show each line as measured, with its own spacing and length.</p></div>';
  }

  /* ---------- step 2: tuning ---------- */
  function renderStep2() {
    var t = targetById(state.targetId);
    $('chosen2').innerHTML = 'Your area: <b>' + esc(t.name) + '</b> <span class="chip">' + esc(t.body) + '</span>. Its signature features, marked below, count three times as much.';
    Array.prototype.forEach.call($('sliders').children, function (lab) {
      var key = lab.getAttribute('data-key'), star = lab.querySelector('.star');
      star.hidden = t.focus.indexOf(key) < 0;
    });
  }
  function buildSliders() {
    var box = $('sliders'), words = function (v) { return v === 0 ? 'ignore' : v < 1 ? 'less' : v === 1 ? 'normal' : v < 3 ? 'more' : 'very important'; };
    A.features.forEach(function (f) {
      var lab = el('label'), out = el('output', null, 'normal'), inp = el('input'), id = 'w-' + f.key;
      lab.setAttribute('data-key', f.key); lab.setAttribute('for', id);
      inp.type = 'range'; inp.min = 0; inp.max = 3; inp.step = 0.5; inp.value = 1; inp.id = id;
      lab.innerHTML = '<span>' + esc(f.label) + ' <span class="tag star" hidden>signature</span><small>' + esc(f.hint) + '</small></span>';
      lab.appendChild(out); lab.appendChild(inp);
      inp.addEventListener('input', function () { state.mult[f.key] = +inp.value; out.textContent = words(+inp.value); });
      inp._reset = function () { inp.value = 1; out.textContent = 'normal'; };
      box.appendChild(lab);
    });
    $('reset-w').addEventListener('click', function () { state.mult = {}; Array.prototype.forEach.call(box.querySelectorAll('input'), function (i) { i._reset(); }); });
  }

  /* ---------- step 3: results ---------- */
  function renderStep3() {
    var t = targetById(state.targetId);
    state.pool = pool();
    state.ranked = M.rank(A.features, t, state.pool, state.mult);
    state.stab = M.stability(A.features, t, state.pool, state.mult, { runs: 1000 });
    if (!state.siteId || !siteById(state.siteId)) state.siteId = state.ranked[0].site.id;
    var chips = t.focus.map(function (k) { return '<span class="chip f">' + esc(LABEL[k]) + '</span>'; }).join('');
    $('tpanel').innerHTML = '<span class="where">' + esc(t.body) + ' &middot; ' + esc(t.place) + '</span><h3>' + esc(t.name) + '</h3><p>' + esc(t.note) + '</p><div class="chips"><span class="chip">Signature features:</span>' + chips + '</div>';
    fillLayerMenu3(); drawGrat($('grat3'));
    renderStability(); renderMarkers(); renderList(); renderDetail();
  }

  function fillLayerMenu3() {
    var s = $('layer3'), cur = state.layer3; s.innerHTML = '';
    var g1 = el('optgroup'); g1.label = 'Match';
    g1.appendChild(new Option('Similarity to your area (top 5 numbered)', 'match')); s.appendChild(g1);
    var g2 = el('optgroup'); g2.label = 'Climate of each area (NASA POWER)';
    g2.appendChild(new Option('Yearly average temperature', 't:temp')); g2.appendChild(new Option('Rainfall', 't:rain')); s.appendChild(g2);
    if (rasters.Earth.length) { var g3 = el('optgroup'); g3.label = 'Earth maps (NASA Worldview)'; rasters.Earth.forEach(function (r) { g3.appendChild(new Option(r.label, 'r:' + r.id)); }); s.appendChild(g3); }
    var g4 = el('optgroup'); g4.label = 'What each area scores (0 to 100)';
    A.features.forEach(function (f) { g4.appendChild(new Option(f.label, 'f:' + f.key)); }); s.appendChild(g4);
    if (!Array.prototype.some.call(s.options, function (o) { return o.value === cur; })) cur = 'match';
    state.layer3 = s.value = cur;
  }

  function layerValue(site, L) {          // returns {v, t, text} for the colour layers, or null
    if (L === 't:temp') return { v: site.climate.tempC, text: site.climate.tempC + ' °C' };
    if (L === 't:rain') return { v: site.climate.rainMmDay, text: site.climate.rainMmDay + ' mm/day' };
    if (L.indexOf('f:') === 0) { var i = A.features.map(function (f) { return f.key; }).indexOf(L.slice(2)); return { v: site.f[i], text: String(site.f[i]) }; }
    return null;
  }

  function renderMarkers() {
    var layer = earthMap.layer, L = state.layer3;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    var raster = setRaster($('em-raster'), rasters.Earth, L);
    var isMatch = L === 'match', score = {};
    state.ranked.forEach(function (r) { score[r.site.id] = r.score; });
    var NS = Math.min(SHOW_N, state.ranked.length);   // v5.3: the station filter can leave fewer than 35 areas
    var shown = state.ranked.slice(0, NS).map(function (r) { return r.site; });
    var vals = shown.map(function (s) { if (isMatch) return score[s.id]; var r = layerValue(s, L); return r ? r.v : 0; }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var norm = function (v) {
      if (L === 't:rain') return (Math.log(Math.max(v, .03)) - Math.log(Math.max(lo, .03))) / ((Math.log(hi) - Math.log(Math.max(lo, .03))) || 1);
      if (L.indexOf('f:') === 0) return v / 100;
      return (v - lo) / ((hi - lo) || 1);
    };
    for (var i = NS - 1; i >= 0; i--) (function (i) {
      var r = state.ranked[i], s = r.site, top = i < TOP_N, lv = isMatch ? { v: r.score, text: Math.round(r.score) + ' similarity' } : layerValue(s, L), showTop = top && (isMatch || !raster && !lv || !!raster);
      var key = i < 10 || s.id === state.siteId;
      var g = mk('g', { 'class': 'mk' + (showTop ? ' top' : '') + (s.id === state.siteId ? ' sel' : '') + (L === 'f:ice' ? ' ' + ICE[s.iceKind][1] : ''), tabindex: key ? 0 : -1, role: 'button',
        'aria-label': (i + 1) + '. ' + nm(s) + ', similarity ' + Math.round(r.score) + (lv && !isMatch ? ', ' + lv.text : ''), 'data-x': px(s.lon).toFixed(1), 'data-y': py(s.lat).toFixed(1) }, layer);
      mk('circle', { 'class': 'hit', r: key ? 11 : 6 }, g); mk('circle', { 'class': 'ring', r: top ? 11 : 6.5 }, g);
      var dot = mk('circle', { 'class': 'dot', r: top ? 8 : 4.2 }, g);
      if (lv && !(isMatch && top)) dot.setAttribute('style', 'fill:' + ramp(norm(lv.v)));
      if (showTop && !(lv && !isMatch)) { var t = mk('text', { 'class': 'num' }, g); t.textContent = String(i + 1); }
      var tip = nm(s) + ' · ' + (lv ? lv.text : Math.round(r.score)) + (L === 'f:ice' ? ' · ' + ICE[s.iceKind][0] : '');
      g.addEventListener('click', function (e) { e.stopPropagation(); selectSite(s.id, true); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSite(s.id, true); } });
      g.addEventListener('mouseenter', function () { showTip('tip3', 'map3', g, tip); }); g.addEventListener('focus', function () { showTip('tip3', 'map3', g, tip); });
      g.addEventListener('mouseleave', function () { $('tip3').hidden = true; }); g.addEventListener('blur', function () { $('tip3').hidden = true; });
    })(i);
    earthMap.apply();
    var lg = $('legend3');
    if (isMatch) lg.innerHTML = '<span><i class="lgdot"></i>Top 5 (numbered). ' + (state.pool.length > SHOW_N ? 'The ' + SHOW_N + ' most similar of ' + state.pool.length + ' ranked areas are shown' : 'All ' + state.pool.length + ' ranked areas are shown') + '; the colour shows similarity.</span>' + rampBar(Math.round(lo) + ' (least similar)', Math.round(hi) + ' (most similar)') + '<span>Drag to move, scroll or use +/&minus; to zoom</span>';
    else if (raster) lg.innerHTML = '<span><b>' + esc(raster.label) + '</b>, from <a href="' + raster.url + '" target="_blank" rel="noopener">' + esc(raster.source) + '</a></span>' + rasterNote(raster);
    else if (L === 't:temp') lg.innerHTML = '<span>Yearly average air temperature, NASA POWER (MERRA-2, 2001 to 2025)</span>' + rampBar(lo.toFixed(0) + ' °C', hi.toFixed(0) + ' °C');
    else if (L === 't:rain') lg.innerHTML = '<span>Rainfall, NASA POWER (log scale)</span>' + rampBar(lo + ' mm/day', hi + ' mm/day');
    else {
      var f = A.features[A.features.map(function (q) { return q.key; }).indexOf(L.slice(2))];
      lg.innerHTML = '<span>Score for <b>' + esc(f.label) + '</b> (' + esc(SRC[f.key][1]) + '). Brighter means more.</span>' + rampBar('0', '100') +
        (f.key === 'ice' ? '<span class="icekey"><i class="ik ik-glacier"></i>Ice sheet or glacier <i class="ik ik-snow"></i>Seasonal snow <i class="ik ik-permafrost"></i>Permafrost (ground ice, inferred from temperature)</span>' : '');
    }
  }

  function pct(n) { return Math.round(100 * (n || 0) / state.stab.runs); }
  function renderList() {
    var ol = $('rank'); ol.innerHTML = '';
    var NS = Math.min(SHOW_N, state.ranked.length), n = state.all ? NS : Math.min(SHOWN, NS);
    state.ranked.slice(0, n).forEach(function (r, i) {
      var li = el('li'), b = el('button', 'rk' + (i < TOP_N ? ' top' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', String(r.site.id === state.siteId));
      var ik = r.site.iceKind !== 'none' && r.site.f[ICEIDX] >= 25 ? ' <span class="ikc ' + ICE[r.site.iceKind][1] + '">' + esc(ICE[r.site.iceKind][0]) + '</span>' : '';
      b.innerHTML = '<span class="no">' + (i + 1) + '</span><b>' + esc(nm(r.site)) + '</b><small>' + esc(subOf(r.site)) + (r.site.small ? ' <span class="ikc ik-small">small site</span>' : '') + ik + '<br>' + r.site.climate.tempC + ' °C · ' + r.site.climate.rainMmDay + ' mm/day · ' + fmtN(r.site.cell.elevationM) + ' m high' + (i < 10 ? '<br>top 5 in ' + pct(state.stab.top5[r.site.id]) + '% of re-rankings' : '') + '</small>' +
        '<span class="sc"><strong>' + Math.round(r.score) + '</strong><span>' + M.verdict(r.score) + '</span></span>';
      b.addEventListener('click', function () { selectSite(r.site.id, true); });
      li.appendChild(b); ol.appendChild(li);
    });
    $('rank-h').textContent = NS < SHOW_N ? 'All ' + NS + ' ranked Earth areas' : 'The ' + NS + ' most similar Earth areas';   // v5.3
    var more = $('more'); more.hidden = NS <= SHOWN;
    more.textContent = state.all ? 'Show fewer' : 'Show all ' + NS + ' areas';
  }

  function polarNote() {   // many top areas in the polar caps are neighbouring cells with almost the same climate
    var n = state.ranked.slice(0, 10).filter(function (r) { return Math.abs(r.site.lat) >= 65; }).length;
    return n >= 6 ? ' <b>Note:</b> ' + n + ' of the top 10 are polar cells (65&deg; or more from the equator). Neighbouring polar cells have almost the same climate, so they count as one region, not ten separate places.' : '';
  }
  function renderStability() {
    var st = state.stab, top = state.ranked[0].site, p1 = pct(st.first[top.id]), p5 = pct(st.top5[top.id]);
    var word = p1 >= 70 ? 'Stable' : p1 >= 40 ? 'Fairly stable' : 'Not stable';
    var tail = p1 >= 70 ? 'The top spot holds up.' : p1 >= 40 ? 'The top few can swap places, so read the first few results as a group.' : 'Treat the top five as a group, not as a strict order.';
    $('stab').innerHTML = '<b>How stable is this ranking? ' + word + '.</b> We re-ranked all ' + state.pool.length + ' areas ' + st.runs + ' times, each time nudging the weights (up to &plusmn;50%), the target scores (&plusmn;5) and the Earth scores (&plusmn;3 for the climate and height grids, &plusmn;5 for the rest). <b>' + esc(nm(top)) + '</b> came first in ' + p1 + '% of the runs and stayed in the top 5 in ' + p5 + '%. ' + tail + ' Each percentage is itself uncertain by about &plusmn;3 points.' + polarNote();
  }

  /* ---------- site facts under the map + satellite image (v4) ---------- */
  var GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_NextGeneration&STYLES=&CRS=EPSG:4326&FORMAT=image/jpeg&WIDTH=480&HEIGHT=480&TIME=';
  function satUrl(s) {   // NASA Blue Marble Next Generation (monthly 2004 composite, 500 m); the month is the local summer so polar areas are lit
    var h = s.cell.sizeDeg / 2 + (s.cell.sizeDeg === 1 ? 0.25 : 0), bbox = [s.lat - h, s.lon - h, s.lat + h, s.lon + h].join(',');
    return GIBS + (s.lat < 0 ? '2004-01-01' : '2004-07-01') + '&BBOX=' + bbox;
  }
  function fmtN(n) { return Math.round(n).toLocaleString('en-US'); }
  function factTiles(s) {
    var r = s.raw, z = s.profile.z, hi = Math.max.apply(null, z), lo = Math.min.apply(null, z);
    return [
      ['Yearly air temperature', s.climate.tempC + ' °C', 'NASA POWER'],
      ['Rainfall', s.climate.rainMmDay + ' mm/day', 'NASA POWER'],
      ['Snow', s.cell.snowDepthCm == null ? 'Ice sheet' : s.cell.snowDepthCm + ' cm deep', 'NASA POWER'],
      ['Kind of ice', ICE[s.iceKind][0], 'worked out from NASA POWER snow and temperature'],
      ['Average height', fmtN(s.cell.elevationM) + ' m', s.cell.sizeDeg === 1 ? 'NOAA ETOPO1, mean of 9 points' : 'NASA POWER (MERRA-2) cell height'],
      ['Terrain roughness', fmtN(s.cell.roughnessM) + ' m', 'NOAA ETOPO1, spread of 9 heights'],
      ['Height range, 40 km line', fmtN(hi - lo) + ' m', 'NOAA ETOPO1, north-south line'],
      ['Typical slope', s.profile.slope2kmDeg.toFixed(1) + '°', 'NOAA ETOPO1, along that line'],
      ['Volcanoes', fmtN(r.volcBasaltic + r.volcOther), r.volcBasaltic + ' basaltic, NOAA NCEI volcano database']
    ];
  }
  function renderFacts(s) {
    var box = $('facts');
    box.innerHTML = '<div class="fx-img"><img alt="Satellite image of the area around ' + esc(nm(s)) + '" width="240" height="240"><small>NASA Blue Marble satellite image of this whole ' + sizeTxt(s) + '. <a href="https://visibleearth.nasa.gov/collection/1484/blue-marble" target="_blank" rel="noopener">Credit: NASA Earth Observatory</a></small></div>' +
      '<div class="fx-main"><h4 class="cmp-title">Facts for ' + esc(nm(s)) + '</h4><div class="fx-grid">' +
      factTiles(s).map(function (t) { return '<div class="fx"><span>' + esc(t[0]) + '</span><b>' + esc(t[1]) + '</b><small>' + esc(t[2]) + '</small></div>'; }).join('') + '</div></div>';
    var im = box.querySelector('img');
    im.addEventListener('error', function () { im.replaceWith(el('div', 'fx-miss', 'The satellite image could not be loaded from NASA (check your connection, or try again later).')); });
    im.addEventListener('load', function () { im.classList.add('in'); });
    im.src = satUrl(s);
  }

  function selectSite(id, scroll) {
    state.siteId = id; state.eLine = 0; renderMarkers(); renderList(); renderDetail();
    if (scroll && window.matchMedia('(max-width: 999px)').matches) $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderDetail() {
    var t = targetById(state.targetId), s = siteById(state.siteId);
    var rk = state.ranked.filter(function (r) { return r.site.id === s.id; })[0];
    var w = M.weights(A.features, t, state.mult), ex = M.explain(A.features, t, s, w);
    var rankNo = state.ranked.indexOf(rk) + 1, who = t.body;
    var yes = ex.matches.slice(0, 4).map(function (m) {
      return '<li><b>' + esc(m.label) + ':</b> both score ' + (m.t >= 70 && m.s >= 70 ? 'high' : 'similar') + ' (' + m.t + ' and ' + m.s + ').</li>';
    }).join('') || '<li>No feature lines up closely, so treat this as a loose match.</li>';
    var no = ex.differs.slice(0, 4).map(function (d) {
      var l = lower(d.label);
      return '<li>' + (d.targetHigher ? 'The ' + who + ' target has far more <b>' + l + '</b> than this site (' + d.t + ' vs ' + d.s + ').'
        : 'This site has far more <b>' + l + '</b> than the ' + who + ' target (' + d.s + ' vs ' + d.t + ').') + '</li>';
    }).join('') || '<li>No big gaps on any single feature.</li>';

    var d = $('detail');
    renderFacts(s);
    d.innerHTML = '<div class="dhead"><div><h3>' + esc(nm(s)) + '</h3><p class="sub">' + esc(subOf(s)) + (s.small ? ' &middot; small named site' : '') + ' &middot; rank #' + rankNo + ' of ' + state.ranked.length + ' for ' + esc(t.name) + '</p></div>' +
      '<div class="big"><strong>' + Math.round(rk.score) + '</strong><span>' + M.verdict(rk.score) + ' similarity (out of 100)</span><small>' + M.percentile(state.ranked, rk.score) + '% of the ' + state.ranked.length + ' areas are less similar. Loose 0&ndash;33, Partial 34&ndash;66, Close 67&ndash;100.</small></div></div>' +
      '<p>' + esc(s.note) + '</p>' +
      (s.fRaw ? '<p class="tsrc"><b>Calibrated box scores (v5.1):</b> ' + (function () { var d = []; A.features.forEach(function (f, i) { if (s.fRaw[i] !== s.f[i]) d.push(esc(f.label) + ' ' + s.fRaw[i] + ' &rarr; ' + s.f[i]); }); return d.length ? d.join(', ') + '. ' : 'no feature changed. '; })() + 'The score is the box value corrected by what we measured on 36 sampled cells (see Sources).</p>' : '') +
      (s.why ? '<p class="tsrc"><b>Why it is on the list:</b> ' + esc(s.why.text) + ' <a href="' + s.why.url + '" target="_blank" rel="noopener">' + esc(s.why.name) + '</a></p>' : '') +
      '<div class="why"><div class="yes"><h4>Why it matches</h4><ul>' + yes + '</ul></div><div class="no"><h4>Where it breaks down</h4><ul>' + no + '</ul></div></div>' +
      '<p class="clim"><b>Computed for this area:</b> yearly average air temperature ' + s.climate.tempC + ' &deg;C, rainfall ' + s.climate.rainMmDay + ' mm a day, average height ' + s.cell.elevationM + ' m. Ice: <span class="ikc ' + ICE[s.iceKind][1] + '">' + esc(ICE[s.iceKind][0]) + '</span> (' + ICE_NOTE[s.iceKind] + '). These describe a whole ' + sizeTxt(s) + ' around the dot, not one spot. All eleven scores are computed from named datasets (see Sources); seven of them are proxies, such as counts of mapped volcanoes or craters, not direct measurements.</p>' +
      '<p class="clim stbline">In ' + state.stab.runs + ' re-rankings with small random changes, this area was first ' + pct(state.stab.first[s.id]) + '% of the time and in the top 5 ' + pct(state.stab.top5[s.id]) + '% of the time.</p>' +
      '<h4 class="cmp-title">Feature by feature</h4>' +
      '<div class="key"><span><span class="d"></span>' + esc(t.body) + ' target</span><span><span class="c"></span>This Earth site</span><span>Numbers: target / this site. A shorter grey bar means a closer match.</span></div>';
    var cmp = el('div', 'cmp');
    A.features.forEach(function (f, i) {
      var a = t.f[i], b = s.f[i], lo = Math.min(a, b), hi = Math.max(a, b), starred = t.focus.indexOf(f.key) >= 0, r = el('div', 'row');
      r.innerHTML = '<div class="nm">' + esc(f.label) + (starred ? ' <span class="tag">signature</span>' : '') +
        (' <span class="tag' + (SRC[f.key][0] === 'counted' ? ' est' : '') + '">Earth: ' + (SRC[f.key][0] === 'counted' ? 'counted' : 'grid') + ' &middot; ' + esc(SRC[f.key][1]) + '</span>') + (f.key === 'ice' ? ' <span class="ikc ' + ICE[s.iceKind][1] + '">' + esc(ICE[s.iceKind][0]) + '</span>' : '') + '<small>' + esc(f.hint) + '</small></div>' +
        '<div class="tr" role="img" aria-label="' + esc(f.label) + ': ' + esc(t.body) + ' target ' + a + ', this site ' + b + '">' +
        '<span class="gapbar" style="left:' + lo + '%;width:' + (hi - lo) + '%"></span><span class="pt t" style="left:' + a + '%"></span><span class="pt e" style="left:' + b + '%"></span></div>' +
        '<div class="vals"><b>' + a + '</b> / <b>' + b + '</b></div>';
      cmp.appendChild(r);
    });
    d.appendChild(cmp);
    // elevation: each line as measured, then a like-for-like comparison (same spacing and window)
    var eprof = [{ name: 'North-south line through the middle of the area', src: 'NOAA ETOPO1, via OpenTopoData', d: s.profile.z.map(function (_, i) { return i * s.profile.spacingKm; }), z: s.profile.z }];
    var pr = el('div', 'profiles'); d.appendChild(pr);
    var a = el('div'), b = el('div'); pr.appendChild(a); pr.appendChild(b);
    renderProfileBlock(a, t.profiles, state.tLine, function (i) { state.tLine = i; renderDetail(); }, t.body + ' target: elevation line, as measured');
    renderProfileBlock(b, eprof, 0, function () {}, 'This Earth area: elevation line, as measured');
    var tp = t.profiles && t.profiles[Math.min(state.tLine, t.profiles.length - 1)];
    if (tp) d.insertAdjacentHTML('beforeend', likeBlock(tp, eprof[0], t.body));
    d.appendChild(el('p', 'pfnote', 'Heights are measured from each world\'s own reference level. The Moon and Mars lines have finer spacing than the 4 km Earth line, so only the like-for-like table above compares them directly.'));
  }

  /* ---------- start ---------- */
  // Each layer is probed by loading one small tile. NASA sometimes drops a request when ten arrive at once,
  // so a failed probe is retried (v3.1) and also retried each time the person switches world.
  var probing = {};
  function probeOne(body, r, tries) {
    if (rasters[body].indexOf(r) >= 0 || probing[body + r.id]) return;
    probing[body + r.id] = true;
    var im = new Image();
    im.onload = function () {
      probing[body + r.id] = false;
      if (rasters[body].indexOf(r) >= 0) return;
      rasters[body].push(r); rasters[body].sort(function (p, q) { return A.rasters[body].indexOf(p) - A.rasters[body].indexOf(q); });
      if (state.view === '1' && state.body === body) fillLayerMenu1();
      if (state.view === '3' && body === 'Earth') fillLayerMenu3();
    };
    im.onerror = function () {
      probing[body + r.id] = false;
      if (tries > 0) setTimeout(function () { probeOne(body, r, tries - 1); }, 1500 * (4 - tries));
    };
    im.src = r.file;
  }
  function probeRasters(only) {
    ['Moon', 'Mars', 'Earth'].forEach(function (body) {
      if (only && only !== body) return;
      A.rasters[body].forEach(function (r) { probeOne(body, r, 3); });
    });
  }

  function init() {
    // step 1 map
    var g1 = $('markers1');
    pickMap = MAP.create({ svg: $('svg1'), markerLayer: g1, zin: $('zin1'), zout: $('zout1'), zreset: $('zreset1') });
    // step 3 map
    var ring = function (r) { return 'M' + r.map(function (p) { return px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1); }).join('L') + 'Z'; };
    $('land3').setAttribute('d', A.land.map(ring).join('')); $('lake3').setAttribute('d', A.seas.map(ring).join(''));
    earthMap = MAP.create({ svg: $('svg3'), markerLayer: $('markers3'), zin: $('zin3'), zout: $('zout3'), zreset: $('zreset3') });
    buildSliders();

    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) {
      b.addEventListener('click', function () {
        state.body = b.getAttribute('data-body'); state.page = 0;
        if (state.targetId && targetById(state.targetId).body !== state.body) { state.targetId = null; state.siteId = null; }
        document.documentElement.setAttribute('data-body', state.body);
        try { history.replaceState(null, '', '#v=1'); } catch (e) { /* ignore */ }
        renderStep1(); $('stepper').querySelectorAll('button').forEach(function (x) { x.disabled = x.getAttribute('data-step') !== '1' && !state.targetId; });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#pager button'), function (b) {
      b.addEventListener('click', function () { state.page = +b.getAttribute('data-page'); renderPager(); renderPins(); renderTargetList(); });
    });
    $('stfilter').addEventListener('change', function (e) { state.stations = e.target.value; });
    $('layer1').addEventListener('change', function (e) { state.layer1 = e.target.value; renderPins(); });
    $('layer3').addEventListener('change', function (e) { state.layer3 = e.target.value; renderMarkers(); });
    Array.prototype.forEach.call(document.querySelectorAll('#stepper button'), function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-step')); }); });
    $('next1').addEventListener('click', function () { go('2'); });
    $('back2').addEventListener('click', function () { go('1'); });
    $('next2').addEventListener('click', function () { state.siteId = null; go('3'); });
    $('back3').addEventListener('click', function () { go('2'); });
    $('again').addEventListener('click', function () { state.targetId = null; state.siteId = null; state.mult = {}; Array.prototype.forEach.call($('sliders').querySelectorAll('input'), function (i) { i._reset(); }); location.hash = 'v=1'; });
    $('more').addEventListener('click', function () { state.all = !state.all; renderList(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-jump]'), function (b) { b.addEventListener('click', function () { var t = $(b.getAttribute('data-jump')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });   // v6: jump menu on the Sources page
    window.addEventListener('hashchange', route);
    route();
  }
  init();
})();
