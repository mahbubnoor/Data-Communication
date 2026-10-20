(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, SANS = D.SANS, MONO = D.MONO;

  /* ---- pure data: slide "addressing" = Forouzan Table 15.3 ---- */
  // labels exactly as on the slide; holds = station in the slide's scene; role = what that field means on this hop
  var CASES = {
    '00': { what: 'station → station, same BSS', addr: [['Destination', 'C', 'receiver + final dest.'], ['Source', 'A', 'transmitter + orig. source'], ['BSS ID', 'BSS 1', 'which BSS'], ['–', '', '']] },
    '01': { what: 'AP → station', addr: [['Destination', 'B', 'receiver + final dest.'], ['Sending AP', 'AP2', 'transmitter'], ['Source', 'A', 'orig. source'], ['–', '', '']] },
    '10': { what: 'station → AP', addr: [['Receiving AP', 'AP1', 'receiver'], ['Source', 'A', 'transmitter + orig. source'], ['Destination', 'B', 'final dest.'], ['–', '', '']] },
    '11': { what: 'AP → AP (wireless DS)', addr: [['Receiving AP', 'AP2', 'receiver'], ['Sending AP', 'AP1', 'transmitter'], ['Destination', 'B', 'final dest.'], ['Source', 'A', 'orig. source']] }
  };
  function fields(td, fd) { return CASES['' + td + fd]; }
  if (typeof module !== 'undefined') module.exports = { CASES: CASES, fields: fields };

  // scene geometry (canvas px)
  var P = { A: [175, 480], C: [425, 490], B: [865, 480], AP1: [300, 255], AP2: [780, 255] };
  var DSY = 128;
  function radio(a, b) { return { pts: [P[a], P[b]], radio: true, a: a, b: b }; }
  var WIRED = { pts: [[300, 227], [300, DSY], [780, DSY], [780, 227]], radio: false, a: 'AP1', b: 'AP2' };
  var HOPS = {
    '00': { act: radio('A', 'C'), ctx: [] },
    '01': { act: radio('AP2', 'B'), ctx: [radio('A', 'AP1'), WIRED] },
    '10': { act: radio('A', 'AP1'), ctx: [WIRED, radio('AP2', 'B')] },
    '11': { act: radio('AP1', 'AP2'), ctx: [radio('A', 'AP1'), radio('AP2', 'B')] },
    eth: { act: WIRED, ctx: [radio('A', 'AP1'), radio('AP2', 'B')] }
  };

  D.register('addr80211', function (root) {
    var st = { td: 1, fd: 0, eth: false, t0: performance.now(), worked: -1 };
    var cv = D.canvas(1080, 620), g = cv.g, W = cv.w, H = cv.h;
    function pick(td, fd, keepWorked) { st.td = td; st.fd = fd; st.eth = false; if (!keepWorked) stopWorked(); st.t0 = performance.now(); sync(); }
    var tdS = D.seg([['0', '0'], ['1', '1']], '1', function (k) { pick(+k, st.fd); });
    var fdS = D.seg([['0', '0'], ['1', '1']], '0', function (k) { pick(st.td, +k); });
    [tdS, fdS].forEach(function (s) { [].forEach.call(s.el.children, function (b) { b.style.cssText = 'font-size:24px;padding:6px 20px;font-family:' + MONO; }); });
    var scen = D.seg([['00', '00 same BSS'], ['01', '01 from DS'], ['10', '10 to DS'], ['11', '11 WDS']], '10', function (k) { pick(+k[0], +k[1]); });
    [].forEach.call(scen.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:6px 12px'; });
    var workB = D.btn('▶ Worked: A → B via wired DS', function () { runWorked(); }, 'acc');
    workB.style.cssText = 'font-size:22px;padding:6px 14px';
    var fillTab = h('table', { cls: 'w-tab', style: 'width:100%;font-family:' + SANS + ';font-size:22px' });
    var head = h('div', { style: 'font:600 24px ' + SANS + ';color:' + C.navy });
    var caseTab = h('table', { cls: 'w-tab', style: 'width:1080px;table-layout:fixed;font-family:' + SANS + ';font-size:22px' });
    var colW = [90, 100, 160, 150, 150, 120, 310];
    caseTab.appendChild(h('colgroup', null, colW.map(function (w) { return h('col', { style: 'width:' + w + 'px' }); })));
    caseTab.appendChild(h('tr', null, ['To DS', 'From DS', 'Address 1', 'Address 2', 'Address 3', 'Address 4', 'Case'].map(function (t) { return h('th', { cls: 'rh', text: t }); })));
    var rows = {};
    ['00', '01', '10', '11'].forEach(function (k) {
      var c = CASES[k], cells = [k[0], k[1]].concat(c.addr.map(function (a) { return a[0]; })).concat([c.what]);
      var tr = h('tr', { style: 'cursor:pointer', onclick: function () { pick(+k[0], +k[1]); } }, cells.map(function (t, i) { return h('td', { text: t, style: 'text-align:left;padding:6px 10px' + (i < 2 ? ';font-family:' + MONO : '') }); }));
      rows[k] = tr; caseTab.appendChild(tr);
    });
    var lab = function (t) { return h('span', { text: t, style: 'font:600 24px ' + SANS + ';color:' + C.navy + ';min-width:96px' }); };
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, caseTab]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px;padding:12px 18px' }, [
          h('div', { style: 'display:flex;gap:28px;align-items:center' }, [
            h('div', { style: 'display:flex;gap:10px;align-items:center' }, [lab('To DS'), tdS.el]),
            h('div', { style: 'display:flex;gap:10px;align-items:center' }, [lab('From DS'), fdS.el])]),
          scen.el, workB]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 16px' }, [head, fillTab]),
        h('div', { cls: 'w-card', style: 'gap:2px;padding:10px 18px' }, [
          h('p', { html: 'Address 1 = <b style="color:' + C.orange + '">next</b> receiver', style: 'margin:0;font-size:23px' }),
          h('p', { html: 'Address 2 = <b style="color:' + C.blue + '">previous</b> sender', style: 'margin:0;font-size:23px' }),
          h('p', { text: 'Address 3 = the end station not named yet', style: 'margin:0;font-size:23px' }),
          h('p', { text: 'Address 4 = original source (wireless DS only)', style: 'margin:0;font-size:23px' })])])
    ]));

    var wTimer = null;
    function stopWorked() { if (wTimer) clearTimeout(wTimer); wTimer = null; st.worked = -1; workB.textContent = '▶ Worked: A → B via wired DS'; }
    function runWorked() {
      stopWorked(); workB.textContent = 'Worked example: hop 1 of 3';
      var seq = [[1, 0, false], [0, 0, true], [0, 1, false]], i = 0;
      (function step() {
        var s = seq[i]; st.worked = i; pick(s[0], s[1], true); if (s[2]) { st.eth = true; sync(); }
        workB.textContent = 'Worked example: hop ' + (i + 1) + ' of 3';
        i++; wTimer = i < seq.length ? setTimeout(step, 3200) : setTimeout(function () { wTimer = null; st.worked = -1; workB.textContent = '▶ Worked: A → B via wired DS'; }, 3200);
      })();
    }

    function key() { return st.eth ? 'eth' : '' + st.td + st.fd; }
    function sync() {
      var k = '' + st.td + st.fd;
      tdS.set('' + st.td); fdS.set('' + st.fd); scen.set(st.eth ? '' : k);
      Object.keys(rows).forEach(function (r) { rows[r].classList.toggle('cur', !st.eth && r === k); });
      fillTab.innerHTML = '';
      if (st.eth) {
        head.innerHTML = 'Hop AP1 → AP2: <span style="color:' + C.navy + '">Ethernet frame</span>';
        fillTab.appendChild(h('tr', null, ['Field', 'Holds'].map(function (t) { return h('th', { cls: 'rh', text: t }); })));
        [['Destination', 'AP2'], ['Source', 'AP1']].forEach(function (r) { fillTab.appendChild(h('tr', null, [h('td', { cls: 'rh', text: r[0] }), h('td', { text: r[1], style: 'text-align:left;font-family:' + MONO })])); });
        fillTab.appendChild(h('tr', null, [h('td', { colspan: 2, style: 'text-align:left;white-space:normal;color:' + C.gray, text: 'An ordinary wired frame on the distribution system: no To DS / From DS bits, no 802.11 addresses.' })]));
        return;
      }
      var c = CASES[k];
      head.innerHTML = '<span style="font-family:' + MONO + ';color:' + C.orange + '">' + k + '</span> · ' + c.what;
      fillTab.appendChild(h('tr', null, ['Field', 'Slide label', 'Holds', 'Role on this hop'].map(function (t) { return h('th', { cls: 'rh', text: t }); })));
      c.addr.forEach(function (a, i) {
        var used = a[0] !== '–', col = /^receiver/.test(a[2]) ? C.orange : /^transmitter/.test(a[2]) ? C.blue : C.ink;
        fillTab.appendChild(h('tr', null, [
          h('td', { cls: 'rh', text: 'Addr ' + (i + 1) }),
          h('td', { text: used ? a[0] : '– (not used)', style: 'text-align:left' + (used ? '' : ';color:' + C.gray) }),
          h('td', { text: a[1], style: 'font:600 23px ' + MONO + ';color:' + col }),
          h('td', { text: a[2], style: 'text-align:left;white-space:normal;color:' + col + ';font-weight:' + (col === C.ink ? 500 : 600) })]));
      });
    }

    function plen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
    function along(pts, f) {
      var L = plen(pts) * f;
      for (var i = 1; i < pts.length; i++) {
        var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (L <= d || i === pts.length - 1) { var u = d ? Math.min(1, L / d) : 0; return [pts[i - 1][0] + u * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + u * (pts[i][1] - pts[i - 1][1])]; }
        L -= d;
      }
    }
    function trim(hop) { // keep radio lines off the icons
      if (!hop.radio) return hop.pts;
      var a = hop.pts[0], b = hop.pts[1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, m = 56;
      return [[a[0] + ux * m, a[1] + uy * m], [b[0] - ux * m, b[1] - uy * m]];
    }
    function line(hop, col, w, dash) {
      var pts = trim(hop); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.setLineDash([]);
      var a = pts[pts.length - 2], b = pts[pts.length - 1], an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.fillStyle = col; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] - 18 * Math.cos(an - 0.4), b[1] - 18 * Math.sin(an - 0.4)); g.lineTo(b[0] - 18 * Math.cos(an + 0.4), b[1] - 18 * Math.sin(an + 0.4)); g.fill();
    }
    function laptop(x, y, name, col) {
      g.fillStyle = '#fff'; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath(); g.rect(x - 26, y - 34, 52, 34); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x - 36, y + 6); g.lineTo(x + 36, y + 6); g.lineTo(x + 28, y); g.lineTo(x - 28, y); g.closePath(); g.fillStyle = col; g.fill();
      g.fillStyle = C.ink; g.font = '600 24px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(name, x, y + 36);
    }
    function ap(x, y, name, col) {
      g.fillStyle = col; g.beginPath(); g.rect(x - 52, y - 26, 104, 52); g.fill();
      g.strokeStyle = col; g.lineWidth = 3; [14, 24].forEach(function (r) { g.beginPath(); g.arc(x + 40, y - 26, r, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke(); });
      g.fillStyle = '#fff'; g.font = '600 24px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, x, y + 1);
    }
    function tag(x, y, text, col) {
      g.font = '600 20px ' + SANS; var w = g.measureText(text).width + 16;
      g.fillStyle = col; g.beginPath(); g.rect(x - w / 2, y - 14, w, 28); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1);
    }

    function draw(now) {
      var k = key(), hp = HOPS[k], wds = k === '11';
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      // BSS ellipses
      [[300, 'BSS 1'], [780, 'BSS 2']].forEach(function (q) {
        g.fillStyle = 'rgba(159,193,230,0.16)'; g.strokeStyle = C.sky; g.lineWidth = 2; g.setLineDash([8, 6]);
        g.beginPath(); g.ellipse(q[0], 405, 235, 175, 0, 0, 7); g.fill(); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.blue; g.font = '600 22px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(q[1], q[0], 568);
      });
      // distribution system
      g.fillStyle = wds ? '#fff' : '#e7edf3'; g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash(wds ? [8, 6] : []);
      g.beginPath(); g.rect(140, 64, 800, 82); g.fill(); g.stroke(); g.setLineDash([]);
      g.fillStyle = wds ? C.gray : C.navy; g.font = '600 22px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(wds ? 'Distribution system: wireless (WDS), APs talk by radio' : 'Distribution system (wired, e.g. Ethernet)', 540, 90);
      if (!wds) { g.strokeStyle = C.navy; g.lineWidth = 3; [300, 780].forEach(function (x) { g.beginPath(); g.moveTo(x, 146); g.lineTo(x, 227); g.stroke(); }); }
      // context hops then active hop
      hp.ctx.forEach(function (c) { line(c, '#b8c2cc', 3, c.radio ? [10, 8] : []); });
      var acol = hp.act.radio ? C.orange : C.navy;
      line(hp.act, acol, 5, hp.act.radio ? [14, 8] : []);
      // nodes
      var names = ['A', 'C', 'B'];
      names.forEach(function (n) { laptop(P[n][0], P[n][1], n, k === '00' || n !== 'C' ? C.navy : '#9aa5b1'); });
      ap(P.AP1[0], P.AP1[1], 'AP1', k === '00' ? '#9aa5b1' : C.navy); ap(P.AP2[0], P.AP2[1], 'AP2', k === '00' ? '#9aa5b1' : C.navy);
      // role tags
      var tx = hp.act.a, rx = hp.act.b, src = 'A', dst = k === '00' ? 'C' : 'B';
      var off = function (n) { return n.slice(0, 2) === 'AP' ? -50 : 60; };
      var tags = {};
      function add(n, t, col) { (tags[n] = tags[n] || []).push([t, col]); }
      if (k === 'eth') { add(tx, 'Ethernet src', C.navy); add(rx, 'Ethernet dst', C.navy); }
      else { add(tx, 'transmitter', C.blue); add(rx, 'receiver', C.orange); }
      if (tx !== src) add(src, 'orig. source', C.green);
      if (rx !== dst) add(dst, 'final dest.', C.green);
      Object.keys(tags).forEach(function (n) {
        var x = P[n][0], y = P[n][1], ap_ = n.slice(0, 2) === 'AP';
        tags[n].forEach(function (t, i) { tag(x + (ap_ ? (n === 'AP1' ? -10 : 10) : 0), ap_ ? y + 50 + i * 32 : y + 64 + i * 32, t[0], t[1]); });
      });
      // moving frame
      var T = 2200, f = ((now - st.t0) % (T + 600)) / T; if (f > 1) f = 1;
      var p = along(trim(hp.act), f);
      g.fillStyle = '#fff'; g.strokeStyle = acol; g.lineWidth = 3;
      g.beginPath(); g.rect(p[0] - 22, p[1] - 15, 44, 30); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(p[0] - 22, p[1] - 15); g.lineTo(p[0], p[1] + 2); g.lineTo(p[0] + 22, p[1] - 15); g.stroke();
      g.fillStyle = acol; g.font = '600 20px ' + MONO; var ap0 = trim(hp.act), side = Math.abs(ap0[1][0] - ap0[0][0]) < Math.abs(ap0[1][1] - ap0[0][1]);
      g.textAlign = side ? 'left' : 'center'; g.textBaseline = 'alphabetic';
      if (k === 'eth') { g.textAlign = 'center'; g.fillText('ordinary Ethernet frame AP1 → AP2', 540, 186); }
      else g.fillText('To/From ' + st.td + st.fd, p[0] + (side ? 32 : 0), p[1] + (side ? 6 : -24));
      // caption
      g.textAlign = 'left'; g.font = '600 22px ' + SANS; g.fillStyle = C.navy;
      g.fillText(k === 'eth' ? 'Hop: AP1 → AP2 on the wired DS' : 'Radio hop: ' + tx + ' → ' + rx + (k === '00' ? '' : '   (end to end: A → B)'), 16, 34);
    }

    function loop() { requestAnimationFrame(function fr(now) { if (!root.isConnected) return; draw(now); requestAnimationFrame(fr); }); }
    sync(); draw(performance.now()); loop();
  });
})();
