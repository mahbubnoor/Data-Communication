(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;

  /* ---- pure functions (slides satellites/orbits, lab L14 tab 4) ---- */
  var RE = 6378, GM = 398600.4, VC = 300000, WE = 2 * Math.PI / 86164.1, EPS = 10; // km, km^3/s^2, km/s, rad/s (sidereal), min elevation deg
  function orbit(hk) {
    var r = RE + hk, T1 = Math.pow(r, 1.5) / 100, T2 = 2 * Math.PI * Math.sqrt(r * r * r / GM);
    var e = EPS * Math.PI / 180, lam = Math.acos(RE * Math.cos(e) / r) - e; // Earth central half-angle seen at >= 10 deg elevation
    var frac = (1 - Math.cos(lam)) / 2, N = Math.ceil(1 / frac);
    var wr = 2 * Math.PI / T2 - WE; // rad/s relative to the turning Earth (equatorial, eastward)
    var sky = wr * r / hk * 180 / Math.PI * 60; // deg per minute, seen straight overhead
    var pass = Math.abs(wr) > 1e-9 ? 2 * lam / Math.abs(wr) : Infinity; // s, horizon (10 deg) to horizon
    return { r: r, T1: T1, T2: T2, ow: hk / VC, ud: 2 * hk / VC, lam: lam, frac: frac, N: N, wr: wr, sky: sky, pass: pass };
  }
  if (typeof module !== 'undefined') module.exports = { orbit: orbit };

  function kfmt(x) { return Math.round(x).toLocaleString('en'); }
  function tfmt(s) {
    if (!isFinite(s)) return 'forever';
    if (s < 2 * 3600) return fmtN(s / 60, 1) + ' min';
    if (s < 3 * 86400) return fmtN(s / 3600, 2) + ' h';
    return fmtN(s / 86400, 1) + ' days';
  }
  function ms(s) { return fmtN(s * 1000, s < 0.01 ? 2 : 1) + ' ms'; }
  function kind(hk) { return hk < 2000 ? 'LEO' : Math.abs(hk - 35786) <= 400 ? 'GEO' : hk < 35786 ? 'MEO' : 'above GEO'; }
  var PRE = [['leo', 'LEO 550', 550], ['meo', 'MEO 10,000', 10000], ['gpsb', 'GPS book 18,000', 18000], ['gps', 'GPS 20,200', 20200], ['geo', 'GEO 35,786', 35786]];
  var HMIN = 200, HMAX = 40000;
  function toPos(hk) { return Math.round(1000 * Math.sqrt((hk - HMIN) / (HMAX - HMIN))); }
  function fromPos(p) { return Math.round((HMIN + (HMAX - HMIN) * Math.pow(p / 1000, 2)) / 10) * 10; }
  var SPEED = 1800; // simulated seconds per real second

  D.register('orbits', function (root) {
    var st = { h: 35786, t: 0, run: true };
    var cv = D.canvas(1060, 850), g = cv.g, W = cv.w, H = cv.h;
    var pre = D.seg(PRE.map(function (p) { return [p[0], p[1]]; }), 'geo', function (k) {
      PRE.forEach(function (p) { if (p[0] === k) st.h = p[2]; }); hSl.set(toPos(st.h)); reset();
    });
    [].forEach.call(pre.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:6px 12px'; });
    var hSl = D.slider('Altitude h above the Earth', 0, 1000, 1, toPos(st.h), function () { return kfmt(st.h) + ' km'; }, function (v) {
      st.h = fromPos(v); hSl.label.textContent = kfmt(st.h) + ' km'; pre.set(''); reset();
    });
    hSl.input.style.margin = '10px 0 6px';
    var playB = D.btn('❚❚ Pause', function () { st.run = !st.run; playB.textContent = st.run ? '❚❚ Pause' : '▶ Play'; if (st.run) loop(); });
    var rstB = D.btn('↺ Restart', function () { reset(); });
    [playB, rstB].forEach(function (b) { b.style.cssText = 'font-size:22px;padding:6px 14px'; });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:580px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:10px 16px' }, [pre.el]),
        h('div', { cls: 'w-card', style: 'gap:4px;padding:8px 18px 8px' }, [hSl.el,
          h('div', { style: 'display:flex;gap:10px;align-items:center' }, [playB, rstB,
            h('span', { cls: 'w-note', style: 'font-size:22px;color:' + C.gray, text: 'clock: 1 s = 30 min' })])]),
        h('div', { cls: 'w-card', style: 'padding:10px 16px' }, [form]),
        h('p', { cls: 'w-note', text: 'Navy dot: a ground station turning with the Earth. Orange cap: where the satellite is above 10° elevation (λ = half-angle at the Earth\'s centre); satellites ≈ Earth area / cap area, a lower bound. Orbits drawn equatorial.' })])
    ]));

    function reset() { st.t = 0; draw(); }

    function draw() {
      var o = orbit(st.h);
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var cx = 435, cy = 440, sc = 395 / (RE + HMAX), Re = RE * sc;
      var thE = -WE * st.t, thS = -(2 * Math.PI / o.T2) * st.t - Math.PI / 2; // canvas angles (anticlockwise = negative), start overhead (top)
      // reference rings
      g.setLineDash([6, 8]); g.lineWidth = 1.5; g.strokeStyle = C.sky;
      [[550, 'LEO 550'], [20200, 'GPS 20,200'], [35786, 'GEO 35,786']].forEach(function (q) {
        var rr = (RE + q[0]) * sc; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke();
      });
      g.setLineDash([]);
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('GPS 20,200 km', cx + (RE + 20200) * sc * 0.707 + 8, cy + (RE + 20200) * sc * 0.707 + 6);
      g.fillText('GEO 35,786 km', cx + (RE + 35786) * sc * 0.707 + 8, cy + (RE + 35786) * sc * 0.707 + 6);
      // coverage cone and cap
      var r = o.r * sc, sx = cx + r * Math.cos(thS), sy = cy + r * Math.sin(thS);
      var e1 = thS - o.lam, e2 = thS + o.lam;
      g.fillStyle = 'rgba(240,163,94,0.22)'; g.beginPath(); g.moveTo(sx, sy);
      g.lineTo(cx + Re * Math.cos(e1), cy + Re * Math.sin(e1)); g.arc(cx, cy, Re, e1, e2); g.closePath(); g.fill();
      g.strokeStyle = C.light; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + Re * Math.cos(e1), cy + Re * Math.sin(e1)); g.lineTo(sx, sy);
      g.lineTo(cx + Re * Math.cos(e2), cy + Re * Math.sin(e2)); g.stroke();
      // Earth
      g.fillStyle = C.blue; g.beginPath(); g.arc(cx, cy, Re, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + Re * Math.cos(thE - Math.PI / 2), cy + Re * Math.sin(thE - Math.PI / 2)); g.stroke();
      g.strokeStyle = C.orange; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, Re + 1, e1, e2); g.stroke();
      // ground station turning with the Earth (starts under the satellite)
      var gx = cx + Re * Math.cos(thE - Math.PI / 2), gy = cy + Re * Math.sin(thE - Math.PI / 2);
      g.fillStyle = C.navy; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(gx, gy, 7, 0, 7); g.fill(); g.stroke();
      // current orbit and satellite
      g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
      g.save(); g.translate(sx, sy); g.rotate(thS + Math.PI / 2);
      g.fillStyle = C.navy; g.fillRect(-13, -3, 26, 6); g.fillStyle = C.orange; g.fillRect(-6, -6, 12, 12); g.restore();
      // labels
      g.textBaseline = 'middle'; g.font = '600 21px ' + SANS;
      var lx = sx + (Math.cos(thS) >= 0 ? 22 : -22), ly = sy + (Math.sin(thS) >= 0 ? 24 : -24);
      if (ly < 56) ly = sy + 26;
      g.textAlign = Math.cos(thS) >= 0 ? 'left' : 'right'; g.fillStyle = C.orange;
      g.fillText(kind(st.h) + ' ' + kfmt(st.h) + ' km', Math.max(12, Math.min(W - 230, lx)), Math.max(16, Math.min(H - 16, ly)));
      g.fillStyle = C.navy; g.textAlign = 'left'; g.font = '600 22px ' + SANS;
      g.fillText('Earth and orbits to scale', 16, 26);
      var tt = st.t, th = Math.floor(tt / 3600), tm = Math.floor((tt % 3600) / 60);
      g.font = '600 22px ' + MONO; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText('t = ' + th + ' h ' + (tm < 10 ? '0' : '') + tm + ' min', 16, H - 26);
      var orbs = st.t / o.T2;
      g.textAlign = 'right'; g.fillText('orbits done: ' + fmtN(orbs, 1), 856, H - 26);
      drawGauge(o);
      // formulas
      var r0 = o.r, skyTxt;
      if (Math.abs(o.sky) < 0.005) skyTxt = '<span class="ok">fixed in the sky (GEO)</span>';
      else if (o.sky < 0) skyTxt = '<b>drifts west ' + fmtN(-o.sky, 2) + '°/min</b>';
      else skyTxt = '<b>' + fmtN(o.sky, o.sky < 1 ? 2 : 1) + '°/min</b>, pass ≈ ' + tfmt(o.pass);
      form.innerHTML =
        'r = 6,378 + ' + kfmt(st.h) + ' = ' + kfmt(r0) + ' km\n' +
        '<span style="color:' + C.navy + ';font-weight:600">Forouzan: T = C × r^1.5, C ≈ 1/100</span>\n' +
        '  = (1/100) × ' + kfmt(r0) + '^1.5\n' +
        '  = ' + kfmt(o.T1) + ' s = <b>' + tfmt(o.T1) + '</b>\n' +
        '<span style="color:' + C.navy + ';font-weight:600">Exact: T = 2π √(r³ / GM)</span>\n' +
        '  = 2π √(' + kfmt(r0) + '³ / 398,600)\n' +
        '  = ' + kfmt(o.T2) + ' s = <b>' + tfmt(o.T2) + '</b>\n' +
        '<span class="bad">2π/√GM = 1/100.5: book +' + fmtN((o.T1 / o.T2 - 1) * 100, 2) + '%</span>\n' +
        'One way: ' + kfmt(st.h) + ' / 300,000 = ' + ms(o.ow) + '\n' +
        'Up + down: 2 × ' + ms(o.ow) + ' = <b>' + ms(o.ud) + '</b>\n' +
        'Cover: λ = ' + fmtN(o.lam * 180 / Math.PI, 1) + '° → ≈ <b>' + o.N + ' satellites</b>\n' +
        'Across sky: ' + skyTxt;
    }
    function drawGauge(o) {
      var x0 = 900, x1 = 1040, y0 = 150, y1 = 790, top = 300; // ms
      g.fillStyle = C.navy; g.font = '600 21px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText('Up + down', (x0 + x1) / 2, y0 - 44); g.fillText('delay', (x0 + x1) / 2, y0 - 18);
      var Y = function (v) { return y1 - v / top * (y1 - y0); };
      g.fillStyle = '#eef2f6'; g.fillRect(x0 + 34, y0, 40, y1 - y0); g.strokeStyle = C.line; g.strokeRect(x0 + 34, y0, 40, y1 - y0);
      var v = Math.min(top, o.ud * 1000);
      g.fillStyle = C.orange; g.fillRect(x0 + 34, Y(v), 40, y1 - Y(v));
      g.font = '500 20px ' + MONO; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = C.gray;
      [0, 100, 200, 300].forEach(function (m) { g.fillText(m, x0 + 26, Y(m)); g.strokeStyle = C.grid; g.beginPath(); g.moveTo(x0 + 30, Y(m)); g.lineTo(x0 + 34, Y(m)); g.stroke(); });
      [[3.67, 'LEO'], [134.7, 'GPS'], [238.6, 'GEO']].forEach(function (q) {
        g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 30, Y(q[0])); g.lineTo(x0 + 80, Y(q[0])); g.stroke();
        g.fillStyle = C.navy; g.textAlign = 'left'; g.font = '600 20px ' + SANS; g.fillText(q[1], x0 + 84, Y(q[0]) - (q[1] === 'LEO' ? 12 : 0));
      });
      g.fillStyle = C.orange; g.font = '600 22px ' + MONO; g.textAlign = 'center';
      g.fillText(ms(o.ud), (x0 + x1) / 2 - 6, y1 + 30);
    }

    var last = null;
    function loop() {
      last = null;
      requestAnimationFrame(function fr(now) {
        if (!root.isConnected || !st.run) return;
        if (last != null && !document.hidden) st.t += Math.min(0.1, (now - last) / 1000) * SPEED;
        last = now; draw(); requestAnimationFrame(fr);
      });
    }
    draw(); loop();
  });
})();
