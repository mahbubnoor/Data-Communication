(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var RAD = Math.PI / 180;

  function optics(n1, n2, a) { // a = angle of incidence in degrees, from the normal
    var s2 = n1 * Math.sin(a * RAD) / n2, crit = n1 > n2 ? Math.asin(n2 / n1) / RAD : null;
    var tir = s2 >= 1 - 1e-12, t2 = tir ? null : Math.asin(Math.min(1, s2)) / RAD;
    var na2 = n1 * n1 - n2 * n2, NA = na2 > 0 ? Math.sqrt(na2) : null;
    var ci = Math.cos(a * RAD), ct = tir ? 0 : Math.cos(t2 * RAD);
    var R = tir ? 1 : Math.pow((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), 2); // s-polarised reflectance
    return { s2: s2, crit: crit, tir: tir, t2: t2, NA: NA, acc: NA != null ? Math.asin(Math.min(1, NA)) / RAD : null, R: R };
  }
  var PRE = {
    slide: { n1: 1.48, n2: 1.46, a: 84 },
    below: { n1: 1.48, n2: 1.46, a: 75 },
    clad: { n1: 1.48, n2: 1.40, a: 75 },
    air: { n1: 1.00, n2: 1.50, a: 30 }
  };

  D.register('refract', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.slide));
    var cv = D.canvas(1080, 540), fib = D.canvas(1080, 262), form = h('div', { cls: 'w-f', style: 'font-size:22px' }), verdict = h('div', { cls: 'w-verdict' });
    var n1Sl = D.slider('n₁ (core, light comes from here)', 1, 1.6, 0.01, st.n1, function (v) { return v.toFixed(2); }, function (v) { st.n1 = v; changed(); });
    var n2Sl = D.slider('n₂ (cladding)', 1, 1.6, 0.01, st.n2, function (v) { return v.toFixed(2); }, function (v) { st.n2 = v; changed(); });
    var aSl = D.slider('Angle of incidence θ₁', 0, 89.9, 0.1, st.a, function (v) { return fmtN(v, 1) + '°'; }, function (v) { st.a = v; changed(); });
    var pre = D.seg([['slide', 'Slide: 1.48 / 1.46'], ['below', 'Same, 75°'], ['clad', 'Cladding 1.40'], ['air', 'Air → glass 30°']], 'slide', function (k) {
      st = JSON.parse(JSON.stringify(PRE[k])); n1Sl.set(st.n1); n2Sl.set(st.n2); aSl.set(st.a); draw();
    });
    var critB = D.btn('Set θ₁ = θc', function () { var o = optics(st.n1, st.n2, 0); if (o.crit != null) { st.a = o.crit; aSl.set(+o.crit.toFixed(1)); pre.set(''); draw(); } });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, fib.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Examples' }), pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:4px 20px 10px' }, [n1Sl.el, n2Sl.el, aSl.el, h('div', { cls: 'w-btns' }, [critB])]),
        h('div', { cls: 'w-card', style: 'padding:10px 18px' }, [form]), verdict])]));
    function changed() { pre.set(''); draw(); }

    function arrow(g, x0, y0, x1, y1, col, lw, alpha) {
      g.globalAlpha = alpha == null ? 1 : alpha; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      var mx = x0 + (x1 - x0) * 0.6, my = y0 + (y1 - y0) * 0.6, an = Math.atan2(y1 - y0, x1 - x0), s = 9 + lw * 1.5;
      g.beginPath(); g.moveTo(mx + Math.cos(an) * s, my + Math.sin(an) * s);
      g.lineTo(mx + Math.cos(an + 2.5) * s, my + Math.sin(an + 2.5) * s); g.lineTo(mx + Math.cos(an - 2.5) * s, my + Math.sin(an - 2.5) * s); g.fill();
      g.globalAlpha = 1;
    }
    function arcLab(g, cx, cy, r, a0, a1, col, txt, tr) {
      g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r, Math.min(a0, a1), Math.max(a0, a1)); g.stroke();
      var am = (a0 + a1) / 2; if (Math.abs(a1 - a0) < 0.5) am = a1 + (a1 >= a0 ? 0.3 : -0.3); g.fillStyle = col; g.font = '600 22px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, cx + Math.cos(am) * tr, cy + Math.sin(am) * tr); g.textBaseline = 'alphabetic';
    }

    function draw() {
      var o = optics(st.n1, st.n2, st.a), g = cv.g, w = cv.w, H = cv.h, cx = w / 2, cy = H / 2, a = st.a * RAD, LEN = function (ang) { return Math.min(430, (cy - 40) / Math.max(Math.cos(ang), 0.01)); }, L = LEN(a);
      // media
      g.clearRect(0, 0, w, H);
      g.fillStyle = '#eef3f8'; g.fillRect(0, 0, w, cy); g.fillStyle = '#d9e5f1'; g.fillRect(0, cy, w, H - cy);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, H - 1);
      g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(0, cy); g.lineTo(w, cy); g.stroke();
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      var fibre = st.n1 > st.n2; g.fillText('medium 2' + (fibre ? ' (cladding)' : '') + ': n₂ = ' + st.n2.toFixed(2), 18, 34); g.fillText('medium 1' + (fibre ? ' (core)' : '') + ': n₁ = ' + st.n1.toFixed(2), 18, H - 18);
      g.textAlign = 'right'; g.fillStyle = C.gray; g.font = '500 20px ' + SANS;
      g.fillText(st.n1 > st.n2 ? 'light goes from denser to less dense' : 'light goes into an equal or denser medium', w - 18, H - 18);
      // normal
      g.setLineDash([8, 7]); g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, 46); g.lineTo(cx, H - 46); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = 'right'; g.fillText('normal', cx - 8, 64);
      // critical-angle guide (incident side)
      if (o.crit != null) {
        var c = o.crit * RAD, Lc = LEN(c) + 30;
        g.setLineDash([4, 6]); g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - Lc * Math.sin(c), cy + Lc * Math.cos(c)); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.red; g.font = '600 21px ' + SANS; g.textAlign = 'right';
        var ex = cx - Lc * Math.sin(c), ey = cy + Lc * Math.cos(c);
        var lr = Math.min(Lc - 20, 300); g.fillText('θc = ' + fmtN(o.crit, 1) + '°', Math.max(150, cx - lr * Math.sin(c) - 10), Math.min(H - 50, cy + lr * Math.cos(c) + 30));
      }
      // incident
      arrow(g, cx - L * Math.sin(a), cy + L * Math.cos(a), cx, cy, C.blue, 5);
      arcLab(g, cx, cy, 70, Math.PI / 2, Math.PI / 2 + a, C.blue, 'θ₁', 96);
      // reflected
      var rAlpha = o.tir ? 1 : Math.max(0.18, Math.min(1, o.R * 3));
      arrow(g, cx, cy, cx + L * Math.sin(a), cy + L * Math.cos(a), o.tir ? C.green : C.blue, o.tir ? 5 : 3, rAlpha);
      if (o.tir) arcLab(g, cx, cy, 70, Math.PI / 2 - a, Math.PI / 2, C.green, 'θ₁', 96);
      // refracted
      if (!o.tir) {
        var b = o.t2 * RAD;
        var Lb = LEN(b); arrow(g, cx, cy, cx + Lb * Math.sin(b), cy - Lb * Math.cos(b), C.orange, 5);
        arcLab(g, cx, cy, 70, -Math.PI / 2, -Math.PI / 2 + b, C.orange, 'θ₂', 96);
        g.fillStyle = C.orange; g.font = '600 22px ' + SANS; g.textAlign = 'left';
        g.fillText('refracted: θ₂ = ' + fmtN(o.t2, 1) + '°', Math.min(w - 300, cx + Lb * Math.sin(b) + 12), Math.max(90, cy - Lb * Math.cos(b) + 4));
      } else {
        g.fillStyle = C.green; g.font = '700 24px ' + SANS; g.textAlign = 'center';
        g.fillText('no refracted ray: total internal reflection', cx + 250, cy - 70);
      }
      // ---- fibre view
      var f = fib.g, fw = fib.w, fh = fib.h, top = 50, core = 72, clad = 46, y0 = top + clad, y1 = y0 + core;
      f.clearRect(0, 0, fw, fh); f.fillStyle = C.panel; f.fillRect(0, 0, fw, fh); f.strokeStyle = C.line; f.lineWidth = 1; f.strokeRect(0.5, 0.5, fw - 1, fh - 1);
      f.fillStyle = '#eef3f8'; f.fillRect(20, top, fw - 40, clad); f.fillRect(20, y1, fw - 40, clad);
      f.fillStyle = '#d9e5f1'; f.fillRect(20, y0, fw - 40, core);
      f.strokeStyle = C.navy; f.lineWidth = 2; f.beginPath(); f.moveTo(20, y0); f.lineTo(fw - 20, y0); f.moveTo(20, y1); f.lineTo(fw - 20, y1); f.stroke();
      f.font = '600 21px ' + SANS; f.fillStyle = C.navy; f.textAlign = 'left';
      f.fillText('Inside a fibre: the ray meets the core–cladding boundary at θ₁, ' + fmtN(90 - st.a, 1) + '° from the axis', 20, 30);
      f.font = '500 20px ' + SANS; f.fillStyle = C.gray; f.textAlign = 'right'; f.fillText('cladding', fw - 28, top + 28); f.fillText('cladding', fw - 28, y1 + 30);
      var alpha = (90 - st.a) * RAD, x = 20, y = (y0 + y1) / 2, dir = -1, I = 1, hits = 0;
      f.lineCap = 'round';
      while (x < fw - 20 && I > 1e-4 && hits < 400) {
        var yT = dir < 0 ? y0 : y1, dx = Math.abs(yT - y) / Math.max(Math.tan(alpha), 1e-6), nx = x + dx, ny = yT;
        if (nx > fw - 20) { ny = y + dir * (fw - 20 - x) * Math.tan(alpha); nx = fw - 20; }
        f.globalAlpha = Math.max(0.12, I); f.strokeStyle = o.tir ? C.green : C.blue; f.lineWidth = 4; f.beginPath(); f.moveTo(x, y); f.lineTo(nx, ny); f.stroke();
        if (nx >= fw - 20) break;
        if (!o.tir) { // part escapes
          var b2 = o.t2 * RAD, ox = Math.sin(b2) * 60, oy = Math.cos(b2) * 40;
          f.globalAlpha = Math.max(0.2, I * (1 - o.R)); f.strokeStyle = C.orange; f.lineWidth = 3; f.beginPath(); f.moveTo(nx, ny); f.lineTo(nx + ox * (clad / 40), ny + dir * oy * (clad / 40)); f.stroke();
          I *= o.R;
        }
        x = nx; y = ny; dir = -dir; hits++;
      }
      f.globalAlpha = 1; f.lineCap = 'butt';
      f.font = '600 21px ' + SANS; f.textAlign = 'left'; f.fillStyle = o.tir ? C.green : C.red;
      f.fillText(o.tir ? 'Every bounce reflects 100%: the light is guided to the far end.' :
        (st.n1 > st.n2 ? 'Each bounce leaks light into the cladding (orange): only ' : 'n₁ ≤ n₂ is no fibre: each bounce leaks light, only ') + fmtN(+(o.R * 100).toPrecision(2), 4) + '% stays in the core.', 20, fh - 16);
      // ---- formulas
      var s = '';
      if (o.crit != null) s += 'sin θc = n₂ / n₁ = ' + st.n2.toFixed(2) + ' / ' + st.n1.toFixed(2) + ' = ' + (st.n2 / st.n1).toFixed(4) + '\n   θc = arcsin ' + (st.n2 / st.n1).toFixed(4) + ' = <b>' + fmtN(o.crit, 1) + '°</b>\n';
      else s += 'n₁ ≤ n₂: no critical angle,\n   TIR is impossible\n';
      s += 'Snell: n₁ sin θ₁ = n₂ sin θ₂\nsin θ₂ = ' + st.n1.toFixed(2) + ' × sin ' + fmtN(st.a, 1) + '° / ' + st.n2.toFixed(2) + '\n       = ' + o.s2.toFixed(4);
      s += o.tir ? (o.s2 > 1 + 1e-9 ? ' > 1 → <span class="bad">no θ₂</span>' : ' → θ₂ = 90° (skims)') + '\n' : ' → θ₂ = <b>' + fmtN(o.t2, 1) + '°</b>\n';
      if (o.NA != null) s += 'NA = √(n₁² − n₂²) = √(' + (st.n1 * st.n1).toFixed(4) + ' − ' + (st.n2 * st.n2).toFixed(4) + ')\n   = ' + o.NA.toFixed(4) + (o.NA < 1 ? ' → θa = ±' + fmtN(o.acc, 1) + '°' : ' ≥ 1');
      form.innerHTML = s;
      var edge = o.crit != null && Math.abs(st.a - o.crit) < 0.05;
      verdict.className = 'w-verdict ' + (o.tir ? 'ok' : o.crit == null ? 'warn' : 'bad');
      verdict.textContent = edge ? 'θ₁ = θc: the refracted ray skims along the boundary (θ₂ = 90°).' : o.tir ? 'θ₁ = ' + fmtN(st.a, 1) + '° ≥ θc: total internal reflection. The light stays in the core.' :
        (o.crit != null ? 'θ₁ = ' + fmtN(st.a, 1) + '° < θc = ' + fmtN(o.crit, 1) + '°: part of the light escapes into the cladding.' : 'n₁ ≤ n₂: the light always gets through, bending towards the normal. TIR needs n₁ > n₂.');
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { optics: optics };
})();
