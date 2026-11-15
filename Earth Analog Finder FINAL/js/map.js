/* Small SVG map helper shared by the target map (step 1) and the Earth map (step 3).
 * Equirectangular: x = (longitude + 180) * 2, y = (90 - latitude) * 2, so the whole world is 720 x 360 units.
 * Provides zoom (buttons + wheel) and drag-to-pan by changing the SVG viewBox.
 * Markers live in a layer of <g> elements carrying data-x / data-y; they are scaled so they keep a constant size on screen. */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', W = 720, H = 360;
  var px = function (lon) { return (lon + 180) * 2; };
  var py = function (lat) { return (90 - lat) * 2; };

  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function create(o) {            // o: { svg, markerLayer, zin, zout, zreset }
    var svg = o.svg, layer = o.markerLayer, view = { x: 0, y: 0, w: W };

    function apply() {
      view.w = Math.max(60, Math.min(W, view.w));
      var h = view.w / 2;
      view.x = Math.max(0, Math.min(W - view.w, view.x));
      view.y = Math.max(0, Math.min(H - h, view.y));
      svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + h);
      var k = 1.25 * Math.max(view.w / W, 0.16);
      Array.prototype.forEach.call(layer.children, function (g) {
        g.setAttribute('transform', 'translate(' + g.getAttribute('data-x') + ' ' + g.getAttribute('data-y') + ') scale(' + k + ')');
      });
    }
    function zoomAt(f, cx, cy) {   // cx, cy: fractions (0 to 1) of the visible map
      var nw = Math.max(60, Math.min(W, view.w * f)), nh = nw / 2, h = view.w / 2;
      view.x += (view.w - nw) * cx; view.y += (h - nh) * cy; view.w = nw; apply();
    }
    o.zin.addEventListener('click', function () { zoomAt(0.6, 0.5, 0.5); });
    o.zout.addEventListener('click', function () { zoomAt(1 / 0.6, 0.5, 0.5); });
    o.zreset.addEventListener('click', function () { view.x = 0; view.y = 0; view.w = W; apply(); });
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var b = svg.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 0.85 : 1 / 0.85, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
    }, { passive: false });
    var drag = null;
    svg.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.mk')) return;
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      svg.classList.add('drag'); svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var s = view.w / svg.getBoundingClientRect().width;
      view.x = drag.vx - (e.clientX - drag.x) * s; view.y = drag.vy - (e.clientY - drag.y) * s; apply();
    });
    var end = function () { drag = null; svg.classList.remove('drag'); };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);

    apply();
    return { apply: apply, layer: layer, svg: svg };
  }

  root.AtlasMap = { create: create, mk: mk, px: px, py: py, W: W, H: H };
})(window);
