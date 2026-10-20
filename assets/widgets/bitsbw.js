/* Try it: bits through a band-limited channel (Lecture 2, after slide "bwrate") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  /* Fourier series of the periodic repetition of a unipolar (0/1) bit pattern; u = time in pattern periods */
  function coeffs(bits, kMax) {
    var L = bits.length, out = [{ re: 0, im: 0 }];
    for (var j = 0; j < L; j++) out[0].re += (bits[j] === '1' ? 1 : 0) / L;
    for (var k = 1; k <= kMax; k++) {
      var re = 0, im = 0;
      for (var i = 0; i < L; i++) {
        if (bits[i] !== '1') continue;
        // integral of e^{-j2πku} over [i/L,(i+1)/L] = (e^{-j2πk i/L} − e^{-j2πk(i+1)/L}) / (j2πk)
        var a1 = -2 * Math.PI * k * i / L, a2 = -2 * Math.PI * k * (i + 1) / L;
        var dr = Math.cos(a1) - Math.cos(a2), di = Math.sin(a1) - Math.sin(a2), w = 2 * Math.PI * k;
        re += di / w; im += -dr / w;   // (dr + j di) / (j w) = di/w − j dr/w
      }
      out.push({ re: re, im: im });
    }
    return out;
  }
  function harmonicsKept(N, L, B) { return Math.floor(B / (N / L) + 1e-9); }
  function received(bits, N, B, M) {
    var L = bits.length, K = harmonicsKept(N, L, B), c = coeffs(bits, K), y = [];
    function at(u) { var v = c[0].re; for (var k = 1; k <= K; k++) { var a = 2 * Math.PI * k * u; v += 2 * (c[k].re * Math.cos(a) - c[k].im * Math.sin(a)); } return v; }
    for (var i = 0; i <= M; i++) y.push(at(i / M));
    var rx = '', samp = [];
    for (var j = 0; j < L; j++) { var v = at((j + 0.5) / L); samp.push(v); rx += v > 0.5 + 1e-9 ? '1' : '0'; }
    var err = 0; for (var q = 0; q < L; q++) if (rx[q] !== bits[q]) err++;
    return { K: K, c: c, y: y, rx: rx, samp: samp, err: err };
  }

  D.register('bitsbw', function (root) {
    var st = { bits: '01001000', N: 16, B: 12 };
    var tc = D.canvas(1080, 400), sc = D.canvas(1080, 250);
    var row = D.bitRow(st, 16, draw), rxBox = h('div', { cls: 'w-bits', style: 'gap:6px' });
    var form = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var BMIN = 0.1, BMAX = 40, bPos = function (B) { return Math.round(Math.log(B / BMIN) / Math.log(BMAX / BMIN) * 1000); };
    var nSl = D.slider('Bit rate N', 1, 20, 1, st.N, function (v) { return v + ' Mbps'; }, function (v) { st.N = v; draw(); });
    var bOf = function (p) { return +(BMIN * Math.pow(BMAX / BMIN, p / 1000)).toPrecision(2); };
    var bSl = D.slider('Channel bandwidth B', 0, 1000, 1, bPos(st.B), function (p) { return fHz(bOf(p)); }, function (p) { st.B = bOf(p); draw(); });
    function fHz(x) { return x < 1 ? D.fmtN(x * 1000, 0) + ' kHz' : D.fmtN(x, 2) + ' MHz'; }
    function pre(bits, N, B) { return function () { st.bits = bits; st.N = N; st.B = B; row.render(); nSl.set(N); bSl.set(bPos(B)); draw(); }; }
    var lab = function (t) { return h('p', { style: 'font:600 22px ' + D.SANS + ';color:' + C.navy + ';width:120px;margin:0;flex:none', text: t }); };
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:10px' }, [
        h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [lab('Sent'), row.el]),
        tc.c, sc.c,
        h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [lab('Received'), rxBox])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding:10px 20px 6px' }, [nSl.el, bSl.el]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Slide examples' }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [
          D.btn('0101…, B = N/2', pre('01010101', 1, 0.5)), D.btn('B = 3N/2', pre('01010101', 1, 1.5)), D.btn('B = 5N/2', pre('01010101', 1, 2.5)),
          D.btn('0101…, B < N/2', pre('01010101', 1, 0.45)), D.btn('10 Mbps, 5 MHz', pre('01010101', 10, 5)), D.btn('Lab: 16 / 12', pre('01001000', 16, 12))])]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [form, verdict])])]));

    function draw() {
      var bits = st.bits, L = bits.length, N = st.N, B = st.B, f0 = N / L, M = 1200, R = received(bits, N, B, M);
      // ---- time plot
      var g = tc.g, W = tc.w, H = tc.h, pl = 60, pr = 16, pt = 42, pb = 18;
      var X = function (u) { return pl + u * (W - pl - pr); }, Y = function (v) { return pt + (1.35 - v) / 1.7 * (H - pt - pb); };
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Sent (blue) and received (orange): one repetition of the pattern', 14, 30);
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(L + ' bits in ' + D.fmtN(L / N, 3) + ' µs', W - 14, 30);
      for (var j = 0; j < L; j++) {
        var bad = R.rx[j] !== bits[j];
        if (bad) { g.fillStyle = 'rgba(192,57,43,.12)'; g.fillRect(X(j / L), pt, X(1 / L) - X(0), H - pt - pb); }
        if (j) { g.strokeStyle = C.grid; g.beginPath(); g.moveTo(X(j / L), pt); g.lineTo(X(j / L), H - pb); g.stroke(); }
      }
      g.fillStyle = C.gray; g.textBaseline = 'middle'; [0, 1].forEach(function (v) { g.fillText(v, pl - 10, Y(v)); });
      g.strokeStyle = C.gray; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(pl, Y(0.5)); g.lineTo(W - pr, Y(0.5)); g.stroke(); g.setLineDash([]);
      g.fillText('½', pl - 10, Y(0.5)); g.textBaseline = 'alphabetic';
      g.strokeStyle = C.blue; g.lineWidth = 2.5; g.beginPath();
      for (var b = 0; b < L; b++) { var lv = bits[b] === '1' ? 1 : 0; b ? g.lineTo(X(b / L), Y(lv)) : g.moveTo(X(0), Y(lv)); g.lineTo(X((b + 1) / L), Y(lv)); }
      g.stroke();
      g.strokeStyle = C.orange; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath();
      R.y.forEach(function (v, i) { var yy = Y(Math.max(-0.3, Math.min(1.33, v))); i ? g.lineTo(X(i / M), yy) : g.moveTo(X(0), yy); }); g.stroke();
      R.samp.forEach(function (v, k) {
        var ok = R.rx[k] === bits[k]; g.fillStyle = ok ? C.green : C.red; g.beginPath(); g.arc(X((k + 0.5) / L), Y(Math.max(-0.3, Math.min(1.33, v))), 8, 0, 7); g.fill();
      });
      // ---- spectrum
      var s = sc.g, Ws = sc.w, Hs = sc.h, fl = 60, fr = 16, base = Hs - 40, top = 84;
      var Fm = Math.max(B * 1.25, 3 * N, f0 * 4), FX = function (f) { return fl + f / Fm * (Ws - fl - fr); };
      var cs = coeffs(bits, Math.min(400, Math.floor(Fm / f0)));
      var amax = 0.7, FY = function (a) { return base - Math.min(a, amax) / amax * (base - top); };
      s.clearRect(0, 0, Ws, Hs); s.fillStyle = C.panel; s.fillRect(0, 0, Ws, Hs); s.strokeStyle = C.line; s.lineWidth = 1; s.strokeRect(0.5, 0.5, Ws - 1, Hs - 1);
      s.fillStyle = 'rgba(240,163,94,.2)'; s.fillRect(FX(0), top - 10, FX(B) - FX(0), base - top + 10);
      s.font = '600 22px ' + D.SANS; s.fillStyle = C.navy; s.textAlign = 'left'; s.fillText('Spectrum of the sent pattern: harmonics every f₀ = N/L', 14, 30);
      s.font = '500 20px ' + D.SANS; s.fillStyle = C.orange; s.textAlign = 'right'; s.fillText('shaded: what the channel passes, 0 to B', Ws - 14, 30);
      [[0.5, 'N/2'], [1.5, '3N/2'], [2.5, '5N/2']].forEach(function (m) {
        var x = FX(m[0] * N); if (x > Ws - fr) return;
        s.strokeStyle = C.navy; s.setLineDash([5, 5]); s.lineWidth = 1.5; s.beginPath(); s.moveTo(x, top - 8); s.lineTo(x, base); s.stroke(); s.setLineDash([]);
        s.fillStyle = C.navy; s.font = '600 20px ' + D.MONO; s.textAlign = 'center'; s.fillText(m[1], x, top - 14);
      });
      s.strokeStyle = C.gray; s.beginPath(); s.moveTo(fl, base); s.lineTo(Ws - fr, base); s.stroke();
      var lw = Math.max(3, Math.min(10, (FX(f0) - FX(0)) * 0.5));
      for (var k = 0; k < cs.length; k++) {
        var f = k * f0, a = k ? 2 * Math.hypot(cs[k].re, cs[k].im) : cs[0].re;
        if (a < 0.003 || FX(f) > Ws - fr) continue;
        var kept = k <= R.K;
        s.strokeStyle = kept ? C.orange : '#b9c3cd'; s.lineWidth = lw; s.beginPath(); s.moveTo(FX(f), base); s.lineTo(FX(f), FY(a)); s.stroke();
      }
      s.fillStyle = C.gray; s.font = '500 20px ' + D.MONO; s.textAlign = 'center';
      var stepT = [0.5, 1, 2, 5, 10, 20].filter(function (t) { return Fm / t <= 8; })[0] || 20;
      for (var t = 0; t <= Fm + 1e-9; t += stepT) if (FX(t) < Ws - fr - 56) s.fillText(D.fmtN(t, 1), FX(t), base + 26);
      s.textAlign = 'right'; s.fillText('MHz', Ws - fr, base + 26 - 0);
      // ---- received bits
      rxBox.innerHTML = '';
      for (var r = 0; r < L; r++) rxBox.appendChild(h('div', { cls: 'w-bit ro' + (R.rx[r] !== bits[r] ? ' err' : ''), style: 'width:46px;height:58px;font-size:30px;cursor:default', text: R.rx[r] }));
      // ---- formulas
      var kept = []; for (var q = 1; q <= R.K; q++) { var aa = 2 * Math.hypot(R.c[q].re, R.c[q].im); if (aa > 1e-6) kept.push(q); }
      var t2 = 'T_bit = 1/N = 1/(' + N + ' Mbps) = ' + (N === 1 ? '1 µs' : D.fmtN(1000 / N, 1) + ' ns') + '\n';
      t2 += 'f₀ = N/L = ' + N + '/' + L + ' = ' + D.fmtN(f0, 3) + ' MHz\n';
      t2 += 'kept: k·f₀ ≤ B → K = ⌊' + D.fmtN(B, 2) + '/' + D.fmtN(f0, 3) + '⌋ = <b>' + R.K + '</b>\n';
      t2 += '  (' + kept.length + ' non-zero harmonic' + (kept.length === 1 ? '' : 's') + ')\n';
      t2 += 'N/2 = ' + fHz(N / 2) + ', 3N/2 = ' + fHz(1.5 * N) + '\n';
      t2 += 'bit errors: <b>' + R.err + ' of ' + L + '</b>';
      form.innerHTML = t2;
      if (R.err) { verdict.className = 'w-verdict bad'; verdict.textContent = 'Bits lost: the channel is too narrow for this bit rate and pattern.'; }
      else if (B < N / 2 - 1e-9) { verdict.className = 'w-verdict warn'; verdict.textContent = 'All bits read, but B < N/2: lucky pattern. 0101… would fail.'; }
      else { verdict.className = 'w-verdict ok'; verdict.textContent = 'All bits recovered.'; }
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { coeffs: coeffs, received: received, harmonicsKept: harmonicsKept };
})();
