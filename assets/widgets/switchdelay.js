(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var COLS = ['#f0a35e', '#9fc1e6', '#8fd19e', '#e6a0c4', '#f5d76e', '#b7a6f0'];

  function delays(p) { // L kbit, R Mbps, k links, tau ms, S ms setup, N packets, w ms wait per switch
    var Tm = p.L / p.R, T = Tm / p.N; // kbit / Mbps = ms
    var circ = p.S + Tm + p.k * p.tau, pack = (p.N + p.k - 1) * T + p.k * p.tau + (p.k - 1) * p.w;
    return { Tm: Tm, T: T, circ: circ, pack: pack };
  }
  function n(x) { return fmtN(x, 3).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  var PRE = {
    slide: { L: 30, R: 1, k: 3, tau: 2, S: 20, N: 5, w: 0 },
    one: { L: 30, R: 1, k: 3, tau: 2, S: 20, N: 1, w: 0 },
    ten: { L: 30, R: 1, k: 3, tau: 2, S: 20, N: 10, w: 0 },
    big: { L: 300, R: 1, k: 3, tau: 2, S: 20, N: 5, w: 0 },
    busy: { L: 30, R: 1, k: 3, tau: 2, S: 20, N: 5, w: 5 }
  };

  D.register('switchdelay', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.slide));
    var cc = D.canvas(528, 610), pc = D.canvas(528, 610), form = h('div', { cls: 'w-f', style: 'font-size:22px' }), verdict = h('div', { cls: 'w-verdict' });
    var S = {};
    function mk(key, label, a, b, s, fmt) { S[key] = D.slider(label, a, b, s, st[key], fmt, function (v) { st[key] = v; pre.set(''); draw(); }); return S[key].el; }
    var pre = D.seg([['slide', 'Slides 8 + 13'], ['one', '1 packet'], ['ten', '10 packets'], ['big', '300 kbit'], ['busy', 'Busy switches']], 'slide', function (key) {
      st = JSON.parse(JSON.stringify(PRE[key])); Object.keys(S).forEach(function (q) { S[q].set(st[q]); }); draw();
    });
    var sliders = [mk('L', 'Message size L', 1, 300, 1, function (v) { return v + ' kbit'; }), mk('R', 'Link rate R', 0.1, 10, 0.1, function (v) { return fmtN(v, 1) + ' Mbps'; }),
      mk('k', 'Links on the path', 1, 6, 1, function (v) { return v + ' (' + (v - 1) + ' switch' + (v === 2 ? '' : 'es') + ')'; }),
      mk('tau', 'Propagation per link τ', 0, 20, 0.5, function (v) { return fmtN(v, 1) + ' ms'; }), mk('S', 'Circuit setup', 0, 100, 1, function (v) { return v + ' ms'; }),
      mk('N', 'Packets N', 1, 30, 1, function (v) { return String(v); }), mk('w', 'Waiting per switch w', 0, 20, 0.5, function (v) { return fmtN(v, 1) + ' ms'; })];
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [h('div', { cls: 'w-row', style: 'gap:24px' }, [cc.c, pc.c]), h('div', { cls: 'w-card', style: 'padding:10px 20px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:2px 20px 4px' }, sliders), verdict])]));

    function frame(cv, title, Tmax, total, col) {
      var g = cv.g, w = cv.w, H = cv.h, top = 92, bot = H - 50, k = st.k, x0 = 96, x1 = w - 34;
      g.clearRect(0, 0, w, H); g.fillStyle = C.panel; g.fillRect(0, 0, w, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, H - 1);
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(title, 16, 32);
      var X = function (i) { return x0 + i * (x1 - x0) / k; }, Y = function (t) { return top + t / Tmax * (bot - top); };
      for (var i = 0; i <= k; i++) {
        g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(X(i), top); g.lineTo(X(i), bot); g.stroke();
        g.fillStyle = C.navy; g.font = '700 20px ' + SANS; g.textAlign = 'center';
        g.fillText(i === 0 ? 'A' : i === k ? 'B' : 'S' + i, X(i), top - 14);
      }
      // time axis
      var step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find(function (s) { return Tmax / s <= 6; }) || 10000;
      g.font = '500 20px ' + MONO; g.textAlign = 'right'; g.fillStyle = C.gray;
      for (var t = 0; t <= Tmax; t += step) { g.fillText(n(t), x0 - 14, Y(t) + 7); g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 - 8, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); }
      g.textAlign = 'right'; g.font = '600 20px ' + SANS; g.fillText('ms ↓', x0 - 14, top - 14);
      // total line
      g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([10, 6]); g.beginPath(); g.moveTo(x0 - 8, Y(total)); g.lineTo(x1, Y(total)); g.stroke(); g.setLineDash([]);
      g.font = '700 22px ' + SANS; g.fillStyle = col; g.textAlign = 'right';
      g.fillText('total ' + n(total) + ' ms', x1, Math.min(H - 14, Y(total) + 28));
      return { g: g, X: X, Y: Y };
    }
    function para(o, i, t0, dur, tau, fill, label) { // a block leaving node i at t0, lasting dur, arriving tau later at node i+1
      var g = o.g, xa = o.X(i), xb = o.X(i + 1);
      g.fillStyle = fill; g.strokeStyle = 'rgba(22,50,79,.55)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(xa, o.Y(t0)); g.lineTo(xb, o.Y(t0 + tau)); g.lineTo(xb, o.Y(t0 + tau + dur)); g.lineTo(xa, o.Y(t0 + dur)); g.closePath(); g.fill(); g.stroke();
      if (label) {
        var hh = o.Y(t0 + dur) - o.Y(t0);
        if (hh >= 22 && xb - xa > 40) { g.fillStyle = C.ink; g.font = '600 20px ' + SANS; g.textAlign = 'center'; g.fillText(label, (xa + xb) / 2, o.Y(t0 + (tau + dur) / 2) + 7); }
      }
    }
    function draw() {
      var d = delays(st), Tmax = Math.max(d.circ, d.pack) * 1.06, k = st.k;
      // circuit
      var o = frame(cc, 'Circuit switching', Tmax, d.circ, d.circ <= d.pack ? C.green : C.red);
      if (st.S > 0) {
        var g = o.g; g.fillStyle = 'rgba(91,102,114,.22)'; g.fillRect(o.X(0), o.Y(0), o.X(k) - o.X(0), o.Y(st.S) - o.Y(0));
        g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(o.X(0), o.Y(0)); g.lineTo(o.X(k), o.Y(st.S / 2)); g.lineTo(o.X(0), o.Y(st.S)); g.stroke();
        if (o.Y(st.S) - o.Y(0) > 24) { g.fillStyle = C.navy; g.font = '600 20px ' + SANS; g.textAlign = 'left'; g.fillText('setup ' + n(st.S) + ' ms', o.X(0) + 8, o.Y(st.S * 0.28) + 6); }
      }
      for (var i = 0; i < k; i++) para(o, i, st.S + i * st.tau, d.Tm, st.tau, 'rgba(240,163,94,.85)', '');
      if (o.Y(st.S + d.Tm) - o.Y(st.S) > 26) { o.g.fillStyle = C.ink; o.g.font = '600 20px ' + SANS; o.g.textAlign = 'center'; o.g.fillText('message: L/R = ' + n(d.Tm) + ' ms', (o.X(0) + o.X(k)) / 2, o.Y(st.S + d.Tm / 2 + k * st.tau / 2) + 7); }
      // packet
      var q = frame(pc, 'Datagram packet switching', Tmax, d.pack, d.pack <= d.circ ? C.green : C.red);
      for (var r = 0; r < k; r++) for (var p = 0; p < st.N; p++) {
        var t0 = (p + r) * d.T + r * (st.tau + st.w);
        para(q, r, t0, d.T, st.tau, COLS[p % COLS.length], st.N <= 10 ? 'P' + (p + 1) : '');
        if (st.w > 0 && r > 0) { var gg = q.g, a = t0 - st.w; gg.fillStyle = 'rgba(192,57,43,.35)'; gg.fillRect(q.X(r) - 6, q.Y(a), 12, q.Y(t0) - q.Y(a)); }
      }
      // formulas
      var win = d.pack < d.circ - 1e-9 ? 'pack' : d.circ < d.pack - 1e-9 ? 'circ' : 'tie', diff = Math.abs(d.circ - d.pack);
      form.innerHTML = 'Circuit = setup + L/R + k·τ = ' + n(st.S) + ' + ' + n(d.Tm) + ' + ' + k + ' × ' + n(st.tau) + ' = <b>' + n(d.circ) + ' ms</b>\n' +
        'Packet time T = (L/N)/R = ' + n(st.L * 1000 / st.N) + ' bits / ' + n(st.R) + ' Mbps = ' + n(d.T) + ' ms\n' +
        'Packet = (N + k − 1)·T + k·τ + (k − 1)·w\n       = (' + st.N + ' + ' + k + ' − 1) × ' + n(d.T) + ' + ' + k + ' × ' + n(st.tau) + ' + ' + (k - 1) + ' × ' + n(st.w) + ' = <b>' + n(d.pack) + ' ms</b>';
      verdict.className = 'w-verdict ' + (win === 'tie' ? 'warn' : 'ok');
      verdict.textContent = win === 'tie' ? 'A tie: both take ' + n(d.circ) + ' ms.' :
        (win === 'pack' ? 'Packet switching' : 'Circuit switching') + ' wins by ' + n(diff) + ' ms (' + fmtN(diff / Math.max(d.circ, d.pack) * 100, 1) + '% less time).' +
        (win === 'circ' && st.N === 1 ? ' One big packet is stored and re-sent on every link.' : win === 'circ' && st.w > 0 ? ' Queuing at the switches costs the packets.' : win === 'pack' ? ' No setup, and the switches work on different packets at once.' : '');
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { delays: delays };
})();
