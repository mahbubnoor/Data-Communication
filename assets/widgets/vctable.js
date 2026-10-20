(function () {
  'use strict';
  var D = typeof window !== 'undefined' ? window.DCW : null;
  var h = D && D.h, C = D && D.C, SANS = D && D.SANS, MONO = D && D.MONO;

  /* ---- data: Forouzan Figs 8.12-8.15 as on slides vctables / vcsetup (A -> B), plus one illustrative circuit C -> D ---- */
  var CIRC = {
    AB: { id: 'AB', name: 'A → B', src: 'A', dst: 'B', rows: [[1, 14, 3, 66], [1, 66, 2, 22], [2, 22, 3, 77]] },
    CD: { id: 'CD', name: 'C → D', src: 'C', dst: 'D', rows: [[2, 22, 3, 41], [1, 41, 2, 14], [2, 14, 1, 66]] }
  };
  function vcis(c) { var r = CIRC[c].rows; return [r[0][1], r[0][3], r[1][3], r[2][3]]; } // VCI on links 0..3
  function lookup(c, s, port, vci) { // what switch s does with a frame arriving on (port, vci)
    var r = CIRC[c].rows[s]; return r[0] === port && r[1] === vci ? { port: r[2], vci: r[3] } : null;
  }
  function clone(t) { return JSON.parse(JSON.stringify(t)); }
  function row(c, v) { return { c: c, v: v.slice(), fill: [], del: false }; }
  function full(withAB) { return [0, 1, 2].map(function (s) { var t = [row('CD', CIRC.CD.rows[s])]; if (withAB) t.push(row('AB', CIRC.AB.rows[s])); return t; }); }

  function dataSteps(c, tables, n0) { // frame from src to dst through the three switches
    var C0 = CIRC[c], v = vcis(c), out = [], sw = ['Switch 1', 'Switch 2', 'Switch 3'];
    out.push({ tables: clone(tables), frame: { c: c, link: 0, dir: 1, kind: 'data', vci: v[0] }, at: null,
      msg: C0.src + ' sends a data frame with VCI ' + v[0] + ' on its link to switch 1 (port ' + C0.rows[0][0] + ').',
      look: 'Frame on link ' + C0.src + '–S1:  VCI <b>' + v[0] + '</b>' });
    for (var s = 0; s < 3; s++) {
      var r = C0.rows[s], res = lookup(c, s, r[0], r[1]);
      out.push({ tables: clone(tables), frame: { c: c, link: s + 1, dir: 1, kind: 'data', vci: res.vci }, at: s, hl: c, rewrite: [r[1], res.vci],
        msg: sw[s] + ' looks up (port ' + r[0] + ', VCI ' + r[1] + '), sends the frame out on port ' + res.port + ' and rewrites the VCI to ' + res.vci + '.',
        look: sw[s] + ' table row\n(in port, VCI) → (out port, VCI)\n   (' + r[0] + ', ' + r[1] + ')   →   (' + res.port + ', <b>' + res.vci + '</b>)\nFrame header:  VCI ' + r[1] + ' → <b>' + res.vci + '</b>' });
    }
    out.push({ tables: clone(tables), frame: { c: c, link: 4, dir: 1, kind: 'data', vci: v[3] }, at: null,
      msg: C0.dst + ' receives the frame with VCI ' + v[3] + '. Every frame of this circuit takes the same path, in order.',
      look: 'VCIs on the way:  ' + v.join(' → ') + '\nOne number per link: each has meaning on that link only.' });
    out.forEach(function (st, i) { st.title = 'Data transfer ' + C0.name + ' (' + (i + 1 + (n0 || 0)) + ')'; });
    return out;
  }

  function lifeSteps() {
    var T = full(false), S = [], ab = CIRC.AB.rows, v = vcis('AB');
    function push(o) { o.tables = clone(T); S.push(o); T.forEach(function (t) { t.forEach(function (r) { r.fill = []; }); }); }
    push({ phase: 'Before setup', frame: null, at: null, msg: 'Only C → D\'s circuit is in the tables. A wants a virtual circuit to B.', look: 'Tables hold one row per circuit.\nA → B has no rows yet.' });
    push({ phase: 'Setup request', frame: { c: 'AB', link: 0, dir: 1, kind: 'setup' }, at: null,
      msg: 'A sends a Setup request to switch 1. It carries the global addresses of A and B, not a VCI.', look: 'Setup frame:  source A, destination B' });
    for (var s = 0; s < 3; s++) {
      var r = ab[s]; T[s].push({ c: 'AB', v: [r[0], r[1], r[2], null], fill: [0, 1, 2], del: false });
      push({ phase: 'Setup request', frame: { c: 'AB', link: s + 1, dir: 1, kind: 'setup' }, at: s, hl: 'AB',
        msg: 'Switch ' + (s + 1) + ': the request came in on port ' + r[0] + '. It picks unused VCI ' + r[1] + ' for that incoming link and routes towards B on port ' + r[2] + '. Out VCI not known yet.',
        look: 'Switch ' + (s + 1) + ' row:  (' + r[0] + ', <b>' + r[1] + '</b>) → (' + r[2] + ', ?)' });
    }
    push({ phase: 'Acknowledgment', frame: { c: 'AB', link: 3, dir: -1, kind: 'ack', vci: v[3] }, at: null,
      msg: 'B accepts. It picks VCI ' + v[3] + ' for frames arriving from switch 3 and sends an Acknowledgment carrying ' + v[3] + '.', look: 'Ack frame to switch 3:  VCI <b>' + v[3] + '</b>' });
    for (s = 2; s >= 0; s--) {
      var rr = T[s][T[s].length - 1]; rr.v[3] = ab[s][3]; rr.fill = [3];
      push({ phase: 'Acknowledgment', frame: { c: 'AB', link: s, dir: -1, kind: 'ack', vci: ab[s][1] }, at: s, hl: 'AB',
        msg: 'Switch ' + (s + 1) + ' learns out VCI ' + ab[s][3] + ' from the Ack and completes its row. It passes back its own incoming VCI ' + ab[s][1] + (s ? ' to switch ' + s + '.' : ' to A.'),
        look: 'Switch ' + (s + 1) + ' row:  (' + ab[s][0] + ', ' + ab[s][1] + ') → (' + ab[s][2] + ', <b>' + ab[s][3] + '</b>)' });
    }
    push({ phase: 'Circuit ready', frame: { c: 'AB', link: -1, dir: -1, kind: 'ack', vci: v[0] }, at: null,
      msg: 'A learns that it must use VCI ' + v[0] + '. All three rows are complete: data can flow.', look: 'A → B circuit:  VCIs ' + v.join(', ') + '\non links A–S1, S1–S2, S2–S3, S3–B' });
    dataSteps('AB', T).forEach(function (d) { d.phase = 'Data transfer'; S.push(d); });
    push({ phase: 'Teardown', frame: { c: 'AB', link: 0, dir: 1, kind: 'tear', vci: v[0] }, at: null,
      msg: 'A sends a Teardown request along the circuit to B.', look: 'Teardown frame:  VCI <b>' + v[0] + '</b>' });
    T.forEach(function (t) { t.forEach(function (r) { if (r.c === 'AB') r.del = true; }); });
    push({ phase: 'Teardown', frame: { c: 'AB', link: 3, dir: -1, kind: 'conf' }, at: null, hl: 'AB',
      msg: 'B confirms the teardown, and every switch deletes the A → B row (struck out).', look: 'Deleted rows (in port, VCI):\nS1 (1, 14)   S2 (1, 66)   S3 (2, 22)' });
    T = T.map(function (t) { return t.filter(function (r) { return r.c !== 'AB'; }); });
    push({ phase: 'Teardown', frame: null, at: null,
      msg: 'The rows are gone: VCIs 14, 66, 22 and 77 can be reused on their links. C → D is untouched.', look: 'Only C → D\'s rows remain.' });
    S.forEach(function (st, i) { st.title = st.phase; });
    return S;
  }

  if (typeof module !== 'undefined') module.exports = { CIRC: CIRC, vcis: vcis, lookup: lookup, dataSteps: dataSteps, lifeSteps: lifeSteps, full: full };
  if (!D) return;

  D.register('vctable', function (root) {
    var MODES = { ab: function () { return dataSteps('AB', full(true)); }, cd: function () { return dataSteps('CD', full(true)); }, life: lifeSteps };
    var st = { mode: 'ab', i: 0, steps: MODES.ab() };
    var cv = D.canvas(1080, 530);
    var tabs = [0, 1, 2].map(function () { return h('div'); });
    var cards = [0, 1, 2].map(function (s) { return h('div', { cls: 'w-card', style: 'width:352px;box-sizing:border-box;padding:12px 14px;gap:8px' }, [h('h4', { text: 'Switch ' + (s + 1) }), tabs[s]]); });
    var mode = D.seg([['ab', 'A → B data'], ['cd', 'C → D data'], ['life', 'Setup → teardown']], 'ab', function (k) { st.mode = k; st.steps = MODES[k](); st.i = 0; draw(); });
    var bBack = D.btn('◀ Back', function () { if (st.i > 0) { st.i--; draw(); } });
    var bNext = D.btn('Next step ▶', function () { if (st.i < st.steps.length - 1) { st.i++; draw(); } }, 'acc');
    var bRe = D.btn('Restart', function () { st.i = 0; draw(); });
    var ctr = h('div', { style: 'font:600 24px ' + SANS + ';color:#16324f' });
    var verdict = h('div', { cls: 'w-verdict warn', style: 'font-size:24px;line-height:1.35' });
    var look = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var note = h('p', { cls: 'w-note', text: 'A VCI is local to one link: 14 means A → B on link A–S1 but C → D on link S2–S3. C → D is an extra, illustrative circuit; A → B uses the slide\'s numbers.' });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px;align-items:flex-start' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, h('div', { cls: 'w-row', style: 'gap:12px;align-items:stretch' }, cards)]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'padding:12px 16px' }, [mode.el]),
        h('div', { cls: 'w-btns' }, [bBack, bNext, bRe]), ctr, verdict, h('div', { cls: 'w-card', style: 'padding:8px 16px' }, [look]), note])]));

    // geometry
    var Y = 200, XS = { A: 44, S1: 190, S2: 540, S3: 890, B: 1036, C: 60, D: 1020 }, YS = { A: Y, B: Y, C: 420, D: 420 }, R = 42;
    var PORT = { S1: { 1: [-R, 0], 3: [R, 0], 2: [0, R] }, S2: { 1: [-R, 0], 2: [R, 0] }, S3: { 2: [-R, 0], 3: [R, 0], 1: [0, R] } };
    function port(sw, p) { var o = PORT[sw][p]; return [XS[sw] + o[0], Y + o[1]]; }
    function linkEnds(c, i) { // link i of circuit c (0 = host to S1, 3 = S3 to host)
      var r = CIRC[c].rows, src = CIRC[c].src, dst = CIRC[c].dst;
      if (i === 0) return [[XS[src], YS[src]], port('S1', r[0][0])];
      if (i === 3) return [port('S3', r[2][2]), [XS[dst], YS[dst]]];
      return [port('S' + i, r[i - 1][2]), port('S' + (i + 1), r[i][0])];
    }
    function linkVci(T, c, i) { // VCI shown on link i, from the tables
      var row = function (s) { return T[s].filter(function (r) { return r.c === c && !r.del; })[0]; };
      var r = i < 3 ? row(i) : row(2); if (!r) return null;
      var v = i < 3 ? r.v[1] : r.v[3]; return v == null ? null : v;
    }

    function draw() {
      var S = st.steps[st.i], T = S.tables, g = cv.g, W = cv.w, H = cv.h;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var fr = S.frame, onLink = fr && fr.link >= 0 && fr.link <= 3 ? fr.link : -2;
      // links
      ['CD', 'AB'].forEach(function (c) {
        for (var i = 0; i < 4; i++) {
          var e = linkEnds(c, i), act = fr && fr.c === c && onLink === i;
          g.strokeStyle = act ? C.light : '#c3ccd6'; g.lineWidth = act ? 10 : 7; g.lineCap = 'round';
          g.beginPath(); g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); g.stroke();
        }
      });
      g.lineCap = 'butt';
      // VCI labels on links
      g.font = '600 20px ' + MONO; g.textAlign = 'center';
      ['AB', 'CD'].forEach(function (c) {
        for (var i = 0; i < 4; i++) {
          var v = linkVci(T, c, i); if (v == null) continue;
          var e = linkEnds(c, i), mx = (e[0][0] + e[1][0]) / 2, my = (e[0][1] + e[1][1]) / 2, x, y;
          if (c === 'AB') { x = mx; y = Y + 46; } else if (i === 1 || i === 2) { x = mx; y = Y + 78; } else { x = mx + (i === 0 ? -40 : 40); y = my + 6; g.textAlign = i === 0 ? 'right' : 'left'; }
          var hot = fr && fr.c === c && onLink === i && fr.vci === v;
          g.fillStyle = hot ? C.orange : c === 'AB' ? C.blue : C.gray;
          g.fillText('VCI ' + v, x, y); g.textAlign = 'center';
        }
      });
      // hosts
      ['A', 'B', 'C', 'D'].forEach(function (n) {
        var x = XS[n], y = YS[n], ab = n === 'A' || n === 'B';
        g.fillStyle = ab ? C.orange : '#8a94a0'; g.beginPath(); g.arc(x, y, 28, 0, 7); g.fill();
        g.fillStyle = '#f5f3ee'; g.font = '700 24px ' + SANS; g.textAlign = 'center'; g.fillText(n, x, y + 8);
      });
      // switches with ports
      ['S1', 'S2', 'S3'].forEach(function (sw, s) {
        var x = XS[sw];
        g.fillStyle = C.navy; rr(g, x - R, Y - R, 2 * R, 2 * R, 12); g.fill();
        if (S.at === s) { g.strokeStyle = C.light; g.lineWidth = 6; rr(g, x - R - 6, Y - R - 6, 2 * R + 12, 2 * R + 12, 16); g.stroke(); }
        g.fillStyle = '#f5f3ee'; g.font = '700 24px ' + SANS; g.textAlign = 'center'; g.fillText(sw, x, Y + 9);
        Object.keys(PORT[sw]).forEach(function (p) {
          var q = port(sw, p); g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 2.5;
          g.beginPath(); g.arc(q[0], q[1], 14, 0, 7); g.fill(); g.stroke();
          g.fillStyle = C.navy; g.font = '700 20px ' + SANS; g.fillText(p, q[0], q[1] + 7);
        });
        if (S.at === s && S.rewrite) {
          g.fillStyle = C.orange; g.font = '700 22px ' + MONO; g.fillText(S.rewrite[0] + ' → ' + S.rewrite[1], x, Y - R - 18);
        }
      });
      // frame
      if (fr) drawFrame(g, fr);
      // heading and legend
      g.font = '600 24px ' + SANS; g.textAlign = 'left'; g.fillStyle = C.navy;
      g.fillText(st.mode === 'life' ? 'Virtual circuit A → B: ' + (S.phase || '').toLowerCase() : 'Data transfer on circuit ' + CIRC[st.mode === 'ab' ? 'AB' : 'CD'].name, 24, 40);
      g.font = '500 20px ' + SANS; g.textAlign = 'left'; g.fillStyle = C.blue; g.fillText('■ A → B (slide values)', 300, H - 22);
      g.fillStyle = C.gray; g.fillText('■ C → D (illustrative)', 560, H - 22);
      g.fillStyle = C.navy; g.font = '600 20px ' + SANS; g.fillText('Port numbers in white circles', 300, H - 54);
      // tables
      tabs.forEach(function (el, s) {
        var rows = T[s], H2 = '<table class="w-tab" style="width:100%"><tr><th>In<br>port</th><th>In<br>VCI</th><th>Out<br>port</th><th>Out<br>VCI</th></tr>';
        if (!rows.length) H2 += '<tr><td colspan="4" style="color:#5b6672">(empty)</td></tr>';
        rows.forEach(function (r) {
          var cur = S.hl === r.c && (S.at === s || r.del || (S.at == null && r.fill.length)), ab = r.c === 'AB';
          H2 += '<tr' + (cur || r.fill.length ? ' class="cur"' : '') + ' style="' + (ab ? 'color:#2f6db5' : 'color:#5b6672') + (r.del ? ';text-decoration:line-through;color:#c0392b' : '') + '">' +
            r.v.map(function (x, j) { var f = r.fill.indexOf(j) >= 0; return '<td style="' + (f ? 'color:#a64f15;font-weight:700' : (j % 2 ? 'font-weight:600' : '')) + '">' + (x == null ? '?' : x) + '</td>'; }).join('') + '</tr>';
        });
        el.innerHTML = H2 + '</table>';
      });
      cards.forEach(function (cd, s) { cd.style.outline = S.at === s ? '4px solid #f0a35e' : ''; });
      ctr.textContent = 'Step ' + (st.i + 1) + ' of ' + st.steps.length + (S.phase ? ':  ' + S.phase : '');
      verdict.className = 'w-verdict ' + (S.phase === 'Teardown' ? 'bad' : st.i === st.steps.length - 1 || S.phase === 'Circuit ready' ? 'ok' : 'warn');
      verdict.textContent = S.msg; look.innerHTML = S.look;
      bBack.disabled = st.i === 0; bNext.disabled = st.i === st.steps.length - 1;
      bBack.style.opacity = bBack.disabled ? '0.4' : ''; bNext.style.opacity = bNext.disabled ? '0.4' : '';
    }
    function drawFrame(g, fr) {
      var x, y, txt, col = fr.kind === 'data' ? C.light : fr.kind === 'tear' || fr.kind === 'conf' ? '#f2b8b0' : '#bcd5ef';
      txt = fr.kind === 'data' ? 'VCI ' + fr.vci + ' | data' : fr.kind === 'setup' ? 'Setup A→B' : fr.kind === 'ack' ? 'Ack VCI ' + fr.vci : fr.kind === 'tear' ? 'Teardown ' + fr.vci : 'Confirm';
      txt = (fr.dir < 0 ? '◀ ' : '') + txt + (fr.dir > 0 ? ' ▶' : '');
      if (fr.link < 0 || fr.link > 3) { var n = fr.link < 0 ? CIRC[fr.c].src : CIRC[fr.c].dst; if (YS[n] > Y) { x = XS[n] + (n === 'C' ? 170 : -170); y = YS[n]; } else { x = XS[n] + (fr.link < 0 ? 60 : -60); y = YS[n] - 78; } }
      else {
        var e = linkEnds(fr.c, fr.link), mx = (e[0][0] + e[1][0]) / 2, my = (e[0][1] + e[1][1]) / 2;
        if (my > Y + 5) { x = mx + (fr.link === 0 ? 175 : -175); y = my + 20; } else { x = mx; y = Y - 92; }
      }
      g.font = '700 22px ' + MONO; var w = g.measureText(txt).width + 28;
      x = Math.max(w / 2 + 6, Math.min(cv.w - w / 2 - 6, x));
      g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 2; rr(g, x - w / 2, y - 22, w, 44, 10); g.fill(); g.stroke();
      g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(txt, x, y + 8);
    }
    function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    draw();
  });
})();
