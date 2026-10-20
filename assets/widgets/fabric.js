(function () {
  'use strict';
  var D = typeof window !== 'undefined' ? window.DCW : null;
  var h = D && D.h, C = D && D.C, SANS = D && D.SANS, MONO = D && D.MONO;
  var fmtN = D ? D.fmtN : function (x, d) { return (+x.toFixed(d)).toString().replace('-', '−'); };

  /* ---- pure functions (Forouzan 8.4.1, Examples 8.3 and 8.4) ---- */
  function counts(N, n, k) { // three-stage N x N switch: N/n crossbars n x k, k crossbars (N/n) x (N/n), N/n crossbars k x n
    var m = N / n;
    return { m: m, xbar: N * N, s1: m * n * k, s2: k * m * m, s3: m * k * n, three: 2 * k * N + k * m * m, clos: 2 * n - 1 };
  }
  function closMin(N) { var n = Math.sqrt(N / 2); return { n: n, k: 2 * n - 1, total: 4 * N * (Math.sqrt(2 * N) - 1) }; }
  function snapDiv(N, n) { // the divisor of N (at most N/2) nearest to n
    var best = 1;
    for (var d = 1; d <= Math.max(1, Math.floor(N / 2)); d++) if (N % d === 0 && Math.abs(d - n) < Math.abs(best - n)) best = d;
    return best;
  }
  function route(calls, n, k, i, o) { // first middle crossbar free on both the ingress and the egress link
    var gi = Math.floor(i / n), go = Math.floor(o / n), busyIn = [], busyOut = [];
    calls.forEach(function (c) { if (Math.floor(c.i / n) === gi) busyIn.push(c.j); if (Math.floor(c.o / n) === go) busyOut.push(c.j); });
    for (var j = 0; j < k; j++) if (busyIn.indexOf(j) < 0 && busyOut.indexOf(j) < 0) return { j: j, busyIn: busyIn, busyOut: busyOut };
    return { j: -1, busyIn: busyIn, busyOut: busyOut };
  }
  function worstCase(N, n, k) { // n-1 calls out of ingress crossbar 1 and n-1 calls into the last egress crossbar, on different middles
    var m = N / n, calls = [], j = 0, out = 0, inp = n;
    var lastO = (m - 1) * n; // target output: first output of the last egress crossbar
    for (var a = 1; a < n && j < k; a++) { // other inputs of crossbar 1 -> outputs of egress crossbars 1..m-1
      while (out >= lastO) out = 0; calls.push({ i: a, o: out, j: j++ }); out++;
    }
    for (var b = 1; b < n && j < k; b++) { calls.push({ i: inp, o: lastO + b, j: j++ }); inp++; }
    return { calls: calls, i: 0, o: lastO };
  }
  function c3(x) { return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function num(x) { if (Math.abs(x - Math.round(x)) < 1e-9) return c3(x); var t = fmtN(x, 2).split('.'); return c3(+t[0]) + (t[1] ? '.' + t[1] : ''); }
  function cellSize(N, n, k, avail) { // crosspoint spacing that fits all three stages in the canvas height
    var m = N / n, c = 26;
    [[m, n], [k, m], [m, k]].forEach(function (s) { c = Math.min(c, (avail - s[0] * 10 - (s[0] - 1) * 6) / (s[0] * s[1])); });
    return c;
  }

  if (typeof module !== 'undefined') module.exports = { counts: counts, closMin: closMin, snapDiv: snapDiv, route: route, worstCase: worstCase };
  if (!D) return;

  var PRE = { ex83: [200, 20, 4], ex84: [200, 10, 19], d4: [18, 3, 4], d5: [18, 3, 5] };

  D.register('fabric', function (root) {
    var st = { N: 18, n: 3, k: 4, calls: [], sel: null, blk: null, last: null, msg: null };
    var cv = D.canvas(1080, 560), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' }), crit = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    var note = h('p', { cls: 'w-note' });
    var sN = D.slider('Inputs = outputs N', 4, 1000, 1, st.N, function (v) { return String(v); }, function (v) { setN(v); });
    var sn = D.slider('First-stage inputs n', 1, 50, 1, st.n, function (v) { return String(v); }, function (v) { setn(v); });
    var sk = D.slider('Middle crossbars k', 1, 99, 1, st.k, function (v) { return String(v); }, function (v) { setk(v); });
    var pre = D.seg([['ex83', 'Ex 8.3'], ['ex84', 'Ex 8.4'], ['d4', 'Demo k = 4'], ['d5', 'Demo k = 5']], 'd4', function (key) { preset(key); });
    var bClos = D.btn('Clos minimum', function () { var n = snapDiv(st.N, Math.sqrt(st.N / 2)); st.n = n; st.k = Math.min(99, 2 * n - 1); sn.set(n); sk.set(st.k); clear(); pre.set(''); draw(); });
    var bWorst = D.btn('Worst case', function () { worst(); draw(); }, 'acc');
    var bClear = D.btn('Clear calls', function () { clear(); draw(); });

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px;align-items:flex-start' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:8px 20px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'padding:12px 18px' }, [pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:4px 20px 6px' }, [sN.el, sn.el, sk.el]),
        h('div', { cls: 'w-btns' }, [bClos, bWorst, bClear]), crit, verdict, note])]));

    function clear() { st.calls = []; st.sel = null; st.blk = null; st.last = null; st.msg = null; }
    function setN(v) { st.N = v; var n = snapDiv(v, st.n); st.n = n; sn.set(n); clear(); pre.set(''); draw(); }
    function setn(v) { var n = snapDiv(st.N, v); st.n = n; sn.set(n); clear(); pre.set(''); draw(); }
    function setk(v) { // keep calls on surviving middles; retry a blocked call
      st.k = v; pre.set('');
      st.calls = st.calls.filter(function (c) { return c.j < v; });
      if (st.blk) attempt(st.blk.i, st.blk.o); else { st.msg = null; st.last = null; }
      draw();
    }
    function preset(key) {
      var p = PRE[key]; st.N = p[0]; st.n = p[1]; st.k = p[2]; sN.set(p[0]); sn.set(p[1]); sk.set(p[2]); clear();
      if (key === 'd4' || key === 'd5') worst();
      draw();
    }
    function worst() {
      clear(); var m = st.N / st.n;
      if (m < 2 || st.n < 2) { st.msg = ['warn', 'Worst case needs n ≥ 2 and at least two first-stage crossbars.']; return; }
      var w = worstCase(st.N, st.n, st.k); st.calls = w.calls; st.worst = true; attempt(w.i, w.o, true);
    }
    function attempt(i, o, isWorst) {
      var r = route(st.calls, st.n, st.k, i, o), gi = Math.floor(i / st.n) + 1, go = Math.floor(o / st.n) + 1;
      st.sel = null;
      if (r.j >= 0) {
        st.calls.push({ i: i, o: o, j: r.j }); st.blk = null; st.last = i;
        st.msg = ['ok', 'Connected: input ' + (i + 1) + ' → output ' + (o + 1) + ' through middle crossbar ' + (r.j + 1) + '.' +
          (r.busyIn.length + r.busyOut.length ? ' ' + uniq(r.busyIn.concat(r.busyOut)).length + ' of ' + st.k + ' middles were unusable.' : '')];
      } else {
        st.blk = { i: i, o: o }; st.last = null;
        st.msg = ['bad', 'Blocked: input ' + (i + 1) + ' → output ' + (o + 1) + '. Crossbar ' + gi + ' already uses middle' + list(r.busyIn) +
          '; output crossbar ' + go + ' uses middle' + list(r.busyOut) + '. All ' + st.k + ' are taken.'];
      }
    }
    function uniq(a) { return a.filter(function (x, p) { return a.indexOf(x) === p; }); }
    function list(a) { a = uniq(a).sort(function (x, y) { return x - y; }); return (a.length === 1 ? ' ' : 's ') + (a.length ? a.map(function (x) { return x + 1; }).join(', ') : 'none'); }

    var G = null; // geometry of the drawn switch, for clicks
    function drawable() { var m = st.N / st.n; return st.N <= 36 && m >= 2 && st.k <= 12 && cellSize(st.N, st.n, st.k, cv.h - 84) >= 10; }

    function draw() {
      var N = st.N, n = st.n, k = st.k, q = counts(N, n, k), cm = closMin(N), m = q.m, nb = k >= 2 * n - 1;
      /* formulas */
      var save = q.xbar - q.three, pct = q.three / q.xbar * 100;
      var exact = Math.abs(cm.n - Math.round(cm.n)) < 1e-9;
      form.innerHTML =
        'Crossbar      N² = ' + c3(N) + '² = <b>' + c3(q.xbar) + '</b>\n' +
        'Three-stage   2kN + k(N/n)² = 2·' + k + '·' + c3(N) + ' + ' + k + '·(' + c3(N) + '/' + n + ')²\n' +
        '              = ' + c3(2 * k * N) + ' + ' + c3(k * m * m) + ' = <b>' + c3(q.three) + '</b>  (' + fmtN(pct, 1) + '% of the crossbar)\n' +
        'Saving        ' + c3(q.xbar) + ' − ' + c3(q.three) + ' = ' + (save >= 0 ? '<span class="ok">' + c3(save) + ' fewer</span>' : '<span class="bad">' + c3(-save) + ' more</span>') + ' crosspoints\n' +
        'Clos rule     k ≥ 2n − 1 = 2·' + n + ' − 1 = ' + (2 * n - 1) + ';  k = ' + k + (nb ? ' ≥ ' + (2 * n - 1) + ': <span class="ok">never blocks</span>' : ' < ' + (2 * n - 1) + ': <span class="bad">can block</span>') + '\n' +
        'Clos minimum  n = √(N/2) = √(' + c3(N) + '/2) = ' + num(cm.n) + ', k = 2n − 1 = ' + num(cm.k) + (exact ? '' : '  (not integer)') + '\n' +
        '              4N[√(2N) − 1] = 4·' + c3(N) + '·[√' + c3(2 * N) + ' − 1] = ' + c3(4 * N) + '·' + num(Math.sqrt(2 * N) - 1) + (exact ? ' = ' : ' ≈ ') + '<b>' + num(cm.total) + '</b>';
      crit.className = 'w-verdict ' + (nb ? 'ok' : 'warn');
      crit.textContent = nb ? 'k = ' + k + ' ≥ 2n − 1 = ' + (2 * n - 1) + ': non-blocking (Clos).' : 'k = ' + k + ' < 2n − 1 = ' + (2 * n - 1) + ': a call can be blocked.';
      var dr = drawable();
      bWorst.disabled = !dr; bClear.disabled = !dr; bWorst.style.opacity = bClear.style.opacity = dr ? '' : '0.4';
      if (st.msg && dr) { verdict.style.display = ''; verdict.className = 'w-verdict ' + st.msg[0]; verdict.textContent = st.msg[1]; }
      else verdict.style.display = 'none';
      note.textContent = dr ? (st.sel !== null ? 'Input ' + (st.sel + 1) + ' selected: now click a free output on the right.' :
        'Click an input (left), then an output (right) to place a call. Click a busy input to hang up. Routing takes the first free middle crossbar.')
        : 'Too big to draw port by port, so the canvas shows a schematic. To place calls by hand, use a Demo preset (N ≤ 36 and few crossbars).';
      var g = cv.g; g.clearRect(0, 0, cv.w, cv.h); g.fillStyle = C.panel; g.fillRect(0, 0, cv.w, cv.h);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, cv.w - 1, cv.h - 1);
      if (dr) drawSwitch(g, q); else { G = null; drawSchematic(g, q, cm); }
    }

    function drawSwitch(g, q) {
      var N = st.N, n = st.n, k = st.k, m = q.m, W = cv.w, top = 70, bot = cv.h - 14, avail = bot - top, p = 5;
      var stages = [[m, n, k], [k, m, m], [m, k, n]]; // count, rows (inputs), cols (outputs)
      var c = cellSize(N, n, k, avail);
      var bw = stages.map(function (s) { return s[2] * c + 2 * p; });
      var xl = [150, W / 2 - bw[1] / 2, W - 150 - bw[2]];
      var boxes = stages.map(function (s, si) {
        var hb = s[1] * c + 2 * p, gap = s[0] > 1 ? (avail - s[0] * hb) / (s[0] - 1) : 0, out = [];
        for (var b = 0; b < s[0]; b++) {
          var y = s[0] > 1 ? top + b * (hb + gap) : top + (avail - hb) / 2;
          out.push({ x: xl[si], y: y, w: bw[si], h: hb, rows: s[1], cols: s[2] });
        }
        return out;
      });
      function rowY(B, r) { return B.y + p + (r + 0.5) * c; }
      function colX(B, j) { return B.x + p + (j + 0.5) * c; }
      function exitY(B, j) { return B.y + p + (j + 0.5) * (B.rows * c) / B.cols; }
      var xIn = 70, xOut = W - 70;
      G = { xIn: xIn, xOut: xOut, ys: [], yo: [] };
      for (var i = 0; i < N; i++) { G.ys.push(rowY(boxes[0][Math.floor(i / n)], i % n)); G.yo.push(exitY(boxes[2][Math.floor(i / n)], i % n)); }
      // headers
      g.font = '600 20px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'center';
      var hdr = ['Stage 1: ' + m + ' of ' + n + ' × ' + k, 'Stage 2: ' + k + ' of ' + m + ' × ' + m, 'Stage 3: ' + m + ' of ' + k + ' × ' + n];
      hdr.forEach(function (t, si) { g.fillText(t, [190, W / 2, W - 190][si], 26); });
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray;
      g.fillText('in', xIn, 54); g.fillText('out', xOut, 54);
      // idle links
      g.strokeStyle = C.line; g.lineWidth = 1.5;
      for (var a = 0; a < m; a++) for (var j = 0; j < k; j++) {
        line(g, [[boxes[0][a].x + boxes[0][a].w, exitY(boxes[0][a], j)], [boxes[1][j].x, rowY(boxes[1][j], a)]]);
        line(g, [[boxes[1][j].x + boxes[1][j].w, exitY(boxes[1][j], a)], [boxes[2][a].x, rowY(boxes[2][a], j)]]);
      }
      for (i = 0; i < N; i++) {
        line(g, [[xIn, G.ys[i]], [boxes[0][Math.floor(i / n)].x, G.ys[i]]]);
        line(g, [[boxes[2][Math.floor(i / n)].x + boxes[2][0].w, G.yo[i]], [xOut, G.yo[i]]]);
      }
      // boxes and crosspoints
      var closed = {};
      function path(cl) {
        var gi = Math.floor(cl.i / n), ri = cl.i % n, go = Math.floor(cl.o / n), ro = cl.o % n, j = cl.j;
        var B1 = boxes[0][gi], B2 = boxes[1][j], B3 = boxes[2][go];
        closed['0:' + gi + ':' + ri + ':' + j] = closed['1:' + j + ':' + gi + ':' + go] = closed['2:' + go + ':' + j + ':' + ro] = cl;
        return [[xIn, G.ys[cl.i]], [colX(B1, j), rowY(B1, ri)], [B1.x + B1.w, exitY(B1, j)], [B2.x, rowY(B2, gi)], [colX(B2, go), rowY(B2, gi)],
          [B2.x + B2.w, exitY(B2, go)], [B3.x, rowY(B3, j)], [colX(B3, ro), rowY(B3, j)], [B3.x + B3.w, exitY(B3, ro)], [xOut, G.yo[cl.o]]];
      }
      var paths = st.calls.map(function (cl) { return [cl, path(cl)]; });
      boxes.forEach(function (stg, si) {
        stg.forEach(function (B, b) {
          g.fillStyle = si === 1 ? '#e7edf3' : '#eef2f6'; g.strokeStyle = C.navy; g.lineWidth = 2;
          g.beginPath(); g.rect(B.x, B.y, B.w, B.h); g.fill(); g.stroke();
          for (var r = 0; r < B.rows; r++) for (var cc = 0; cc < B.cols; cc++) {
            var on = closed[si + ':' + b + ':' + r + ':' + cc];
            g.fillStyle = on ? (on.i === st.last ? C.green : C.orange) : '#b9c3cd';
            g.beginPath(); g.arc(colX(B, cc), rowY(B, r), on ? Math.max(3, c * 0.3) : Math.max(1.5, c * 0.12), 0, 7); g.fill();
          }
          if (si !== 2 && (b === 0 || B.y - stg[b - 1].y - stg[b - 1].h >= 24)) { g.fillStyle = C.navy; g.font = '600 20px ' + SANS; g.textAlign = 'center'; g.fillText(String(b + 1), B.x + B.w / 2, B.y - 5); }
        });
      });
      // calls
      paths.forEach(function (pp) { g.strokeStyle = pp[0].i === st.last ? C.green : C.orange; g.lineWidth = 3.5; line(g, pp[1]); });
      if (st.blk) {
        var b0 = boxes[0][Math.floor(st.blk.i / n)], b2 = boxes[2][Math.floor(st.blk.o / n)];
        g.strokeStyle = C.red; g.lineWidth = 3.5; g.setLineDash([10, 7]);
        line(g, [[xIn, G.ys[st.blk.i]], [b0.x, G.ys[st.blk.i]]]); line(g, [[b2.x + b2.w, G.yo[st.blk.o]], [xOut, G.yo[st.blk.o]]]);
        line(g, [[b0.x + b0.w + 10, G.ys[st.blk.i]], [b2.x - 10, G.yo[st.blk.o]]]); g.setLineDash([]);
        var mx = W / 2, my = (G.ys[st.blk.i] + G.yo[st.blk.o]) / 2;
        g.fillStyle = C.red; g.beginPath(); g.arc(mx, my, 20, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 4; line(g, [[mx - 8, my - 8], [mx + 8, my + 8]]); line(g, [[mx + 8, my - 8], [mx - 8, my + 8]]);
      }
      // port dots and numbers
      var busyI = {}, busyO = {}; st.calls.forEach(function (cl) { busyI[cl.i] = busyO[cl.o] = cl; });
      var showNum = c * n / n >= 12 && Math.min(c, 26) >= 13;
      for (i = 0; i < N; i++) {
        dot(g, xIn, G.ys[i], st.sel === i ? C.blue : busyI[i] ? (busyI[i].i === st.last ? C.green : C.orange) : st.blk && st.blk.i === i ? C.red : '#fff');
        dot(g, xOut, G.yo[i], busyO[i] ? (busyO[i].i === st.last ? C.green : C.orange) : st.blk && st.blk.o === i ? C.red : '#fff');
        if (showNum) {
          g.font = '500 20px ' + MONO; g.fillStyle = C.ink; g.textAlign = 'right'; g.fillText(String(i + 1), xIn - 16, G.ys[i] + 7);
          g.textAlign = 'left'; g.fillText(String(i + 1), xOut + 16, G.yo[i] + 7);
        }
      }
      G.r = Math.max(8, Math.min(16, c / 2));
    }
    function dot(g, x, y, f) { g.fillStyle = f; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.stroke(); }
    function line(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }

    function drawSchematic(g, q, cm) {
      var W = cv.w, n = st.n, k = st.k, m = q.m;
      var cols = [[m, n + ' × ' + k, q.s1, n * k], [k, m + ' × ' + m, q.s2, m * m], [m, k + ' × ' + n, q.s3, k * n]];
      var xs = [190, W / 2, W - 190], bw = 150, bh = 40;
      var ys = cols.map(function (cl) {
        var cnt = cl[0], show = cnt <= 4 ? cnt : 4, out = [];
        for (var b = 0; b < show; b++) out.push({ y: 70 + b * 54, lab: cnt > 4 && b === 3 ? cnt : b + 1, dots: cnt > 4 && b === 3 });
        return out;
      });
      g.strokeStyle = C.line; g.lineWidth = 1.5;
      for (var s = 0; s < 2; s++) ys[s].forEach(function (a) { ys[s + 1].forEach(function (b) { line(g, [[xs[s] + bw / 2, a.y + bh / 2], [xs[s + 1] - bw / 2, b.y + bh / 2]]); }); });
      cols.forEach(function (cl, si) {
        g.font = '600 20px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'center';
        g.fillText('Stage ' + (si + 1) + ': ' + c3(cl[0]) + ' crossbar' + (cl[0] === 1 ? '' : 's'), xs[si], 32);
        ys[si].forEach(function (b) {
          if (b.dots) { g.fillStyle = C.gray; g.font = '700 22px ' + SANS; g.fillText('⋮', xs[si], b.y - 2); }
          g.fillStyle = si === 1 ? C.blue : C.navy; g.fillRect(xs[si] - bw / 2, b.y + (b.dots ? 6 : 0), bw, bh - (b.dots ? 6 : 0));
          g.fillStyle = '#f5f3ee'; g.font = '600 20px ' + MONO; g.fillText(cl[1], xs[si], b.y + 27 + (b.dots ? 3 : 0));
        });
        g.fillStyle = C.ink; g.font = '500 20px ' + MONO;
        g.fillText(c3(cl[0]) + ' × ' + c3(cl[3]) + ' = ' + c3(cl[2]), xs[si], 70 + 4 * 54 + 16);
      });
      // bars
      var bars = [['Single crossbar N²', q.xbar, C.gray], ['Three-stage (n = ' + n + ', k = ' + k + ')', q.three, k >= 2 * n - 1 ? C.green : C.orange],
        ['Clos minimum 4N[√(2N) − 1]', cm.total, C.blue]];
      var mx = Math.max(q.xbar, q.three, cm.total), x0 = 360, x1 = W - 300, y0 = 352;
      g.font = '600 20px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Crosspoints', 24, y0 - 18);
      bars.forEach(function (b, i) {
        var y = y0 + i * 62, w = Math.max(2, (x1 - x0) * b[1] / mx);
        g.fillStyle = C.ink; g.font = '500 20px ' + SANS; g.textAlign = 'right'; g.fillText(b[0], x0 - 14, y + 27);
        g.fillStyle = b[2]; g.fillRect(x0, y + 4, w, 34);
        g.fillStyle = C.ink; g.font = '600 20px ' + MONO; g.textAlign = 'left'; g.fillText(num(b[1]) + '  (' + fmtN(b[1] / q.xbar * 100, 1) + '%)', x0 + w + 10, y + 28);
      });
      g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = 'left';
      g.fillText('Bars to scale. Percentages are of the single N × N crossbar.', 24, cv.h - 18);
    }

    cv.c.style.cursor = 'pointer';
    cv.c.addEventListener('click', function (e) {
      if (!G || !drawable()) return;
      var R = cv.c.getBoundingClientRect(), x = (e.clientX - R.left) * cv.w / R.width, y = (e.clientY - R.top) * cv.h / R.height;
      function hit(xx, arr) { if (Math.abs(x - xx) > 34) return -1; var best = -1, bd = G.r + 4; arr.forEach(function (yy, i) { var d = Math.abs(y - yy); if (d < bd) { bd = d; best = i; } }); return best; }
      var i = hit(G.xIn, G.ys), o = hit(G.xOut, G.yo);
      if (i >= 0) {
        var ci = st.calls.findIndex(function (c) { return c.i === i; });
        if (ci >= 0) { st.calls.splice(ci, 1); st.sel = null; st.last = null; st.msg = ['warn', 'Input ' + (i + 1) + ' hung up; its middle crossbar is free again.']; }
        else { st.sel = st.sel === i ? null : i; st.blk = null; st.msg = null; }
        pre.set(''); draw();
      } else if (o >= 0 && st.sel !== null) {
        if (st.calls.some(function (c) { return c.o === o; })) { st.msg = ['warn', 'Output ' + (o + 1) + ' is already in a call. Pick a free output.']; }
        else attempt(st.sel, o);
        pre.set(''); draw();
      }
    });
    preset('d4');
  });
})();
