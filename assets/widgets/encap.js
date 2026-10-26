/* Try it: encapsulation stepper (Lecture 1, after slide "encap") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  /* Typical header sizes in bytes. OSI 7/6/5 headers have no fixed size: small illustrative values. */
  var MODELS = {
    5: [
      { n: 'Application', unit: 'message', hd: null, col: C.navy },
      { n: 'Transport', unit: 'segment', hd: { k: 'H4', b: 20, what: 'TCP header', col: C.navy }, col: C.navy },
      { n: 'Network', unit: 'datagram', hd: { k: 'H3', b: 20, what: 'IP header', col: C.blue }, col: C.navy },
      { n: 'Data link', unit: 'frame', hd: { k: 'H2', b: 14, what: 'Ethernet header', col: C.orange }, tr: { k: 'T2', b: 4, what: 'FCS trailer' }, col: C.orange },
      { n: 'Physical', unit: 'bits', hd: null, col: C.orange }],
    7: [
      { n: 'Application', unit: 'message', hd: { k: 'H7', b: 8, what: 'application header (illustrative)', col: '#61788f' }, col: C.navy },
      { n: 'Presentation', unit: 'message', hd: { k: 'H6', b: 4, what: 'presentation header (illustrative)', col: '#4c6680' }, col: C.navy },
      { n: 'Session', unit: 'message', hd: { k: 'H5', b: 4, what: 'session header (illustrative)', col: '#3a5470' }, col: C.navy },
      { n: 'Transport', unit: 'segment', hd: { k: 'H4', b: 20, what: 'TCP header', col: C.navy }, col: C.navy },
      { n: 'Network', unit: 'datagram', hd: { k: 'H3', b: 20, what: 'IP header', col: C.blue }, col: C.navy },
      { n: 'Data link', unit: 'frame', hd: { k: 'H2', b: 14, what: 'Ethernet header', col: C.orange }, tr: { k: 'T2', b: 4, what: 'FCS trailer' }, col: C.orange },
      { n: 'Physical', unit: 'bits', hd: null, col: C.orange }]
  };
  /* packet at layer i (0 = top) = list of blocks, outermost first */
  function packetAt(L, i, data) {
    var heads = [], trail = [];
    for (var j = 0; j <= i; j++) { if (L[j].hd) heads.unshift(L[j].hd); if (L[j].tr) trail.push(L[j].tr); }
    var blocks = heads.map(function (x) { return { k: x.k, b: x.b, col: x.col, kind: 'h' }; });
    blocks.push({ k: 'Data', b: data, kind: 'd' });
    trail.forEach(function (x) { blocks.push({ k: x.k, b: x.b, col: C.orange, kind: 't' }); });
    var total = blocks.reduce(function (a, x) { return a + x.b; }, 0);
    return { blocks: blocks, total: total, over: total - data, pct: (total - data) / total * 100 };
  }
  /* steps: 0..n-1 sender layers going down, n = on the link, n+1..2n receiver layers going up (bottom first) */
  function stepInfo(n, s) {
    if (s < n) return { side: 'tx', layer: s };
    if (s === n) return { side: 'link', layer: n - 1 };
    return { side: 'rx', layer: n - 1 - (s - n - 1) };
  }

  D.register('encap', function (root) {
    var st = { model: 5, data: 100, step: 0, anim: 1 };
    var cv = D.canvas(1080, 846), g = cv.g, W = cv.w, H = cv.h;
    var stepTxt = h('div', { cls: 'w-f', style: 'min-height:190px' });
    var sumTxt = h('div', { cls: 'w-f' });
    var playB = D.btn('▶ Play', togglePlay, 'acc');
    var modelSeg = D.seg([[5, 'TCP/IP · 5 layers'], [7, 'OSI · 7 layers']], 5, function (m) {
      st.model = m; dSl.range(10, m === 7 ? 1440 : 1460, 10); if (st.data > (m === 7 ? 1440 : 1460)) { st.data = 1440; dSl.set(1440); }
      st.step = 0; stop(); draw();
    });
    var dSl = D.slider('Application data', 10, 1460, 10, 100, function (v) { return v + ' bytes'; }, function (v) { st.data = v; draw(); });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:28px' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:556px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:12px' }, [modelSeg.el,
          h('div', { cls: 'w-btns', style: 'align-items:center' }, [D.btn('Step ▸', function () { stop(); next(); }), playB, D.btn('Reset', function () { stop(); st.step = 0; draw(); })])]),
        h('div', { cls: 'w-card', style: 'gap:4px;padding-top:12px;padding-bottom:10px' }, [dSl.el,
          h('div', { cls: 'w-btns' }, [D.btn('20 B', function () { setData(20); }), D.btn('100 B', function () { setData(100); }), D.btn('Full: 1460 B', function () { setData(st.model === 7 ? 1440 : 1460); })])]),
        h('div', { cls: 'w-card', style: 'gap:6px' }, [stepTxt]),
        h('div', { cls: 'w-card', style: 'gap:6px' }, [sumTxt,
          h('p', { cls: 'w-note', text: 'Typical sizes: TCP 20 B, IP 20 B, Ethernet 14 B + 4 B trailer. OSI H5–H7 sizes are only illustrative.' })])])]));

    function setData(v) { st.data = v; dSl.set(v); draw(); }
    function nSteps() { return 2 * st.model + 1; }
    function next() { if (st.step < nSteps() - 1) { st.step++; st.anim = 0; animate(); } }
    var timer = null, raf = null;
    function togglePlay() {
      if (timer) { stop(); return; }
      if (st.step >= nSteps() - 1) st.step = 0;
      playB.textContent = '❚❚ Pause'; draw();
      timer = setInterval(function () { if (st.step >= nSteps() - 1) { stop(); return; } next(); }, 1700);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; playB.textContent = '▶ Play'; }
    function animate() {
      if (raf) cancelAnimationFrame(raf);
      var t0 = performance.now();
      (function fr() {
        st.anim = Math.min(1, (performance.now() - t0) / 1200); draw();
        if (st.anim < 1 && root.isConnected) raf = requestAnimationFrame(fr); else raf = null;
      })();
    }

    function rr(x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function bitsOf(total) { var s = '', x = (total * 2654435761) >>> 0; for (var i = 0; i < 64; i++) { x = (x * 1103515245 + 12345) >>> 0; s += (x >>> 16) & 1; } return s; }

    function draw() {
      var L = MODELS[st.model], n = L.length, info = stepInfo(n, st.step);
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var top = 52, linkH = 128, rowH = (H - top - linkH - 10) / n, sw = 168, sx0 = 14, sx1 = W - 14 - sw, cx0 = sx0 + sw + 22, cx1 = sx1 - 22;
      g.font = '600 24px ' + D.SANS; g.textBaseline = 'alphabetic'; g.fillStyle = C.navy;
      g.textAlign = 'center'; g.fillText('Sender', sx0 + sw / 2, 36); g.fillText('Receiver', sx1 + sw / 2, 36);
      g.fillStyle = C.gray; g.font = '500 20px ' + D.SANS;
      g.fillText(info.side === 'rx' ? 'going up: each layer removes its header' : 'going down: each layer adds its header', (cx0 + cx1) / 2, 34);
      var hw = st.model === 7 ? 54 : 66, dw = st.model === 7 ? 150 : 190, bh = Math.min(50, rowH - 34);
      for (var i = 0; i < n; i++) {
        var y = top + i * rowH, ly = L[i];
        // stacks
        [[sx0, 'tx'], [sx1, 'rx']].forEach(function (p) {
          var active = (info.side === p[1] && info.layer === i) || (info.side === 'link' && i === n - 1);
          var done = p[1] === 'tx' ? (info.side !== 'tx' || i <= info.layer) : (info.side === 'rx' && i >= info.layer);
          g.globalAlpha = done || active ? 1 : 0.35;
          rr(p[0], y + 4, sw, rowH - 8, 10); g.fillStyle = ly.col; g.fill();
          if (active) { g.lineWidth = 5; g.strokeStyle = C.light; g.stroke(); }
          g.fillStyle = '#f5f3ee'; g.textAlign = 'center'; g.font = '600 21px ' + D.SANS;
          var two = rowH > 70;
          g.fillText((st.model === 7 ? (n - i) + ' · ' : '') + ly.n, p[0] + sw / 2, y + rowH / 2 + (two ? -3 : 7));
          if (two) { g.font = '500 20px ' + D.SANS; g.fillText(ly.unit, p[0] + sw / 2, y + rowH / 2 + 21); }
          g.globalAlpha = 1;
        });
        // packet row
        var shown = info.side === 'tx' ? i <= info.layer : true;
        if (!shown) continue;
        var rxDone = info.side === 'rx' && i >= info.layer, rxCur = info.side === 'rx' && i === info.layer;
        var dim = info.side === 'rx' && !rxDone;
        var isTxCur = info.side === 'tx' && i === info.layer;
        if (rxCur || isTxCur || (info.side === 'link' && i === n - 1)) { g.fillStyle = '#fbe9da'; rr(cx0 - 10, y + 2, cx1 - cx0 + 20, rowH - 4, 10); g.fill(); }
        g.globalAlpha = dim ? 0.3 : 1;
        var by = y + (rowH - bh) / 2 - 10;
        if (ly.n === 'Physical') {
          var pk = packetAt(L, n - 2, st.data), bits = bitsOf(pk.total);
          g.font = '600 26px ' + D.MONO; g.fillStyle = C.orange; g.textAlign = 'left';
          var str = bits.slice(0, 4) + ' ' + bits.slice(4, 8) + ' ' + bits.slice(8, 12) + ' ' + bits.slice(12, 16) + ' …';
          g.fillText(str, cx0, by + bh / 2 + 9);
          g.font = '500 20px ' + D.MONO; g.fillStyle = C.ink; g.textAlign = 'right';
          g.fillText(pk.total + ' B × 8 = ' + (pk.total * 8).toLocaleString('en-US') + ' bits', cx1, by + bh / 2 + 8);
          g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'left';
          g.fillText('no header: the whole frame is sent as a stream of bits', cx0, by + bh + 26);
        } else {
          var P = packetAt(L, i, st.data), x = cx0, newest = L[i].hd ? L[i].hd.k : null, newT = L[i].tr ? L[i].tr.k : null;
          P.blocks.forEach(function (b) {
            var w = b.kind === 'd' ? dw : hw, isNew = (b.k === newest || b.k === newT) && (isTxCur || rxCur);
            var slide = isTxCur && isNew ? (1 - easeOut(st.anim)) * 26 : 0;
            var yy = by - slide;
            if (rxCur && isNew) {
              g.save(); g.globalAlpha = (dim ? 0.3 : 1) * 0.9; g.setLineDash([6, 5]); g.strokeStyle = C.red; g.lineWidth = 3;
              g.strokeRect(x + 2, yy + 2, w - 4, bh - 4); g.restore();
              g.fillStyle = C.red; g.font = '600 22px ' + D.SANS; g.textAlign = 'center'; g.fillText(b.k, x + w / 2, yy + bh / 2 + 8);
              g.beginPath(); g.moveTo(x + 8, yy + bh - 8); g.lineTo(x + w - 8, yy + 8); g.strokeStyle = C.red; g.lineWidth = 3; g.stroke();
            } else {
              g.fillStyle = b.kind === 'd' ? '#e7edf3' : b.col; g.fillRect(x, yy, w, bh);
              if (isNew) { g.strokeStyle = C.light; g.lineWidth = 4; g.strokeRect(x + 2, yy + 2, w - 4, bh - 4); }
              g.fillStyle = b.kind === 'd' ? C.ink : '#fbf6ef'; g.font = '600 22px ' + D.SANS; g.textAlign = 'center';
              g.fillText(b.k, x + w / 2, yy + bh / 2 + 8);
            }
            g.fillStyle = b.kind === 'd' ? C.gray : C.ink; g.font = '500 ' + (st.model === 7 && b.kind !== 'd' ? 18 : 20) + 'px ' + D.MONO; g.textAlign = 'center';
            g.fillText(b.b + ' B', x + w / 2, by + bh + 22);
            x += w + 3;
          });
          g.textAlign = 'right'; g.font = '600 22px ' + D.MONO; g.fillStyle = C.ink;
          g.fillText(P.total + ' B', cx1, by + bh / 2 - 2);
          var cut = (L[i].hd ? L[i].hd.b : 0) + (L[i].tr ? L[i].tr.b : 0);
          if (rxCur && cut) { g.font = '600 20px ' + D.MONO; g.fillStyle = C.green; g.fillText('→ ' + (P.total - cut) + ' B', cx1, by + bh / 2 + 24); }
          else { g.font = '500 20px ' + D.MONO; g.fillStyle = P.over ? C.orange : C.gray; g.fillText(D.fmtN(P.pct, 1) + '% ovh', cx1, by + bh / 2 + 24); }
        }
        if (rxDone && !rxCur) { g.fillStyle = C.green; g.font = '700 24px ' + D.SANS; g.textAlign = 'right'; g.fillText('✓', sx1 + sw - 8, y + 30); }
        g.globalAlpha = 1;
      }
      // the physical link
      var ly0 = H - linkH + 6, lyc = ly0 + 62;
      g.strokeStyle = C.orange; g.lineWidth = 6; g.beginPath();
      g.moveTo(sx0 + sw / 2, top + n * rowH - 4); g.lineTo(sx0 + sw / 2, lyc); g.lineTo(sx1 + sw / 2, lyc); g.lineTo(sx1 + sw / 2, top + n * rowH - 4); g.stroke();
      g.fillStyle = C.gray; g.font = '500 20px ' + D.SANS; g.textAlign = 'center';
      g.fillText('physical link (cable, fibre or radio): the only place where anything really travels', W / 2, lyc + 46);
      if (info.side === 'link' || info.side === 'rx' || (info.side === 'tx' && info.layer === n - 1)) {
        var pk2 = packetAt(L, n - 2, st.data), bs = bitsOf(pk2.total), span = sx1 - sx0 - sw, prog = info.side === 'link' ? easeOut(st.anim) : (info.side === 'rx' ? 1 : 0);
        g.font = '600 22px ' + D.MONO; g.textAlign = 'center';
        var nb = 22, step = 26, head = sx0 + sw / 2 + 20 + prog * (span - 40);
        for (var k = 0; k < nb; k++) {
          var bx = head - k * step; if (bx < sx0 + sw / 2 + 14 || bx > sx1 + sw / 2 - 14) continue;
          g.fillStyle = 'rgba(251,250,247,.95)'; g.fillRect(bx - 9, lyc - 30, 18, 24);
          g.fillStyle = C.orange; g.fillText(bs[k], bx, lyc - 10);
        }
      }
      // panels
      var cur = info.side === 'link' ? null : L[info.layer];
      var Pc = info.side === 'link' ? packetAt(L, n - 2, st.data) : (cur.n === 'Physical' ? packetAt(L, n - 2, st.data) : packetAt(L, info.layer, st.data));
      var t = '<span style="color:' + C.gray + '">Step ' + (st.step + 1) + ' of ' + nSteps() + '</span>\n';
      if (info.side === 'link') {
        t += '<b>On the link</b>\n' + (Pc.total * 8).toLocaleString('en-US') + ' bits travel as a signal\nfrom sender to receiver.\nNo layer adds anything here.';
      } else if (cur.n === 'Physical') {
        t += info.side === 'tx' ? '<b>Sender · Physical</b>\nAdds nothing. Sends the frame as\nbits: ' + Pc.total + ' B × 8 = <b>' + (Pc.total * 8).toLocaleString('en-US') + ' bits</b>'
          : '<b>Receiver · Physical</b>\nTurns the signal back into bits and\nhands the ' + Pc.total + ' B frame up.';
      } else {
        var add = [], removed = [];
        if (cur.hd) add.push(cur.hd); if (cur.tr) add.push(cur.tr);
        var below = info.layer > 0 ? packetAt(L, info.layer - 1, st.data) : null;
        var parts = Pc.blocks.map(function (b) { return b.k === 'Data' ? st.data : b.b; });
        if (info.side === 'tx') {
          t += '<b>Sender · ' + cur.n + '</b>\n';
          if (add.length) {
            t += 'Adds ' + add.map(function (x) { return x.k + ' (' + x.b + ' B)'; }).join(' + ') + '\n' + add.map(function (x) { return x.what; }).join(' + ') + '\n';
            t += cur.unit + ' = ' + (below ? (add.length > 1 ? cur.hd.b + ' + ' + below.total + ' + ' + cur.tr.b : cur.hd.b + ' + ' + below.total) : cur.hd.b + ' + ' + st.data) + ' = <b>' + Pc.total + ' B</b>\n';
          } else t += 'Creates the message: <b>' + st.data + ' B</b> of data\n';
        } else {
          removed = add;
          t += '<b>Receiver · ' + cur.n + '</b>\n';
          if (removed.length) {
            t += 'Reads and removes ' + removed.map(function (x) { return x.k; }).join(' and ') + '\n';
            t += (below ? 'passes up ' : 'delivers ') + Pc.total + ' − ' + removed.reduce(function (a, x) { return a + x.b; }, 0) + ' = <b>' + (below ? below.total : st.data) + ' B</b>' + (below ? '' : ', same as sent') + '\n';
          } else t += 'Gets the message: <b>' + st.data + ' B</b>, same as sent\n';
        }
        if (Pc.over) t += 'overhead = ' + Pc.over + ' / ' + Pc.total + ' = <b>' + D.fmtN(Pc.pct, 1) + '%</b>';
        else t += 'overhead = 0 / ' + Pc.total + ' = <b>0%</b>';
        void parts;
      }
      stepTxt.innerHTML = t;
      var fr = packetAt(L, n - 2, st.data);
      sumTxt.innerHTML = 'Frame = ' + fr.over + ' B headers + ' + st.data + ' B data\n      = <b>' + fr.total + ' B</b> (' + (fr.total * 8).toLocaleString('en-US') + ' bits)\nEfficiency = ' + st.data + ' / ' + fr.total + ' = <b>' + D.fmtN(st.data / fr.total * 100, 1) + '%</b>';
    }
    function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { MODELS: MODELS, packetAt: packetAt, stepInfo: stepInfo };
})();
