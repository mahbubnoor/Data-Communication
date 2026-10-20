/* Try it: delta modulation, step by step (Lecture 5, after slide "delta"). Slides "delta", "quantize"; PCM Lab tab 3. */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  /*PURE*/
  // x(t) = A sin(2π f t); f and fs in kHz, t in ms, A and δ in V. Encoder as in the lab:
  // at each sample compare x with the staircase: x > y → bit 1, y += δ; otherwise bit 0, y −= δ.
  // Simulation starts one cycle before the shown window (staircase 0, signal 0) so the LPF has history.
  function dmRun(A, f, fs, dl) {
    var T = 1 / f, pre = T, show = 2 * T, post = T;
    var k0 = Math.ceil(pre * fs), N = Math.round(show * fs), k1 = Math.ceil(post * fs);
    var tot = k0 + N + k1, y = 0, xs = [], ys = [], bs = [];
    for (var k = 0; k < tot; k++) {
      var t = (k - k0) / fs, x = A * Math.sin(2 * Math.PI * f * t);
      var b = x > y ? 1 : 0; y += b ? dl : -dl;
      xs.push(x); ys.push(y); bs.push(b);
    }
    // classify each sample: slope overload = staircase more than one step away and still stepping the same way;
    // granular (hunting) = three bits in a row alternate (…1 0 1… / …0 1 0…)
    var cls = [];
    for (k = 0; k < tot; k++) {
      var over = Math.abs(xs[k] - ys[k]) > dl && k > 0 && bs[k] === bs[k - 1];
      var gran = !over && k > 1 && bs[k] !== bs[k - 1] && bs[k - 1] !== bs[k - 2];
      cls.push(over ? 2 : gran ? 1 : 0);
    }
    // demodulator: windowed-sinc low-pass (Hamming), cut-off fc = 2f (capped below fs/2), applied to the staircase
    // values; output belongs to the centre of each hold interval, t_k + Ts/2.
    var fc = Math.min(2 * f, 0.45 * fs), M = Math.min(Math.ceil(3 * fs / fc), 600), hk = [], s = 0;
    for (var m = -M; m <= M; m++) {
      var u = 2 * fc / fs * m, sinc = m === 0 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
      var w = 0.54 + 0.46 * Math.cos(Math.PI * m / (M + 1)); hk.push(sinc * w); s += sinc * w;
    }
    hk = hk.map(function (v) { return v / s; });
    var lp = [];
    for (k = 0; k < tot; k++) {
      var acc = 0;
      for (m = -M; m <= M; m++) { var j = Math.min(tot - 1, Math.max(0, k + m)); acc += hk[m + M] * ys[j]; }
      lp.push(acc);
    }
    // keep the shown window only
    var o = { N: N, x: [], y: [], b: [], c: [], lp: [], xl: [], yPrev: ys[k0 - 1] };
    var sx = 0, se = 0, nOver = 0, nGran = 0;
    for (k = k0; k < k0 + N; k++) {
      o.x.push(xs[k]); o.y.push(ys[k]); o.b.push(bs[k]); o.c.push(cls[k]); o.lp.push(lp[k]);
      var tl = (k - k0 + 0.5) / fs, xl = A * Math.sin(2 * Math.PI * f * tl); o.xl.push(xl);
      sx += xl * xl; se += (lp[k] - xl) * (lp[k] - xl);
      if (cls[k] === 2) nOver++; if (cls[k] === 1) nGran++;
    }
    o.nOver = nOver; o.nGran = nGran; o.snr = 10 * Math.log10(sx / Math.max(se, 1e-30));
    o.maxSlope = 2 * Math.PI * f * A;   // V/ms (f in kHz)
    o.stairSlope = dl * fs;             // V/ms (fs in kHz)
    o.overload = o.stairSlope < o.maxSlope;
    o.dMin = o.maxSlope / fs;           // smallest δ without overload
    return o;
  }
  /*END*/

  function num(x, d) { return D.fmtN(x, d === undefined ? 2 : d); }
  function kbps(r) { return r >= 1000 ? num(r / 1000, 3) + ' Mbps' : num(r, 2) + ' kbps'; }
  var PRE = {
    ok: { A: 1, f: 1, fs: 32, dl: 0.25 },
    over: { A: 1, f: 1, fs: 32, dl: 0.1 },
    gran: { A: 0.2, f: 1, fs: 32, dl: 0.4 },
    fine: { A: 1, f: 1, fs: 128, dl: 0.06 }
  };

  D.register('deltamod', function (root) {
    var st = { A: 1, f: 1, fs: 32, dl: 0.25 }, key = 'ok';
    var cv = D.canvas(1080, 770);
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var verdict = h('div', { cls: 'w-verdict' });
    var sA = D.slider('Amplitude A', 0.1, 2, 0.1, st.A, function (v) { return num(v, 1) + ' V'; }, function (v) { st.A = v; mark(null); draw(); });
    var sF = D.slider('Signal frequency f', 0.5, 2, 0.25, st.f, function (v) { return num(v, 2) + ' kHz'; }, function (v) { st.f = v; mark(null); draw(); });
    var sD = D.slider('Step size δ', 0.02, 0.5, 0.01, st.dl, function (v) { return num(v, 2) + ' V'; }, function (v) { st.dl = v; mark(null); draw(); });
    var sS = D.slider('Sampling rate fs', 16, 128, 4, st.fs, function (v) { return v + ' kHz'; }, function (v) { st.fs = v; mark(null); draw(); });
    var seg = D.seg([['ok', 'No overload'], ['over', 'Slope overload'], ['gran', 'Granular noise'], ['fine', 'Small δ, fast fs']], key, function (k) {
      key = k; st = Object.assign({}, PRE[k]); sA.set(st.A); sF.set(st.f); sD.set(st.dl); sS.set(st.fs); draw();
    });
    function mark(k) { key = k; seg.set(k); }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px;align-items:flex-start' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [
        h('div', { cls: 'w-btns', style: 'gap:8px;align-items:center' }, [h('span', { text: 'Presets:', style: 'font-size:24px;font-weight:600;color:' + C.navy }), seg.el]),
        cv.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding-top:10px;padding-bottom:0' }, [sA.el, sF.el, sD.el, sS.el]),
        h('div', { cls: 'w-card', style: 'padding:12px 18px' }, [form]), verdict,
        h('p', { cls: 'w-note', text: 'Red: staircase more than δ behind and still stepping one way. Amber: bits alternate 1 0 1 (hunting).' })])]));

    function draw() {
      var o = dmRun(st.A, st.f, st.fs, st.dl), N = o.N, g = cv.g, W = cv.w, H = cv.h;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var x0 = 20, x1 = W - 20, cw = (x1 - x0) / N;
      var X = function (kk) { return x0 + kk * cw; };          // kk in samples from window start
      // ---------- panel 1: signal + staircase
      var p1t = 46, p1b = 380, mid1 = (p1t + p1b) / 2;
      var R = 1.15 * Math.max(st.A, Math.max.apply(null, o.y.map(Math.abs)), Math.abs(o.yPrev));
      var Y1 = function (v) { return mid1 - v / R * (p1b - p1t) / 2; };
      for (var k = 0; k < N; k++) {
        if (o.c[k] === 2) { g.fillStyle = '#f8d3ce'; g.fillRect(X(k), p1t, cw + 0.5, p1b - p1t); }
        else if (o.c[k] === 1) { g.fillStyle = '#f4e6c4'; g.fillRect(X(k), p1t, cw + 0.5, p1b - p1t); }
      }
      g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, mid1); g.lineTo(x1, mid1); g.stroke();
      g.font = '600 22px ' + D.SANS; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = C.navy; g.fillText('Encoder:', x0, 22);
      g.fillStyle = C.blue; g.fillText('signal x(t)', x0 + 104, 22);
      g.fillStyle = C.orange; g.fillText('staircase (±δ per sample)', x0 + 240, 22);
      g.fillStyle = '#c0392b'; g.fillRect(x0 + 540, 12, 20, 20); g.fillStyle = C.ink; g.font = '500 20px ' + D.SANS; g.fillText('slope overload', x0 + 566, 22);
      g.fillStyle = '#d9a23a'; g.fillRect(x0 + 720, 12, 20, 20); g.fillStyle = C.ink; g.fillText('granular noise (hunting)', x0 + 746, 22);
      g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath();
      for (var i = 0; i <= 600; i++) { var kk = i / 600 * N, v = st.A * Math.sin(2 * Math.PI * st.f * kk / st.fs); if (i) g.lineTo(X(kk), Y1(v)); else g.moveTo(X(kk), Y1(v)); }
      g.stroke();
      g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), Y1(o.yPrev));
      for (k = 0; k < N; k++) { g.lineTo(X(k), Y1(o.y[k])); g.lineTo(X(k + 1), Y1(o.y[k])); }
      g.stroke();
      if (N <= 96) { g.fillStyle = C.orange; for (k = 0; k < N; k++) { g.beginPath(); g.arc(X(k), Y1(o.x[k]), 3, 0, 7); g.fill(); } }
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right';
      g.fillText('+' + num(R / 1.15, 2) + ' V', x1, p1t + 12); g.fillText('2 cycles = ' + num(2 / st.f, 3) + ' ms', x1, p1b - 12);
      // ---------- panel 2: bits
      var bt = 400, bh = 54;
      g.font = '600 22px ' + D.SANS; g.textAlign = 'left'; g.fillStyle = C.navy;
      g.fillText('Bit stream (1 = step up, 0 = step down): ' + N + ' bits for 2 cycles', x0, bt - 2 + 0);
      var by = bt + 18;
      for (k = 0; k < N; k++) {
        g.fillStyle = o.b[k] ? C.orange : '#dfe5ec';
        g.fillRect(X(k) + (cw > 6 ? 1 : 0), by, Math.max(cw - (cw > 6 ? 2 : 0), 0.8), bh);
        if (cw >= 13) { g.fillStyle = o.b[k] ? '#fff' : C.navy; g.font = '600 20px ' + D.MONO; g.textAlign = 'center'; g.fillText(o.b[k], X(k + 0.5), by + bh / 2 + 1); }
      }
      if (cw < 13) { g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('too many to print: orange = 1, grey = 0', x1, bt - 2); }
      // ---------- panel 3: demodulator
      var p3t = 520, p3b = H - 16, mid3 = (p3t + p3b) / 2;
      var R3 = 1.1 * Math.max(st.A, Math.max.apply(null, o.lp.map(Math.abs)), Math.max.apply(null, o.y.map(Math.abs)), Math.abs(o.yPrev));
      var Y3 = function (v) { return mid3 - v / R3 * (p3b - p3t) / 2; };
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(x0, p3t - 26); g.lineTo(x1, p3t - 26); g.stroke();
      g.textAlign = 'left'; g.font = '600 22px ' + D.SANS;
      g.fillStyle = C.navy; g.fillText('Decoder:', x0, p3t - 2);
      g.fillStyle = C.blue; g.fillText('original', x0 + 104, p3t - 2);
      g.fillStyle = C.orange; g.fillText('staircase → low-pass filter (cut-off 2f)', x0 + 214, p3t - 2);
      g.strokeStyle = C.grid; g.beginPath(); g.moveTo(x0, mid3); g.lineTo(x1, mid3); g.stroke();
      g.strokeStyle = 'rgba(166,79,21,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), Y3(o.yPrev));
      for (k = 0; k < N; k++) { g.lineTo(X(k), Y3(o.y[k])); g.lineTo(X(k + 1), Y3(o.y[k])); }
      g.stroke();
      g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath();
      for (i = 0; i <= 600; i++) { kk = i / 600 * N; v = st.A * Math.sin(2 * Math.PI * st.f * kk / st.fs); if (i) g.lineTo(X(kk), Y3(v)); else g.moveTo(X(kk), Y3(v)); }
      g.stroke();
      g.strokeStyle = C.orange; g.lineWidth = 4; g.beginPath();
      for (k = 0; k < N; k++) { if (k) g.lineTo(X(k + 0.5), Y3(o.lp[k])); else g.moveTo(X(k + 0.5), Y3(o.lp[k])); }
      g.stroke();
      g.font = '600 22px ' + D.MONO; g.textAlign = 'right'; g.fillStyle = o.snr >= 15 ? C.green : C.red;
      g.fillText('output SNR ≈ ' + num(o.snr, 1) + ' dB', x1, p3t - 2);

      // ---------- formulas
      var nP = 8, fsP = 2 * st.f, rP = nP * fsP, rD = st.fs;
      form.innerHTML =
        'max signal slope = 2πfA\n  = 2π × ' + num(st.f, 2) + ' kHz × ' + num(st.A, 1) + ' V = <b>' + num(o.maxSlope, 2) + ' V/ms</b>\n' +
        'staircase slope = δ·fs\n  = ' + num(st.dl, 2) + ' V × ' + st.fs + ' kHz = <b>' + num(o.stairSlope, 2) + ' V/ms</b>\n' +
        'no overload needs δ ≥ 2πfA/fs = ' + num(o.dMin, 3) + ' V\n' +
        'DM bit rate = 1 × fs = <b>' + kbps(rD) + '</b>\n' +
        'PCM (n = 8 at 2f): ' + nP + ' × ' + num(fsP, 2) + ' kHz = <b>' + kbps(rP) + '</b>\n' +
        'overload ' + o.nOver + '/' + N + ' · hunting ' + o.nGran + '/' + N;
      if (o.overload) { verdict.className = 'w-verdict bad'; verdict.textContent = 'Overload: ' + num(o.stairSlope, 2) + ' < ' + num(o.maxSlope, 2) + ' V/ms. Raise δ or fs.'; }
      else if (o.nGran > 0.5 * N) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Keeps up, but δ is big: granular noise. Try a smaller δ.'; }
      else { verdict.className = 'w-verdict ok'; verdict.textContent = 'No slope overload: ' + num(o.stairSlope, 2) + ' ≥ ' + num(o.maxSlope, 2) + ' V/ms.'; }
    }
    draw();
  });
})();
