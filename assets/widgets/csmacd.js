(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;

  /* ---- pure functions ---- */
  // A at x = 0 starts at t = 0; B at x = d starts at tB (< Tp, before A's first bit arrives)
  function cdCalc(d, v, R, bits, frac) {
    var Tp = d / v, tB = frac * Tp, Tfr = bits / R;
    var tm = (Tp + tB) / 2, xm = v * tm;          // A's front x = v t meets B's front x = d − v (t − tB)
    var tBdet = Tp, tAdet = tB + Tp;              // B hears A's first bit; A hears B's first bit
    return { Tp: Tp, tB: tB, Tfr: Tfr, tm: tm, xm: xm, tBdet: tBdet, tAdet: tAdet, minBits: 2 * Tp * R,
      aStill: Tfr >= tAdet * (1 - 1e-9), safe: Tfr >= 2 * Tp * (1 - 1e-9), maxLen: Tfr / 2 * v };
  }
  function sig3(x) { if (!x) return 0; var p = Math.pow(10, Math.floor(Math.log10(Math.abs(x))) - 2); return Math.round(x / p) * p; }
  function tfmt(s) { // seconds → µs / ns / ms text
    var a = Math.abs(s);
    if (a >= 1e-3) return fmtN(s * 1e3, 3) + ' ms';
    if (a >= 1e-6) return fmtN(s * 1e6, a >= 1e-4 ? 1 : 2) + ' µs';
    return fmtN(s * 1e9, 1) + ' ns';
  }
  function rfmt(R) { return R >= 1e9 ? fmtN(R / 1e9, 2) + ' Gbps' : fmtN(R / 1e6, 2) + ' Mbps'; }
  function dfmt(d) { return d >= 1000 ? fmtN(d / 1000, 3) + ' km' : fmtN(d, 1) + ' m'; }
  if (typeof module !== 'undefined') module.exports = { cdCalc: cdCalc };

  var PRE = {
    e5: { d: 5120, v: 2e8, R: 10e6, B: 64, f: 0.9 },
    fe: { d: 512, v: 2e8, R: 100e6, B: 64, f: 0.9 },
    ge: { d: 51.2, v: 2e8, R: 1e9, B: 64, f: 0.9 },
    ck: { d: 2000, v: 2e8, R: 100e6, B: 64, f: 0.9 }
  };

  D.register('csmacd', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.e5));
    var cv = D.canvas(1080, 640);
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    function clr() { pre.set(''); }
    var dSl = D.slider('Cable length d', 1, 4, 0.005, Math.log10(st.d), function () { return ''; }, function (v) { st.d = sig3(Math.pow(10, v)); clr(); draw(); });
    var vSl = D.slider('Propagation speed v', 1, 3, 0.1, 2, function () { return ''; }, function (v) { st.v = v * 1e8; clr(); draw(); });
    var rSl = D.slider('Data rate R', 0, 3, 0.01, 1, function () { return ''; }, function (v) { st.R = sig3(Math.pow(10, v)) * 1e6; clr(); draw(); });
    var bSl = D.slider('Frame size', 8, 1500, 1, 64, function () { return ''; }, function (v) { st.B = v; clr(); draw(); });
    var fSl = D.slider('B starts at', 0, 0.99, 0.01, 0.9, function () { return ''; }, function (v) { st.f = v; clr(); draw(); });
    var pre = D.seg([['e5', 'Ex. 12.5'], ['fe', '100 Mbps, 512 m'], ['ge', '1 Gbps, 51.2 m'], ['ck', '100 Mbps, 2 km']], 'e5', function (k) {
      st = JSON.parse(JSON.stringify(PRE[k])); dSl.set(Math.log10(st.d)); vSl.set(st.v / 1e8); rSl.set(Math.log10(st.R / 1e6)); bSl.set(st.B); fSl.set(st.f); draw();
    });
    [].forEach.call(pre.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:7px 12px'; });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding-top:10px;padding-bottom:10px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding-top:12px;padding-bottom:12px' }, [pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding-top:8px;padding-bottom:4px' }, [dSl.el, vSl.el, rSl.el, bSl.el, fSl.el]),
        verdict,
        h('p', { cls: 'w-note', html: 'Worst case: B starts just before A\'s first bit arrives (tB → Tp). The news needs another Tp to travel back, so A must still be sending at 2Tp: <b>Tfr ≥ 2Tp</b>, minimum frame = 2Tp × R.' })])
    ]));

    function draw() {
      var r = cdCalc(st.d, st.v, st.R, st.B * 8, st.f);
      dSl.label.textContent = dfmt(st.d); vSl.label.textContent = fmtN(st.v / 1e8, 1) + '×10⁸ m/s'; rSl.label.textContent = rfmt(st.R);
      bSl.label.textContent = st.B + ' B = ' + st.B * 8 + ' bits'; fSl.label.textContent = fmtN(st.f, 2) + ' Tp = ' + tfmt(r.tB);
      var g = cv.g, w = cv.w, hh = cv.h, Tp = r.Tp;
      var x0 = 250, x1 = w - 250, y0 = 112, y1 = hh - 30, tmax = 2.2 * Tp;
      var X = function (x) { return x0 + x / st.d * (x1 - x0); }, Y = function (t) { return y0 + t / tmax * (y1 - y0); };
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      // time grid and ticks (right edge)
      g.font = '500 20px ' + MONO; g.textBaseline = 'middle'; g.textAlign = 'left';
      [[0, '0'], [Tp, 'Tp'], [2 * Tp, '2Tp']].forEach(function (k) {
        g.strokeStyle = '#c9d1d9'; g.lineWidth = 1; g.setLineDash([3, 5]);
        g.beginPath(); g.moveTo(x0 - 14, Y(k[0])); g.lineTo(x1 + 14, Y(k[0])); g.moveTo(w - 152, Y(k[0])); g.lineTo(w - 12, Y(k[0])); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.gray; g.fillText(k[1] + (k[0] ? '=' + tfmt(k[0]) : ''), w - 150, Y(k[0]) - 14);
      });
      g.fillStyle = C.gray; g.font = '600 20px ' + SANS; g.fillText('time ↓', w - 150, y1 - 8);
      // cable and stations
      g.strokeStyle = C.navy; g.lineWidth = 6; g.beginPath(); g.moveTo(X(0), y0 - 44); g.lineTo(X(st.d), y0 - 44); g.stroke();
      g.font = '700 26px ' + SANS; g.textAlign = 'center';
      [[0, 'A'], [st.d, 'B']].forEach(function (s) {
        g.fillStyle = C.navy; g.fillRect(X(s[0]) - 22, y0 - 66, 44, 44); g.fillStyle = '#fff'; g.fillText(s[1], X(s[0]), y0 - 44);
        g.strokeStyle = '#9aa5b1'; g.lineWidth = 1.5; g.setLineDash([5, 6]); g.beginPath(); g.moveTo(X(s[0]), y0 - 22); g.lineTo(X(s[0]), y1); g.stroke(); g.setLineDash([]);
      });
      g.font = '600 21px ' + SANS; g.fillStyle = C.navy; g.fillText('d = ' + dfmt(st.d) + '  (space →)', (X(0) + X(st.d)) / 2, y0 - 82);
      // signals
      var aEnd = Math.min(r.Tfr, r.tAdet), bEnd = Math.min(r.tB + r.Tfr, r.tBdet);
      function band(xs, ts, xe, dur, col) {
        var te = ts + Math.abs(xe - xs) / st.v, L = 3 * tmax;
        g.fillStyle = col; g.beginPath(); g.moveTo(X(xs), Y(ts)); g.lineTo(X(xe), Y(te)); g.lineTo(X(xe), Y(Math.min(te + dur, L))); g.lineTo(X(xs), Y(Math.min(ts + dur, L))); g.closePath(); g.fill();
      }
      g.save(); g.beginPath(); g.rect(x0 - 30, y0 - 6, x1 - x0 + 60, y1 - y0 + 6); g.clip();
      band(0, 0, st.d, aEnd, 'rgba(47,109,181,.16)');
      band(st.d, r.tB, 0, bEnd - r.tB, 'rgba(201,117,46,.22)');
      g.lineWidth = 4; g.strokeStyle = C.blue; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(st.d), Y(Tp)); g.stroke();
      g.strokeStyle = C.orangeL; g.beginPath(); g.moveTo(X(st.d), Y(r.tB)); g.lineTo(X(0), Y(r.tB + Tp)); g.stroke();
      g.lineWidth = 12; g.strokeStyle = C.blue; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(0), Y(Math.min(aEnd, 3 * tmax))); g.stroke();
      g.strokeStyle = C.orangeL; g.beginPath(); g.moveTo(X(st.d), Y(r.tB)); g.lineTo(X(st.d), Y(bEnd)); g.stroke();
      g.restore();
      // left of A: start and frame end
      g.font = '600 21px ' + SANS; g.textAlign = 'right'; g.fillStyle = C.blue; g.fillText('A starts', X(0) - 18, Y(0));
      var tEnd = Math.min(r.Tfr, tmax), late = r.Tfr < r.tAdet;
      g.strokeStyle = late ? C.red : C.blue; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(X(0) - 26, Y(tEnd)); g.lineTo(X(0) + 26, Y(tEnd)); g.stroke(); g.setLineDash([]);
      if (!late) { g.strokeStyle = C.blue; g.lineWidth = 2; g.setLineDash([3, 6]); g.beginPath(); g.moveTo(X(0), Y(aEnd)); g.lineTo(X(0), Y(tEnd)); g.stroke(); g.setLineDash([]); }
      g.fillStyle = late ? C.red : C.blue; g.fillText(late ? 'last bit sent' : (r.Tfr > tmax ? 'frame ends ↓' : 'frame would end'), X(0) - 30, Y(tEnd) - 13);
      g.font = '500 20px ' + MONO; g.fillText('Tfr = ' + tfmt(r.Tfr), X(0) - 30, Y(tEnd) + 13);
      // right of B
      g.font = '600 21px ' + SANS; g.textAlign = 'left'; g.fillStyle = C.orangeL;
      g.fillText('B starts', X(st.d) + 18, Y(r.tB) - 14); g.fillText('B detects', X(st.d) + 18, Y(r.tBdet) + 16);
      // collision point
      g.fillStyle = C.red; g.font = '700 34px ' + SANS; g.textAlign = 'center'; g.fillText('✕', X(r.xm), Y(r.tm));
      g.font = '600 21px ' + SANS; g.textAlign = 'right'; g.fillText('collision', X(r.xm) - 46, Y(r.tm));
      // detections
      function dot(x, t, col) { g.fillStyle = '#fff'; g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(X(x), Y(t), 10, 0, 7); g.fill(); g.stroke(); }
      dot(st.d, r.tBdet, C.orangeL); dot(0, r.tAdet, r.aStill ? C.green : C.red);
      g.textAlign = 'left'; g.fillStyle = r.aStill ? C.green : C.red; g.font = '600 21px ' + SANS;
      g.fillText(r.aStill ? 'A detects while sending ✓' : 'news reaches A too late ✗', X(0) + 20, Y(r.tAdet) + 8);
      g.font = '500 20px ' + MONO; g.fillText('tB + Tp = ' + tfmt(r.tAdet), X(0) + 20, Y(r.tAdet) + 32);
      // text
      var minB = r.minBits;
      form.innerHTML = 'B starts at tB = ' + tfmt(r.tB) + '; collision ' + dfmt(r.xm) + ' from A at t = ' + tfmt(r.tm) + '\n' + 'Tp  = d / v = ' + dfmt(st.d) + ' / ' + fmtN(st.v / 1e8, 1) + '×10⁸ m/s = <b>' + tfmt(Tp) + '</b>\n' +
        'Tfr = ' + st.B * 8 + ' bits / ' + rfmt(st.R) + ' = <b>' + tfmt(r.Tfr) + '</b>   vs  2Tp = ' + tfmt(2 * Tp) + '  ' + (r.safe ? '<span class="ok">Tfr ≥ 2Tp ✓</span>' : '<span class="bad">Tfr &lt; 2Tp ✗</span>') + '\n' +
        'Min frame = 2Tp × R = ' + tfmt(2 * Tp) + ' × ' + rfmt(st.R) + ' = <b>' + fmtN(minB, 1) + ' bits = ' + fmtN(minB / 8, 1) + ' bytes</b>\n' +
        'Longest cable for ' + st.B + ' B at this rate: Tfr / 2 × v = <b>' + dfmt(r.maxLen) + '</b>';
      if (r.safe) { verdict.className = 'w-verdict ok'; verdict.textContent = 'Tfr ≥ 2Tp: even in the worst case A is still sending when the collision news arrives, so it knows to resend.'; }
      else if (r.aStill) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Caught this time, but Tfr < 2Tp: if B started a moment later, A would finish first and never know. Frame too short.'; }
      else { verdict.className = 'w-verdict bad'; verdict.textContent = 'A finished before the news arrived: the frame is lost and A thinks it succeeded. Pad to ' + Math.ceil(minB / 8 - 1e-9) + ' bytes or shorten the cable.'; }
    }
    draw();
  });
})();
