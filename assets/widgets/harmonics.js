/* Try it: build a square wave from odd harmonics (Lecture 2, after slide "harmonics") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  /* partial Fourier sum of a ±1 square wave, n odd harmonics, t in periods */
  function partial(n, t) { var v = 0; for (var i = 0; i < n; i++) { var k = 2 * i + 1; v += 4 / (Math.PI * k) * Math.sin(2 * Math.PI * k * t); } return v; }
  function peakOf(n) { var best = -1, at = 0; for (var i = 1; i < 4000; i++) { var t = i / 8000, v = partial(n, t); if (v > best) { best = v; at = t; } } return { v: best, t: at }; }
  function powerKept(n) { var s = 0; for (var i = 0; i < n; i++) { var k = 2 * i + 1; s += 1 / (k * k); } return 8 / (Math.PI * Math.PI) * s; }

  D.register('harmonics', function (root) {
    var st = { n: 3, f: 1, each: false };
    var cv = D.canvas(1080, 610), g = cv.g, W = cv.w, H = cv.h;
    var form = h('div', { cls: 'w-f' }), gib = h('div', { cls: 'w-f' }), bw = h('div', { cls: 'w-f' });
    var nSl = D.slider('Odd harmonics n', 1, 25, 1, st.n, function (v) { return v === 1 ? '1 (just f)' : v + ' (up to ' + (2 * v - 1) + 'f)'; }, function (v) { st.n = v; draw(); });
    var fSl = D.slider('Fundamental f = 1/T', 0.5, 10, 0.5, st.f, function (v) { return D.fmtN(v, 1) + ' kHz'; }, function (v) { st.f = v; draw(); });
    var eachB = D.btn('Show each harmonic', function () { st.each = !st.each; eachB.classList.toggle('on', st.each); draw(); });
    function pre(n, f) { return function () { st.n = n; st.f = f; nSl.set(n); fSl.set(f); draw(); }; }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:14px 22px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding:10px 20px 8px' }, [nSl.el, fSl.el, h('div', { cls: 'w-btns', style: 'margin-top:4px' }, [eachB])]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:14px 20px' }, [h('h4', { text: 'Slide examples' }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [
          D.btn('f only', pre(1, 1)), D.btn('f, 3f, 5f (1 kHz)', pre(3, 1)), D.btn('10 harmonics', pre(10, 1)), D.btn('25: Gibbs', pre(25, 1))])]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:14px 20px' }, [bw]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:14px 20px' }, [gib])])]));

    function draw() {
      var n = st.n, f = st.f, top = 330, T = 1 / f;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      // ---- time domain
      var pl = 62, pr = 18, pt = 44, pb = 40, X = function (t) { return pl + t / 2 * (W - pl - pr); }, Y = function (v) { return pt + (1.45 - v) / 2.9 * (top - pt - pb); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Time domain: sum of ' + n + ' harmonic' + (n > 1 ? 's' : '') + ' vs ideal square wave', 14, 30);
      g.strokeStyle = C.grid; [-1, 1].forEach(function (v) { g.beginPath(); g.moveTo(pl, Y(v)); g.lineTo(W - pr, Y(v)); g.stroke(); });
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(pl, Y(0)); g.lineTo(W - pr, Y(0)); g.stroke();
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      [1, 0, -1].forEach(function (v) { g.fillText(D.fmtN(v, 0), pl - 8, Y(v)); }); g.textBaseline = 'alphabetic';
      [0, 0.5, 1, 1.5, 2].forEach(function (p) { g.textAlign = p === 2 ? 'right' : 'center'; g.fillText(D.fmtN(p * T, 3), X(p) + (p === 2 ? 6 : 0), top - 12); });
      g.textAlign = 'right'; g.font = '500 20px ' + D.SANS; g.fillText('time (ms) · 2 periods, T = ' + D.fmtN(T, 3) + ' ms', W - pr, 30);
      g.strokeStyle = '#9aa5b1'; g.lineWidth = 2; g.setLineDash([8, 7]); g.beginPath();
      for (var i = 0; i <= 1000; i++) { var t = i / 500, s = (t % 1) < 0.5 ? 1 : -1; i ? g.lineTo(X(t), Y(s)) : g.moveTo(X(t), Y(s)); if (i && ((i % 250) === 0)) g.lineTo(X(t), Y(-s)); }
      g.stroke(); g.setLineDash([]);
      if (st.each) for (var e = 0; e < Math.min(n, 6); e++) {
        var k0 = 2 * e + 1; g.strokeStyle = 'rgba(47,109,181,.45)'; g.lineWidth = 1.5; g.beginPath();
        for (var j = 0; j <= 1200; j++) { var tt = j / 600, vv = 4 / (Math.PI * k0) * Math.sin(2 * Math.PI * k0 * tt); j ? g.lineTo(X(tt), Y(vv)) : g.moveTo(X(tt), Y(vv)); }
        g.stroke();
      }
      g.strokeStyle = C.orangeL; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath();
      for (var q = 0; q <= 2400; q++) { var t2 = q / 1200, v2 = partial(n, t2); q ? g.lineTo(X(t2), Y(v2)) : g.moveTo(X(t2), Y(v2)); }
      g.stroke();
      var pk = peakOf(n);
      if (n >= 2) {
        g.fillStyle = C.red; g.beginPath(); g.arc(X(pk.t), Y(pk.v), 7, 0, 7); g.fill();
        g.font = '600 20px ' + D.SANS; g.textAlign = 'left'; g.fillText('overshoot: peak ' + D.fmtN(pk.v, 3), X(pk.t) + 12, Y(pk.v) - 6);
      }
      // ---- spectrum
      var s0 = top + 8, sb = H - 40, kMax = Math.max(2 * n + 5, 11), fl = 62, frr = 18;
      var FX = function (k) { return fl + k / (kMax + 1) * (W - fl - frr); }, FY = function (a) { return sb - a / 1.35 * (sb - s0 - 52); };
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(10, s0); g.lineTo(W - 10, s0); g.stroke();
      g.fillStyle = 'rgba(240,163,94,.18)'; g.fillRect(FX(0), s0 + 40, FX(2 * n - 1) + 8 - FX(0), sb - s0 - 40);
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Frequency domain: odd harmonics, height 4/(πk)', 14, s0 + 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.orange; g.textAlign = 'right'; g.fillText('shaded: 0 to ' + (2 * n - 1) + 'f = ' + D.fmtN((2 * n - 1) * f, 1) + ' kHz', W - frr, s0 + 30);
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(fl, sb); g.lineTo(W - frr, sb); g.stroke();
      var bwid = Math.max(5, Math.min(18, (FX(2) - FX(0)) * 0.55));
      for (var k = 1; k <= kMax; k += 2) {
        var on = k <= 2 * n - 1, a = 4 / (Math.PI * k);
        g.fillStyle = on ? C.orange : '#dfe4e9'; g.fillRect(FX(k) - bwid / 2, FY(a), bwid, sb - FY(a));
        var every = kMax > 30 ? 4 : (kMax > 16 ? 2 : 1);
        if (((k - 1) / 2) % every === 0) {
          g.fillStyle = on ? C.ink : '#9aa5b1'; g.font = '500 20px ' + D.MONO; g.textAlign = 'center';
          g.fillText(k === 1 ? 'f' : k + 'f', FX(k), sb + 24);
          if (k <= 9 && kMax <= 30) { g.fillStyle = on ? C.orange : '#9aa5b1'; g.fillText(D.fmtN(a, 3), FX(k), FY(a) - 8); }
        }
      }
      // ---- text
      var ks = []; for (var m = 0; m < n; m++) ks.push(2 * m + 1);
      var shown = ks.length <= 4 ? ks : ks.slice(0, 2).concat(['…', ks[ks.length - 1]]);
      var hi = (2 * n - 1) * f;
      form.innerHTML = 's(t) = (4/π)[' + shown.map(function (k) { return k === '…' ? '…' : (k === 1 ? 'sin 2πft' : '(1/' + k + ') sin 2π' + k + 'ft'); }).join(' + ') + ']\n' +
        'frequencies: ' + shown.map(function (k) { return k === '…' ? '…' : D.fmtN(k * f, 1); }).join(', ') + ' kHz\namplitudes 4/(πk): ' +
        shown.map(function (k) { return k === '…' ? '…' : D.fmtN(4 / (Math.PI * k), 3); }).join(', ') + '\n' +
        'power kept = (8/π²)(1 + 1/3² + … + 1/' + (2 * n - 1) + '²) = <b>' + D.fmtN(powerKept(n) * 100, 1) + '%</b> of the power';
      bw.innerHTML = 'highest = ' + (2 * n - 1) + 'f = ' + (2 * n - 1) + ' × ' + D.fmtN(f, 1) + ' = <b>' + D.fmtN(hi, 1) + ' kHz</b>\n' +
        'B = highest − lowest\n  = ' + D.fmtN(hi, 1) + ' − ' + D.fmtN(f, 1) + ' = <b>' + D.fmtN(hi - f, 1) + ' kHz</b>\n' +
        'baseband channel: <b>0 to ' + D.fmtN(hi, 1) + ' kHz</b>\n' +
        '<span style="color:' + C.gray + '">as bits 1010…: N = 2f = ' + D.fmtN(2 * f, 1) + ' kbps</span>';
      gib.innerHTML = n === 1 ? '<b>One sine</b>: peak 4/π = ' + D.fmtN(4 / Math.PI, 3) + '\nAdd 3f to flatten the top.' :
        '<b>Gibbs</b>: peak = ' + D.fmtN(pk.v, 3) + ' (ideal 1)\novershoot = <b>' + D.fmtN((pk.v - 1) / 2 * 100, 1) + '%</b> of the 2 V jump\n' +
        '<span style="color:' + C.gray + '">More harmonics make the ripple narrower, not lower: it stays ≈ 9%.</span>';
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { partial: partial, peakOf: peakOf, powerKept: powerKept };
})();
