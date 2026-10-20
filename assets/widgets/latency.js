(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;

  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function sci(x) { // 1.2 × 10⁷
    if (x === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), m = +(x / Math.pow(10, e)).toPrecision(3);
    if (e >= -2 && e <= 5) return fmtN(x, 6).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var es = String(e).split('').map(function (c) { return SUP[c]; }).join('');
    return (m === 1 ? '' : fmtN(m, 3) + ' × ') + '10' + es;
  }
  function fmtT(s) { // seconds → readable
    if (s === 0) return '0 s';
    var a = Math.abs(s), P = [[1, 's'], [1e-3, 'ms'], [1e-6, 'µs'], [1e-9, 'ns']];
    for (var i = 0; i < P.length; i++) if (a >= P[i][0] * 0.9999) return fmtN(+(s / P[i][0]).toPrecision(4), 4) + ' ' + P[i][1];
    return fmtN(+(s / 1e-9).toPrecision(3), 4) + ' ns';
  }
  function fmtBytes(b) { return b >= 1e6 ? fmtN(b / 1e6, 3) + ' MB' : b >= 1e3 ? fmtN(b / 1e3, 3) + ' kB' : b + ' B'; }
  function fmtRate(r) { return r >= 1e9 ? fmtN(r / 1e9, 3) + ' Gbps' : r >= 1e6 ? fmtN(r / 1e6, 3) + ' Mbps' : fmtN(r / 1e3, 3) + ' kbps'; }
  function fmtKm(km) { return km < 1 ? fmtN(km * 1000, 1) + ' m' : fmtN(km, 1).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' km'; }
  function pct(f) { return fmtN(+(f * 100).toPrecision(4), 3) + '%'; }
  function delays(st) {
    var bits = st.size * 8, tp = st.dist * 1000 / st.v, tt = bits / st.bw, q = st.q / 1000, p = st.p / 1000;
    return { bits: bits, tp: tp, tt: tt, q: q, p: p, tot: tp + tt + q + p };
  }

  var SIZES = [100, 250, 500, 1e3, 2.5e3, 5e3, 1e4, 2.5e4, 5e4, 1e5, 2.5e5, 5e5, 1e6, 2.5e6, 5e6, 1e7, 2.5e7, 5e7, 1e8];
  var RATES = [1e4, 5.6e4, 1e5, 1e6, 2e6, 1e7, 2e7, 1e8, 1e9, 1e10];
  var DISTS = [0.1, 1, 10, 50, 100, 500, 1000, 2000, 5000, 12000, 20000, 40000, 72000];
  var PRE = {
    email: { name: 'Email 2.5 kB @ 1 Gbps', size: 2500, bw: 1e9, dist: 12000, v: 2.4e8, q: 0, p: 0 },
    image: { name: 'Image 5 MB @ 1 Mbps', size: 5e6, bw: 1e6, dist: 12000, v: 2.4e8, q: 0, p: 0 },
    sat: { name: 'Satellite 72,000 km', size: 2500, bw: 1e9, dist: 72000, v: 3e8, q: 0, p: 0 },
    lan: { name: 'Busy LAN', size: 1500, bw: 1e8, dist: 0.1, v: 2e8, q: 5, p: 0.5 }
  };
  var COL = { tp: C.blue, tt: C.orange, q: C.sky, p: C.navy };
  var NAMES = { tp: 'Propagation', tt: 'Transmission', q: 'Queuing', p: 'Processing' };

  D.register('latency', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.email)), anim = null, tShow = null;
    var cv = D.canvas(1080, 620), form = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    function idx(list, v) { var b = 0; list.forEach(function (x, i) { if (Math.abs(Math.log(x / v)) < Math.abs(Math.log(list[b] / v))) b = i; }); return b; }
    var sSl = D.slider('Message size', 0, SIZES.length - 1, 1, idx(SIZES, st.size), function (i) { return fmtBytes(SIZES[i]); }, function (i) { st.size = SIZES[i]; changed(); });
    var bSl = D.slider('Bandwidth', 0, RATES.length - 1, 1, idx(RATES, st.bw), function (i) { return fmtRate(RATES[i]); }, function (i) { st.bw = RATES[i]; changed(); });
    var dSl = D.slider('Distance', 0, DISTS.length - 1, 1, idx(DISTS, st.dist), function (i) { return fmtKm(DISTS[i]); }, function (i) { st.dist = DISTS[i]; changed(); });
    var vSl = D.slider('Propagation speed', 1, 3, 0.1, 2.4, function (v) { return fmtN(v, 1) + ' × 10⁸ m/s'; }, function (v) { st.v = v * 1e8; changed(); });
    var qSl = D.slider('Queuing delay', 0, 100, 1, 0, function (v) { return v + ' ms'; }, function (v) { st.q = v; changed(); });
    var pSl = D.slider('Processing delay', 0, 5, 0.1, 0, function (v) { return fmtN(v, 1) + ' ms'; }, function (v) { st.p = v; changed(); });
    var pre = D.seg([['email', 'Email (slide)'], ['image', 'Image (slide)'], ['sat', 'Satellite'], ['lan', 'Busy LAN']], 'email', function (k) {
      st = JSON.parse(JSON.stringify(PRE[k]));
      sSl.set(idx(SIZES, st.size)); bSl.set(idx(RATES, st.bw)); dSl.set(idx(DISTS, st.dist)); vSl.set(st.v / 1e8); qSl.set(st.q); pSl.set(st.p);
      stop(); draw();
    });
    var playB = D.btn('▶ Send the message', play, 'acc');
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:12px 20px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:14px 20px' }, [h('h4', { text: 'Slide examples' }), pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:6px 20px' }, [sSl.el, bSl.el, dSl.el, vSl.el, qSl.el, pSl.el]),
        h('div', { cls: 'w-btns' }, [playB]), verdict])]));

    function changed() { pre.set(''); stop(); draw(); }
    function stop() { if (anim) cancelAnimationFrame(anim); anim = null; tShow = null; playB.textContent = '▶ Send the message'; }
    function play() {
      if (anim) { stop(); draw(); return; }
      var d = delays(st), T = d.tp + d.tt, t0 = performance.now(), dur = 4500;
      playB.textContent = '■ Stop';
      (function frame(now) {
        var f = Math.min(1, (now - t0) / dur); tShow = f * T * 1.04; draw();
        if (f < 1) anim = requestAnimationFrame(frame); else { anim = null; playB.textContent = '▶ Send again'; }
      })(t0);
    }

    function draw() {
      var d = delays(st), g = cv.g, w = cv.w, H = cv.h, keys = ['tp', 'tt', 'q', 'p'];
      g.clearRect(0, 0, w, H); g.fillStyle = C.panel; g.fillRect(0, 0, w, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, H - 1);
      var big = keys.reduce(function (a, k) { return d[k] > d[a] ? k : a; }, 'tp');
      // ---- 1. stacked bar (linear)
      var x0 = 30, x1 = w - 30, y0 = 50, bh = 74;
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('Latency = propagation + transmission + queuing + processing', x0, 34);
      g.textAlign = 'right'; g.fillStyle = C.orange; g.fillText('total ' + fmtT(d.tot), x1, 34);
      var x = x0;
      keys.forEach(function (k) {
        var ww = d.tot > 0 ? d[k] / d.tot * (x1 - x0) : 0;
        g.fillStyle = COL[k]; g.fillRect(x, y0, ww, bh);
        if (ww > 150) {
          g.fillStyle = k === 'q' ? C.ink : '#fff'; g.textAlign = 'center'; g.font = '600 22px ' + SANS;
          g.fillText(NAMES[k], x + ww / 2, y0 + 32); g.font = '600 22px ' + MONO; g.fillText(fmtT(d[k]), x + ww / 2, y0 + 60);
        }
        x += ww;
      });
      g.strokeStyle = C.gray; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, bh);
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('0', x0, y0 + bh + 24);
      g.textAlign = 'right'; g.fillText(fmtT(d.tot), x1, y0 + bh + 24);
      g.textAlign = 'center'; g.font = '500 20px ' + SANS; g.fillText('linear scale: a delay under 1% of the total is too thin to see', (x0 + x1) / 2, y0 + bh + 24);
      // ---- 2. each delay on a log scale
      var ly = 186, rowH = 38, lx0 = 210, lx1 = w - 200, LMIN = -9, LMAX = 2;
      var LX = function (s) { var e = Math.log10(Math.max(s, 1e-9)); return lx0 + (Math.min(LMAX, e) - LMIN) / (LMAX - LMIN) * (lx1 - lx0); };
      g.font = '600 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('Each delay on a log scale', x0, ly - 8);
      [[1e-9, '1 ns'], [1e-6, '1 µs'], [1e-3, '1 ms'], [1, '1 s'], [100, '100 s']].forEach(function (tk) {
        g.strokeStyle = C.grid; g.beginPath(); g.moveTo(LX(tk[0]), ly); g.lineTo(LX(tk[0]), ly + 4 * rowH); g.stroke();
        g.fillStyle = C.gray; g.font = '500 20px ' + MONO; g.textAlign = 'center'; g.fillText(tk[1], LX(tk[0]), ly + 4 * rowH + 22);
      });
      keys.forEach(function (k, i) {
        var yy = ly + i * rowH;
        g.fillStyle = k === big ? C.orange : C.ink; g.font = (k === big ? '700 ' : '600 ') + '21px ' + SANS; g.textAlign = 'left'; g.fillText(NAMES[k], x0, yy + 27);
        if (d[k] > 0) { g.fillStyle = COL[k]; g.fillRect(lx0, yy + 7, Math.max(2, LX(d[k]) - lx0), rowH - 14); }
        g.font = (k === big ? '700 ' : '500 ') + '21px ' + MONO; g.fillStyle = k === big ? C.orange : C.ink; g.textAlign = 'left';
        g.fillText(fmtT(d[k]) + (d.tot > 0 ? '  ' + pct(d[k] / d.tot) : ''), lx1 + 14, yy + 27);
      });
      // ---- 3. the bits on the link
      var top = 400, ax = 110, bx = w - 110, ly2 = top + 92, Tt = d.tt, Tp = d.tp;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(14, top - 14); g.lineTo(w - 14, top - 14); g.stroke();
      var t = tShow == null ? Tp : tShow;
      g.font = '600 20px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText('On the link (' + fmtKm(st.dist) + '):  t = ' + fmtT(t) + (tShow == null ? '  (first bit just arriving)' : ''), x0, top + 14);
      [[ax, 'A'], [bx, 'B']].forEach(function (n) { g.fillStyle = C.navy; g.fillRect(n[0] - 34, ly2 - 30, 68, 60); g.fillStyle = '#fff'; g.font = '700 26px ' + SANS; g.textAlign = 'center'; g.fillText(n[1], n[0], ly2 + 9); });
      g.strokeStyle = C.gray; g.lineWidth = 6; g.beginPath(); g.moveTo(ax + 34, ly2); g.lineTo(bx - 34, ly2); g.stroke(); g.lineWidth = 1;
      var L = st.dist * 1000, P = function (m) { return ax + 34 + Math.max(0, Math.min(L, m)) / L * (bx - ax - 68); };
      var front = st.v * t, rear = st.v * (t - Tt);
      if (front > 0 && rear < L) {
        var pa = P(rear), pb = P(front);
        g.fillStyle = C.orange; g.fillRect(Math.min(pa, P(L) - 4), ly2 - 16, Math.max(4, pb - pa), 32);
      }
      var onWire = st.v * Tt;
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'center';
      g.fillText('Message length on the wire = v × transmission = ' + (onWire >= 1000 ? sci(onWire / 1000) + ' km' : fmtN(onWire, 3) + ' m') +
        (onWire > L ? '  (longer than the link: the link is full)' : '  (' + fmtN(+(onWire / L * 100).toPrecision(2), 3) + '% of the link)'), w / 2, ly2 + 70);
      var done = t >= Tp + Tt;
      g.font = '600 20px ' + SANS; g.fillStyle = done ? C.green : C.gray;
      g.fillText(done ? 'Last bit arrived at ' + fmtT(Tp + Tt) + ' (+ ' + fmtT(d.q + d.p) + ' queuing and processing = ' + fmtT(d.tot) + ')' :
        'First bit arrives at ' + fmtT(Tp) + ', last bit at ' + fmtT(Tp + Tt), w / 2, ly2 + 108);
      // ---- formulas
      form.innerHTML = 'Propagation  = d / v = ' + sci(L) + ' m / ' + sci(st.v) + ' m/s = <b>' + fmtT(Tp) + '</b>\n' +
        'Transmission = size / bandwidth = ' + sci(d.bits) + ' bits / ' + sci(st.bw) + ' bps = <b>' + fmtT(Tt) + '</b>\n' +
        'Queuing = ' + fmtT(d.q) + ',  Processing = ' + fmtT(d.p) + '\n' +
        'Latency = ' + fmtT(Tp) + ' + ' + fmtT(Tt) + ' + ' + fmtT(d.q) + ' + ' + fmtT(d.p) + ' = <b>' + fmtT(d.tot) + '</b>';
      var share = d.tot > 0 ? d[big] / d.tot : 0;
      verdict.className = 'w-verdict ' + (share > 0.9 ? 'ok' : 'warn');
      verdict.textContent = share > 0.9 ? NAMES[big] + ' dominates: ' + pct(share) + ' of the latency.' +
        (big === 'tp' ? ' Distance matters, bandwidth hardly does.' : big === 'tt' ? ' Bandwidth matters, distance hardly does.' : ' The routers are the bottleneck.')
        : 'No single delay dominates: ' + NAMES[big].toLowerCase() + ' is the largest at ' + pct(share) + '.';
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { delays: delays, fmtT: fmtT, sci: sci };
})();
