/* Try it: how many cables for n devices? (Lecture 1, after slide "topocompare").
   Mesh n(n-1)/2 duplex links, n-1 ports per device; star n links (n hub ports); bus 1 trunk + n drop lines; ring n links, 2 ports.
   Worked example (slide "worked"): 10 computers -> mesh 45 links, 9 ports each; star 10 links + 10-port switch; 20 devices -> 190 vs 20. */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;

  // ---------- pure functions ----------
  function counts(topo, n) {
    if (topo === 'mesh') return { links: n * (n - 1) / 2, cables: n * (n - 1) / 2, perDev: n - 1, hubPorts: 0, total: n * (n - 1) };
    if (topo === 'star') return { links: n, cables: n, perDev: 1, hubPorts: n, total: 2 * n };
    if (topo === 'bus') return { links: n, cables: n + 1, perDev: 1, hubPorts: 0, total: n };   // 1 trunk + n drop lines
    return { links: n, cables: n, perDev: 2, hubPorts: 0, total: 2 * n };                           // ring
  }
  // graph of the network: nodes 0..n-1 are devices, then hub / bus taps; edges carry the key used to break them
  function edges(topo, n, dual) {
    var E = [], i, j;
    if (topo === 'mesh') for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) E.push({ a: i, b: j, key: 'L' + i + '-' + j, both: true });
    if (topo === 'star') for (i = 0; i < n; i++) E.push({ a: i, b: n, key: 'S' + i, both: true });
    if (topo === 'bus') {
      for (i = 0; i < n; i++) E.push({ a: i, b: n + i, key: 'P' + i, both: true });
      for (i = 0; i < n - 1; i++) E.push({ a: n + i, b: n + i + 1, key: 'T' + i, both: true });
    }
    if (topo === 'ring') for (i = 0; i < n; i++) E.push({ a: i, b: (i + 1) % n, key: 'R' + i, both: !!dual });   // one-way: clockwise only
    return E;
  }
  // which devices can still hold a two-way conversation: groups of mutually reachable live devices
  function talkGroups(topo, n, broken, dual) {
    var N = topo === 'bus' ? 2 * n : n + 1, adj = [], i;
    for (i = 0; i < N; i++) adj.push([]);
    var dead = function (v) { return v < n ? broken['D' + v] : (topo === 'star' && v === n ? broken.H : false); };
    edges(topo, n, dual).forEach(function (e) {
      if (broken[e.key] || dead(e.a) || dead(e.b)) return;
      adj[e.a].push(e.b); if (e.both) adj[e.b].push(e.a);
    });
    function reach(s) { var seen = {}, q = [s]; seen[s] = 1; while (q.length) { var v = q.pop(); adj[v].forEach(function (w) { if (!seen[w]) { seen[w] = 1; q.push(w); } }); } return seen; }
    var R = []; for (i = 0; i < n; i++) R.push(dead(i) ? {} : reach(i));
    var gid = [], groups = [];
    for (i = 0; i < n; i++) {
      gid.push(-1); if (dead(i)) continue;
      for (var g = 0; g < groups.length; g++) { var r = groups[g][0]; if (R[i][r] && R[r][i]) { groups[g].push(i); gid[i] = g; break; } }
      if (gid[i] < 0) { gid[i] = groups.length; groups.push([i]); }
    }
    var pairs = groups.reduce(function (s, gr) { return s + gr.length * (gr.length - 1) / 2; }, 0);
    return { groups: groups, gid: gid, pairs: pairs, dead: dead };
  }

  var NAMES = 'ABCDEFGHIJKL';
  var GCOL = ['#3f8f5a', '#2f6db5', '#7a5ba8', '#2a8c8c', '#8a6d1f', '#b0477a'];

  D.register('topology', function (root) {
    var st = { topo: 'mesh', n: 6, broken: {}, dual: false };
    var cv = D.canvas(1100, 846), g = cv.g;
    cv.c.style.cssText += ';background:' + C.panel + ';border:1px solid ' + C.line + ';cursor:pointer';
    var hits = [];

    var topoSeg = D.seg([['mesh', 'Mesh'], ['star', 'Star'], ['bus', 'Bus'], ['ring', 'Ring']], 'mesh', function (k) { st.topo = k; st.broken = {}; draw(); });
    var nSl = D.slider('Devices n', 2, 12, 1, st.n, function (v) { return 'n = ' + v; }, function (v) { st.n = v; st.broken = {}; draw(); });
    var ringSeg = D.seg([[false, 'One-way ring'], [true, 'Dual ring']], false, function (k) { st.dual = k; draw(); });
    var ringRow = h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [ringSeg.el]);
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var tab = h('div');
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:23px;line-height:1.3' });
    function preset(topo, n) { st.topo = topo; st.n = n; st.broken = {}; topoSeg.set(topo); nSl.set(n); draw(); }

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:540px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px' }, [topoSeg.el, nSl.el, ringRow,
          h('div', { cls: 'w-btns' }, [
            btn('Office of 10: mesh', function () { preset('mesh', 10); }, 'acc'),
            btn('Office of 10: star', function () { preset('star', 10); }),
            btn('Mesh of 4', function () { preset('mesh', 4); }),
            btn('Repair all', function () { st.broken = {}; draw(); })])]),
        h('div', { cls: 'w-card', style: 'gap:6px' }, [form, tab]),
        verdict])]));

    cv.c.addEventListener('click', function (e) {
      var r = cv.c.getBoundingClientRect(), sx = cv.w / r.width, x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sx;
      var best = null, bd = 1e9;
      hits.forEach(function (o) {
        var d;
        if (o.r) d = Math.hypot(x - o.x, y - o.y) - o.r;
        else { var dx = o.x2 - o.x1, dy = o.y2 - o.y1, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - o.x1) * dx + (y - o.y1) * dy) / L)) : 0; d = Math.hypot(x - o.x1 - t * dx, y - o.y1 - t * dy) - 9; }
        if (d < bd) { bd = d; best = o; }
      });
      if (best && bd < 4) { if (st.broken[best.key]) delete st.broken[best.key]; else st.broken[best.key] = 1; draw(); }
    });

    function devPos(n) {
      var P = [], cx = 550, cy = 400, R = 300;
      if (st.topo === 'bus') {
        var x0 = 150, x1 = 950;
        for (var i = 0; i < n; i++) { var x = n === 1 ? 550 : x0 + i * (x1 - x0) / (n - 1); P.push({ x: x, y: i % 2 ? cy + 200 : cy - 200, tx: x, ty: cy }); }
        return P;
      }
      for (var k = 0; k < n; k++) { var a = -Math.PI / 2 + 2 * Math.PI * k / n; P.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }); }
      return P;
    }
    function xmark(x, y) { g.strokeStyle = C.red; g.lineWidth = 5; g.beginPath(); g.moveTo(x - 11, y - 11); g.lineTo(x + 11, y + 11); g.moveTo(x + 11, y - 11); g.lineTo(x - 11, y + 11); g.stroke(); }
    function arrow(x1, y1, x2, y2, col, fr) {
      fr = fr || 0.5; var mx = x1 + (x2 - x1) * fr, my = y1 + (y2 - y1) * fr, a = Math.atan2(y2 - y1, x2 - x1);
      g.fillStyle = col; g.beginPath(); g.moveTo(mx + 12 * Math.cos(a), my + 12 * Math.sin(a));
      g.lineTo(mx - 9 * Math.cos(a) + 8 * Math.sin(a), my - 9 * Math.sin(a) - 8 * Math.cos(a));
      g.lineTo(mx - 9 * Math.cos(a) - 8 * Math.sin(a), my - 9 * Math.sin(a) + 8 * Math.cos(a)); g.closePath(); g.fill();
    }

    function draw() {
      var n = st.n, topo = st.topo, br = st.broken, P = devPos(n), T = talkGroups(topo, n, br, st.dual), cnt = counts(topo, n);
      ringRow.style.display = topo === 'ring' ? 'flex' : 'none';
      ringSeg.set(st.dual);
      g.clearRect(0, 0, cv.w, cv.h); hits = [];
      var NAVY = C.navy, lw = topo === 'mesh' && n > 8 ? 2.5 : 4;
      function line(x1, y1, x2, y2, key, col, w) {
        var b = br[key];
        g.strokeStyle = b ? C.red : (col || NAVY); g.lineWidth = b ? 4 : (w || lw); g.setLineDash(b ? [10, 8] : []);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
        if (b) xmark((x1 + x2) / 2, (y1 + y2) / 2);
        hits.push({ key: key, x1: x1, y1: y1, x2: x2, y2: y2 });
      }
      // ---- links ----
      if (topo === 'mesh') for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) line(P[i].x, P[i].y, P[j].x, P[j].y, 'L' + i + '-' + j);
      if (topo === 'star') for (i = 0; i < n; i++) line(P[i].x, P[i].y, 550, 400, 'S' + i);
      if (topo === 'ring') for (i = 0; i < n; i++) {
        var a = P[i], b = P[(i + 1) % n], ox = 0, oy = 0;
        if (n === 2) { ox = i ? -26 : 26; }
        line(a.x + ox, a.y + oy, b.x + ox, b.y + oy, 'R' + i);
        if (!br['R' + i]) { arrow(a.x + ox, a.y + oy, b.x + ox, b.y + oy, C.orange, st.dual ? 0.38 : 0.5); if (st.dual) arrow(b.x + ox, b.y + oy, a.x + ox, a.y + oy, C.blue, 0.38); }
      }
      if (topo === 'bus') {
        var cy = 400;
        g.strokeStyle = NAVY; g.lineWidth = 9; g.beginPath(); g.moveTo(70, cy); g.lineTo(P[0].tx, cy); g.moveTo(P[n - 1].tx, cy); g.lineTo(1030, cy); g.stroke();
        for (i = 0; i < n - 1; i++) line(P[i].tx, cy, P[i + 1].tx, cy, 'T' + i, NAVY, 9);
        g.fillStyle = C.gray; g.fillRect(52, cy - 22, 18, 44); g.fillRect(1030, cy - 22, 18, 44);
        g.fillStyle = C.gray; g.font = '600 20px ' + D.SANS; g.textAlign = 'left'; g.fillText('terminator', 30, cy + 50);
        g.textAlign = 'right'; g.fillText('terminator', 1072, cy + 50);
        for (i = 0; i < n; i++) { line(P[i].x, P[i].y, P[i].tx, cy, 'P' + i, C.blue, 3); g.fillStyle = NAVY; g.fillRect(P[i].tx - 7, cy - 7, 14, 14); }
        g.textAlign = 'left'; g.fillStyle = NAVY; g.font = '600 20px ' + D.SANS; g.fillText('navy = trunk (backbone) · blue = drop lines · squares = taps', 70, 60);
      }
      // ---- hub ----
      if (topo === 'star') {
        var hd = br.H;
        g.fillStyle = hd ? '#fbe2df' : NAVY; g.strokeStyle = hd ? C.red : NAVY; g.lineWidth = 4;
        g.fillRect(500, 360, 100, 80); g.strokeRect(500, 360, 100, 80);
        g.fillStyle = hd ? C.red : '#f5f3ee'; g.font = '700 22px ' + D.SANS; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(hd ? 'Hub ✕' : 'Hub', 550, 390); g.font = '500 20px ' + D.SANS; g.fillText(n + ' ports', 550, 420);
        hits.push({ key: 'H', x: 550, y: 400, r: 52 });
      }
      // ---- devices ----
      var rad = n > 9 ? 30 : 34;
      for (i = 0; i < n; i++) {
        var p = P[i], dead = br['D' + i], gi = T.gid[i], alone = !dead && gi >= 0 && T.groups[gi].length === 1 && n > 1;
        var col = dead ? C.red : alone ? '#9aa5b1' : GCOL[gi % GCOL.length];
        if (Object.keys(br).length === 0) col = C.blue;
        g.fillStyle = dead ? '#fbe2df' : col; g.strokeStyle = dead || alone ? C.red : '#ffffff'; g.lineWidth = dead || alone ? 5 : 3;
        g.beginPath(); g.arc(p.x, p.y, rad, 0, 7); g.fill(); g.stroke();
        g.fillStyle = dead ? C.red : '#ffffff'; g.font = '700 26px ' + D.SANS; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(NAMES[i], p.x, p.y + 1);
        if (dead) xmark(p.x + rad - 4, p.y - rad + 4);
        g.font = '600 20px ' + D.MONO; g.fillStyle = C.gray;   // ports-per-device badge
        if (topo !== 'bus') {
          var ang = Math.atan2(p.y - 400, p.x - 550);
          g.fillText(cnt.perDev + 'p', p.x + (rad + 26) * Math.cos(ang), p.y + (rad + 22) * Math.sin(ang));
        } else { g.font = '600 20px ' + D.MONO; g.fillStyle = C.gray; g.fillText('1p', p.x, p.y + (i % 2 ? rad + 20 : -rad - 18)); }
        hits.push({ key: 'D' + i, x: p.x, y: p.y, r: rad + 4 });
      }
      g.textBaseline = 'alphabetic';
      // ---- caption ----
      g.fillStyle = NAVY; g.font = '600 24px ' + D.SANS; g.textAlign = 'left';
      var cap = topo === 'mesh' ? cnt.links + ' duplex links' : topo === 'star' ? cnt.links + ' links to the hub' : topo === 'bus' ? '1 trunk + ' + n + ' drop lines' : cnt.links + ' links in a loop';
      g.fillText(cap + ' · ' + cnt.total + ' ports in total', 24, 810);
      g.fillStyle = C.gray; g.font = '500 21px ' + D.SANS; g.textAlign = 'right';
      g.fillText('“Np” = ports on that device · click a cable or device to break it', 1080, 810);

      // ---- formula ----
      var f, B = function (v) { return '<b>' + v + '</b>'; };
      if (topo === 'mesh') f = 'Links = n(n − 1)/2\n      = ' + n + ' × ' + (n - 1) + ' / 2 = ' + B(cnt.links) + '\nPorts per device = n − 1 = ' + B(cnt.perDev) + '\nTotal ports = n(n − 1)\n      = ' + n + ' × ' + (n - 1) + ' = ' + B(cnt.total);
      if (topo === 'star') f = 'Links = n = ' + B(n) + '\nPorts per device = ' + B(1) + '\nHub ports = n = ' + B(n) + '\nTotal ports = n + n = ' + n + ' + ' + n + ' = ' + B(cnt.total);
      if (topo === 'bus') f = 'Cables = 1 trunk + n drop lines\n       = 1 + ' + n + ' = ' + B(cnt.cables) + '\nPorts per device = ' + B(1) + ' (one tap)\nTotal ports = n = ' + B(cnt.total);
      if (topo === 'ring') f = 'Links = n = ' + B(n) + (st.dual ? ' (+ ' + n + ' on ring 2)' : '') + '\nPorts per device = ' + B(2) + ' (two neighbours)\nTotal ports = 2n = 2 × ' + n + ' = ' + B(cnt.total);
      form.innerHTML = f;
      var t = '<table class="w-tab" style="width:100%"><tr><th class="rh">n = ' + n + '</th><th>Links</th><th>Ports/dev</th><th>Total</th><th>Links at 2n</th></tr>';
      [['mesh', 'Mesh'], ['star', 'Star'], ['bus', 'Bus'], ['ring', 'Ring']].forEach(function (r) {
        var c = counts(r[0], n), c2 = counts(r[0], 2 * n);
        t += '<tr' + (r[0] === topo ? ' class="cur"' : '') + '><td class="rh">' + r[1] + '</td><td>' + (r[0] === 'bus' ? '1+' + n : c.links) + '</td><td>' + c.perDev +
          '</td><td>' + c.total + (r[0] === 'star' ? '*' : '') + '</td><td>' + (r[0] === 'bus' ? '1+' + 2 * n : c2.links) + '</td></tr>';
      });
      tab.innerHTML = t + '</table><p class="w-note" style="margin-top:6px">Total = all ports (* star: n device + n hub ports)</p>';

      // ---- verdict ----
      var keys = Object.keys(br), N = n * (n - 1) / 2, live = T.groups.reduce(function (s, gr) { return s + gr.length; }, 0);
      var gtxt = T.groups.filter(function (gr) { return gr.length > 1; }).map(function (gr) { return gr.map(function (k) { return NAMES[k]; }).join(''); });
      var cut = T.groups.filter(function (gr) { return gr.length === 1; }).map(function (gr) { return NAMES[gr[0]]; });
      var head = 'Pairs that can talk: ' + T.pairs + ' of ' + N + '. ', msg, cls;
      var devDown = keys.filter(function (k) { return k[0] === 'D'; }).map(function (k) { return NAMES[+k.slice(1)]; });
      if (!keys.length) { msg = 'Nothing broken: all ' + n + ' devices can talk (' + N + ' pair' + (N === 1 ? '' : 's') + '). Click a cable or a device to break it.'; cls = 'ok'; }
      else if (topo === 'star' && br.H) { msg = head + 'Hub down: no device can reach any other. The hub is a single point of failure.'; cls = 'bad'; }
      else if (topo === 'ring' && !st.dual && n > 1 && T.pairs === 0) { msg = head + 'One break stops the one-way ring: every two-way exchange needs the whole loop. Fix: a dual ring.'; cls = 'bad'; }
      else if (topo === 'bus' && keys.some(function (k) { return k[0] === 'T'; })) {
        msg = head + 'Trunk cut splits the bus: ' + gtxt.concat(cut).join(' | ') + '. Real coax: the cut ends reflect signals, so the whole bus stops.'; cls = 'bad';
      } else if (T.groups.length === 1 && live === n - devDown.length) {
        var relay = topo === 'mesh' ? keys.filter(function (k) { return k[0] === 'L'; }).map(function (k) { var q = k.slice(1).split('-'); return NAMES[+q[0]] + '–' + NAMES[+q[1]]; }) : [];
        msg = head + (devDown.length ? 'Only ' + devDown.join(', ') + ' is down; everyone else can still talk' : 'Everyone can still talk') +
          (relay.length ? (relay.length > 2 ? '; ' + relay.length + ' pairs now relay' : '; ' + relay.join(', ') + ' now relay' + (relay.length > 1 ? '' : 's')) + ' via another device.' : (topo === 'ring' ? ': traffic turns back on the second ring.' : '.')); cls = 'ok';
      } else {
        msg = head + (gtxt.length ? 'Can still talk: ' + gtxt.join(' | ') + '. ' : '') + (cut.length ? 'Cut off: ' + cut.join(' ') + '.' : '') +
          (devDown.length ? ' Down: ' + devDown.join(' ') + '.' : ''); cls = T.pairs ? 'warn' : 'bad';
      }
      verdict.className = 'w-verdict ' + cls; verdict.textContent = msg;
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { counts: counts, talkGroups: talkGroups };
})();
