(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;

  // Radio horizon, as on the slide: d = c·√h km with h in metres; c = 3.57 (geometric) or 4.12 (with refraction).
  // The constant fixes an effective Earth radius R = 500·c² km (3.57 → 6,372 km; 4.12 → 8,487 km ≈ 4/3 × 6,371).
  function horizon(c, hm) { return c * Math.sqrt(Math.max(0, hm)); }
  function link(c, h1, h2, d) {
    var d1 = horizon(c, h1), d2 = horizon(c, h2), dmax = d1 + d2, R = 500 * c * c;
    // check by geometry, not by the formula: is the straight line above the Earth's bulge everywhere?
    var clear = true, minGap = Infinity;
    for (var i = 0; i <= 2000; i++) {
      var x = d * i / 2000, bulge = x * (d - x) / (2 * R) * 1000, line = h1 + (h2 - h1) * (d ? x / d : 0);
      minGap = Math.min(minGap, line - bulge); if (line - bulge < -1e-6) clear = false;
    }
    return { d1: d1, d2: d2, dmax: dmax, R: R, visible: d <= dmax + 1e-9, clearGeom: clear, minGap: minGap };
  }
  var PRE = {
    t100: { h1: 100, h2: 100, d: 71, c: 3.57 },
    phone: { h1: 1.5, h2: 30, d: 23.5, c: 3.57 },
    t25: { h1: 25, h2: 25, d: 35.5, c: 3.57 }
  };

  D.register('towers', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.t100));
    var cv = D.canvas(1080, 836), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' }), verdict = h('div', { cls: 'w-verdict' });
    var h1Sl = D.slider('Antenna 1 height h₁', 0, 300, 0.5, st.h1, function (v) { return fmtN(v, 1) + ' m'; }, function (v) { st.h1 = v; changed(); });
    var h2Sl = D.slider('Antenna 2 height h₂', 0, 300, 0.5, st.h2, function (v) { return fmtN(v, 1) + ' m'; }, function (v) { st.h2 = v; changed(); });
    var dSl = D.slider('Distance between them d', 0, 150, 0.5, st.d, function (v) { return fmtN(v, 1) + ' km'; }, function (v) { st.d = v; changed(); });
    var kSeg = D.seg([['3.57', '3.57 (slide)'], ['4.12', '4.12 (refraction)']], '3.57', function (k) { st.c = +k; draw(); });
    var pre = D.seg([['t100', '100 m + 100 m'], ['phone', '1.5 m + 30 m'], ['t25', '25 m + 25 m']], 't100', function (k) {
      st = JSON.parse(JSON.stringify(PRE[k])); h1Sl.set(st.h1); h2Sl.set(st.h2); dSl.set(st.d); kSeg.set(String(st.c)); draw();
    });
    var x4 = D.btn('Height × 4', function () { st.h1 = Math.min(300, st.h1 * 4); st.h2 = Math.min(300, st.h2 * 4); h1Sl.set(st.h1); h2Sl.set(st.h2); changed(); });
    var atMax = D.btn('Put d at the limit', function () { var L = link(st.c, st.h1, st.h2, st.d); st.d = Math.min(150, Math.round(L.dmax * 10) / 10); dSl.set(st.d); changed(); });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Slide examples (heights)' }), pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:4px 20px 10px' }, [h1Sl.el, h2Sl.el, dSl.el, h('div', { cls: 'w-btns' }, [x4, atMax])]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:10px 18px' }, [h('div', { cls: 'w-btns' }, [kSeg.el]), form]), verdict])]));
    function changed() { pre.set(''); draw(); }

    function draw() {
      var L = link(st.c, st.h1, st.h2, st.d), g = cv.g, W = cv.w, H = cv.h;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      // scales: x in km along the ground, y in metres; Earth drawn as the parabola y = -(x - X0)^2/(2R)
      var X0 = st.d / 2, xa = X0 - 80, xb = X0 + 80, R = L.R, px0 = 20, px1 = W - 20, sx = (px1 - px0) / (xb - xa);
      var yTop = 310, yBot = -515, py0 = 150, py1 = H - 50, sy = (py1 - py0) / (yTop - yBot);
      var X = function (x) { return px0 + (x - xa) * sx; }, Y = function (m) { return py0 + (yTop - m) * sy; };
      var G = function (x) { return -Math.pow(x - X0, 2) / (2 * R) * 1000; };
      // sky / earth
      g.fillStyle = '#e9f1f9'; g.fillRect(1, 1, W - 2, H - 2);
      g.beginPath(); g.moveTo(X(xa), Y(G(xa)));
      for (var x = xa; x <= xb + 0.01; x += 0.5) g.lineTo(X(x), Y(G(x)));
      g.lineTo(X(xb), H); g.lineTo(X(xa), H); g.closePath(); g.fillStyle = '#d9e4cf'; g.fill();
      g.strokeStyle = C.green; g.lineWidth = 3; g.beginPath();
      for (x = xa; x <= xb + 0.01; x += 0.5) { if (x === xa) g.moveTo(X(x), Y(G(x))); else g.lineTo(X(x), Y(G(x))); }
      g.stroke();
      // distance ticks along the ground
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      for (var t = Math.max(0, Math.ceil(xa / 25) * 25); t <= xb - 4; t += 25) { var yy = Y(G(t)); g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(X(t), yy); g.lineTo(X(t), yy + 10); g.stroke(); g.fillText((t < 0 ? '−' + (-t) : t) + (t === 0 ? ' km' : ''), X(t), yy + 32); }
      // antennas
      var A1 = { x: 0, g: G(0) }, A2 = { x: st.d, g: G(st.d) };
      function tower(A, hm, lab, col) {
        var xb_ = X(A.x), y0 = Y(A.g), y1 = Y(A.g + hm);
        g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.moveTo(xb_, y0); g.lineTo(xb_, y1); g.stroke();
        g.fillStyle = col; g.beginPath(); g.arc(xb_, y1, 8, 0, 2 * Math.PI); g.fill();
        return y1;
      }
      var yA1 = tower(A1, st.h1, 'h₁', C.navy), yA2 = tower(A2, st.h2, 'h₂', C.blue);
      // horizon tangent rays (dashed) from each antenna to its horizon point
      function tangentPt(A, hm, dist, dir) { return { x: A.x + dir * dist, y: G(A.x + dir * dist) }; }
      var T1 = tangentPt(A1, st.h1, L.d1, 1), T2 = tangentPt(A2, st.h2, L.d2, -1);
      g.setLineDash([10, 8]); g.lineWidth = 2.5;
      g.strokeStyle = C.navy; g.beginPath(); g.moveTo(X(A1.x), yA1); g.lineTo(X(T1.x), Y(T1.y)); g.stroke();
      g.strokeStyle = C.blue; g.beginPath(); g.moveTo(X(A2.x), yA2); g.lineTo(X(T2.x), Y(T2.y)); g.stroke();
      g.setLineDash([]);
      [[T1, C.navy], [T2, C.blue]].forEach(function (p) { if (p[0].x >= xa && p[0].x <= xb) { g.fillStyle = p[1]; g.beginPath(); g.arc(X(p[0].x), Y(p[0].y), 7, 0, 2 * Math.PI); g.fill(); } });
      // line of sight
      g.strokeStyle = L.visible ? C.green : C.red; g.lineWidth = 5; g.beginPath(); g.moveTo(X(A1.x), yA1); g.lineTo(X(A2.x), yA2); g.stroke();
      if (!L.visible) { // mark where the beam enters the ground
        // bulge above the chord minus the beam height: mark its worst point
        var xm = st.d / 2, xx, worst = -Infinity; for (var i = 0; i <= 400; i++) { xx = st.d * i / 400; var gap = xx * (st.d - xx) / (2 * R) * 1000 - (st.h1 + (st.h2 - st.h1) * xx / st.d); if (gap > worst) { worst = gap; xm = xx; } }
        var yl = yA1 + (yA2 - yA1) * xm / st.d;
        g.strokeStyle = C.red; g.lineWidth = 5; var cx = X(xm), r = 16; g.beginPath(); g.moveTo(cx - r, yl - r); g.lineTo(cx + r, yl + r); g.moveTo(cx + r, yl - r); g.lineTo(cx - r, yl + r); g.stroke();
        g.font = '600 22px ' + SANS; g.fillStyle = C.red; g.textAlign = 'center'; g.fillText('blocked by the Earth\'s bulge', cx, Math.min(yl, Y(G(xm))) - 26);
      }
      // labels at antennas
      function tag(text, x, y, left, col) {
        g.font = '600 22px ' + SANS; var tw = g.measureText(text).width, x0 = left ? x - 14 - tw : x + 14;
        g.fillStyle = 'rgba(233,241,249,0.92)'; g.fillRect(x0 - 6, y - 24, tw + 12, 32);
        g.fillStyle = col; g.textAlign = 'left'; g.fillText(text, x0, y);
      }
      tag('h₁ = ' + fmtN(st.h1, 1) + ' m', X(A1.x), yA1 - 16, X(A1.x) > 220, C.navy);
      tag('h₂ = ' + fmtN(st.h2, 1) + ' m', X(A2.x), yA2 - 16, X(A2.x) > W - 220, C.blue);
      // horizon distance labels under the tangent points
      g.font = '600 22px ' + SANS; g.textAlign = 'left';
      g.fillStyle = C.navy; g.beginPath(); g.arc(30, 72, 7, 0, 2 * Math.PI); g.fill(); g.fillText('d₁ = ' + fmtN(L.d1, 1) + ' km: horizon of antenna 1', 46, 80);
      g.fillStyle = C.blue; g.beginPath(); g.arc(30, 106, 7, 0, 2 * Math.PI); g.fill(); g.fillText('d₂ = ' + fmtN(L.d2, 1) + ' km: horizon of antenna 2', 46, 114);
      g.font = '500 20px ' + SANS;
      // header text inside the canvas
      g.textAlign = 'left'; g.font = '600 24px ' + SANS; g.fillStyle = C.navy;
      g.fillText('Two antennas over the curved Earth (side view)', 20, 34);
      var exag = Math.round((sy * 1000) / sx);
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'right';
      g.fillText('heights exaggerated about ' + exag + ' × vs distance', W - 20, 34);
      g.textAlign = 'left';
      g.fillText('dashed: each antenna\'s view grazing the horizon · Earth radius used ' + fmtN(Math.round(R), 0) + ' km', 20, H - 18);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);

      var s1 = Math.sqrt(st.h1), s2 = Math.sqrt(st.h2), cs = fmtN(st.c, 2);
      form.innerHTML = 'd₁ = ' + cs + '√' + fmtN(st.h1, 1) + ' = ' + cs + ' × ' + s1.toFixed(2) + ' = ' + fmtN(L.d1, 1) + ' km\n' +
        'd₂ = ' + cs + '√' + fmtN(st.h2, 1) + ' = ' + cs + ' × ' + s2.toFixed(2) + ' = ' + fmtN(L.d2, 1) + ' km\n' +
        'd<sub>max</sub> = ' + cs + '(√' + fmtN(st.h1, 1) + ' + √' + fmtN(st.h2, 1) + ')\n     = ' + cs + ' × ' + (s1 + s2).toFixed(2) + ' = <b>' + fmtN(L.dmax, 1) + ' km</b>\n' +
        'd = ' + fmtN(st.d, 1) + ' km ' + (L.visible ? '≤' : '>') + ' ' + fmtN(L.dmax, 1) + ' km → ' + (L.visible ? '<span class="ok">visible</span>' : '<span class="bad">blocked</span>');
      verdict.className = 'w-verdict ' + (L.visible ? 'ok' : 'bad');
      verdict.textContent = L.visible ? 'Visible: line of sight with ' + fmtN(L.dmax - st.d, 1) + ' km to spare.'
        : 'Blocked by the Earth: ' + fmtN(st.d - L.dmax, 1) + ' km too far.';
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { link: link, horizon: horizon };
})();
