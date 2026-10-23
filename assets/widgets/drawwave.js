/* Try it: draw one period of a wave, see its Fourier series (Lecture 2, after slide "lab") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;
  var NS = 256, NH = 20, YM = 1.35;

  /* Fourier series from one period of NS samples (DFT; sample k sits at the centre of its cell, t = (k + ½)/NS); sin convention:
     x(t) ≈ c0 + Σ cn sin(2π n f t + φn), cn = 2|Xn|, φn = atan2(an, bn) */
  function series(x) {
    var N = x.length, out = [];
    for (var n = 0; n <= N / 2; n++) {
      var re = 0, im = 0;
      for (var k = 0; k < N; k++) { var a = 2 * Math.PI * n * (k + 0.5) / N; re += x[k] * Math.cos(a); im -= x[k] * Math.sin(a); }
      re /= N; im /= N;
      if (n === 0) { out.push({ n: 0, c: re, a: re, b: 0, ph: 0 }); continue; }
      var an = 2 * re, bn = -2 * im, m = n === N / 2 ? 0.5 : 1;
      out.push({ n: n, a: an * m, b: bn * m, c: Math.hypot(an, bn) * m, ph: Math.atan2(an, bn) * 180 / Math.PI });
    }
    return out;
  }
  function recon(S, nMax, t) { var v = S[0].c; for (var n = 1; n <= nMax; n++) v += S[n].a * Math.cos(2 * Math.PI * n * t) + S[n].b * Math.sin(2 * Math.PI * n * t); return v; }
  function power(x) { var p = 0; for (var k = 0; k < x.length; k++) p += x[k] * x[k]; return p / x.length; }
  function powerN(S, nMax) { var p = S[0].c * S[0].c; for (var n = 1; n <= nMax; n++) p += S[n].c * S[n].c / 2; return p; }
  function rmsErr(x, S, nMax) { var e = 0; for (var k = 0; k < x.length; k++) { var d = x[k] - recon(S, nMax, (k + 0.5) / x.length); e += d * d; } return Math.sqrt(e / x.length); }
  function need(S, x, frac) { var P = power(x); if (P < 1e-12) return 0; for (var n = 0; n <= NH; n++) if (powerN(S, n) >= frac * P - 1e-12) return n; return null; }

  function gauss(t, m, w) { return Math.exp(-0.5 * Math.pow((t - m) / w, 2)); }
  var SHAPES = {
    square: function (t) { return t < 0.5 ? 1 : -1; },
    triangle: function (t) { return t < 0.25 ? 4 * t : t < 0.75 ? 2 - 4 * t : 4 * t - 4; },
    sawtooth: function (t) { return 1 - 2 * t; },
    pulse: function (t) { return Math.abs(t - 0.5) < 1 / 32 ? 1 : 0; },
    heart: function (t) { return 0.15 * gauss(t, 0.2, 0.025) - 0.12 * gauss(t, 0.36, 0.008) + 1.0 * gauss(t, 0.4, 0.01) - 0.25 * gauss(t, 0.44, 0.01) + 0.3 * gauss(t, 0.65, 0.045); }
  };
  function shape(name) { var x = new Float64Array(NS); for (var k = 0; k < NS; k++) x[k] = SHAPES[name]((k + 0.5) / NS); return x; }

  D.register('drawwave', function (root) {
    var st = { x: shape('square'), N: 5, shape: 'square', drawing: false, last: null };
    var S = series(st.x);
    var cv = D.canvas(1080, 610), g = cv.g, W = cv.w, H = cv.h;
    cv.c.style.touchAction = 'none'; cv.c.style.cursor = 'crosshair';
    var fForm = h('div', { cls: 'w-f', style: 'flex:1.2;min-width:0' }), fPow = h('div', { cls: 'w-f', style: 'flex:1;min-width:0' });
    var nSl = D.slider('Use first N harmonics', 0, NH, 1, st.N, function (v) { return v === 0 ? '0 (DC only)' : v + ' (up to ' + (v === 1 ? 'f' : v + 'f') + ')'; }, function (v) { st.N = v; draw(); });
    var verdict = h('div', { cls: 'w-verdict' });
    var pBtns = {};
    function pick(k) { st.x = shape(k); st.shape = k; S = series(st.x); mark(); draw(); }
    function mark() { Object.keys(pBtns).forEach(function (k) { pBtns[k].classList.toggle('on', k === st.shape); }); }
    [['square', 'Square'], ['triangle', 'Triangle'], ['sawtooth', 'Sawtooth'], ['pulse', 'Narrow pulse'], ['heart', 'Heartbeat']].forEach(function (p) {
      pBtns[p[0]] = D.btn(p[1], function () { pick(p[0]); });
    });
    var clearB = D.btn('Clear', function () { st.x = new Float64Array(NS); st.shape = null; S = series(st.x); mark(); draw(); }, 'acc');

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c,
        h('div', { cls: 'w-card', style: 'flex-direction:row;gap:22px;padding:12px 20px' }, [fForm, fPow])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'Draw it for me' }),
          h('div', { cls: 'w-btns', style: 'gap:8px' }, Object.keys(pBtns).map(function (k) { return pBtns[k]; }).concat([clearB]))]),
        h('div', { cls: 'w-card', style: 'gap:4px;padding:10px 18px 6px' }, [nSl.el]),
        verdict,
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'What to notice' }),
          h('p', { cls: 'w-note', style: 'color:' + C.ink, html: '<b style="color:' + C.red + '">Sharp corners and jumps</b> (square, sawtooth, pulse) need many harmonics: wide bandwidth.' }),
          h('p', { cls: 'w-note', style: 'color:' + C.ink, html: '<b style="color:' + C.green + '">Smooth, rounded shapes</b> (triangle, a sine) need only a few: narrow bandwidth.' }),
          h('p', { cls: 'w-note', html: 'Every harmonic is a multiple of f = 1/T, so the drawing\'s period sets the spacing.' })])])]));

    /* ---- drawing with pointer events (scaled slide: map via getBoundingClientRect) */
    var box = { l: 66, r: W - 18, t: 50, b: 360 };
    function toLocal(e) { var r = cv.c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
    function paint(p) {
      var k = Math.max(0, Math.min(NS - 1, Math.floor((p.x - box.l) / (box.r - box.l) * NS)));
      var v = Math.max(-YM, Math.min(YM, YM - (p.y - box.t) / (box.b - box.t) * 2 * YM));
      if (st.last) {
        var k0 = st.last.k, v0 = st.last.v, n = Math.abs(k - k0);
        for (var i = 0; i <= n; i++) { var kk = k0 + (k > k0 ? i : -i); st.x[kk] = n ? v0 + (v - v0) * i / n : v; }
      } else st.x[k] = v;
      st.last = { k: k, v: v };
    }
    cv.c.addEventListener('pointerdown', function (e) {
      var p = toLocal(e); if (p.y > box.b + 20) return;
      e.preventDefault(); st.drawing = true; st.last = null; st.shape = null; mark();
      try { cv.c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      paint(p); S = series(st.x); draw();
    });
    cv.c.addEventListener('pointermove', function (e) { if (!st.drawing) return; e.preventDefault(); paint(toLocal(e)); S = series(st.x); draw(); });
    function end() { st.drawing = false; st.last = null; }
    cv.c.addEventListener('pointerup', end); cv.c.addEventListener('pointercancel', end);

    function draw() {
      var N = st.N, P = power(st.x), PN = powerN(S, N), err = rmsErr(st.x, S, N), empty = P < 1e-12;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var X = function (t) { return box.l + t * (box.r - box.l); }, Y = function (v) { return box.t + (YM - v) / (2 * YM) * (box.b - box.t); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Draw one period here', 14, 30);
      g.font = '500 20px ' + D.SANS; g.textAlign = 'right';
      g.fillStyle = C.blue; g.fillText('— your drawing', W - 290, 30); g.fillStyle = C.orange; g.fillText('— sum of DC + ' + N + ' harmonic' + (N === 1 ? '' : 's'), W - 14, 30);
      g.fillStyle = '#fff'; g.fillRect(box.l, box.t, box.r - box.l, box.b - box.t);
      g.strokeStyle = C.grid; g.lineWidth = 1;
      [-1, -0.5, 0.5, 1].forEach(function (v) { g.beginPath(); g.moveTo(box.l, Y(v)); g.lineTo(box.r, Y(v)); g.stroke(); });
      [0.25, 0.5, 0.75].forEach(function (t) { g.beginPath(); g.moveTo(X(t), box.t); g.lineTo(X(t), box.b); g.stroke(); });
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(box.l, Y(0)); g.lineTo(box.r, Y(0)); g.stroke();
      g.strokeStyle = C.line; g.strokeRect(box.l, box.t, box.r - box.l, box.b - box.t);
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      [1, 0, -1].forEach(function (v) { g.fillText(D.fmtN(v, 0), box.l - 8, Y(v)); }); g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      [[0, '0'], [0.25, 'T/4'], [0.5, 'T/2'], [0.75, '3T/4'], [1, 'T']].forEach(function (q) { g.textAlign = q[0] === 1 ? 'right' : (q[0] === 0 ? 'left' : 'center'); g.fillText(q[1], X(q[0]), box.b + 24); });
      if (empty && !st.drawing) { g.font = '600 26px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'center'; g.fillText('Draw one period here with the mouse or a finger', (box.l + box.r) / 2, Y(0) - 24); }
      // drawing
      g.strokeStyle = C.blue; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath();
      for (var k = 0; k <= NS; k++) { var v = st.x[k % NS]; var xx = X(k / NS); k ? g.lineTo(xx, Y(v)) : g.moveTo(xx, Y(v)); if (k < NS) g.lineTo(X((k + 1) / NS), Y(v)); }
      g.stroke();
      // reconstruction
      g.save(); g.beginPath(); g.rect(box.l, box.t, box.r - box.l, box.b - box.t); g.clip();
      g.strokeStyle = C.orangeL; g.lineWidth = 4; g.beginPath();
      for (var q = 0; q <= 1000; q++) { var t = q / 1000, vr = recon(S, N, t); q ? g.lineTo(X(t), Y(vr)) : g.moveTo(X(t), Y(vr)); }
      g.stroke(); g.restore();

      // ---- spectrum bars 0..20
      var s0 = box.b + 40, sb = H - 36, fl = 66, fr = 18;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(10, s0); g.lineTo(W - 10, s0); g.stroke();
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Recipe: amplitude of each harmonic (DC to 20f)', 14, s0 + 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('orange = used in the sum', W - 14, s0 + 30);
      var cmax = 0; for (var n = 0; n <= NH; n++) cmax = Math.max(cmax, Math.abs(S[n].c)); cmax = Math.max(cmax, 0.05);
      var top = cmax * 1.08, bt = s0 + 50, BW = (W - fl - fr) / (NH + 1);
      var BY = function (a) { return sb - a / top * (sb - bt); };
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(fl, sb); g.lineTo(W - fr, sb); g.stroke();
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(D.fmtN(cmax, 2), fl - 6, BY(cmax)); g.textBaseline = 'alphabetic';
      g.strokeStyle = C.grid; g.beginPath(); g.moveTo(fl, BY(cmax)); g.lineTo(W - fr, BY(cmax)); g.stroke();
      for (n = 0; n <= NH; n++) {
        var cx = fl + (n + 0.5) * BW, a = Math.abs(S[n].c), used = n <= N;
        g.fillStyle = used ? (n === 0 ? C.navy : C.orangeL) : C.sky;
        g.fillRect(cx - BW * 0.32, BY(a), BW * 0.64, sb - BY(a));
        g.fillStyle = used ? C.ink : C.gray; g.font = (used ? '600 ' : '500 ') + '20px ' + D.MONO; g.textAlign = 'center';
        g.fillText(n === 0 ? 'DC' : n === 1 ? 'f' : n + 'f', cx, sb + 24);
      }

      // ---- formula with the first terms substituted
      var tm = [], thr = Math.max(cmax * 0.01, 1e-6);
      for (n = 1; n <= N; n++) if (S[n].c > thr) tm.push(n);
      var tx = '<b>x(t)</b> ≈ ' + D.fmtN(+S[0].c.toFixed(3), 3) + '   <span style="color:' + C.gray + '">(DC)</span>';
      tm.slice(0, 3).forEach(function (n) {
        tx += '\n   + ' + S[n].c.toFixed(3) + ' sin(2π·' + (n === 1 ? '' : n) + 'ft ' + (S[n].ph < 0 ? '− ' : '+ ') + D.fmtN(Math.abs(Math.round(S[n].ph)), 0) + '°)';
      });
      if (tm.length > 3) tx += '\n   + … ' + (tm.length - 3) + ' more term' + (tm.length > 4 ? 's' : '') + ' up to ' + tm[tm.length - 1] + 'f';
      if (!tm.length) tx += '\n   (no harmonics used' + (N ? ' are non-zero' : '') + ')';
      fForm.innerHTML = tx;
      var pc = empty ? 0 : PN / P * 100;
      fPow.innerHTML = empty ? 'Draw a wave to see\nits power.' :
        'P = mean x² = ' + D.fmtN(P, 3) + '\nP<sub>N</sub> = c₀² + Σ cₙ²/2 = ' + D.fmtN(PN, 3) +
        '\ncaptured = ' + D.fmtN(PN, 3) + ' / ' + D.fmtN(P, 3) + ' = <b>' + D.fmtN(Math.min(pc, 100), 1) + ' %</b>' +
        '\nRMS error = <b>' + D.fmtN(err, 3) + '</b>' +
        '\n<span style="color:' + C.gray + '">highest used = ' + (N ? (N === 1 ? 'f' : N + 'f') : '0 (DC)') + ', f = 1/T</span>';
      var n99 = need(S, st.x, 0.99), n90 = need(S, st.x, 0.9);
      var sub = function (n) { return n === null ? 'more than 20' : 'N = ' + n; };
      if (empty) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Draw a wave (or pick a shape) to see its recipe.'; }
      else if (n99 === null) { verdict.className = 'w-verdict bad'; verdict.innerHTML = '99 % of the power needs more than 20 harmonics: sharp corners.'; }
      else if (n99 <= 5) { verdict.className = 'w-verdict ok'; verdict.innerHTML = '99 % of the power needs only N = ' + n99 + ': a smooth shape.'; }
      else { verdict.className = 'w-verdict warn'; verdict.innerHTML = '99 % of the power needs N = ' + n99 + ' harmonics.'; }
      if (!empty) verdict.innerHTML += '<div style="font-size:23px;font-weight:500;margin-top:4px">90 % needs ' + sub(n90) + '; 99 % needs ' + sub(n99) + '.</div>';
    }
    mark(); draw();
  });
  if (typeof module !== 'undefined') module.exports = { series: series, recon: recon, power: power, powerN: powerN, rmsErr: rmsErr, need: need, shape: shape };
})();
