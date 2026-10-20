(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var HOPS = 24;

  // Same pseudo-random generator as Multiplexing Lab tab 4, so a given M and seed give the same hop pattern there.
  function hopSeq(M, seed, n) {
    var sd = Math.max(1, seed), seq = [];
    for (var i = 0; i < n; i++) { sd = (sd * 1103515245 + 12345) % 2147483648; seq.push(Math.floor(sd / 2147483648 * M)); }
    return seq;
  }
  function calc(st) {
    var J = st.jam.filter(function (j) { return j < st.M; }).length, seq = hopSeq(st.M, st.seed, HOPS);
    var hits = seq.filter(function (c) { return st.jam.indexOf(c) >= 0; }).length;
    return { seq: seq, J: J, hits: hits, frac: J / st.M, Th: 1 / st.hop, bitsPerHop: st.R * 1000 / st.hop,
      Bss: st.M * st.B, gainDb: 10 * Math.log10(st.M), lostRate: st.R * J / st.M, k: Math.ceil(Math.log2(st.M)) };
  }
  var PRE = {
    fig: { M: 8, B: 1, hop: 1600, R: 1000, seed: 7, jam: [5] },
    bt: { M: 79, B: 1, hop: 1600, R: 1000, seed: 7, jam: [40] },
    bt4: { M: 79, B: 1, hop: 1600, R: 1000, seed: 7, jam: [20, 21, 22, 23] }
  };
  function fmtHz(mhz) { return mhz >= 1 ? fmtN(mhz, 1) + ' MHz' : fmtN(mhz * 1000, 0) + ' kHz'; }
  function fmtRate(kbps) { return kbps >= 1000 ? fmtN(kbps / 1000, 2) + ' Mbps' : fmtN(kbps, 0) + ' kbps'; }
  function fmtT(s) { return s >= 1e-3 ? fmtN(s * 1000, 3) + ' ms' : fmtN(s * 1e6, 1) + ' µs'; }

  D.register('fhss', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.fig));
    var cv = D.canvas(1080, 846), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' }), verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    var mSl = D.slider('Frequencies M', 2, 80, 1, st.M, function (v) { return v + ' channels'; }, function (v) { st.M = v; st.jam = st.jam.filter(function (j) { return j < v; }); changed(); });
    var bSl = D.slider('Channel bandwidth B', 0.5, 5, 0.5, st.B, function (v) { return fmtHz(v); }, function (v) { st.B = v; changed(); });
    var hSl = D.slider('Hop rate', 100, 3200, 100, st.hop, function (v) { return v.toLocaleString('en-US') + ' hops/s'; }, function (v) { st.hop = v; changed(); });
    var rSl = D.slider('Data rate', 100, 3000, 100, st.R, function (v) { return fmtRate(v); }, function (v) { st.R = v; changed(); });
    var seedL = h('span', { style: 'font:600 24px ' + MONO + ';color:' + C.orange });
    var pre = D.seg([['fig', '8 channels (figure)'], ['bt', 'Bluetooth 79'], ['bt4', 'Bluetooth, 4 jammed']], 'fig', function (k) {
      st = JSON.parse(JSON.stringify(PRE[k])); mSl.set(st.M); bSl.set(st.B); hSl.set(st.hop); rSl.set(st.R); draw();
    });
    function changed() { pre.set(''); draw(); }
    var seedRow = h('div', { cls: 'w-row', style: 'gap:10px;align-items:center;margin-top:6px' }, [
      h('span', { text: 'Code seed', style: 'font-weight:600' }), D.btn('−', function () { st.seed = Math.max(1, st.seed - 1); changed(); }), seedL,
      D.btn('+', function () { st.seed++; changed(); }), D.btn('Clear jammer', function () { st.jam = []; changed(); })]);
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:4px 20px 10px' }, [mSl.el, bSl.el, hSl.el, rSl.el, seedRow]),
        h('div', { cls: 'w-card', style: 'padding:8px 18px' }, [form]), verdict])]));

    // geometry
    var GX0 = 120, GX1 = 1060, GY0 = 96, GY1 = 600, CW = (GX1 - GX0) / HOPS;
    cv.c.style.cursor = 'pointer';
    cv.c.addEventListener('click', function (e) {
      var r = cv.c.getBoundingClientRect(), y = (e.clientY - r.top) * cv.h / r.height, x = (e.clientX - r.left) * cv.w / r.width;
      if (y < GY0 || y > GY1 || x < 10) return;
      var rh = (GY1 - GY0) / st.M, ch = st.M - 1 - Math.floor((y - GY0) / rh);
      var i = st.jam.indexOf(ch); if (i >= 0) st.jam.splice(i, 1); else st.jam.push(ch);
      changed();
    });

    function draw() {
      var R = calc(st), g = cv.g, W = cv.w, H = cv.h, M = st.M, rh = (GY1 - GY0) / M;
      seedL.textContent = st.seed;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText('Frequency (' + M + ' channels) vs time (' + HOPS + ' hops of ' + fmtT(R.Th) + ')', 20, 32);
      g.font = '600 20px ' + SANS; g.fillStyle = C.red; g.textAlign = 'right'; g.fillText('click a row to put a jammer there', W - 20, 32);
      // code row
      var bin = M <= 16 && Math.pow(2, R.k) === M;
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText(bin ? R.k + '-bit code' : 'channel no.', 12, 74);
      g.font = (bin && R.k > 3 ? '500 15px ' : '600 20px ') + MONO; g.textAlign = 'center';
      R.seq.forEach(function (c, i) { g.fillStyle = st.jam.indexOf(c) >= 0 ? C.red : C.navy; g.fillText(bin ? D.bin(c, R.k) : String(c), GX0 + (i + 0.5) * CW, 74); });
      // grid rows
      for (var c = 0; c < M; c++) {
        var y = GY0 + (M - 1 - c) * rh, jam = st.jam.indexOf(c) >= 0;
        if (jam) { g.fillStyle = 'rgba(192,57,43,0.22)'; g.fillRect(GX0, y, GX1 - GX0, rh); }
      }
      g.strokeStyle = C.grid; g.lineWidth = 1;
      if (M <= 40) for (c = 0; c <= M; c++) { y = GY0 + c * rh; g.beginPath(); g.moveTo(GX0, y); g.lineTo(GX1, y); g.stroke(); }
      for (var i = 0; i <= HOPS; i++) { g.beginPath(); g.moveTo(GX0 + i * CW, GY0); g.lineTo(GX0 + i * CW, GY1); g.stroke(); }
      g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(GX0, GY0, GX1 - GX0, GY1 - GY0);
      // channel labels
      g.font = '500 20px ' + MONO; g.textAlign = 'right';
      var every = M <= 16 ? 1 : M <= 40 ? 5 : 10;
      for (c = 0; c < M; c++) {
        jam = st.jam.indexOf(c) >= 0;
        if (c % every === 0 || jam && M <= 40) { g.fillStyle = jam ? C.red : C.gray; g.fillText('f' + c, GX0 - 10, GY0 + (M - 0.5 - c) * rh + 7); }
      }
      // hop cells
      R.seq.forEach(function (c, i) {
        var x = GX0 + i * CW + 2, y = GY0 + (M - 1 - c) * rh + (rh > 8 ? 2 : 0), hh = Math.max(4, rh - (rh > 8 ? 4 : 0)), hit = st.jam.indexOf(c) >= 0;
        g.fillStyle = hit ? C.red : C.orange; g.fillRect(x, y, CW - 4, hh);
        if (hit) { var cx = x + (CW - 4) / 2, cy = y + hh / 2; g.font = '700 22px ' + SANS; g.textAlign = 'center'; if (hh >= 26) { g.fillStyle = '#fff'; g.fillText('✕', cx, cy + 8); } else g.fillText('✕', cx, cy - hh / 2 - 6 < GY0 + 18 ? cy + hh / 2 + 22 : cy - hh / 2 - 6); }
      });
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'left';
      g.fillText('the hops spread over M × B = ' + fmtHz(R.Bss) + '; each hop uses only B = ' + fmtHz(st.B), GX0, GY1 + 28);
      // fixed-carrier comparison
      var fixed = st.jam.length ? st.jam[0] : Math.floor(M / 2), yS = 676, sh = 40;
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.fillText('Fixed carrier on f' + fixed + (st.jam.length ? ' (where the jammer sits), no hopping:' : ', no hopping (no jammer yet):'), 20, yS - 10);
      for (i = 0; i < HOPS; i++) { g.fillStyle = st.jam.length ? C.red : C.blue; g.fillRect(GX0 + i * CW + 2, yS, CW - 4, sh); }
      if (st.jam.length) { g.fillStyle = '#fff'; g.font = '700 22px ' + SANS; g.textAlign = 'center'; for (i = 0; i < HOPS; i++) g.fillText('✕', GX0 + (i + 0.5) * CW, yS + 28); }
      // loss bars
      function bar(y, label, frac, col, txt) {
        g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(label, 20, y + 26);
        var x0 = 230, x1 = 680; g.fillStyle = C.grid; g.fillRect(x0, y, x1 - x0, 36); g.fillStyle = col; g.fillRect(x0, y, (x1 - x0) * Math.min(1, frac), 36);
        g.strokeStyle = C.line; g.strokeRect(x0, y, x1 - x0, 36);
        g.fillStyle = col; g.font = '700 24px ' + MONO; g.fillText(txt, x1 + 14, y + 27);
      }
      bar(740, 'FHSS data lost', R.frac, R.J ? C.orange : C.green, fmtN(R.frac * 100, 1) + '%');
      bar(792, 'Fixed carrier lost', st.jam.length ? 1 : 0, st.jam.length ? C.red : C.green, st.jam.length ? '100%' : '0%');
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'right';
      g.fillText('= J/M; shown: ' + R.hits + ' of ' + HOPS + ' hops hit', W - 16, 740 + 26);

      // formulas
      var Js = R.J;
      form.innerHTML = 'Th = 1/' + st.hop.toLocaleString('en-US') + ' = <b>' + fmtT(R.Th) + '</b>\n' +
        'bits/hop = ' + (st.R * 1000).toLocaleString('en-US') + '/' + st.hop.toLocaleString('en-US') + ' = ' + fmtN(R.bitsPerHop, 1) + ' bits\n' +
        'B<sub>FHSS</sub> = M × B = ' + M + ' × ' + fmtHz(st.B) + ' = <b>' + fmtHz(R.Bss) + '</b>\n' +
        'Gain = M = ' + M + ' → 10 log₁₀ ' + M + ' = <b>' + fmtN(R.gainDb, 1) + ' dB</b>\n' +
        'lost = J/M = ' + Js + '/' + M + ' = <b>' + fmtN(R.frac * 100, 1) + '%</b>\n' +
        '  = ' + fmtRate(st.R) + ' × ' + Js + '/' + M + ' = ' + fmtRate(R.lostRate);
      verdict.className = 'w-verdict ' + (R.J === 0 ? 'ok' : R.frac <= 0.2 ? 'warn' : 'bad');
      verdict.textContent = R.J === 0 ? 'No jammer: click a frequency row to add one.'
        : R.J + ' of ' + M + ' channels jammed: FHSS loses ' + fmtN(R.frac * 100, 1) + '%, a fixed carrier 100%.';
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { hopSeq: hopSeq, calc: calc };
})();
