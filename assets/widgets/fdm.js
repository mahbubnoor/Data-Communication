(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var COLS = ['#f0a35e', '#9fc1e6', '#8fd19e', '#e6a0c4', '#f5d76e', '#b7a6f0', '#7fd6d6', '#f0827a', '#c4d97a', '#d9b38c', '#a3c4f0', '#f0c4a3'];
  var QNAME = { 1: 'BPSK (2 levels)', 2: 'QPSK = 4-QAM', 3: '8-QAM', 4: '16-QAM', 5: '32-QAM', 6: '64-QAM', 7: '128-QAM', 8: '256-QAM' };

  function plan(st) { // analog: n channels of B with guards G from f0 (kHz)
    var B = st.mode === 'dig' ? st.W * 1000 / st.n : st.B, G = st.mode === 'dig' ? 0 : st.G, ch = [];
    for (var i = 0; i < st.n; i++) { var a = st.f0 + i * (B + G); ch.push([a, a + B]); }
    var tot = st.n * B + (st.n - 1) * G, out = { B: B, G: G, tot: tot, ch: ch, end: st.f0 + tot };
    if (st.mode === 'dig') {
      out.bph = st.R * 1000 / B; out.r = Math.max(1, Math.ceil(out.bph - 1e-9)); out.M = Math.pow(2, out.r); out.baud = st.R * 1000 / out.r;
    }
    return out;
  }
  function sup(r) { return String(r).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]; }).join(''); }
  function qname(r) { return QNAME[r] || (r <= 12 ? Math.pow(2, r) + '-QAM' : '2' + sup(r) + '-QAM'); }
  function k(v) { return fmtN(v, 2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  var PRE = {
    ex61: { mode: 'ana', n: 3, B: 4, G: 0, f0: 20, R: 1, W: 1 },
    ex62: { mode: 'ana', n: 5, B: 100, G: 10, f0: 0, R: 1, W: 1 },
    chk: { mode: 'ana', n: 8, B: 50, G: 5, f0: 0, R: 1, W: 1 },
    ex63: { mode: 'dig', n: 4, B: 100, G: 10, f0: 0, R: 1, W: 1 }
  };

  D.register('fdm', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.ex62));
    var note = h('p', { cls: 'w-note' });
    var cv = D.canvas(1080, 600), form = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var nSl = D.slider('Channels n', 1, 12, 1, st.n, function (v) { return String(v); }, function (v) { st.n = v; changed(); });
    var bSl = D.slider('Bandwidth per channel B', 1, 200, 1, st.B, function (v) { return v + ' kHz'; }, function (v) { st.B = v; changed(); });
    var gSl = D.slider('Guard band G', 0, 50, 1, st.G, function (v) { return v + ' kHz'; }, function (v) { st.G = v; changed(); });
    var fSl = D.slider('Link starts at f₀', 0, 1000, 1, st.f0, function (v) { return k(v) + ' kHz'; }, function (v) { st.f0 = v; changed(); });
    var rSl = D.slider('Data rate per channel R', 0.25, 10, 0.25, st.R, function (v) { return fmtN(v, 2) + ' Mbps'; }, function (v) { st.R = v; changed(); });
    var wSl = D.slider('Link bandwidth', 0.5, 20, 0.5, st.W, function (v) { return fmtN(v, 1) + ' MHz'; }, function (v) { st.W = v; changed(); });
    var mode = D.seg([['ana', 'Analog channels'], ['dig', 'Digital channels']], 'ana', function (m) { st.mode = m; changed(); });
    var pre = D.seg([['ex61', 'Ex. 6.1'], ['ex62', 'Ex. 6.2'], ['chk', '8 × 50 kHz'], ['ex63', 'Ex. 6.3']], 'ex62', function (key) {
      st = JSON.parse(JSON.stringify(PRE[key])); mode.set(st.mode);
      nSl.set(st.n); bSl.set(st.B); gSl.set(st.G); fSl.set(st.f0); rSl.set(st.R); wSl.set(st.W); draw();
    });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:12px 20px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px;padding:14px 20px' }, [mode.el, h('h4', { text: 'Textbook examples' }), pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:6px 20px' }, [nSl.el, bSl.el, gSl.el, fSl.el, rSl.el, wSl.el]), verdict, note])]));
    function changed() { pre.set(''); draw(); }

    function draw() {
      var dig = st.mode === 'dig', P = plan(st), g = cv.g, w = cv.w, H = cv.h;
      [bSl, gSl, fSl].forEach(function (s) { s.el.style.display = dig ? 'none' : ''; });
      [rSl, wSl].forEach(function (s) { s.el.style.display = dig ? '' : 'none'; });
      var unit = dig ? 'MHz' : 'kHz', sc = dig ? 1000 : 1, u = function (v) { return k(v / sc); };
      g.clearRect(0, 0, w, H); g.fillStyle = C.panel; g.fillRect(0, 0, w, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, H - 1);
      var x0 = 50, x1 = w - 50, base = 450, top = 140, span = P.tot || 1;
      var X = function (f) { return x0 + (f - st.f0) / span * (x1 - x0); };
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText(dig ? 'Ex. 6.3 style: each digital channel is modulated into its own band' : 'Channels side by side in frequency · grey = guard bands', 24, 36);
      // total brace
      g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(X(st.f0), 82); g.lineTo(X(st.f0), 70); g.lineTo(X(P.end), 70); g.lineTo(X(P.end), 82); g.stroke();
      var tl = 'link bandwidth = ' + u(P.tot) + ' ' + unit; g.font = '700 24px ' + SANS; var tw = g.measureText(tl).width + 24;
      g.fillStyle = C.panel; g.fillRect(w / 2 - tw / 2, 54, tw, 30); g.fillStyle = C.orange; g.textAlign = 'center'; g.fillText(tl, w / 2, 78);
      // guards
      P.ch.forEach(function (c, i) {
        if (i < P.ch.length - 1 && P.G > 0) {
          var a = X(c[1]), b = X(c[1] + P.G);
          g.fillStyle = 'rgba(91,102,114,.18)'; g.fillRect(a, top - 20, b - a, base - top + 20);
          g.strokeStyle = 'rgba(91,102,114,.45)'; g.lineWidth = 1;
          for (var y = top - 20; y < base; y += 14) { g.beginPath(); g.moveTo(a, Math.min(base, y + Math.min(14, b - a))); g.lineTo(Math.min(b, a + 14), y); g.stroke(); }
          if (b - a > 26) { g.fillStyle = C.gray; g.font = '600 20px ' + SANS; g.textAlign = 'center'; g.fillText('G', (a + b) / 2, top - 28); }
        }
      });
      // channels
      var n = P.ch.length, wch = (x1 - x0) * P.B / span;
      P.ch.forEach(function (c, i) {
        var a = X(c[0]), b = X(c[1]), sl = Math.min(18, (b - a) * 0.15);
        g.fillStyle = COLS[i % COLS.length]; g.beginPath(); g.moveTo(a, base); g.lineTo(a + sl, top); g.lineTo(b - sl, top); g.lineTo(b, base); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(22,50,79,.5)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = C.ink; g.textAlign = 'center';
        if (wch > 46) { g.font = '600 ' + (wch > 70 ? 22 : 20) + 'px ' + SANS; g.fillText((wch > 70 ? 'Ch ' : '') + (i + 1), (a + b) / 2, top + 40); }
        if (dig && wch > 120) { g.font = '600 20px ' + MONO; g.fillText(fmtN(st.R, 2) + ' Mbps', (a + b) / 2, top + 80); g.fillText(qname(P.r).split(' ')[0], (a + b) / 2, top + 108); }
        if (!dig && wch > 120) { g.font = '500 20px ' + MONO; g.fillText(u(c[0]) + '–' + u(c[1]), (a + b) / 2, top + 76); }
      });
      // axis
      g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 20, base); g.lineTo(x1 + 30, base); g.stroke();
      g.fillStyle = C.navy; g.beginPath(); g.moveTo(x1 + 36, base); g.lineTo(x1 + 24, base - 7); g.lineTo(x1 + 24, base + 7); g.fill();
      var edges = [st.f0]; P.ch.forEach(function (c, i) { edges.push(c[1]); if (i < n - 1 && P.G > 0) edges.push(c[1] + P.G); });
      var minGap = 74, last = -1e9, lastLab = X(P.end) - 0;
      g.font = '500 20px ' + MONO; g.textAlign = 'center';
      edges.forEach(function (f, i) {
        var x = X(f), isEnd = i === edges.length - 1 || i === 0;
        g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, base); g.lineTo(x, base + 8); g.stroke();
        if ((x - last >= minGap && lastLab - x >= minGap) || isEnd) { g.fillStyle = isEnd ? C.orange : C.gray; g.fillText(u(f), x, base + 32); last = x; }
      });
      g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = 'right'; g.fillText('frequency (' + unit + ')', x1 + 36, base + 64);
      g.textAlign = 'left'; g.fillText(n + ' channels, ' + (n - 1) + ' gap' + (n === 2 ? '' : 's') + ' between them' + (P.G > 0 ? '' : ' (no guard bands)'), x0 - 20, base + 64);
      g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = 'left';
      g.fillText('At the receiver, ' + n + ' band-pass filters pick out the channels; each is shifted back down and demodulated.', x0 - 20, H - 26);
      // formulas
      var f = '';
      if (!dig) {
        f += 'Total = n·B + (n − 1)·G = ' + st.n + ' × ' + k(st.B) + ' + ' + (st.n - 1) + ' × ' + k(st.G) + ' = <b>' + k(P.tot) + ' kHz</b>\n';
        f += 'Band: ' + k(st.f0) + ' to ' + k(P.end) + ' kHz\n';
        f += P.ch.slice(0, 6).map(function (c, i) { return 'Ch ' + (i + 1) + ': ' + k(c[0]) + '–' + k(c[1]); }).join(',  ') + (n > 6 ? ', …' : '');
        if (st.G > 0 && n > 1) f += '\n<span class="bad">Not</span> n guards: ' + st.n + ' × ' + k(st.B) + ' + ' + st.n + ' × ' + k(st.G) + ' = ' + k(st.n * (st.B + st.G)) + ' kHz wastes one G';
      } else {
        f += 'Each channel gets B = ' + fmtN(st.W, 2) + ' MHz / ' + st.n + ' = <b>' + k(P.B) + ' kHz</b>\n';
        f += 'Bits per hertz = R / B = ' + k(st.R * 1000) + ' kbps / ' + k(P.B) + ' kHz = <b>' + fmtN(P.bph, 3) + '</b>' + (Math.abs(P.bph - P.r) > 1e-9 ? ' → round up to ' + P.r : '') + '\n';
        f += 'r = ' + P.r + ' bits per signal element → M = 2' + sup(P.r) + ' = <b>' + qname(P.r) + '</b>\n';
        f += 'S = R / r = ' + k(st.R * 1000) + ' / ' + P.r + ' = ' + k(P.baud) + ' kbaud ≤ B = ' + k(P.B) + ' kHz (d = 0)';
      }
      form.innerHTML = f;
      note.textContent = dig ? 'Forouzan Ex. 6.3: the satellite channel is analog, so each digital channel is first modulated (Lecture 7); more bits per hertz needs a denser constellation.' :
        'Why n − 1 guards? Guard bands sit only between neighbours: n channels in a row have n − 1 gaps. Ex. 6.1 uses single-sideband, so each voice stays 4 kHz wide.';
      if (!dig) {
        var waste = P.tot > 0 ? (n - 1) * P.G / P.tot : 0;
        verdict.className = 'w-verdict ' + (P.G > 0 ? 'warn' : 'ok');
        verdict.textContent = P.G > 0 ? 'Guard bands cost ' + k((n - 1) * P.G) + ' kHz, ' + fmtN(+(waste * 100).toPrecision(3), 2) + '% of the link, but stop neighbouring channels leaking into each other.' :
          'No guard bands: every hertz carries a channel. Real filters are not this sharp, so real systems add gaps.';
      } else {
        verdict.className = 'w-verdict ' + (P.r <= 6 ? 'ok' : 'bad');
        verdict.textContent = P.r <= 6 ? 'Each ' + fmtN(st.R, 2) + ' Mbps channel fits its ' + k(P.B) + ' kHz with ' + qname(P.r) + '.' :
          'Needs ' + P.r + ' bits per hertz (' + qname(P.r) + '): too dense for a noisy satellite link. Use fewer channels or a wider band.';
      }
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { plan: plan };
})();
