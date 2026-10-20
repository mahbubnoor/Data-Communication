/* Try it: sine wave explorer, time and frequency domain (Lecture 2, after slide "domains") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;
  var UNITS = { 1: ['Hz', 's'], 1e3: ['kHz', 'ms'], 1e6: ['MHz', 'µs'], 1e9: ['GHz', 'ns'] };

  /* spectrum: DC value plus one line per frequency (same-frequency sines merge as phasors) */
  function spectrum(st) {
    var dc = st.dc, lines = {};
    function add(A, f, phDeg) {
      if (!A) return;
      if (f === 0) { dc += A * Math.sin(phDeg * Math.PI / 180); return; }
      var k = f.toFixed(3); lines[k] = lines[k] || { f: f, re: 0, im: 0, n: 0 };
      lines[k].re += A * Math.cos(phDeg * Math.PI / 180); lines[k].im += A * Math.sin(phDeg * Math.PI / 180); lines[k].n++;
    }
    add(st.A, st.f, st.ph);
    if (st.two) add(st.A2, st.f2, 0);
    var out = Object.keys(lines).map(function (k) { var l = lines[k]; return { f: l.f, a: Math.hypot(l.re, l.im), merged: l.n > 1 }; })
      .filter(function (l) { return l.a > 1e-9; });
    if (Math.abs(dc) > 1e-9) out.push({ f: 0, a: Math.abs(dc), dc: dc });
    out.sort(function (a, b) { return a.f - b.f; });
    return out;
  }
  function sig(st, t) {
    var v = st.dc + st.A * Math.sin(2 * Math.PI * st.f * t + st.ph * Math.PI / 180);
    if (st.two) v += st.A2 * Math.sin(2 * Math.PI * st.f2 * t);
    return v;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function radStr(deg) {
    if (deg === 0) return '0 rad';
    var n = Math.round(deg / 15), d = 12, g = gcd(n, d); n /= g; d /= g;
    return (n === 1 ? '' : n) + 'π' + (d === 1 ? '' : '/' + d) + ' rad';
  }
  function cycStr(deg) { if (deg === 0) return '0'; var n = Math.round(deg / 15), d = 24, g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + '/' + d; }
  /* engineering format: value in base unit -> string with SI prefix */
  function eng(x, unit) {
    if (!isFinite(x)) return '∞';
    var P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-2, 'c'], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
    if (unit !== 'm') P = P.filter(function (p) { return p[1] !== 'c'; });
    else { P = P.filter(function (p) { return p[0] <= 1e3; }); if (Math.abs(x) >= 1e3) return Math.round(x / 1e3).toLocaleString('en-US') + ' km'; }
    var ax = Math.abs(x);
    for (var i = 0; i < P.length; i++) if (ax >= P[i][0] * (unit === 'm' ? 0.9995 : 0.09995)) return D.fmtN(+(x / P[i][0]).toPrecision(3), 6) + ' ' + P[i][1] + unit;
    return D.fmtN(x, 3) + ' ' + unit;
  }
  function sci(x) { if (x === 0) return '0'; if (Math.abs(x) >= 0.01 && Math.abs(x) < 1000) return D.fmtN(x, 3); var e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), m = x / Math.pow(10, e); return (Math.abs(m - 1) < 1e-9 ? '' : D.fmtN(m, 3) + ' × ') + '10' + sup(e); }
  function sup(e) { var m = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(e).split('').map(function (c) { return m[c]; }).join(''); }

  D.register('sine', function (root) {
    var st = { A: 5, f: 8, ph: 0, dc: 0, two: false, A2: 3, f2: 12, u: 1, v: 3e8 };
    var tc = D.canvas(650, 470), fc = D.canvas(414, 470);
    var f1 = h('div', { cls: 'w-f', style: 'flex:1' }), f2 = h('div', { cls: 'w-f', style: 'flex:1' });
    function fu() { return UNITS[st.u][0]; }
    var aSl = D.slider('Peak amplitude A', 0, 10, 0.5, st.A, function (v) { return D.fmtN(v, 1) + ' V'; }, function (v) { st.A = v; draw(); });
    var fSl = D.slider('Frequency f', 0, 20, 0.1, st.f, function (v) { return D.fmtN(v, 1) + ' ' + fu(); }, function (v) { st.f = v; draw(); });
    var pSl = D.slider('Phase φ', 0, 360, 15, st.ph, function (v) { return v + '°'; }, function (v) { st.ph = v; draw(); });
    var dSl = D.slider('DC level', -10, 10, 0.5, st.dc, function (v) { return D.fmtN(v, 1) + ' V'; }, function (v) { st.dc = v; draw(); });
    var a2Sl = D.slider('Second sine A₂', 0, 10, 0.5, st.A2, function (v) { return D.fmtN(v, 1) + ' V'; }, function (v) { st.A2 = v; draw(); });
    var f2Sl = D.slider('Second sine f₂', 0.5, 20, 0.1, st.f2, function (v) { return D.fmtN(v, 1) + ' ' + fu(); }, function (v) { st.f2 = v; draw(); });
    var twoB = D.btn('+ Second sine', function () { setTwo(!st.two); draw(); });
    var unitSeg = D.seg([[1, 'Hz'], [1e3, 'kHz'], [1e6, 'MHz'], [1e9, 'GHz']], 1, function (k) { st.u = k; refresh(); draw(); });
    var vSeg = D.seg([[3e8, 'air 3×10⁸'], [2e8, 'cable 2×10⁸']], 3e8, function (k) { st.v = k; draw(); });
    var two = h('div', { cls: 'w-col', style: 'gap:0' }, [a2Sl.el, f2Sl.el]);
    function setTwo(on) { st.two = on; twoB.classList.toggle('on', on); twoB.textContent = on ? '− Second sine' : '+ Second sine'; two.style.display = on ? '' : 'none'; }
    function refresh() { aSl.set(st.A); fSl.set(st.f); pSl.set(st.ph); dSl.set(st.dc); a2Sl.set(st.A2); f2Sl.set(st.f2); unitSeg.set(st.u); vSeg.set(st.v); setTwo(st.two); }
    function pre(o) { return function () { st = Object.assign({ A: 5, f: 8, ph: 0, dc: 0, two: false, A2: 3, f2: 12, u: 1, v: st.v }, o); refresh(); draw(); }; }
    var presets = h('div', { cls: 'w-btns', style: 'gap:8px' }, [
      D.btn('DC 5 V', pre({ A: 0, dc: 5 })), D.btn('8 Hz', pre({ A: 5, f: 8 })), D.btn('16 Hz', pre({ A: 5, f: 16 })),
      D.btn('10 V DC + 6 Hz', pre({ A: 7, f: 6, dc: 10 })), D.btn('φ = 90°', pre({ A: 5, f: 2, ph: 90 })),
      D.btn('T = 100 ms', pre({ A: 5, f: 10 })), D.btn('2.4 GHz', pre({ A: 5, f: 2.4, u: 1e9, v: 3e8 })),
      D.btn('1 + 5 kHz', pre({ A: 5, f: 1, two: true, A2: 5, f2: 5, u: 1e3 }))]);
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [
        h('div', { cls: 'w-row', style: 'gap:16px' }, [tc.c, fc.c]),
        h('div', { cls: 'w-card w-row', style: 'flex-direction:row;gap:26px;padding:14px 22px' }, [f1, f2])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:14px 18px' }, [h('h4', { text: 'Slide examples' }), presets]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:8px 18px 4px' }, [aSl.el, fSl.el, pSl.el, dSl.el,
          h('div', { cls: 'w-row', style: 'gap:10px;align-items:center;margin:4px 0 6px' }, [unitSeg.el]),
          h('div', { cls: 'w-row', style: 'gap:10px;align-items:center;margin:4px 0 8px' }, [twoB, vSeg.el]), two])])]));

    function draw() {
      var g = tc.g, W = tc.w, H = tc.h, uT = UNITS[st.u][1], uF = fu();
      var N = 1300, vals = [], mx = -1e9, mn = 1e9;
      for (var i = 0; i <= N; i++) { var v = sig(st, i / N); vals.push(v); if (v > mx) mx = v; if (v < mn) mn = v; }
      var peak = Math.max(Math.abs(mx), Math.abs(mn), 1e-9), ym = [1, 2, 5, 10, 15, 20, 25, 30].filter(function (x) { return x >= peak * 1.04; })[0] || 30;
      var pl = 64, pr = 16, pt = 46, pb = 46, X = function (t) { return pl + t * (W - pl - pr); }, Y = function (v) { return pt + (ym - v) / (2 * ym) * (H - pt - pb); };
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Time domain', 14, 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('amplitude (V) against time (' + uT + ')', W - 14, 30);
      g.strokeStyle = C.grid; g.lineWidth = 1;
      for (var k = 0; k <= 10; k++) { g.beginPath(); g.moveTo(X(k / 10), pt); g.lineTo(X(k / 10), H - pb); g.stroke(); }
      [-ym, -ym / 2, ym / 2, ym].forEach(function (y) { g.beginPath(); g.moveTo(pl, Y(y)); g.lineTo(W - pr, Y(y)); g.stroke(); });
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(pl, Y(0)); g.lineTo(W - pr, Y(0)); g.stroke();
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      [ym, 0, -ym].forEach(function (y) { g.fillText(D.fmtN(y, 1), pl - 8, Y(y)); });
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { g.fillText(D.fmtN(t, 2), X(t), H - pb + 26); });
      // one period T marker (component 1)
      if (st.f > 0 && st.A > 0 && 1 / st.f <= 1) {
        var t0 = 0, t1 = 1 / st.f, yb = H - pb - 14;
        g.strokeStyle = C.orange; g.lineWidth = 2; g.beginPath(); g.moveTo(X(t0), yb); g.lineTo(X(t1), yb); g.moveTo(X(t0), yb - 8); g.lineTo(X(t0), yb + 8); g.moveTo(X(t1), yb - 8); g.lineTo(X(t1), yb + 8); g.stroke();
        g.fillStyle = C.orange; g.font = '600 20px ' + D.SANS; g.textAlign = X(t1) - X(0) > 60 ? 'center' : 'left';
        g.fillText('T', X(t1) - X(0) > 60 ? (X(t0) + X(t1)) / 2 : X(t1) + 6, yb - 8);
      }
      if (st.two) {
        g.strokeStyle = 'rgba(47,109,181,.35)'; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath();
        for (var j = 0; j <= N; j++) { var vv = st.dc + st.A * Math.sin(2 * Math.PI * st.f * j / N + st.ph * Math.PI / 180); j ? g.lineTo(X(j / N), Y(vv)) : g.moveTo(X(j / N), Y(vv)); }
        g.stroke(); g.beginPath();
        for (var q = 0; q <= N; q++) { var v2 = st.A2 * Math.sin(2 * Math.PI * st.f2 * q / N); q ? g.lineTo(X(q / N), Y(v2)) : g.moveTo(X(q / N), Y(v2)); }
        g.strokeStyle = 'rgba(166,79,21,.4)'; g.stroke(); g.setLineDash([]);
      }
      g.strokeStyle = st.two ? C.navy : C.blue; g.lineWidth = 3.5; g.lineJoin = 'round'; g.beginPath();
      vals.forEach(function (v, i2) { i2 ? g.lineTo(X(i2 / N), Y(v)) : g.moveTo(X(i2 / N), Y(v)); }); g.stroke();
      g.fillStyle = C.orange; g.beginPath(); g.arc(X(0), Y(vals[0]), 7, 0, 7); g.fill();
      // frequency domain
      var s = fc.g, Wf = fc.w, Hf = fc.h, fl = 46, fr = 18, ft = 46, fb = 46, Fm = 21;
      var FX = function (f) { return fl + f / Fm * (Wf - fl - fr); }, FY = function (a) { return ft + 26 + (ym - a) / ym * (Hf - ft - fb - 26); };
      s.clearRect(0, 0, Wf, Hf); s.fillStyle = C.panel; s.fillRect(0, 0, Wf, Hf); s.strokeStyle = C.line; s.lineWidth = 1; s.strokeRect(0.5, 0.5, Wf - 1, Hf - 1);
      s.font = '600 22px ' + D.SANS; s.fillStyle = C.navy; s.textAlign = 'left'; s.fillText('Frequency domain', 14, 30);
      s.strokeStyle = C.grid; [ym / 2, ym].forEach(function (a) { s.beginPath(); s.moveTo(fl, FY(a)); s.lineTo(Wf - fr, FY(a)); s.stroke(); });
      s.strokeStyle = C.gray; s.beginPath(); s.moveTo(fl, FY(0)); s.lineTo(Wf - fr, FY(0)); s.moveTo(fl, FY(0)); s.lineTo(fl, FY(ym)); s.stroke();
      s.fillStyle = C.gray; s.font = '500 20px ' + D.MONO; s.textAlign = 'right'; s.textBaseline = 'middle'; s.fillText(D.fmtN(ym, 1), fl - 6, FY(ym)); s.fillText('0', fl - 6, FY(0));
      s.textBaseline = 'alphabetic'; s.textAlign = 'center'; [0, 5, 10, 15, 20].forEach(function (f) { s.fillText(f, FX(f), Hf - fb + 26); });
      s.font = '500 20px ' + D.SANS; s.textAlign = 'right'; s.fillText('f (' + uF + ')', Wf - 14, 30);
      var lines = spectrum(st);
      lines.forEach(function (l) {
        var col = l.f === 0 ? C.navy : (l.merged ? C.navy : (st.two && Math.abs(l.f - st.f2) < 1e-9 ? C.orange : C.blue));
        s.strokeStyle = col; s.lineWidth = 7; s.beginPath(); s.moveTo(FX(l.f), FY(0)); s.lineTo(FX(l.f), FY(l.a)); s.stroke();
        s.fillStyle = col; s.beginPath(); s.arc(FX(l.f), FY(l.a), 7, 0, 7); s.fill();
        s.font = '600 20px ' + D.MONO; s.textAlign = l.f > 17 ? 'right' : (l.f < 1.5 ? 'left' : 'center');
        s.fillText(D.fmtN(l.a, 2) + (l.dc < 0 ? ' (−)' : ''), FX(l.f) + (l.f < 1.5 ? -4 : 0), FY(l.a) - 14);
      });
      // formulas
      var t = '', T = st.f > 0 ? 1 / st.f : Infinity, fs = D.fmtN(st.f, 1);
      t += '<b>Component 1</b>\ns(t) = ' + D.fmtN(st.A, 1) + ' sin(2π·' + fs + 't + ' + st.ph + '°)\n';
      if (st.f > 0) {
        t += 'T = 1/f = 1/(' + fs + ' ' + uF + ') = <b>' + eng(T / st.u, 's') + '</b>\n';
        t += 'φ = ' + st.ph + '° = ' + radStr(st.ph) + ' = ' + cycStr(st.ph) + ' cycle\n';
        t += 'starts ' + cycStr(st.ph) + ' × T = <b>' + eng(st.ph / 360 * T / st.u, 's') + '</b> early\n';
        t += 'λ = v/f = ' + sci(st.v) + ' / ' + sci(st.f * st.u) + '\n  = <b>' + eng(st.v / (st.f * st.u), 'm') + '</b>';
      } else {
        t += 'f = 0: no change at all (DC)\nvalue = A sin φ = ' + D.fmtN(st.A, 1) + ' × sin ' + st.ph + '° = <b>' + D.fmtN(st.A * Math.sin(st.ph * Math.PI / 180), 2) + ' V</b>\nT = 1/0 = ∞ (never repeats)';
      }
      f1.innerHTML = t;
      var u = '<b>Whole signal</b> (in this window)\n';
      u += 'max = ' + D.fmtN(mx, 2) + ' V,  min = ' + D.fmtN(mn, 2) + ' V\n';
      if (st.two) u += '+ ' + D.fmtN(st.A2, 1) + ' sin(2π·' + D.fmtN(st.f2, 1) + 't)\n  T₂ = <b>' + eng(1 / st.f2 / st.u, 's') + '</b>\n';
      u += 'Spikes: ' + (lines.length ? lines.map(function (l) { return D.fmtN(l.a, 2) + ' @ ' + D.fmtN(l.f, 1); }).join(', ') + ' ' + uF : 'none') + '\n';
      if (lines.length >= 2) {
        var hi = lines[lines.length - 1].f, lo = lines[0].f;
        u += 'B = highest − lowest\n  = ' + D.fmtN(hi, 1) + ' − ' + D.fmtN(lo, 1) + ' = <b>' + D.fmtN(hi - lo, 1) + ' ' + uF + '</b>\n';
      }
      if (lines.some(function (l) { return l.merged; })) u += '<span class="bad">f₂ = f: they merge into one spike</span>\n';
      u += '<span style="color:' + C.gray + '">Phase shifts the wave, not a spike.</span>';
      f2.innerHTML = u;
    }
    refresh(); draw();
  });
  if (typeof module !== 'undefined') module.exports = { spectrum: spectrum, sig: sig, radStr: radStr, cycStr: cycStr, eng: eng };
})();
