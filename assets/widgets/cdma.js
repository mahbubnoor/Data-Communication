(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, SANS = D.SANS, MONO = D.MONO;

  /* ---- pure functions ---- */
  function walsh(n) { var W = [[1]]; while (W.length < n) { W = W.map(function (r) { return r.concat(r); }).concat(W.map(function (r) { return r.concat(r.map(function (x) { return -x; })); })); } return W; }
  function channel(W, d) { return W[0].map(function (_, k) { return d.reduce(function (a, di, i) { return a + di * W[i][k]; }, 0); }); }
  function decode(W, ch, i) { var ip = ch.reduce(function (a, x, k) { return a + x * W[i][k]; }, 0); return { ip: ip, r: ip / W.length }; }
  function sg(v) { return v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0'; }
  if (typeof module !== 'undefined') module.exports = { walsh: walsh, channel: channel, decode: decode };

  var PRE = { fig: [-1, -1, 0, 1, 1, 0, -1, 1], ex2: [1, 1, -1, 0, 1, 0, -1, 1] };
  var LAB = { 1: 'bit 1', '-1': 'bit 0', 0: 'silent' };

  D.register('cdma', function (root) {
    var st = { N: 4, d: PRE.fig.slice(), k: 1 };   // k = station being decoded (0-based); Fig. 12.26 decodes station 2
    var rowsBox = h('div', { cls: 'w-col', style: 'gap:6px' });
    var chCv = D.canvas(1080, 196), decCv = D.canvas(1080, 196);
    var nSeg = D.seg([['2', 'W2: 2 stations'], ['4', 'W4: 4'], ['8', 'W8: 8']], '4', function (k) { st.N = +k; if (st.k >= st.N) st.k = 0; build(); });
    var preSeg = D.seg([['fig', 'Forouzan Fig. 12.26'], ['ex2', 'Practice (cdmaex2)']], 'fig', function (k) {
      st.d = PRE[k].slice(); st.N = 4; st.k = k === 'fig' ? 1 : 0; nSeg.set('4'); build();
    });
    var kBox = h('div', { cls: 'w-btns', style: 'gap:8px' });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var note = h('p', { cls: 'w-note' });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:8px' }, [rowsBox, chCv.c, decCv.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding-top:12px;padding-bottom:12px' }, [h('h4', { text: 'Walsh table' }), nSeg.el]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding-top:12px;padding-bottom:12px' }, [h('h4', { text: 'Presets' }), preSeg.el]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding-top:12px;padding-bottom:12px' }, [h('h4', { text: 'Decode station' }), kBox]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding-top:12px;padding-bottom:12px' }, [form, note])])
    ]));
    [].forEach.call(preSeg.el.children, function (b) { b.style.fontSize = '22px'; });
    [].forEach.call(nSeg.el.children, function (b) { b.style.fontSize = '22px'; });

    var LW = 80, SW = 286, GAP = 10, SX = LW + SW + 2 * GAP; // station-row geometry; strips start at SX
    var strips = [];
    function geo() {
      var N = st.N, cw = N === 8 ? 40 : (N === 4 ? 62 : 80), gw = N * cw;
      SW = N === 8 ? 156 : 286; SX = LW + SW + 2 * GAP;
      return { cw: cw, codeX: 22, prodX: 22 + gw + (N === 8 ? 120 : 150), gw: gw, tx: 22 + gw + (N === 8 ? 60 : 75) };
    }
    function build() {
      rowsBox.innerHTML = ''; strips = [];
      var N = st.N, rh = N === 8 ? 46 : (N === 4 ? 72 : 80), G = geo();
      rowsBox.style.gap = (N === 8 ? 4 : 6) + 'px';
      // header
      var hd = D.canvas(1080, 30); rowsBox.appendChild(hd.c);
      var g = hd.g; g.font = '600 20px ' + SANS; g.fillStyle = C.gray; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText('station', 0, 15); g.fillText(N === 8 ? 'data (– = silent)' : 'data d (click)', LW + GAP, 15);
      g.fillText('code c (row of W' + N + ')', SX + G.codeX, 15); g.fillText('d × c', SX + G.prodX, 15);
      for (var i = 0; i < N; i++) (function (i) {
        var sgm = D.seg(N === 8 ? [['1', '1'], ['-1', '0'], ['0', '–']] : [['1', 'bit 1'], ['-1', 'bit 0'], ['0', 'silent']], String(st.d[i]), function (k) { st.d[i] = +k; draw(); });
        [].forEach.call(sgm.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:' + (N === 8 ? '3px' : '7px') + ' 12px;border-width:2px'; });
        sgm.el.style.cssText = 'width:' + SW + 'px;gap:6px;flex-wrap:nowrap';
        var cvs = D.canvas(1080 - SX, rh); strips.push(cvs);
        rowsBox.appendChild(h('div', { style: 'display:flex;align-items:center;gap:' + GAP + 'px;height:' + rh + 'px' }, [
          h('div', { style: 'width:' + LW + 'px;font:600 24px ' + SANS + ';color:' + C.navy, text: 'Stn ' + (i + 1) }), sgm.el, cvs.c]));
      })(i);
      kBox.innerHTML = '';
      for (i = 0; i < N; i++) (function (i) {
        kBox.appendChild(D.btn(String(i + 1), function () { st.k = i; draw(); }, i === st.k ? 'on' : ''));
      })(i);
      draw();
    }
    function chip(g, x, y, w, hh, v, fill, ink) {
      g.fillStyle = fill; g.fillRect(x + 2, y, w - 4, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(x + 2.5, y + 0.5, w - 5, hh - 1);
      g.fillStyle = ink; g.font = '600 ' + (w < 50 ? 20 : 23) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sg(v), x + w / 2, y + hh / 2 + 1);
    }
    function codeFill(v) { return v > 0 ? '#dbe7f5' : v < 0 ? '#f6dfcc' : '#eef0f2'; }
    function draw() {
      var N = st.N, W = walsh(N), d = st.d.slice(0, N), ch = channel(W, d), G = geo(), cw = G.cw;
      [].forEach.call(kBox.children, function (b, i) { b.classList.toggle('on', i === st.k); });
      strips.forEach(function (s, i) {
        var g = s.g, hh = s.h, ch0 = Math.min(hh - 8, 46), y = (hh - ch0) / 2;
        g.clearRect(0, 0, s.w, hh); if (i === st.k) { g.fillStyle = '#fbe9da'; g.fillRect(0, 0, s.w, hh); }
        for (var k = 0; k < N; k++) chip(g, G.codeX + k * cw, y, cw, ch0, W[i][k], codeFill(W[i][k]), C.ink);
        g.font = '600 22px ' + MONO; g.fillStyle = C.navy; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('× ' + sg(d[i]) + ' =', G.tx, hh / 2);
        for (k = 0; k < N; k++) { var p = W[i][k] * d[i]; chip(g, G.prodX + k * cw, y, cw, ch0, p, d[i] === 0 ? '#f3f4f5' : codeFill(p), d[i] === 0 ? '#9aa5b1' : C.ink); }
      });
      // channel: chips + waveform
      var g = chCv.g, w = chCv.w, hh = chCv.h, px = SX + G.prodX, mx = Math.max(1, Math.max.apply(null, ch.map(Math.abs)));
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.font = '600 22px ' + SANS; g.fillStyle = C.orange; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('Channel D = sum of all d × c', 14, 30); g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.fillText('(chip by chip; only this travels)', 14, 58);
      for (var k = 0; k < N; k++) chip(g, px + k * cw, 10, cw, 46, ch[k], '#fbe9da', C.orange);
      // waveform of the channel, under the chips
      var wy = 136, amp = 46, wx0 = px, wx1 = px + N * cw;
      g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(wx0 - 30, wy); g.lineTo(wx1 + 30, wy); g.stroke();
      g.setLineDash([3, 5]); g.beginPath(); g.moveTo(wx0 - 30, wy - amp); g.lineTo(wx1 + 30, wy - amp); g.moveTo(wx0 - 30, wy + amp); g.lineTo(wx1 + 30, wy + amp); g.stroke(); g.setLineDash([]);
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('0', wx0 - 36, wy); g.fillText(sg(mx), wx0 - 36, wy - amp); g.fillText(sg(-mx), wx0 - 36, wy + amp);
      g.strokeStyle = C.orange; g.lineWidth = 4; g.beginPath(); g.moveTo(wx0 - 30, wy); g.lineTo(wx0, wy);
      for (k = 0; k < N; k++) { var yy = wy - ch[k] / mx * amp; g.lineTo(wx0 + k * cw, yy); g.lineTo(wx0 + (k + 1) * cw, yy); }
      g.lineTo(wx1, wy); g.lineTo(wx1 + 30, wy); g.stroke();
      g.fillStyle = C.gray; g.textAlign = 'right'; g.font = '500 20px ' + SANS; g.fillText('signal on the medium (one data bit = ' + N + ' chips)', wx0 - 80, wy);
      // decoding
      var dc = decode(W, ch, st.k), r = dc.r, bit = r > 0 ? 'bit 1' : r < 0 ? 'bit 0' : 'silent';
      g = decCv.g; w = decCv.w; hh = decCv.h;
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('Station ' + (st.k + 1) + ' listens:', 14, 34); g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.fillText('D × c' + (st.k + 1) + ', chip by chip', 14, 62);
      var cx = SX + G.codeX;
      g.font = '600 22px ' + MONO; g.fillStyle = C.navy; g.textAlign = 'right'; g.fillText('c' + (st.k + 1), cx - 8, 34);
      for (k = 0; k < N; k++) chip(g, cx + k * cw, 12, cw, 44, W[st.k][k], codeFill(W[st.k][k]), C.ink);
      g.textAlign = 'center'; g.fillText((N === 8 ? '' : 'D × c' + (st.k + 1)) + ' =', SX + G.tx, 34);
      for (k = 0; k < N; k++) chip(g, px + k * cw, 12, cw, 44, ch[k] * W[st.k][k], '#fbe9da', C.orange);
      var terms = ch.map(function (x, k) { return x * W[st.k][k]; });
      var sum = terms.map(function (t, i) { return (i ? (t < 0 ? ' − ' : ' + ') + Math.abs(t) : sg(t)); }).join('');
      g.textAlign = 'left'; g.font = '600 23px ' + MONO; g.fillStyle = C.ink;
      var line = 'sum = ' + sum + ' = ' + sg(dc.ip);
      if (line.length > 72) line = 'sum = ' + sg(dc.ip);
      g.fillText(line, 14, 104);
      g.font = '700 30px ' + MONO; g.fillStyle = C.orange;
      g.fillText(sg(dc.ip) + ' / ' + N + ' = ' + sg(r) + '  →  ' + bit, 14, 152);
      var sent = d[st.k], okk = sent === r;
      g.font = '600 22px ' + SANS; g.fillStyle = okk ? C.green : C.red; g.textAlign = 'right';
      g.fillText(okk ? 'matches what station ' + (st.k + 1) + ' sent (' + LAB[sent] + ') ✓' : 'mismatch ✗', w - 16, 152);
      // formula column
      form.innerHTML = 'bit 1 → +1, bit 0 → −1, silent → 0\nD = d1·c1 + d2·c2 + … (chip sums)\nD·c' + (st.k + 1) + ' = d' + (st.k + 1) + '·N + 0 + … + 0\n' +
        '    = ' + sg(dc.ip) + ' → ÷ ' + N + ' = <b>' + sg(r) + ' (' + bit + ')</b>\nc·c = ' + N + ',  ci·cj = 0 (i ≠ j)';
      note.innerHTML = st.N === 4 && d.join() === '-1,-1,0,1' ?
        'Fig. 12.26 corrected: the book prints c2 = [+1 +1 +1 −1] and d2·c2 = [−1 −1 −1 +1]. The correct c2 is [+1 −1 +1 −1], giving D = [−1 −1 −3 +1]; and −4/4 = −1 means bit 0, not bit 1.' :
        'Codes are rows of the Walsh table: W2N = [WN WN; WN −WN]. Any two rows are orthogonal, so other stations cancel.';
    }
    build();
  });
})();
