(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;

  /* ---- pure functions (same two-path model as the lab, tab 2) ---- */
  var c0 = 3e8;
  function mpGain(f, tau, a) { var ph = 2 * Math.PI * f * tau; return Math.hypot(1 + a * Math.cos(ph), a * Math.sin(ph)); } // |1 + a e^(−j2πfτ)|
  function db(x) { return 20 * Math.log10(Math.max(x, 1e-6)); }
  if (typeof module !== 'undefined') module.exports = { mpGain: mpGain };

  var B = 20e6, RS = 20e6; // 20 MHz channel, 20 Msymbols/s (slide multipath)
  var PRE = {
    slide: { L: 30, fine: 0, a: 0.8, f: 2.4 },
    short: { L: 1, fine: 0, a: 0.8, f: 2.4 },
    fade: { L: 30, fine: 6.25, a: 0.8, f: 2.4 },
    long: { L: 300, fine: 0, a: 0.8, f: 2.4 }
  };

  D.register('multipath', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.slide));
    var wv = D.canvas(1080, 360), fr = D.canvas(1080, 470);
    function clr() { pre.set(''); }
    var lSl = D.slider('Extra path of the echo', 0, 300, 1, st.L, function (v) { return fmtN(v, 0) + ' m'; }, function (v) { st.L = v; clr(); draw(); });
    var fSl = D.slider('+ fine shift', 0, 35, 0.25, 0, function (v) { return fmtN(v, 2) + ' cm'; }, function (v) { st.fine = v; clr(); draw(); });
    var aSl = D.slider('Echo strength a', 0, 1, 0.05, st.a, function (v) { return fmtN(v, 2) + ' × direct'; }, function (v) { st.a = v; clr(); draw(); });
    var cSl = D.slider('Carrier frequency', 0.8, 6, 0.01, st.f, function (v) { return fmtN(v, 2) + ' GHz'; }, function (v) { st.f = v; clr(); draw(); });
    var pre = D.seg([['slide', '30 m echo'], ['fade', '30 m + λ/2'], ['short', '1 m echo'], ['long', '300 m echo']], 'slide', function (k) {
      st = JSON.parse(JSON.stringify(PRE[k])); lSl.set(st.L); fSl.set(st.fine); aSl.set(st.a); cSl.set(st.f); draw();
    });
    [].forEach.call(pre.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:7px 12px'; });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [wv.c, fr.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding-top:12px;padding-bottom:12px' }, [pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding-top:8px;padding-bottom:4px' }, [lSl.el, fSl.el, aSl.el, cSl.el]),
        h('div', { cls: 'w-card', style: 'padding-top:12px;padding-bottom:12px' }, [form]),
        verdict])
    ]));

    function panel(cv) { var g = cv.g; g.clearRect(0, 0, cv.w, cv.h); g.fillStyle = C.panel; g.fillRect(0, 0, cv.w, cv.h); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, cv.w - 1, cv.h - 1); return g; }

    function draw() {
      var fc = st.f * 1e9, lam = c0 / fc, dL = st.L + st.fine / 100, tau = dL / c0, a = st.a;
      var phi = 2 * Math.PI * dL / lam, cyc = dL / lam, frac = cyc - Math.floor(cyc), deg = frac * 360;
      var amp = mpGain(fc, tau, a), pdb = db(amp);
      /* ---- waves at the carrier ---- */
      var g = panel(wv), w = wv.w, hh = wv.h, x0 = 150, x1 = w - 24, N = 3; // 3 carrier cycles
      var X = function (u) { return x0 + u / N * (x1 - x0); };
      var A1 = 50;
      g.font = '600 21px ' + SANS; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = C.navy; g.fillText('At the carrier, ' + fmtN(st.f, 2) + ' GHz (λ = ' + fmtN(lam * 100, 2) + ' cm): three cycles', 16, 22);
      // axes
      [96, 244].forEach(function (y) { g.strokeStyle = C.line; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); });
      function wave(y, A, ph, col, wd, dash) {
        g.strokeStyle = col; g.lineWidth = wd; g.setLineDash(dash || []); g.beginPath();
        for (var i = 0; i <= 600; i++) { var u = i / 600 * N, yy = y - A * Math.cos(2 * Math.PI * u - ph); i ? g.lineTo(X(u), yy) : g.moveTo(X(u), yy); }
        g.stroke(); g.setLineDash([]);
      }
      wave(96, A1, 0, C.blue, 3.5);
      if (a > 0) wave(96, A1 * a, phi, C.gray, 3.5, [10, 7]);
      // sum = Re{(1 + a e^{-jφ}) e^{jωt}}
      var re = 1 + a * Math.cos(phi), im = a * Math.sin(phi), sA = Math.hypot(re, im), sPh = Math.atan2(im, re);
      var sScale = 40; // 1.0 amplitude = 46 px, so 2.0 fits
      g.strokeStyle = 'rgba(166,79,21,.25)'; g.setLineDash([4, 6]); g.lineWidth = 1.5;
      [1, -1].forEach(function (s) { g.beginPath(); g.moveTo(x0, 244 - s * sScale); g.lineTo(x1, 244 - s * sScale); g.stroke(); }); g.setLineDash([]);
      wave(244, sScale * sA, sPh, C.orange, 4.5);
      g.font = '600 21px ' + SANS; g.textAlign = 'right';
      g.fillStyle = C.blue; g.fillText('direct', x0 - 14, 80); g.fillStyle = C.gray; g.fillText('echo', x0 - 14, 112);
      g.fillStyle = C.orange; g.fillText('sum', x0 - 14, 248); g.font = '500 20px ' + MONO; g.fillText(fmtN(sA, 2) + '×', x0 - 14, 274);
      var kind = deg < 60 || deg > 300 ? 'constructive' : (deg > 120 && deg < 240 ? 'destructive' : 'partial');
      g.textAlign = 'right'; g.font = '600 21px ' + SANS; g.fillStyle = kind === 'destructive' ? C.red : (kind === 'constructive' ? C.green : C.orange);
      g.fillText('echo lags ' + fmtN(cyc, 2) + ' cycles → ' + fmtN(deg, 0) + '° → ' + kind + ' (' + (pdb >= 0 ? '+' : '') + fmtN(pdb, 1) + ' dB)', x1, hh - 16);

      /* ---- received power across frequency ---- */
      g = panel(fr); w = fr.w; hh = fr.h;
      var span = 40e6, f0 = fc - span / 2, px0 = 92, px1 = w - 24, py0 = 82, py1 = hh - 76, dTop = 8, dBot = -30;
      var FX = function (f) { return px0 + (f - f0) / span * (px1 - px0); }, FY = function (v) { return py0 + (dTop - Math.max(dBot, Math.min(dTop, v))) / (dTop - dBot) * (py1 - py0); };
      g.fillStyle = 'rgba(159,193,230,.28)'; g.fillRect(FX(fc - B / 2), py0 - 32, FX(fc + B / 2) - FX(fc - B / 2), py1 - py0 + 32);
      g.font = '500 20px ' + MONO; g.textBaseline = 'middle'; g.textAlign = 'right';
      [6, 0, -10, -20, -30].forEach(function (v) {
        g.strokeStyle = v === 0 ? '#9aa5b1' : C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(px0, FY(v)); g.lineTo(px1, FY(v)); g.stroke();
        g.fillStyle = C.gray; g.fillText((v > 0 ? '+' : '') + fmtN(v, 0), px0 - 10, FY(v));
      });
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (var m = -20; m <= 20; m += 10) g.fillText((m > 0 ? '+' : '') + m + ' MHz', Math.max(px0 + 40, Math.min(px1 - 50, FX(fc + m * 1e6))), py1 + 18);
      g.font = '600 20px ' + SANS; g.fillStyle = C.gray; g.fillText('frequency (relative to the carrier ' + fmtN(st.f, 2) + ' GHz)', (px0 + px1) / 2, hh - 26);
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = C.navy; g.font = '600 21px ' + SANS;
      g.fillText('Received power (dB, relative to the direct wave alone) across frequency', 16, 26);
      g.fillStyle = C.blue; g.textAlign = 'center'; g.fillText('your 20 MHz channel', FX(fc), py0 - 16);
      // curve
      g.save(); g.beginPath(); g.rect(px0, py0 - 4, px1 - px0, py1 - py0 + 8); g.clip();
      g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath();
      var mn = 1e9, mx = -1e9;
      for (var i = 0; i <= 2400; i++) {
        var f = f0 + i / 2400 * span, val = db(mpGain(f, tau, a)), y = FY(val);
        i ? g.lineTo(FX(f), y) : g.moveTo(FX(f), y);
        if (f >= fc - B / 2 && f <= fc + B / 2) { mn = Math.min(mn, val); mx = Math.max(mx, val); }
      }
      g.stroke(); g.restore();
      // notches inside the channel
      var nIn = 0;
      if (a > 0 && tau > 0) {
        var kmin = Math.ceil((fc - B / 2) * tau - 0.5), kmax = Math.floor((fc + B / 2) * tau - 0.5);
        nIn = Math.max(0, kmax - kmin + 1);
        if (nIn <= 12) for (var k = kmin; k <= kmax; k++) { var fn = (k + 0.5) / tau; g.fillStyle = C.red; g.beginPath(); g.moveTo(FX(fn), py1 + 2); g.lineTo(FX(fn) - 8, py1 + 14); g.lineTo(FX(fn) + 8, py1 + 14); g.fill(); }
      }
      // carrier dot
      g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.arc(FX(fc), FY(pdb), 9, 0, 7); g.fill(); g.stroke();
      // notch spacing bracket (when 2+ notches visible)
      var sp = tau > 0 ? 1 / tau : Infinity;
      if (a > 0 && sp < span && sp > 2e6) {
        var kk = Math.ceil((fc - B / 2) * tau - 0.5), fa = (kk + 0.5) / tau, fb = fa + sp;
        if (FX(fb) <= px1) {
          var yb = FY(dBot) - 26; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(FX(fa), yb + 8); g.lineTo(FX(fa), yb); g.lineTo(FX(fb), yb); g.lineTo(FX(fb), yb + 8); g.stroke();
          g.fillStyle = C.navy; g.font = '600 20px ' + SANS; g.textAlign = 'center'; g.fillText('1/τ = ' + fmtN(sp / 1e6, 2) + ' MHz', (FX(fa) + FX(fb)) / 2, yb - 14);
        }
      }
      /* ---- text ---- */
      var swing = mx - mn, worst = a >= 1 ? '−∞' : fmtN(db(1 - a), 1);
      form.innerHTML = 'τ = ΔL / c = ' + fmtN(dL, 4) + ' m / 3×10⁸\n  = <b>' + (tau >= 1e-6 ? fmtN(tau * 1e6, 3) + ' µs' : fmtN(tau * 1e9, 2) + ' ns') + '</b>\n' +
        'Notch spacing 1/τ = <b>' + (sp === Infinity ? '∞' : sp >= 1e9 ? fmtN(sp / 1e9, 2) + ' GHz' : fmtN(sp / 1e6, 2) + ' MHz') + '</b>\n' +
        'Notches in 20 MHz: <b>' + nIn + '</b>, swing ' + fmtN(swing, 1) + ' dB\n' +
        'Worst fade 20log(1 − ' + fmtN(a, 2) + ') = ' + worst + ' dB\n' +
        'Echo ÷ symbol (50 ns) = ' + fmtN(tau * RS, 2);
      if (swing < 3) { verdict.className = 'w-verdict ok'; verdict.textContent = 'Flat: the whole channel rises or falls together (' + fmtN(swing, 1) + ' dB across 20 MHz).'; }
      else { verdict.className = 'w-verdict bad'; verdict.textContent = 'Frequency-selective: parts of the channel fade by up to ' + fmtN(swing, 1) + ' dB.'; }
    }
    draw();
  });
})();
