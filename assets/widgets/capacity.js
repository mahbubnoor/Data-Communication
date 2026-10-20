/* Try it: Nyquist against Shannon (Lecture 3, after slide "combined") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  function nyquist(B, L) { return 2 * B * Math.log2(L); }
  function shannon(B, snr) { return B * Math.log2(1 + snr); }
  function maxLevels(snr) { return Math.sqrt(1 + snr); }          // where 2B log2 L = B log2(1 + SNR)
  function grp(x) { return Math.round(x).toLocaleString('en-US'); }
  function bps(x) {
    if (x < 1e5) return D.fmtN(+x.toPrecision(5), 2).replace(/^(\d+)/, function (m) { return (+m).toLocaleString('en-US'); }) + ' bps';
    if (x < 1e6) return D.fmtN(+(x / 1e3).toPrecision(4), 2) + ' kbps';
    if (x < 1e9) return D.fmtN(+(x / 1e6).toPrecision(4), 3) + ' Mbps';
    return D.fmtN(+(x / 1e9).toPrecision(4), 3) + ' Gbps';
  }
  function hz(x) { return x < 1e4 ? grp(x) + ' Hz' : x < 1e6 ? D.fmtN(+(x / 1e3).toPrecision(3), 2) + ' kHz' : D.fmtN(+(x / 1e6).toPrecision(3), 2) + ' MHz'; }

  D.register('capacity', function (root) {
    var st = { B: 1e6, snr: 63, L: 4 };
    var cv = D.canvas(1080, 520), g = cv.g, W = cv.w, H = cv.h;
    var form = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var bPos = function (B) { return Math.round(Math.log10(B / 100) / 6 * 1000); }, bOf = function (p) { return +(100 * Math.pow(10, p * 6 / 1000)).toPrecision(2); };
    var bSl = D.slider('Bandwidth B', 0, 1000, 1, bPos(st.B), function (p) { return hz(bOf(p)); }, function (p) { st.B = bOf(p); draw(); });
    var sSl = D.slider('SNR', -10, 60, 0.5, 18, function (v) { return D.fmtN(v, 1) + ' dB = ' + snrStr(Math.pow(10, v / 10)); }, function (v) { st.snr = Math.pow(10, v / 10); draw(); });
    var lSl = D.slider('Signal levels L', 1, 10, 1, 2, function (v) { return 'L = ' + Math.pow(2, v) + ' (' + v + ' bit' + (v > 1 ? 's' : '') + ')'; }, function (v) { st.L = Math.pow(2, v); draw(); });
    function snrStr(r) { return r >= 100 ? grp(r) : D.fmtN(+r.toPrecision(3), 3); }
    function setSnrLabel() { sSl.label.textContent = st.snr === 0 ? '−∞ dB = 0' : D.fmtN(10 * Math.log10(st.snr), 2) + ' dB = ' + snrStr(st.snr); }
    function pre(B, snr, L) {
      return function () {
        st.B = B; if (snr !== null) st.snr = snr; if (L) st.L = L;
        bSl.set(bPos(B)); bSl.label.textContent = hz(B);
        sSl.set(st.snr > 0 ? Math.round(20 * Math.log10(st.snr)) / 2 : -10); setSnrLabel();
        lSl.set(Math.log2(st.L)); draw();
      };
    }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:14px 22px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Slide examples' }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [
          D.btn('3 kHz, L = 4', pre(3000, null, 4)), D.btn('20 kHz, L = 64', pre(20000, null, 64)),
          D.btn('Phone: 35 dB', pre(3000, 3162, 32)), D.btn('SNR = 0', pre(3000, 0, 2)),
          D.btn('1 MHz, SNR 63', pre(1e6, 63, 4)), D.btn('1 MHz, SNR 1', pre(1e6, 1, 2)), D.btn('2 MHz, 36 dB', pre(2e6, Math.pow(10, 3.6), 8))])]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:10px 20px 6px' }, [bSl.el, sSl.el, lSl.el]),
        verdict])]));

    function draw() {
      var B = st.B, snr = st.snr, L = st.L, N = nyquist(B, L), Cc = shannon(B, snr), Lmax = maxLevels(snr);
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var ymax = Math.max(Cc * 1.8, N * 1.15, nyquist(B, 4) * 1.2);
      // ---- bars
      var bx0 = 20, bw = 330, pt = 92, pb = 60, Yb = function (v) { return H - pb - v / ymax * (H - pt - pb); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Maximum bit rate', 14, 32);
      [[N, C.blue, 'Nyquist', '2B log₂L'], [Cc, C.orange, 'Shannon', 'B log₂(1+SNR)']].forEach(function (b, i) {
        var x = bx0 + 30 + i * 150, w = 110, y = Yb(Math.min(b[0], ymax));
        g.fillStyle = b[1]; g.fillRect(x, y, w, H - pb - y);
        g.fillStyle = b[1]; g.font = '600 22px ' + D.MONO; g.textAlign = 'center'; g.fillText(bps(b[0]), x + w / 2, Math.max(66, y - 12));
        g.fillStyle = C.ink; g.font = '600 22px ' + D.SANS; g.fillText(b[2], x + w / 2, H - pb + 28); g.fillStyle = C.gray; g.font = '500 20px ' + D.SANS; g.fillText(b[3], x + w / 2, H - pb + 52);
      });
      g.strokeStyle = C.orange; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(bx0 + 10, Yb(Cc)); g.lineTo(bx0 + bw, Yb(Cc)); g.stroke(); g.setLineDash([]);
      g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(bx0 + 10, H - pb); g.lineTo(bx0 + bw, H - pb); g.stroke();
      // ---- chart: Nyquist rate against L
      var cx0 = 420, cx1 = W - 24, cpt = 92, cpb = 60, Lm = 10;
      var X = function (lg) { return cx0 + 40 + (lg - 1) / (Lm - 1) * (cx1 - cx0 - 60); }, Y = function (v) { return H - cpb - Math.min(v, ymax) / ymax * (H - cpt - cpb); };
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(cx0 - 22, 14); g.lineTo(cx0 - 22, H - 14); g.stroke();
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Nyquist rate as L grows, against Shannon\'s ceiling', cx0, 32);
      g.fillStyle = 'rgba(192,57,43,.08)'; g.fillRect(cx0, cpt - 30, cx1 - cx0, Y(Cc) - cpt + 30);
      g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(cx0, H - cpb); g.lineTo(cx1, H - cpb); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      for (var lg = 1; lg <= Lm; lg++) g.fillText(Math.pow(2, lg), X(lg), H - cpb + 26);
      g.font = '500 20px ' + D.SANS; g.fillText('levels L (log scale)', (cx0 + cx1) / 2, H - cpb + 52);
      // ceiling
      g.strokeStyle = C.orange; g.lineWidth = 4; g.beginPath(); g.moveTo(cx0, Y(Cc)); g.lineTo(cx1, Y(Cc)); g.stroke();
      g.fillStyle = C.orange; g.font = '600 22px ' + D.SANS; g.textAlign = 'right';
      var sl = 'Shannon C = ' + bps(Cc), sy = Math.max(cpt - 36, Math.min(Y(Cc) - 12, H - cpb - 40)), sw2 = g.measureText(sl).width;
      g.fillStyle = 'rgba(251,250,247,.9)'; g.fillRect(cx1 - 12 - sw2, sy - 22, sw2 + 10, 28); g.fillStyle = C.orange; g.fillText(sl, cx1 - 6, sy);
      g.fillStyle = C.red; g.font = '500 20px ' + D.SANS; g.textAlign = 'left';
      if (Y(Cc) - cpt > 30) g.fillText('above: impossible', cx0 + 8, Y(Cc) - 12);
      // max useful L
      if (Lmax >= 2) {
        var xl = X(Math.min(Lm, Math.log2(Lmax)));
        g.strokeStyle = C.green; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(xl, cpt - 20); g.lineTo(xl, H - cpb); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.green; g.font = '600 20px ' + D.SANS; g.textAlign = Math.log2(Lmax) > 7 ? 'right' : 'left';
        g.fillText('√(1+SNR) = ' + D.fmtN(+Lmax.toPrecision(3), 2), xl + (Math.log2(Lmax) > 7 ? -8 : 8), H - cpb - 12);
      }
      // nyquist points
      var Yu = function (v) { return H - cpb - v / ymax * (H - cpt - cpb); };
      g.save(); g.beginPath(); g.rect(cx0, cpt - 30, cx1 - cx0, H - cpb - cpt + 30); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath();
      for (var k = 1; k <= Lm; k++) { var v = nyquist(B, Math.pow(2, k)); k === 1 ? g.moveTo(X(k), Yu(v)) : g.lineTo(X(k), Yu(v)); }
      g.stroke(); g.restore();
      for (var k2 = 1; k2 <= Lm; k2++) {
        var v2 = nyquist(B, Math.pow(2, k2)), over = v2 > Cc + 1e-9;
        if (v2 > ymax) { g.fillStyle = C.red; g.font = '700 24px ' + D.SANS; g.textAlign = 'center'; g.fillText('↑', X(k2), cpt - 8); continue; }
        g.fillStyle = over ? C.red : C.blue; g.beginPath(); g.arc(X(k2), Y(v2), Math.pow(2, k2) === L ? 12 : 6, 0, 7); g.fill();
      }
      var lc = Math.log2(L), yc = Y(N);
      g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(X(lc), yc, 16, 0, 7); g.stroke();
      g.fillStyle = N > Cc + 1e-9 ? C.red : C.blue; g.font = '600 22px ' + D.MONO; g.textAlign = lc > 7 ? 'right' : 'left';
      g.fillText('L = ' + L + ': ' + bps(N), X(lc) + (lc > 7 ? -24 : 24), Math.max(cpt + 14, yc + (N > Cc ? -6 : 34)));
      // ---- text
      var lb = Math.log2(L), snrDb = snr > 0 ? 10 * Math.log10(snr) : -Infinity, lg2 = Math.log2(1 + snr), best = Math.pow(2, Math.floor(Math.log2(Math.max(Lmax, 1))));
      var Bs = B >= 1e6 ? (B === 1e6 ? '10⁶' : D.fmtN(B / 1e6, 2) + ' × 10⁶') : grp(B);
      var t = '<b>Nyquist</b> N = 2 × ' + Bs + ' × log₂' + L + ' = 2 × ' + Bs + ' × ' + lb + ' = <b>' + bps(N) + '</b>\n';
      t += '<b>Shannon</b> C = ' + Bs + ' × log₂(1 + ' + snrStr(snr) + ') = ' + Bs + ' × ' + D.fmtN(lg2, 3) + ' = <b>' + bps(Cc) + '</b>\n';
      t += 'SNR = ' + snrStr(snr) + (snr > 0 ? ' → 10 log₁₀ ' + snrStr(snr) + ' = ' + D.fmtN(snrDb, 2) + ' dB' : ' (−∞ dB): C = B × log₂1 = 0') + '\n';
      t += 'Useful levels: L ≤ √(1+SNR) = ' + D.fmtN(+Lmax.toPrecision(4), 3) + (Lmax >= 2 ? ' → use L = <b>' + best + '</b> (' + bps(nyquist(B, best)) + ')' : ' → not even 2 levels') + '\n';
      if (snr >= 10) t += '<span style="color:' + C.gray + '">Shortcut (SNR ≫ 1): C ≈ B × SNR(dB)/3 = ' + Bs + ' × ' + D.fmtN(snrDb, 1) + '/3 ≈ ' + bps(B * snrDb / 3) + '</span>';
      else t += '<span style="color:' + C.gray + '">Low SNR: the dB shortcut does not apply here.</span>';
      form.innerHTML = t;
      if (N > Cc + 1e-9) { verdict.className = 'w-verdict bad'; verdict.textContent = 'Impossible: ' + bps(N) + ' is above Shannon\'s ' + bps(Cc) + '. Noise makes ' + L + ' levels unreadable: use fewer.'; }
      else if (N > 0.9 * Cc) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Right at the ceiling: no margin. Real systems stay further below C.'; }
      else { verdict.className = 'w-verdict ok'; verdict.textContent = 'Possible: ' + bps(N) + ' is below the ceiling of ' + bps(Cc) + '.'; }
    }
    pre(st.B, 63, 4)();
  });
  if (typeof module !== 'undefined') module.exports = { nyquist: nyquist, shannon: shannon, maxLevels: maxLevels, bps: bps };
})();
