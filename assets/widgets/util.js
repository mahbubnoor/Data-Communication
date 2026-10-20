/* Try it: link utilisation and the bandwidth-delay product (Lecture 12, after slide "utilisation"). Slides "bdp", "utilisation". */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;
  var RS = [10e3, 56e3, 64e3, 100e3, 1e6, 1.544e6, 10e6, 100e6, 1e9];
  var TPS = [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 135, 270, 500];   // ms, one way
  var LS = [100, 200, 500, 1000, 1500, 2000, 4000, 8000, 12000];                       // bits

  // pure: everything the slide computes
  function calc(R, L, TpS, W) {
    var Tt = L / R, a = TpS / Tt, U = Math.min(1, W / (1 + 2 * a)), need = Math.ceil(1 + 2 * a - 1e-9);
    var mg = 1; while (Math.pow(2, mg) - 1 < W) mg++;
    var ms = 1; while (Math.pow(2, ms - 1) < W) ms++;
    var bdp = R * 2 * TpS, quick = Math.min(1, W * L / bdp);
    return { Tt: Tt, a: a, U: U, need: need, mg: mg, ms: ms, bdp: bdp, bdpF: bdp / L, quick: quick };
  }
  // pure: send times of frames with a sliding window (ACK returns Tt + 2Tp after a frame starts)
  function sendTimes(Tt, Tp, W, tEnd) {
    var s = [];
    for (var j = 0; j < 3000; j++) {
      var t = j ? s[j - 1] + Tt : 0;
      if (j >= W) t = Math.max(t, s[j - W] + Tt + 2 * Tp);
      if (t > tEnd) break;
      s.push(t);
    }
    return s;
  }
  function fR(r) { return r >= 1e9 ? D.fmtN(r / 1e9, 3) + ' Gbps' : r >= 1e6 ? D.fmtN(r / 1e6, 3) + ' Mbps' : D.fmtN(r / 1e3, 3) + ' kbps'; }
  function fT(t) {
    var a = Math.abs(t);
    if (a >= 1) return D.fmtN(+t.toPrecision(4), 4) + ' s';
    if (a >= 1e-3) return D.fmtN(+(t * 1e3).toPrecision(4), 4) + ' ms';
    if (a >= 1e-6) return D.fmtN(+(t * 1e6).toPrecision(4), 4) + ' µs';
    return D.fmtN(+(t * 1e9).toPrecision(4), 4) + ' ns';
  }
  function fB(n) { return Math.round(n).toLocaleString('en-US'); }
  function fNum(x) { return Math.abs(x) >= 1e4 ? Math.round(x).toLocaleString('en-US') : D.fmtN(+x.toPrecision(5), 4); }
  function pc(u) { return D.fmtN(+(100 * u).toPrecision(3), 8) + ' %'; }

  D.register('util', function (root) {
    var st = { r: 4, tp: 8, l: 3, W: 15 };
    var cv = D.canvas(1080, 700), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.55' });
    var sR = D.slider('Data rate R', 0, RS.length - 1, 1, st.r, function (v) { return fR(RS[v]); }, function (v) { st.r = v; draw(); });
    var sP = D.slider('One-way propagation Tp', 0, TPS.length - 1, 1, st.tp, function (v) { return fT(TPS[v] / 1000); }, function (v) { st.tp = v; draw(); });
    var sL = D.slider('Frame size L', 0, LS.length - 1, 1, st.l, function (v) { return fB(LS[v]) + ' bits'; }, function (v) { st.l = v; draw(); });
    var sW = D.slider('Window W', 1, 127, 1, st.W, function (v) { return v + (v === 1 ? ' (Stop-and-Wait)' : ' frames'); }, function (v) { st.W = v; draw(); });
    function pre(r, tp, l, W) { return function () { st.r = RS.indexOf(r); st.tp = TPS.indexOf(tp); st.l = LS.indexOf(l); st.W = W; sR.set(st.r); sP.set(st.tp); sL.set(st.l); sW.set(W); draw(); }; }
    var presets = h('div', { cls: 'w-btns', style: 'gap:8px' }, [
      h('span', { text: 'Slide “bdp”:', style: 'font-weight:600;color:' + C.navy + ';align-self:center' }),
      btn('Stop-and-Wait', pre(1e6, 10, 1000, 1)), btn('W = 15', pre(1e6, 10, 1000, 15)), btn('W = 21', pre(1e6, 10, 1000, 21)),
      h('span', { text: 'GEO:', style: 'font-weight:600;color:' + C.navy + ';align-self:center;margin-left:8px' }),
      btn('S&W', pre(1e6, 270, 8000, 1)), btn('W = 69', pre(1e6, 270, 8000, 69), 'acc'), btn('a = 0.01', pre(1e6, 0.01, 1000, 1))]);
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [presets, cv.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding-top:12px;padding-bottom:4px' }, [sR.el, sP.el, sL.el, sW.el]),
        h('div', { cls: 'w-card', style: 'padding:14px 18px' }, [form])])]));

    function draw() {
      var R = RS[st.r], TpS = TPS[st.tp] / 1000, L = LS[st.l], W = st.W, k = calc(R, L, TpS, W);
      var cyc = k.Tt + 2 * TpS, tEnd = 2 * cyc;
      // ----- canvas
      var g = cv.g, w = cv.w, hh = cv.h, x0 = 130, x1 = w - 30, yS = 104, yR = 360;
      var X = function (t) { return x0 + t / tEnd * (x1 - x0); };
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.font = '600 22px ' + D.SANS; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = C.navy;
      g.fillText('Sender', 18, yS); g.fillText('Receiver', 18, yR);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('time →', x1, yR + 56); g.textAlign = 'left';
      var s = sendTimes(k.Tt, TpS, W, tEnd);
      // idle gaps on the sender line
      var busyEnd = 0, idle = [];
      s.forEach(function (t) { if (t > busyEnd + 1e-12) idle.push([busyEnd, t]); busyEnd = Math.max(busyEnd, t + k.Tt); });
      if (busyEnd < tEnd) idle.push([busyEnd, tEnd]);
      idle.forEach(function (p) {
        var a = X(p[0]), b = X(Math.min(p[1], tEnd));
        if (b - a < 2) return;
        g.fillStyle = '#fbe2df'; g.fillRect(a, yS - 30, b - a, 30);
        g.strokeStyle = C.red; g.lineWidth = 1; g.save(); g.beginPath(); g.rect(a, yS - 30, b - a, 30); g.clip();
        for (var xx = a - 30; xx < b; xx += 12) { g.beginPath(); g.moveTo(xx, yS); g.lineTo(xx + 30, yS - 30); g.stroke(); }
        g.restore();
        if (b - a > 150) { g.fillStyle = C.red; g.font = '600 20px ' + D.SANS; g.textAlign = 'center'; g.fillText('idle: waiting for an ACK', (a + b) / 2, yS - 46); }
      });
      // legend
      g.font = '500 20px ' + D.SANS; g.textAlign = 'left'; var lx = 18;
      [[C.orange, 'first window of W frames'], [C.blue, 'sent after ACKs return'], [C.green, 'ACK'], [C.red, 'sender idle']].forEach(function (it) {
        g.fillStyle = it[0]; g.fillRect(lx, 22, 22, 16); g.fillStyle = C.gray; g.fillText(it[1], lx + 30, 31); lx += 30 + g.measureText(it[1]).width + 34; });
      // lines
      g.strokeStyle = C.navy; g.lineWidth = 2;
      [yS, yR].forEach(function (y) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); });
      // frames (parallelograms) and ACKs
      var many = s.length > 60;
      s.forEach(function (t, j) {
        var a = X(t), b = X(Math.min(t + k.Tt, tEnd)), c = X(Math.min(t + TpS, tEnd)), d = X(Math.min(t + k.Tt + TpS, tEnd));
        g.fillStyle = j < W ? 'rgba(201,117,46,.55)' : 'rgba(47,109,181,.35)';
        g.beginPath(); g.moveTo(a, yS); g.lineTo(Math.max(b, a + 1), yS); g.lineTo(Math.max(d, c + 1), yR); g.lineTo(c, yR); g.closePath(); g.fill();
        g.fillStyle = j < W ? C.orange : C.blue; g.fillRect(a, yS - 30, Math.max(1.5, b - a - (b - a > 4 ? 1 : 0)), 30);
        var ta = t + k.Tt + TpS, tb = t + k.Tt + 2 * TpS;
        if (ta < tEnd) {
          g.strokeStyle = many ? 'rgba(63,143,90,.35)' : C.green; g.lineWidth = 1.5;
          var fb = Math.min(1, (tEnd - ta) / (tb - ta));
          g.beginPath(); g.moveTo(X(ta), yR); g.lineTo(X(ta + (tb - ta) * fb), yR + (yS - yR) * fb); g.stroke();
        }
      });
      // markers: first ACK back, window end
      g.setLineDash([7, 6]); g.lineWidth = 2;
      var tA = cyc, tWend = Math.min(W * k.Tt, tEnd);
      g.strokeStyle = C.green; g.beginPath(); g.moveTo(X(tA), yS - 34); g.lineTo(X(tA), yR + 36); g.stroke();
      g.setLineDash([]);
      g.font = '600 20px ' + D.SANS; g.textAlign = X(tA) > x0 + 420 ? 'right' : 'left'; g.fillStyle = C.green;
      g.fillText('first ACK back: Tt + 2Tp = ' + fT(cyc), X(tA) + (g.textAlign === 'right' ? -10 : 10), yR + 24);
      // brace for W·Tt
      g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), yS + 18); g.lineTo(X(tWend), yS + 18); g.stroke();
      g.fillStyle = C.orange; g.textAlign = 'left'; g.font = '600 20px ' + D.SANS;
      var lbl = 'W·Tt = ' + W + ' × ' + fT(k.Tt) + ' = ' + fT(W * k.Tt);
      g.fillText(lbl, Math.min(X(0) + 4, x1 - g.measureText(lbl).width), yS + 40);
      // axis ticks
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'center';
      [0, cyc, 2 * cyc].forEach(function (t, i) { var xx = X(t); g.fillRect(xx - 1, yR, 2, 8); g.textAlign = i === 0 ? 'left' : i === 2 ? 'right' : 'center'; if (i !== 1) g.fillText(i === 0 ? '0' : fT(t), xx, yR + 22); });
      // utilisation bar
      var by = 520, bw = x1 - x0;
      g.textAlign = 'left'; g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.fillText('Link busy', 18, by + 20);
      g.fillStyle = '#fbe2df'; g.fillRect(x0, by, bw, 40); g.fillStyle = C.orange; g.fillRect(x0, by, bw * k.U, 40);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(x0, by, bw, 40);
      g.font = '600 24px ' + D.MONO; g.fillStyle = k.U > 0.25 ? '#fff' : C.ink; g.textAlign = k.U > 0.25 ? 'right' : 'left';
      g.fillText('U = ' + pc(k.U), k.U > 0.25 ? x0 + bw * k.U - 12 : x0 + bw * k.U + 12, by + 21);
      // BDP strip: how many frames fit in one round trip
      var py = 590; g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Pipe', 18, py + 43);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray;
      g.fillText('One round trip R·2Tp holds ' + fNum(k.bdpF) + ' frames of ' + fB(L) + ' bits; the window fills ' + (W >= k.bdpF ? 'all of them' : W + ' of them'), x0, py + 6);
      var nb = Math.ceil(k.bdpF - 1e-9), cw2 = Math.min(40, bw / Math.max(1, nb));
      if (nb > 150) { g.fillStyle = '#e3e7ec'; g.fillRect(x0, py + 26, bw, 34); g.fillStyle = C.orange; g.fillRect(x0, py + 26, Math.max(3, bw * Math.min(1, W / k.bdpF)), 34); nb = 0; }
      for (var i = 0; i < nb; i++) {
        var filled = i < W;
        g.fillStyle = filled ? C.orange : '#e3e7ec';
        var fw = Math.min(1, k.bdpF - i);
        g.fillRect(x0 + i * cw2, py + 26, Math.max(1, cw2 * fw - (cw2 > 6 ? 2 : 0)), 34);
      }
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right';
      g.fillText('orange = frames the window lets the sender send; grey = empty pipe', x1, py + 84);
      // ----- formulas
      var f = '', thr = +(k.U * R).toPrecision(4);
      f += 'Tt = L/R = ' + fB(L) + '/' + fR(R) + ' = <b>' + fT(k.Tt) + '</b>\n';
      f += 'a = Tp/Tt = ' + fT(TpS) + '/' + fT(k.Tt) + ' = <b>' + fNum(k.a) + '</b>\n';
      f += 'U = W/(1 + 2a) = ' + W + '/' + fNum(1 + 2 * k.a) + ' = <b>' + pc(k.U) + '</b>\n';
      f += '  ' + (W / (1 + 2 * k.a) > 1 ? '(capped at 1) ' : '') + 'U·R = ' + fR(thr) + '\n';
      f += 'Quick: W·L/(R·2Tp)\n     = ' + fB(W * L) + '/' + fB(k.bdp) + ' = ' + pc(k.quick) + '\n';
      var l2 = '    = <b>' + fB(k.bdp) + ' bits</b>', l3 = ' = ' + fNum(k.bdpF) + ' frames';
      f += 'BDP = R × 2Tp = ' + fR(R) + ' × ' + fT(2 * TpS) + '\n' + l2 + ((fB(k.bdp) + l3).length > 26 ? '\n   ' : '') + l3 + '\n';
      f += 'Full use: W ≥ 1 + 2a = ' + fNum(1 + 2 * k.a) + '\n          → <b>W = ' + fNum(k.need) + '</b> ' + (W >= k.need ? '<span class="ok">✓ reached</span>' : '<span class="bad">(now ' + W + ')</span>') + '\n';
      f += 'GBN: 2^m − 1 ≥ ' + W + ' → <b>m = ' + k.mg + '</b>\n';
      f += 'SR:  2^(m−1) ≥ ' + W + ' → <b>m = ' + k.ms + '</b>';
      form.innerHTML = f;
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { calc: calc, sendTimes: sendTimes };
})();
