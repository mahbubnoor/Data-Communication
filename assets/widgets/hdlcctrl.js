/* Try it: build an HDLC control field (Lecture 12, after slide "hdlcctrl"). Slides "hdlcframe", "hdlcctrl", "hdlcex".
   Bit order follows the slide and the ARQ Lab: bit 1 (first sent) on the left, each number written most significant bit first. */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;

  // S-frame codes and U-frame commands exactly as on the slide / ARQ Lab tab 4
  var SCODES = [['00', 'RR', 'receive ready: ACK up to N(R)\u00a0−\u00a01'], ['10', 'RNR', 'ACK, but stop: receiver busy'],
    ['01', 'REJ', 'NAK for Go-Back-N: resend from N(R)'], ['11', 'SREJ', 'NAK for Selective Repeat: resend N(R) only']];
  var UCODES = [['11', '100', 'SABM', 'set async. balanced mode'], ['00', '110', 'UA', 'unnumbered ACK'],
    ['00', '010', 'DISC', 'disconnect'], ['00', '001', 'SNRM', 'set normal resp. mode'], ['11', '000', 'DM', 'disconnected mode']];

  function b3(n) { return D.bin(Math.max(0, Math.min(7, n | 0)), 3); }
  // pure: build the 8 bits
  function encode(f) {
    var p = f.pf ? '1' : '0';
    if (f.type === 'I') return '0' + b3(f.ns) + p + b3(f.nr);
    if (f.type === 'S') return '10' + f.scode + p + b3(f.nr);
    var u = UCODES.filter(function (x) { return x[2] === f.ucmd; })[0];
    return '11' + u[0] + p + u[1];
  }
  // pure: decode 8 bits (string). Returns null-like {valid:false} for bad input.
  function decode(s) {
    if (!/^[01]{8}$/.test(s)) return { valid: false, why: /[^01\s]/.test(s) ? 'only 0 and 1 allowed' : 'need 8 bits, got ' + s.replace(/\s/g, '').length };
    var pf = +s[4];
    if (s[0] === '0') {
      var ns = parseInt(s.slice(1, 4), 2), nr = parseInt(s.slice(5), 2);
      return { valid: true, known: true, type: 'I', ns: ns, nr: nr, pf: pf, groups: [[0, 1, 'I'], [1, 4, 'N(S)'], [4, 5, 'P/F'], [5, 8, 'N(R)']],
        name: 'I-frame', words: 'I-frame · N(S) = ' + ns + ' · P/F = ' + pf + ' · N(R) = ' + nr, say: '“this is my frame ' + ns + '; I expect your frame ' + nr + ' next”' };
    }
    if (s[1] === '0') {
      var code = s.slice(2, 4), sc = SCODES.filter(function (x) { return x[0] === code; })[0], nr2 = parseInt(s.slice(5), 2);
      var say = { RR: '“I have your frames up to ' + ((nr2 + 7) % 8) + '; send ' + nr2 + ' next”', RNR: '“got up to ' + ((nr2 + 7) % 8) + ', but I am busy: stop sending”',
        REJ: '“frame ' + nr2 + ' is bad: go back and resend from ' + nr2 + '”', SREJ: '“resend frame ' + nr2 + ' only”' }[sc[1]];
      return { valid: true, known: true, type: 'S', scode: code, sname: sc[1], nr: nr2, pf: pf, groups: [[0, 2, 'S'], [2, 4, 'code'], [4, 5, 'P/F'], [5, 8, 'N(R)']],
        name: 'S-frame ' + sc[1], words: 'S-frame · ' + sc[1] + ' · P/F = ' + pf + ' · N(R) = ' + nr2, say: say };
    }
    var c1 = s.slice(2, 4), c2 = s.slice(5), uc = UCODES.filter(function (x) { return x[0] === c1 && x[1] === c2; })[0];
    return { valid: true, known: !!uc, type: 'U', c1: c1, c2: c2, uname: uc ? uc[2] : null, pf: pf, groups: [[0, 2, 'U'], [2, 4, 'code'], [4, 5, 'P/F'], [5, 8, 'code']],
      name: uc ? 'U-frame ' + uc[2] : 'U-frame (code not in the table)', words: 'U-frame · ' + (uc ? uc[2] : 'code ' + c1 + ' · ' + c2) + ' · P/F = ' + pf,
      say: uc ? '“' + uc[3] + '”' : 'not one of the five commands on the slide' };
  }

  // Example 11.6 (Figure 11.19) as on slide "hdlcex". dir: 1 = top lane → bottom lane
  var SCEN = {
    ok: { lanes: ['Node A', 'Node B'], frames: [
      { l: 'SABM', f: { type: 'U', ucmd: 'SABM', pf: 1 }, d: 1, cap: 'A → B: SABM (P = 1): “let us start, balanced mode” (Example 11.5).' },
      { l: 'UA', f: { type: 'U', ucmd: 'UA', pf: 1 }, d: -1, cap: 'B → A: UA (F = 1): “accepted”. The link is up.' },
      { l: 'I 0,0', f: { type: 'I', ns: 0, nr: 0, pf: 0 }, d: 1, cap: 'A → B: I-frame 0. N(R) = 0: A has received nothing from B yet.' },
      { l: 'I 1,0', f: { type: 'I', ns: 1, nr: 0, pf: 0 }, d: 1, cap: 'A → B: I-frame 1, still N(R) = 0.' },
      { l: 'I 0,2', f: { type: 'I', ns: 0, nr: 2, pf: 0 }, d: -1, cap: 'B → A: B\'s own frame 0 carries N(R) = 2: “got your 0 and 1” (piggybacked ACK).' },
      { l: 'I 1,2', f: { type: 'I', ns: 1, nr: 2, pf: 0 }, d: -1, cap: 'B → A: I-frame 1, N(R) still 2.' },
      { l: 'I 2,2', f: { type: 'I', ns: 2, nr: 2, pf: 0 }, d: -1, cap: 'B → A: I-frame 2, N(R) still 2.' },
      { l: 'RR 3', f: { type: 'S', scode: '00', nr: 3, pf: 0 }, d: 1, cap: 'A → B: A has no data, so the ACK goes in an S-frame: RR 3 = “got 0, 1, 2; send 3 next”.' },
      { l: 'DISC', f: { type: 'U', ucmd: 'DISC', pf: 1 }, d: 1, cap: 'A → B: DISC (P = 1): “disconnect”.' },
      { l: 'UA', f: { type: 'U', ucmd: 'UA', pf: 1 }, d: -1, cap: 'B → A: UA (F = 1): the link is closed.' }] },
    lost: { lanes: ['Node B', 'Node A'], frames: [
      { l: 'I 0', f: { type: 'I', ns: 0, nr: 0, pf: 0 }, d: 1, cap: 'B → A: I-frame 0 (N(R) = 0: B has received no data from A). Accepted.' },
      { l: 'I 1', f: { type: 'I', ns: 1, nr: 0, pf: 0 }, d: 1, lost: true, cap: 'B → A: I-frame 1 is lost on the link.' },
      { l: 'I 2', f: { type: 'I', ns: 2, nr: 0, pf: 0 }, d: 1, disc: true, cap: 'B → A: I-frame 2 arrives out of order; Go-Back-N: A discards it.' },
      { l: 'REJ 1', f: { type: 'S', scode: '01', nr: 1, pf: 0 }, d: -1, cap: 'A → B: REJ 1: confirms frame 0 and asks for 1 and everything after it.' },
      { l: 'I 1', f: { type: 'I', ns: 1, nr: 0, pf: 0 }, d: 1, re: true, cap: 'B → A: I-frame 1 resent.' },
      { l: 'I 2', f: { type: 'I', ns: 2, nr: 0, pf: 0 }, d: 1, re: true, cap: 'B → A: I-frame 2 resent.' },
      { l: 'RR 3', f: { type: 'S', scode: '00', nr: 3, pf: 0 }, d: -1, cap: 'A → B: RR 3: frames 0, 1, 2 all accepted.' }] }
  };

  var FCOL = { I: C.navy, S: C.navy, U: C.navy, 'N(S)': C.blue, code: C.blue, 'P/F': C.gray, 'N(R)': C.orange };

  D.register('hdlcctrl', function (root) {
    var st = { type: 'S', ns: 3, nr: 1, pf: 0, scode: '01', ucmd: 'SABM', bits: '10010001', scen: 'lost', pick: 3 };
    var seq = D.canvas(1060, 250), hits = [];
    var bitsBox = h('div', { style: 'display:flex;gap:26px;align-items:flex-end;justify-content:center;height:140px' });
    var words = h('div', { style: 'font:600 30px ' + D.MONO + ';color:' + C.navy + ';text-align:center' });
    var sayEl = h('div', { style: 'font:500 24px ' + D.SANS + ';color:' + C.gray + ';text-align:center;min-height:30px' });
    var typeSeg = D.seg([['I', 'I-frame'], ['S', 'S-frame'], ['U', 'U-frame']], st.type, function (k) { st.type = k; build(); });
    var nsSl = D.slider('N(S)', 0, 7, 1, st.ns, function (v) { return v + ' = ' + D.bin(v, 3); }, function (v) { st.ns = v; build(); });
    var nrSl = D.slider('N(R)', 0, 7, 1, st.nr, function (v) { return v + ' = ' + D.bin(v, 3); }, function (v) { st.nr = v; build(); });
    var sSeg = D.seg(SCODES.map(function (x) { return [x[0], x[1] + ' ' + x[0]]; }), st.scode, function (k) { st.scode = k; build(); });
    var uSeg = D.seg(UCODES.map(function (x) { return [x[2], x[2]]; }), st.ucmd, function (k) { st.ucmd = k; build(); });
    var pfSeg = D.seg([['0', 'P/F = 0'], ['1', 'P/F = 1']], '0', function (k) { st.pf = +k; build(); });
    [nsSl, nrSl].forEach(function (s) { s.el.style.width = '300px'; });
    var ctlRow = h('div', { style: 'display:flex;gap:22px;align-items:center;flex-wrap:nowrap;min-height:86px' });
    var inp = h('input', { cls: 'w-in', spellcheck: 'false', maxlength: '11', 'aria-label': 'Eight control bits to decode', style: 'box-sizing:border-box;width:100%;font-family:' + D.MONO + ';font-size:30px;letter-spacing:4px' });
    var verdict = h('div', { cls: 'w-verdict' });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var tab = h('div');
    var cap = h('p', { cls: 'w-note', style: 'font-size:22px;color:' + C.ink + ';min-height:30px;margin:0' });
    var scenSeg = D.seg([['ok', 'No error: piggybacking'], ['lost', 'Frame 1 lost: REJ']], st.scen, function (k) { st.scen = k; st.pick = -1; drawSeq(); cap.textContent = 'Click a frame to load its control field.'; });

    var P = [['0 011 0 101', '00110101'], ['REJ 1', '10010001'], ['10 00 1 100', '10001100'], ['SABM', '11110100'], ['UA', '11000110']];
    var preBox = h('div', { cls: 'w-btns', style: 'flex-wrap:wrap;gap:8px' });
    P.forEach(function (p) { var pb; preBox.appendChild(pb = btn(p[0], function () { st.pick = -1; setBits(p[1], true); drawSeq(); cap.textContent = 'Click a frame to load its control field.'; })); pb.style.whiteSpace = 'nowrap'; });

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:20px;width:1664px;align-items:stretch' }, [
      h('div', { cls: 'w-col', style: 'width:1084px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px;padding:14px 22px' }, [
          h('div', { style: 'display:flex;gap:22px;align-items:center' }, [typeSeg.el, pfSeg.el]), ctlRow, bitsBox, words, sayEl]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 12px' }, [
          h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:0 10px' }, [h('h4', { text: 'Example 11.6: click a frame', style: 'margin:0' }), scenSeg.el]),
          seq.c, h('div', { style: 'padding:0 10px' }, [cap,
            h('p', { cls: 'w-note', style: 'margin:4px 0 0', text: 'Blue = I-frame · orange = S-frame · navy = U-frame · grey = discarded · dashed = resent · ✕ = lost' })])])]),
      h('div', { cls: 'w-col', style: 'width:560px;min-width:0;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px' }, [h('h4', { text: 'Decode: type 8 bits' }), inp, verdict, preBox]),
        h('div', { cls: 'w-card', style: 'flex:1;gap:10px' }, [h('h4', { text: 'Field by field' }), form, tab])])]));

    inp.addEventListener('input', function () {
      var s = inp.value.replace(/\s/g, '');
      st.pick = -1; drawSeq(); cap.textContent = 'Click a frame to load its control field.';
      if (/^[01]{8}$/.test(s)) setBits(s, false); else showInvalid(inp.value);
    });

    function syncCtl() {
      typeSeg.set(st.type); pfSeg.set(String(st.pf)); nsSl.set(st.ns); nrSl.set(st.nr); sSeg.set(st.scode); uSeg.set(st.uknown === false ? '' : st.ucmd);
      ctlRow.innerHTML = '';
      if (st.type === 'I') { ctlRow.appendChild(nsSl.el); ctlRow.appendChild(nrSl.el); }
      else if (st.type === 'S') { ctlRow.appendChild(sSeg.el); ctlRow.appendChild(nrSl.el); }
      else ctlRow.appendChild(uSeg.el);
    }
    function build() { st.uknown = true; st.bits = encode(st); st.pick = -1; drawSeq(); cap.textContent = 'Click a frame to load its control field.'; render(true); }
    // load bits from outside (preset, typing, clicking a bit, sequence frame)
    function setBits(s, writeInp) {
      st.bits = s; var d = decode(s);
      st.type = d.type; st.pf = d.pf;
      if (d.type === 'I') { st.ns = d.ns; st.nr = d.nr; }
      if (d.type === 'S') { st.scode = d.scode; st.nr = d.nr; }
      st.uknown = d.type === 'U' ? d.known : true;
      if (d.type === 'U' && d.known) st.ucmd = d.uname;
      render(writeInp);
    }
    function showInvalid(raw) {
      var d = decode(raw.replace(/\s/g, ''));
      verdict.className = 'w-verdict bad'; verdict.textContent = 'Invalid: ' + d.why;
      bitsBox.style.opacity = '0.3'; words.style.color = C.red; words.textContent = 'invalid: not a control field'; sayEl.textContent = 'boxes show the last valid field';
    }
    function bitBox(c, i) {
      return h('button', { type: 'button', cls: 'w-bit', 'aria-label': 'bit ' + (i + 1) + ' = ' + c, title: 'click to flip',
        style: 'width:78px;height:96px;font-size:46px;' + (c === '1' ? 'background:#fff' : 'background:#fff'), onclick: function () {
          var s = st.bits.split(''); s[i] = s[i] === '1' ? '0' : '1'; st.pick = -1; drawSeq(); cap.textContent = 'Click a frame to load its control field.'; setBits(s.join(''), true); } }, [c]);
    }
    function render(writeInp) {
      var d = decode(st.bits);
      syncCtl(); bitsBox.style.opacity = '1'; words.style.color = C.navy;
      if (writeInp) inp.value = st.bits;
      bitsBox.innerHTML = '';
      d.groups.forEach(function (g) {
        var col = FCOL[g[2]], kids = [];
        for (var i = g[0]; i < g[1]; i++) {
          var b = bitBox(st.bits[i], i);
          b.style.borderColor = col; b.style.color = col; b.style.borderWidth = '3px';
          if (g[2] === 'I' || g[2] === 'S' || g[2] === 'U') { b.style.background = C.navy; b.style.color = '#f5f3ee'; }
          kids.push(b);
        }
        bitsBox.appendChild(h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:6px' }, [
          h('div', { style: 'display:flex;gap:6px' }, kids),
          h('div', { style: 'height:6px;align-self:stretch;border-radius:3px;background:' + col }),
          h('div', { text: g[2] === 'I' || g[2] === 'S' || g[2] === 'U' ? 'type' : g[2], style: 'font:600 22px ' + D.SANS + ';color:' + col })]));
      });
      words.textContent = d.words;
      sayEl.textContent = d.say;
      verdict.className = 'w-verdict ' + (d.known ? 'ok' : 'warn');
      verdict.textContent = d.known ? d.name + ' ✓' : 'U-frame: ' + d.c1 + ' · ' + d.c2 + ' is not on the slide\'s list';
      var f;
      function L(a, v, r) { return (a + '          ').slice(0, 10) + (v + '      ').slice(0, 6) + '→ ' + r + '\n'; }
      if (d.type === 'I') {
        f = L('bit 1', '0', '<b>I-frame</b>') + L('bits 2–4', st.bits.slice(1, 4), 'N(S) = ' + st.bits.slice(1, 4) + '₂ = <b>' + d.ns + '</b>') +
          L('bit 5', String(d.pf), 'P/F = <b>' + d.pf + '</b>') + L('bits 6–8', st.bits.slice(5), 'N(R) = ' + st.bits.slice(5) + '₂ = <b>' + d.nr + '</b>');
      } else if (d.type === 'S') {
        f = L('bits 1–2', '10', '<b>S-frame</b>') + L('bits 3–4', d.scode, 'code ' + d.scode + ' = <b>' + d.sname + '</b>') +
          L('bit 5', String(d.pf), 'P/F = <b>' + d.pf + '</b>') + L('bits 6–8', st.bits.slice(5), 'N(R) = ' + st.bits.slice(5) + '₂ = <b>' + d.nr + '</b>');
      } else {
        f = L('bits 1–2', '11', '<b>U-frame</b>') + L('bits 3–4', d.c1, 'code part 1') + L('bit 5', String(d.pf), 'P/F = <b>' + d.pf + '</b>') +
          L('bits 6–8', d.c2, 'code ' + d.c1 + ' · ' + d.c2 + ' = <b>' + (d.known ? d.uname : '?') + '</b>');
      }
      f = f.replace(/\n$/, '');
      form.innerHTML = f;
      tab.innerHTML = '';
      var t = h('table', { cls: 'w-tab', style: 'width:100%;font-size:22px;table-layout:fixed' });
      if (d.type === 'U') {
        t.appendChild(h('tr', {}, [h('th', { text: 'Code' }), h('th', { text: 'Name' }), h('th', { text: 'Meaning' })]));
        UCODES.forEach(function (x) { t.appendChild(h('tr', { cls: d.known && x[2] === d.uname ? 'cur' : '' }, [h('td', { text: x[0] + ' P ' + x[1], style: 'font-family:' + D.MONO + ';white-space:nowrap' }), h('td', { text: x[2] }), h('td', { text: x[3], style: 'font:400 22px ' + D.SANS + ';text-align:left;white-space:normal' })])); });
      } else {
        t.appendChild(h('tr', {}, [h('th', { text: 'S code' }), h('th', { text: 'Name' }), h('th', { text: 'Meaning' })]));
        SCODES.forEach(function (x) { t.appendChild(h('tr', { cls: d.type === 'S' && x[0] === d.scode ? 'cur' : '' }, [h('td', { text: x[0], style: 'font-family:' + D.MONO }), h('td', { text: x[1] }), h('td', { text: x[2], style: 'font:400 22px ' + D.SANS + ';text-align:left;white-space:normal' })])); });
      }
      var cg = h('colgroup', {}, [h('col', { style: 'width:' + (d.type === 'U' ? 130 : 92) + 'px' }), h('col', { style: 'width:' + (d.type === 'U' ? 90 : 84) + 'px' }), h('col')]);
      t.insertBefore(cg, t.firstChild);
      tab.appendChild(t);
    }

    function drawSeq() {
      var g = seq.g, W = seq.w, H = seq.h, sc = SCEN[st.scen], n = sc.frames.length;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      var x0 = 150, x1 = W - 30, yT = 40, yB = H - 40, step = (x1 - x0) / n, dx = step * 0.62;
      g.font = '600 22px ' + D.SANS; g.textAlign = 'left'; g.textBaseline = 'middle';
      [[yT, sc.lanes[0]], [yB, sc.lanes[1]]].forEach(function (p) {
        g.fillStyle = C.navy; g.fillText(p[1], 14, p[0]);
        g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - 10, p[0]); g.lineTo(x1, p[0]); g.stroke();
      });
      g.fillStyle = C.gray; g.font = '500 20px ' + D.SANS; g.fillText('time →', 14, H / 2);
      hits = [];
      sc.frames.forEach(function (fr, i) {
        var xs = x0 + i * step + 4, xe = xs + dx, ys = fr.d > 0 ? yT : yB, ye = fr.d > 0 ? yB : yT;
        var col = fr.disc ? '#9aa3ad' : (fr.f.type === 'I' ? C.blue : fr.f.type === 'S' ? C.orange : C.navy);
        var sel = i === st.pick;
        if (fr.lost) { xe = xs + dx * 0.55; ye = ys + (ye - ys) * 0.55; }
        g.strokeStyle = col; g.lineWidth = sel ? 5 : 3; g.setLineDash(fr.re ? [10, 7] : []);
        g.beginPath(); g.moveTo(xs, ys); g.lineTo(xe, ye); g.stroke(); g.setLineDash([]);
        var a = Math.atan2(ye - ys, xe - xs);
        if (fr.lost) {
          g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath();
          g.moveTo(xe - 10, ye - 10); g.lineTo(xe + 10, ye + 10); g.moveTo(xe + 10, ye - 10); g.lineTo(xe - 10, ye + 10); g.stroke();
        } else {
          g.fillStyle = col; g.beginPath(); g.moveTo(xe, ye);
          g.lineTo(xe - 16 * Math.cos(a - 0.4), ye - 16 * Math.sin(a - 0.4)); g.lineTo(xe - 16 * Math.cos(a + 0.4), ye - 16 * Math.sin(a + 0.4)); g.fill();
        }
        // label box at the middle of the full arrow
        var mx = xs + dx * (fr.lost ? 0.3 : 0.5), my = ys + ((fr.d > 0 ? yB : yT) - ys) * (fr.lost ? 0.3 : 0.5);
        g.font = '600 21px ' + D.MONO; var tw = g.measureText(fr.l).width + 16, bh = 32;
        var bx = Math.max(x0 - 6, Math.min(W - tw - 4, mx - tw / 2)), by = my - bh / 2;
        g.fillStyle = sel ? C.light : '#fff'; g.strokeStyle = sel ? C.orange : col; g.lineWidth = sel ? 3 : 2;
        g.beginPath(); g.rect(bx, by, tw, bh); g.fill(); g.stroke();
        g.fillStyle = fr.disc ? C.gray : C.ink; g.textAlign = 'center'; g.fillText(fr.l, bx + tw / 2, my + 1); g.textAlign = 'left';
        hits.push([bx - 6, by - 40, tw + 12, bh + 80, i]);
      });
    }
    seq.c.style.cursor = 'pointer';
    seq.c.addEventListener('click', function (e) {
      var r = seq.c.getBoundingClientRect(), sx = seq.w / r.width, x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sx;
      var best = -1, bd = 1e9;
      hits.forEach(function (hh) { var cx = hh[0] + hh[2] / 2, cy = hh[1] + hh[3] / 2, dd = Math.abs(x - cx) + 0.3 * Math.abs(y - cy); if (x >= hh[0] - 20 && x <= hh[0] + hh[2] + 20 && dd < bd) { bd = dd; best = hh[4]; } });
      if (best < 0) return;
      var fr = SCEN[st.scen].frames[best];
      st.pick = best; drawSeq();
      setBits(encode(Object.assign({ ns: 0, nr: 0, pf: 0, scode: '00', ucmd: 'SABM' }, fr.f)), true);
      cap.textContent = fr.cap + '  Control = ' + st.bits.slice(0, fr.f.type === 'I' ? 1 : 2) + ' ' + st.bits.slice(fr.f.type === 'I' ? 1 : 2, 4) + ' ' + st.bits[4] + ' ' + st.bits.slice(5);
    });

    setBits(st.bits, true); drawSeq();
    var f0 = SCEN.lost.frames[3];
    cap.textContent = f0.cap + '  Control = 10 01 0 001';
  });
  if (typeof module !== 'undefined') module.exports = { encode: encode, decode: decode, SCEN: SCEN };
})();
