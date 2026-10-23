/* Try it: one pulse vs a pulse train, line spectrum and sinc envelope (Lecture 2, after slide "digspectrum") */
(function () {
  'use strict';
  var TAU = 2 * Math.PI;
  /* ---------- pure maths (time in µs, frequency in MHz) ---------- */
  function sinc(x) { return Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); }
  /* complex Fourier coefficient of a 0/1 V pulse train, width tau, period T, pulse centred on t = 0 */
  function cn(n, tau, T) { return tau / T * sinc(n * tau / T); }
  /* Fourier transform of one 1 V pulse of width tau: X(f) = tau·sinc(f·tau) (V·µs) */
  function Xf(f, tau) { return tau * sinc(f * tau); }
  /* averaged amplitude density of random 0/1 NRZ bits of width tau, normalised so the theory is |sinc(f·tau)|.
     Exact transform of each segment: X(f) = tau·sinc(f·tau)·Σ (b_k − mean) e^{−j2πf·k·tau}. */
  function bitsDensity(bits, tau, freqs, seg) {
    var nSeg = Math.floor(bits.length / seg), out = freqs.map(function () { return 0; });
    var mean = bits.reduce(function (a, b) { return a + b; }, 0) / bits.length;
    for (var s = 0; s < nSeg; s++) {
      freqs.forEach(function (f, i) {
        var re = 0, im = 0, w = TAU * f * tau;
        for (var k = 0; k < seg; k++) { var b = bits[s * seg + k] - mean; re += b * Math.cos(w * k); im -= b * Math.sin(w * k); }
        var X = tau * sinc(f * tau), P = X * X * (re * re + im * im) / (seg * tau); // periodogram
        out[i] += P / nSeg;
      });
    }
    return out.map(function (P) { return Math.sqrt(P) / (Math.sqrt(tau) / 2); }); // theory: (tau/4)·sinc² → |sinc|
  }
  function randBits(n, seed) { var x = seed || 12345, b = []; for (var i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; b.push((x >> 16) & 1); } return b; }
  if (typeof window === 'undefined' || !window.DCW) {
    if (typeof module !== 'undefined') module.exports = { sinc: sinc, cn: cn, Xf: Xf, bitsDensity: bitsDensity, randBits: randBits };
    return;
  }
  var D = window.DCW, h = D.h, C = D.C;
  var FMAX = 5, TW = 10; // spectrum 0..5 MHz, time window ±10 µs

  D.register('pulse', function (root) {
    var st = { tau: 1, T: 4, mode: 'train', bits: null, dens: null, seed: 7, anim: 0 };
    var cv = D.canvas(1080, 720), g = cv.g, W = cv.w, H = cv.h, TOP = 270;
    var form = h('div', { cls: 'w-f' }), teach = h('div', { cls: 'w-verdict warn', style: 'font-size:23px;padding:10px 16px;line-height:1.3' });
    function us(v) { return D.fmtN(v, 2) + ' µs'; }
    var tauSl = D.slider('Pulse width τ', 0.2, 2, 0.05, st.tau, us, function (v) { stop(); st.tau = v; if (st.mode === 'train' && st.T < v) { st.T = v; TSl.set(v); } if (st.mode === 'bits') mkBits(false); draw(); });
    var TSl = D.slider('Period T', 0.5, 20, 0.25, st.T, us, function (v) { stop(); st.mode = 'train'; st.T = Math.max(v, st.tau); if (st.T !== v) TSl.set(st.T); draw(); });
    var oneB = D.btn('Single pulse (T → ∞)', function () { toSingle(); }, 'acc');
    function stop() { if (st.anim) { cancelAnimationFrame(st.anim); st.anim = 0; } }
    function toSingle(from) {
      stop();
      var T0 = from || (st.mode === 'train' ? st.T : 4 * st.tau), T1 = 64, t0 = null;
      st.mode = 'train'; st.T = T0;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 2600);
        st.T = T0 * Math.pow(T1 / T0, p * p); TSl.set(Math.min(20, st.T));
        if (p >= 1) { st.anim = 0; st.mode = 'single'; draw(); return; }
        draw(); st.anim = requestAnimationFrame(step);
      }
      st.anim = requestAnimationFrame(step);
    }
    function mkBits(fresh) {
      if (fresh || !st.bits) { st.seed = (st.seed * 7919 + 17) % 100003; st.bits = randBits(64 * 24, st.seed); }
      var fs = []; for (var i = 0; i <= 400; i++) fs.push(i / 400 * FMAX);
      st.dens = { f: fs, a: bitsDensity(st.bits, st.tau, fs, 64) };
    }
    function pre(tau, T, mode) { return function () { stop(); st.tau = tau; tauSl.set(tau); if (T) { st.T = T; TSl.set(T); } st.mode = mode || st.mode; if (st.mode === 'bits') mkBits(mode === 'bits'); draw(); }; }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, teach]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding:8px 20px 10px' }, [tauSl.el, TSl.el, h('div', { cls: 'w-btns', style: 'margin-top:6px' }, [oneB])]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Presets' }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [
          D.btn('One bit at 1 Mbps', pre(1, 0, 'single')), D.btn('Narrower pulse', pre(0.25)), D.btn('0101… at 1 Mbps', pre(1, 2, 'train')),
          D.btn('Periodic vs aperiodic', function () { pre(1, 2, 'train')(); toSingle(2); }), D.btn('Digital data', pre(1, 0, 'bits'))])]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 20px' }, [form])])]));

    function draw() {
      var tau = st.tau, T = st.T, mode = st.mode;
      TSl.input.disabled = mode === 'bits'; TSl.el.style.opacity = mode === 'bits' ? 0.45 : 1;
      if (mode === 'single') TSl.label.textContent = '∞'; else if (mode === 'bits') TSl.label.textContent = 'none (aperiodic)'; else TSl.label.textContent = us(T);
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      // ---- time domain
      var pl = 70, pr = 22, pt = 56, pb = 44;
      var X = function (t) { return pl + (t + TW) / (2 * TW) * (W - pl - pr); }, Y = function (v) { return pt + (1.15 - v) / 1.3 * (TOP - pt - pb); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText(mode === 'bits' ? 'Time domain: random bits, each τ wide (no period)' : mode === 'single' ? 'Time domain: a single pulse (T = ∞)' : 'Time domain: pulse train, period T', 14, 30);
      g.strokeStyle = C.grid; g.beginPath(); g.moveTo(pl, Y(1)); g.lineTo(W - pr, Y(1)); g.stroke();
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(pl, Y(0)); g.lineTo(W - pr, Y(0)); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('1 V', pl - 8, Y(1)); g.fillText('0', pl - 8, Y(0)); g.textBaseline = 'alphabetic';
      [-10, -5, 0, 5, 10].forEach(function (t) { g.textAlign = t === 10 ? 'right' : 'center'; g.fillText(t + (t === 10 ? ' µs' : ''), X(t) + (t === 10 ? 4 : 0), TOP - 14); });
      g.strokeStyle = C.blue; g.lineWidth = 3; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(X(-TW), Y(0));
      var edgesT = [];
      if (mode === 'bits') {
        var nb = Math.ceil(2 * TW / tau);
        for (var k = 0; k < nb; k++) { var a = -TW + k * tau, b = Math.min(TW, a + tau), v = st.bits[k]; g.lineTo(X(a), Y(v)); g.lineTo(X(b), Y(v)); }
      } else {
        var ks = mode === 'single' ? [0] : [];
        if (mode === 'train') for (var m = Math.ceil((-TW - tau) / T); m * T - tau / 2 <= TW; m++) ks.push(m);
        ks.forEach(function (m) { var c = m * T; if (mode === 'single') c = 0; var a = Math.max(-TW, c - tau / 2), b = Math.min(TW, c + tau / 2); if (b <= a) return; g.lineTo(X(a), Y(0)); g.lineTo(X(a), Y(1)); g.lineTo(X(b), Y(1)); g.lineTo(X(b), Y(0)); edgesT.push(c); });
      }
      g.lineTo(X(TW), Y(0)); g.stroke();
      // τ and T markers
      g.font = '600 20px ' + D.SANS; g.fillStyle = C.orange; g.strokeStyle = C.orange; g.lineWidth = 2;
      function arrow(t1, t2, y, lab) {
        g.beginPath(); g.moveTo(X(t1), y); g.lineTo(X(t2), y); g.stroke();
        [[t1, 1], [t2, -1]].forEach(function (p) { g.beginPath(); g.moveTo(X(p[0]), y); g.lineTo(X(p[0]) + 9 * p[1], y - 5); g.lineTo(X(p[0]) + 9 * p[1], y + 5); g.closePath(); g.fill(); });
        g.textAlign = 'center'; g.fillText(lab, (X(t1) + X(t2)) / 2, y - 9);
      }
      if (mode !== 'bits') {
        var tw = X(tau / 2) - X(-tau / 2);
        if (tw > 26) arrow(-tau / 2, tau / 2, Y(1) - 14, 'τ'); else { g.textAlign = 'left'; g.fillText('τ', X(tau / 2) + 6, Y(1) - 10); }
        if (mode === 'train' && T <= TW && T > tau) { g.strokeStyle = C.navy; g.fillStyle = C.navy; arrow(0, T, Y(0.45), 'T = ' + us(T)); }
      } else { g.textAlign = 'left'; g.fillText('τ = ' + us(tau) + ' per bit', X(-TW) + 8, Y(1) - 14); }
      // ---- spectrum
      var fl = 70, fr = 26, sTop = TOP + 72, sBot = H - 46;
      var FX = function (f) { return fl + f / FMAX * (W - fl - fr); };
      g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(10, TOP); g.lineTo(W - 10, TOP); g.stroke();
      var head = mode === 'train' ? 'Periodic → discrete spikes at n/T (Fourier series)' : mode === 'single' ? 'Aperiodic → continuous spectrum (Fourier transform)' : 'Random bits are aperiodic → continuous spectrum';
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(head, 14, TOP + 30);
      var peak = mode === 'train' ? tau / T : mode === 'single' ? tau : 1;
      var FY = function (a) { return sBot - a / (peak * 1.1) * (sBot - sTop); };
      // B ≈ 1/τ band
      var fz = 1 / tau;
      g.fillStyle = 'rgba(240,163,94,.16)'; g.fillRect(FX(0), sTop - 26, Math.min(FX(fz), FX(FMAX)) - FX(0), sBot - sTop + 26);
      // axes
      g.strokeStyle = C.gray; g.lineWidth = 1.5; g.beginPath(); g.moveTo(fl, sBot); g.lineTo(W - fr, sBot); g.moveTo(fl, sBot); g.lineTo(fl, sTop - 10); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      for (var tf = 0; tf <= FMAX; tf++) { g.fillText(String(tf), FX(tf), sBot + 26); g.beginPath(); g.moveTo(FX(tf), sBot); g.lineTo(FX(tf), sBot + 6); g.stroke(); }
      g.textAlign = 'right'; g.fillText('MHz', fl - 14, sBot + 26);
      g.textBaseline = 'middle'; g.fillText(D.fmtN(peak, 3), fl - 6, FY(peak)); g.fillText('0', fl - 6, sBot); g.textBaseline = 'alphabetic';
      g.strokeStyle = C.grid; g.beginPath(); g.moveTo(fl, FY(peak)); g.lineTo(W - fr, FY(peak)); g.stroke();
      // envelope (dashed)
      g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath();
      for (var i = 0; i <= 600; i++) { var f = i / 600 * FMAX, e = peak * Math.abs(sinc(f * tau)); i ? g.lineTo(FX(f), FY(e)) : g.moveTo(FX(f), FY(e)); }
      g.stroke(); g.setLineDash([]);
      var nLines = 0;
      if (mode === 'train') {
        var f0 = 1 / T, wpx = Math.max(2, Math.min(10, (FX(f0) - FX(0)) * 0.45));
        g.fillStyle = C.orange;
        for (var n = 0; n * f0 <= FMAX + 1e-9; n++) { var c = Math.abs(cn(n, tau, T)); if (n * f0 < fz - 1e-9) nLines++; g.fillRect(FX(n * f0) - wpx / 2, FY(c), wpx, sBot - FY(c)); }
        if (f0 >= 0.4) { g.font = '600 20px ' + D.MONO; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('c₀ = τ/T = ' + D.fmtN(tau / T, 3), FX(0) + 10, FY(peak) - 8); }
      } else if (mode === 'single') {
        g.fillStyle = 'rgba(201,117,46,.35)'; g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(FX(0), sBot);
        for (var j = 0; j <= 600; j++) { var ff = j / 600 * FMAX; g.lineTo(FX(ff), FY(Math.abs(Xf(ff, tau)))); }
        g.lineTo(FX(FMAX), sBot); g.closePath(); g.fill(); g.stroke();
      } else {
        g.strokeStyle = C.orange; g.lineWidth = 2; g.beginPath();
        st.dens.f.forEach(function (f, q) { var y = FY(Math.min(1.08, st.dens.a[q])); q ? g.lineTo(FX(f), y) : g.moveTo(FX(f), y); }); g.stroke();
        g.beginPath(); g.moveTo(FX(0), sBot); g.lineTo(FX(0), sTop - 4); g.lineWidth = 4; g.stroke();
      }
      // first zero
      if (fz <= FMAX + 1e-9) {
        var zx = FX(fz); g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(zx, sTop - 26); g.lineTo(zx, sBot); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.red; g.beginPath(); g.arc(zx, sBot, 7, 0, TAU); g.fill();
        g.font = '600 20px ' + D.SANS; var lab = 'first zero 1/τ = ' + D.fmtN(fz, 2) + ' MHz', lw = g.measureText(lab).width;
        g.textAlign = zx + 10 + lw > W - fr ? 'right' : 'left'; g.fillText(lab, g.textAlign === 'right' ? zx - 10 : zx + 10, sTop - 8);
      }
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right';
      g.fillText(mode === 'train' ? '|cₙ| = (τ/T)·|sinc(nτ/T)|,  - - envelope' : mode === 'single' ? '|X(f)| = τ·|sinc(fτ)| (V·µs)' : 'measured from 1,536 random bits (+ DC line at 0)', W - fr, TOP + 30);
      // ---- formulas
      var s = '', G = '<span style="color:' + C.gray + '">', E = '</span>';
      if (mode === 'train') s += G + 'line spacing:' + E + ' f₀ = 1/T\n  = 1/' + D.fmtN(T, 2) + ' µs = <b>' + D.fmtN(1 / T, 3) + ' MHz</b>\n';
      else if (mode === 'single') s += G + 'line spacing:' + E + ' f₀ = 1/T\n  = 1/∞ → <b>0</b>: a continuous spectrum\n';
      else s += G + 'no period:' + E + ' <b>continuous</b> spectrum\n' + G + 'bit rate:' + E + ' N = 1/τ = ' + D.fmtN(1 / tau, 2) + ' Mbps\n';
      s += G + 'first zero:' + E + ' 1/τ = 1/' + D.fmtN(tau, 2) + ' µs = <b>' + D.fmtN(fz, 2) + ' MHz</b>\n';
      if (mode === 'train') s += G + 'duty cycle:' + E + ' τ/T = ' + D.fmtN(tau, 2) + '/' + D.fmtN(T, 2) + ' = <b>' + D.fmtN(tau / T, 3) + '</b>\n';
      else if (mode === 'single') s += G + 'duty cycle:' + E + ' τ/T = ' + D.fmtN(tau, 2) + '/∞ → <b>0</b>\n';
      s += G + 'bandwidth:' + E + ' B ≈ 1/τ = <b>' + D.fmtN(fz, 2) + ' MHz</b>';
      if (mode === 'train') s += '\n' + G + 'lines below the first zero:' + E + ' <b>' + nLines + '</b>';
      form.innerHTML = s;
      teach.innerHTML = '<b>Time–frequency trade-off:</b> τ = ' + us(tau) + ' → first zero at ' + D.fmtN(fz, 2) + ' MHz. Halve τ to ' + D.fmtN(tau / 2, 3) + ' µs' + ' and the spectrum doubles in width (' + D.fmtN(2 * fz, 2) + ' MHz): <b>shorter pulses need more bandwidth.</b>';
    }
    draw();
  });
})();
