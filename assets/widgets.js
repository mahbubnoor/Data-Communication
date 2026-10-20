/* Interactive slides for the Data Communication course: PCM, QAM, Hamming (7,4), CRC, ARQ.
   Each widget mounts into <div data-widget="name"> inside a 1920x1080 slide. Works offline. */
(function () {
  'use strict';
  var C = { bg: '#f5f3ee', panel: '#fbfaf7', ink: '#1d2733', navy: '#16324f', blue: '#2f6db5', sky: '#9fc1e6', orange: '#a64f15',
    orangeL: '#c9752e', gray: '#5b6672', line: '#d5dbe1', grid: '#e6eaef', red: '#c0392b', green: '#3f8f5a', light: '#f0a35e' };
  var SANS = "'IBM Plex Sans',Arial,sans-serif", MONO = "'IBM Plex Mono','Courier New',monospace";
  var W = {};

  /* ---------- helpers ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'style') e.style.cssText = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k === 'cls') e.className = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function canvas(w, hh) {
    var c = h('canvas', { style: 'width:' + w + 'px;height:' + hh + 'px;display:block;border-radius:12px' });
    c.width = w * 2; c.height = hh * 2;
    var g = c.getContext('2d'); g.scale(2, 2);
    return { c: c, g: g, w: w, h: hh };
  }
  function slider(label, min, max, step, val, fmt, on) {
    var v = h('span', { cls: 'val' });
    var r = h('input', { type: 'range', cls: 'w-range', min: min, max: max, step: step, value: val, 'aria-label': label });
    var box = h('div', { cls: 'w-ctl' }, [h('div', { cls: 'lab' }, [h('span', { text: label }), v]), r]);
    function upd() { v.textContent = fmt(+r.value); }
    r.addEventListener('input', function () { upd(); on(+r.value); });
    upd();
    return { el: box, input: r, set: function (x) { r.value = x; upd(); }, get: function () { return +r.value; }, label: v,
      range: function (a, b, s) { r.min = a; r.max = b; if (s) r.step = s; upd(); } };
  }
  function btn(text, on, cls) { return h('button', { type: 'button', cls: 'w-btn' + (cls ? ' ' + cls : ''), text: text, onclick: on }); }
  function seg(items, cur, on) {
    var box = h('div', { cls: 'w-btns', role: 'group' });
    var bs = items.map(function (it) {
      var b = btn(it[1], function () { set(it[0]); on(it[0]); });
      box.appendChild(b); return [it[0], b];
    });
    function set(k) { bs.forEach(function (p) { p[1].classList.toggle('on', p[0] === k); p[1].setAttribute('aria-pressed', p[0] === k); }); }
    set(cur);
    return { el: box, set: set };
  }
  function fx(x, d) { var s = x.toFixed(d); return (x >= 0 ? '+' : '') + s.replace('-', '−'); }
  function fmtN(x, d) { var s = (+x.toFixed(d)).toString(); return s.replace('-', '−'); }
  function bin(v, n) { var s = v.toString(2); while (s.length < n) s = '0' + s; return s; }
  function xor(a, b) { return a === b ? '0' : '1'; }

  /* =====================================================================
     1. PCM: sample, quantise, encode
     ===================================================================== */
  var PCM_PRE = {
    sine: { name: 'Sine wave', mode: 'sine', f: 1, ratio: 10, n: 3, vmin: -1, vmax: 1, cycles: 2 },
    exA: { name: 'Example A', mode: 'sine', f: 1 / (2 * Math.PI), ratio: 7, n: 3, vmin: -1, vmax: 1, cycles: 1, fixedF: true },
    fig: { name: 'Fig. 4.26', mode: 'list', xs: [-6.1, 7.5, 16.2, 19.7, 11.0, -5.5, -11.3, -9.4, -6.0], k0: 1, n: 3, vmin: -20, vmax: 20, fs: null },
    exC: { name: 'Example C', mode: 'list', xs: [4.15, 6.23, 6.91, 5.50, 4.07, 3.87, 3.45, 1.74, 0.42, 1.31], k0: 0, n: 3, vmin: 0, vmax: 8, fs: 1 }
  };
  function pcmQuant(x, vmin, vmax, n) {
    var L = Math.pow(2, n), D = (vmax - vmin) / L;
    x = Math.round(x * 1e9) / 1e9;
    var z = Math.floor((x - vmin) / D + 1e-12); if (z < 0) z = 0; if (z > L - 1) z = L - 1;
    var q = vmin + (z + 0.5) * D;
    return { code: z, word: bin(z, n), q: q, err: q - x, D: D, L: L };
  }
  function pcmSamples(p) {
    if (p.mode === 'list') return p.xs.map(function (x, i) { return { t: p.k0 + i, x: x }; });
    var fs = p.ratio * p.f, T = p.cycles / p.f, out = [];
    for (var k = 0; k / fs <= T + 1e-9 && k < 200; k++) out.push({ t: k / fs, x: Math.round(Math.sin(2 * Math.PI * p.f * k / fs) * 1e9) / 1e9 + 0 });
    return out;
  }
  W.pcm = function (root) {
    var st = JSON.parse(JSON.stringify(PCM_PRE.sine)); var preKey = 'sine';
    var plot = canvas(1060, 430);
    var tableBox = h('div', { style: 'overflow:hidden' });
    var stream = h('p', { cls: 'w-note', style: 'font:500 23px ' + MONO + ';color:#1d2733' });
    var fSl = slider('Signal frequency f', 0.5, 5, 0.5, 1, function (v) { return fmtN(v, 2) + ' Hz'; }, function (v) { st.f = v; draw(); });
    var rSl = slider('Sampling rate fs', 0.5, 20, 0.25, 10, function (v) { return fmtN(v * st.f, 3) + ' /s  (' + fmtN(v, 2) + ' f)'; }, function (v) { st.ratio = v; draw(); });
    var nSl = slider('Bits per sample n', 1, 8, 1, 3, function (v) { return v + ' bits → L = ' + Math.pow(2, v); }, function (v) { st.n = v; draw(); });
    var form = h('div', { cls: 'w-f' }), listNote = h('p', { cls: 'w-note', style: 'display:none' });
    var pre = seg([['sine', 'Sine'], ['exA', 'Example A'], ['fig', 'Fig. 4.26'], ['exC', 'Example C']], 'sine', function (k) {
      preKey = k; st = JSON.parse(JSON.stringify(PCM_PRE[k]));
      fSl.set(st.f); rSl.set(st.ratio || 10); nSl.set(st.n);
      fSl.el.style.display = (st.mode !== 'sine' || st.fixedF) ? 'none' : ''; rSl.el.style.display = st.mode !== 'sine' ? 'none' : '';
      listNote.style.display = st.mode === 'list' ? '' : 'none'; listNote.textContent = st.mode === 'list' ? 'Fixed samples from the textbook example: only n can change.' : '';
      if (st.fixedF) { listNote.style.display = ''; listNote.textContent = 'Example A: s(t) = sin t, so f = 1/(2π) ≈ 0.159 Hz; start at 7 samples per cycle.'; }
      draw();
    });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:28px' }, [
      h('div', { cls: 'w-col', style: 'width:1060px;gap:14px' }, [plot.c, tableBox, stream]),
      h('div', { cls: 'w-col', style: 'width:576px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px' }, [h('h4', { text: 'Signal' }), pre.el]),
        h('div', { cls: 'w-card', style: 'gap:2px;padding-top:12px;padding-bottom:6px' }, [listNote, fSl.el, rSl.el, nSl.el]),
        h('div', { cls: 'w-card' }, [form])])
    ]));

    function draw() {
      var S = pcmSamples(st), n = st.n, Q = S.map(function (s) { return pcmQuant(s.x, st.vmin, st.vmax, n); });
      var L = Q[0].L, D = Q[0].D, g = plot.g, w = plot.w, hh = plot.h;
      var padL = 70, padR = 20, padT = 20, padB = 46;
      var t0, t1;
      if (st.mode === 'sine') { t0 = 0; t1 = st.cycles / st.f; } else { t0 = S[0].t - 0.5; t1 = S[S.length - 1].t + 0.5; }
      var X = function (t) { return padL + (t - t0) / (t1 - t0) * (w - padL - padR); };
      var span = st.vmax - st.vmin, Y = function (v) { return padT + (st.vmax + span * 0.04 - v) / (span * 1.08) * (hh - padT - padB); };
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      // zones
      g.font = '500 20px ' + MONO; g.textBaseline = 'middle';
      for (var i = 0; i <= L; i++) {
        var y = Y(st.vmin + i * D);
        if (L <= 64 || i === 0 || i === L) {
          g.strokeStyle = (i === 0 || i === L) ? C.gray : '#c9d1d9'; g.setLineDash(i === 0 || i === L ? [] : [6, 6]);
          g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke(); g.setLineDash([]);
        }
        if (i < L && L <= 16) { g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(bin(i, n), padL - 8, Y(st.vmin + (i + 0.5) * D)); }
      }
      if (L > 16) { g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(fmtN(st.vmax, 1), padL - 8, Y(st.vmax)); g.fillText(fmtN(st.vmin, 1), padL - 8, Y(st.vmin)); }
      // zero line
      if (st.vmin < 0 && st.vmax > 0) { g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(padL, Y(0)); g.lineTo(w - padR, Y(0)); g.stroke(); }
      // signal
      g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath();
      if (st.mode === 'sine') {
        for (var px = 0; px <= 600; px++) { var tt = t0 + (t1 - t0) * px / 600, yy = Y(Math.sin(2 * Math.PI * st.f * tt)); px ? g.lineTo(X(tt), yy) : g.moveTo(X(tt), yy); }
      } else {
        g.setLineDash([8, 7]);
        for (var a = 0; a < S.length - 1; a++) {
          var p0 = S[Math.max(0, a - 1)], p1 = S[a], p2 = S[a + 1], p3 = S[Math.min(S.length - 1, a + 2)];
          for (var u = 0; u <= 20; u++) {
            var s = u / 20, s2 = s * s, s3 = s2 * s;
            var v = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3);
            var tx = p1.t + s * (p2.t - p1.t);
            (a === 0 && u === 0) ? g.moveTo(X(tx), Y(v)) : g.lineTo(X(tx), Y(v));
          }
        }
      }
      g.stroke(); g.setLineDash([]);
      // alias
      var aliasNote = '';
      if (st.mode === 'sine') {
        var fs = st.ratio * st.f, m = Math.round(st.f / fs), fa = st.f - m * fs;
        if (st.ratio < 2 - 1e-9) {
          g.strokeStyle = C.red; g.lineWidth = 3; g.setLineDash([12, 8]); g.beginPath();
          for (var q = 0; q <= 600; q++) { var t2 = t0 + (t1 - t0) * q / 600, y2 = Y(Math.sin(2 * Math.PI * fa * t2)); q ? g.lineTo(X(t2), y2) : g.moveTo(X(t2), y2); }
          g.stroke(); g.setLineDash([]);
          aliasNote = fmtN(Math.abs(fa), 3);
        }
      }
      // staircase, error bars, dots
      g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath();
      S.forEach(function (s, k) {
        var tEnd = k < S.length - 1 ? S[k + 1].t : Math.min(t1, s.t + (S.length > 1 ? S[1].t - S[0].t : 1));
        if (st.mode === 'list') tEnd = s.t + 0.5;
        var tSt = st.mode === 'list' ? s.t - 0.5 : s.t;
        g.moveTo(X(tSt), Y(Q[k].q)); g.lineTo(X(tEnd), Y(Q[k].q));
      });
      g.stroke();
      S.forEach(function (s, k) {
        g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(X(s.t), Y(s.x)); g.lineTo(X(s.t), Y(Q[k].q)); g.stroke();
        g.fillStyle = C.orange; g.beginPath(); g.arc(X(s.t), Y(Q[k].q), 6, 0, 7); g.fill();
        g.fillStyle = C.red; g.beginPath(); g.arc(X(s.t), Y(s.x), 7, 0, 7); g.fill();
      });
      // axis label + legend
      g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(st.mode === 'sine' ? 'time (s): 0 to ' + fmtN(t1, 2) : 'sample number k', padL, hh - 14);
      g.textAlign = 'right';
      g.fillText('blue: signal · red: samples · orange: quantised' + (aliasNote ? ' · red dashed: alias' : ''), w - padR, hh - 14);
      if (aliasNote) {
        g.font = '600 24px ' + SANS; g.textAlign = 'left'; var msg = 'fs < 2f: the samples now trace a ' + aliasNote + ' Hz wave', mw = g.measureText(msg).width;
        g.fillStyle = 'rgba(251,250,247,.92)'; g.fillRect(padL + 4, hh - padB - 40, mw + 16, 34); g.fillStyle = C.red; g.fillText(msg, padL + 12, hh - padB - 15);
      }
      // table (first 10 samples)
      var K = Math.min(10, S.length), rows = [['Sample', function (k) { return fx(S[k].x, st.vmax >= 10 ? 1 : 2); }],
        ['Code', function (k) { return Q[k].code; }], ['Word', function (k) { return Q[k].word; }],
        ['Quantised', function (k) { return fx(Q[k].q, D >= 1 ? 2 : 3); }], ['Error', function (k) { return fx(Q[k].err, D >= 1 ? 2 : 3); }]];
      var html = '<table class="w-tab" style="width:100%"><tr><th class="rh">k</th>';
      for (var c = 0; c < K; c++) html += '<th>' + (st.mode === 'list' ? S[c].t : c) + '</th>';
      html += '</tr>';
      rows.forEach(function (r) { html += '<tr><td class="rh">' + r[0] + '</td>'; for (var c2 = 0; c2 < K; c2++) html += '<td>' + r[1](c2) + '</td>'; html += '</tr>'; });
      html += '</table>';
      tableBox.innerHTML = html;
      var words = Q.map(function (x) { return x.word; });
      stream.textContent = 'Bit stream: ' + words.slice(0, 12).join(' ') + (words.length > 12 ? ' …' : '') + '   (' + S.length + ' samples × ' + n + ' bits = ' + S.length * n + ' bits)'
        + (S.length > K ? '   · table shows the first ' + K : '');
      // formulas
      var maxErr = Math.max.apply(null, Q.map(function (x) { return Math.abs(x.err); }));
      var unit = ' V', f = '';
      f += 'L = 2ⁿ = 2^' + n + ' = <b>' + L + '</b> levels\n';
      f += 'Δ = (Vmax − Vmin)/L = ' + fmtN(span, 2) + '/' + L + ' = <b>' + fmtN(D, 4) + unit + '</b>\n';
      f += '|error| ≤ Δ/2 = ' + fmtN(D / 2, 4) + unit + ' (max seen ' + fmtN(maxErr, 3) + ')\n';
      if (st.mode === 'sine') {
        var fsv = st.ratio * st.f, okN = st.ratio >= 2 - 1e-9;
        f += 'fs = ' + fmtN(fsv, 3) + ' /s, 2f = ' + fmtN(2 * st.f, 3) + '  <span class="' + (okN ? 'ok' : 'bad') + '">' + (okN ? (Math.abs(st.ratio - 2) < 1e-9 ? '= 2f: on the edge' : '≥ 2f ✓') : '< 2f: aliasing ✗') + '</span>\n';
        f += 'Bit rate = fs × n = ' + fmtN(fsv, 3) + ' × ' + n + ' = <b>' + fmtN(fsv * n, 3) + ' bps</b>\n';
      } else if (st.fs) {
        f += 'fs = ' + st.fs + ' sample/s (from the example)\n';
        f += 'Bit rate = fs × n = ' + st.fs + ' × ' + n + ' = <b>' + st.fs * n + ' bps</b>\n';
      } else {
        f += 'fs is not given in the figure\n';
        f += 'Bits = samples × n = ' + S.length + ' × ' + n + ' = <b>' + S.length * n + ' bits</b>\n';
      }
      f += 'SQNR ≈ 6.02n + 1.76 = <b>' + fmtN(6.02 * n + 1.76, 1) + ' dB</b>';
      form.innerHTML = f;
    }
    pre.set('sine'); draw();
  };

  /* =====================================================================
     2. QAM: bits -> symbols -> constellation -> modulated signal
     ===================================================================== */
  var G2 = { '00': -3, '01': -1, '11': 1, '10': 3 };
  var G3 = { '000': -7, '001': -5, '011': -3, '010': -1, '110': 1, '111': 3, '101': 5, '100': 7 };
  var QAM = {
    4: { r: 2, map: function (b) { return { I: b[0] === '1' ? 1 : -1, Q: b[1] === '1' ? 1 : -1 }; },
      rule: '1st bit → I, 2nd bit → Q: 1 = +1, 0 = −1' },
    8: { r: 3, map: function (b) {
        var ph = { '00': 0, '01': 90, '10': 180, '11': 270 }[b.slice(0, 2)], A = b[2] === '1' ? 2 : 1;
        return { I: Math.round(A * Math.cos(ph * Math.PI / 180)), Q: Math.round(A * Math.sin(ph * Math.PI / 180)) };
      }, rule: 'Bits 1–2 → phase (00 0°, 01 90°, 10 180°, 11 270°); bit 3 → amplitude (0 → 1, 1 → 2)' },
    16: { r: 4, map: function (b) { return { I: G2[b.slice(0, 2)], Q: G2[b.slice(2, 4)] }; },
      rule: 'Bits 1–2 → I, bits 3–4 → Q (Gray): 00 → −3, 01 → −1, 11 → +1, 10 → +3' },
    64: { r: 6, map: function (b) { return { I: G3[b.slice(0, 3)], Q: G3[b.slice(3, 6)] }; },
      rule: 'Bits 1–3 → I, bits 4–6 → Q (Gray): 000 → −7, 001 → −5, 011 → −3, 010 → −1, 110 → +1, 111 → +3, 101 → +5, 100 → +7' }
  };
  function qamSym(M, bits) {
    var p = QAM[M].map(bits), A = Math.sqrt(p.I * p.I + p.Q * p.Q), ph = Math.atan2(p.Q, p.I) * 180 / Math.PI;
    if (ph < 0) ph += 360; ph = Math.round(ph * 10) / 10;
    return { bits: bits, I: p.I, Q: p.Q, A: A, ph: ph };
  }
  function fmtA(A) { return Math.abs(A - Math.round(A)) < 1e-9 ? String(Math.round(A)) : A.toFixed(3); }
  W.qam = function (root) {
    var st = { M: 4, bits: '100110110101', cur: 0, playing: false, noise: false, snr: 15, N: 12, iq: false, pick: null };
    var con = canvas(470, 470), wave = canvas(1150, 250);
    var inp = h('input', { cls: 'w-in', value: st.bits, 'aria-label': 'Bits to send', spellcheck: 'false', style: 'flex:1' });
    var presetSel = h('select', { cls: 'w-sel', 'aria-label': 'Example bit strings' }, [
      h('option', { value: '', text: 'Examples…' }),
      h('option', { value: '100110110101', text: 'Example C, first 12 bits' }),
      h('option', { value: '100110110101100011011001000001', text: 'Example C, all 30 bits' }),
      h('option', { value: '000110110001101100011011', text: '4-QAM: every dibit' }),
      h('option', { value: 'rand', text: 'Random 24 bits' })]);
    var chips = h('div', { cls: 'w-chips' });
    var detail = h('div', { cls: 'w-f' }), rule = h('p', { cls: 'w-note' }), rate = h('div', { cls: 'w-f' });
    var ser = h('p', { cls: 'w-note', style: 'min-height:30px' });
    var playB = btn('▶ Play', togglePlay, 'acc');
    var scheme = seg([[4, '4-QAM'], [8, '8-QAM'], [16, '16-QAM'], [64, '64-QAM']], 4, function (m) { st.M = m; st.cur = 0; st.pick = null; mkCloud(); draw(); });
    var nSl = slider('Bit rate N', 1, 64, 1, 12, function (v) { return v + ' kbps'; }, function (v) { st.N = v; draw(); });
    var snrSl = slider('Noise: SNR', 3, 30, 1, 15, function (v) { return st.noise ? v + ' dB' : 'off'; }, function (v) { st.snr = v; mkCloud(); draw(); });
    var noiseB = btn('Add noise', function () { st.noise = !st.noise; noiseB.classList.toggle('on', st.noise); snrSl.set(st.snr); mkCloud(); draw(); });
    var iqB = btn('Show I and Q carriers', function () { st.iq = !st.iq; iqB.classList.toggle('on', st.iq); draw(); });
    inp.addEventListener('input', function () {
      var v = inp.value.replace(/[^01]/g, '').slice(0, 48); if (v !== inp.value) inp.value = v; st.bits = v; st.cur = 0; st.pick = null; mkCloud(); draw();
    });
    presetSel.addEventListener('change', function () {
      var v = presetSel.value; if (!v) return;
      if (v === 'rand') { v = ''; for (var i = 0; i < 24; i++) v += Math.random() < 0.5 ? '0' : '1'; }
      inp.value = v; st.bits = v; st.cur = 0; st.pick = null; presetSel.value = ''; mkCloud(); draw();
    });
    con.c.addEventListener('click', function (e) {
      var r = con.c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * con.w, y = (e.clientY - r.top) / r.height * con.h;
      var best = null, bd = 1e9;
      allPts().forEach(function (p) { var d = Math.hypot(px(p.I) - x, py(p.Q) - y); if (d < bd) { bd = d; best = p; } });
      if (best && bd < 40) {
        var idx = syms().map(function (s) { return s.bits; }).indexOf(best.bits);
        if (idx >= 0) { st.cur = idx; st.pick = null; } else st.pick = best;
        draw();
      }
    });
    root.appendChild(h('div', { cls: 'w-col', style: 'gap:16px' }, [
      h('div', { cls: 'w-row', style: 'align-items:center;gap:16px' }, [scheme.el, inp, presetSel]),
      h('div', { cls: 'w-row', style: 'gap:24px' }, [
        h('div', { cls: 'w-col', style: 'width:470px;gap:10px' }, [con.c, h('div', { cls: 'w-btns' }, [noiseB, iqB]), snrSl.el, ser]),
        h('div', { cls: 'w-col', style: 'width:1150px;gap:12px' }, [
          chips, wave.c,
          h('div', { cls: 'w-row', style: 'gap:20px' }, [
            h('div', { cls: 'w-card', style: 'width:640px;gap:6px' }, [detail, rule]),
            h('div', { cls: 'w-card', style: 'width:490px;gap:4px' }, [
              h('div', { cls: 'w-btns' }, [btn('◀', function () { stop(); st.cur = Math.max(0, st.cur - 1); st.pick = null; draw(); }), playB,
                btn('▶|', function () { stop(); st.cur = Math.min(syms().length - 1, st.cur + 1); st.pick = null; draw(); })]),
              nSl.el, rate])])])])]));

    function padded() { var r = QAM[st.M].r, b = st.bits || '0'; var p = (r - b.length % r) % r; return { s: b + '0'.repeat(p), pad: p }; }
    function syms() { var r = QAM[st.M].r, s = padded().s, out = []; for (var i = 0; i < s.length; i += r) out.push(qamSym(st.M, s.slice(i, i + r))); return out; }
    function allPts() { var r = QAM[st.M].r, out = []; for (var i = 0; i < (1 << r); i++) out.push(qamSym(st.M, bin(i, r))); return out; }
    function lim() { return { 4: 1.6, 8: 2.6, 16: 4.2, 64: 8.4 }[st.M]; }
    function px(I) { return con.w / 2 + I / lim() * (con.w / 2 - 20); }
    function py(Q) { return con.h / 2 - Q / lim() * (con.h / 2 - 20); }
    var cloud = [];
    function gauss() { var u = Math.random() || 1e-9, v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function mkCloud() {
      cloud = []; if (!st.noise) return;
      var pts = allPts(), Es = pts.reduce(function (a, p) { return a + p.I * p.I + p.Q * p.Q; }, 0) / pts.length;
      var sig = Math.sqrt(Es / (2 * Math.pow(10, st.snr / 10)));
      for (var i = 0; i < 400; i++) {
        var p = pts[Math.floor(Math.random() * pts.length)], rx = { I: p.I + sig * gauss(), Q: p.Q + sig * gauss() };
        var best = pts[0], bd = 1e9; pts.forEach(function (c) { var d = (c.I - rx.I) * (c.I - rx.I) + (c.Q - rx.Q) * (c.Q - rx.Q); if (d < bd) { bd = d; best = c; } });
        cloud.push({ I: rx.I, Q: rx.Q, ok: best.bits === p.bits });
      }
    }
    var timer = null;
    function togglePlay() { if (timer) stop(); else { st.pick = null; if (st.cur >= syms().length - 1) st.cur = 0; timer = setInterval(function () { if (st.cur >= syms().length - 1) { stop(); return; } st.cur++; draw(); }, 1300); playB.textContent = '❚❚ Pause'; draw(); } }
    function stop() { if (timer) clearInterval(timer); timer = null; playB.textContent = '▶ Play'; }

    function draw() {
      var S = syms(), P = allPts(), r = QAM[st.M].r, cur = S[Math.min(st.cur, S.length - 1)], g = con.g, used = {};
      S.forEach(function (s) { used[s.bits] = 1; });
      var show = st.pick || cur;
      // ---- constellation
      g.clearRect(0, 0, con.w, con.h); g.fillStyle = C.panel; g.fillRect(0, 0, con.w, con.h);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, con.w - 1, con.h - 1);
      var L = lim(), step = st.M === 64 ? 2 : 1;
      g.strokeStyle = C.grid; g.lineWidth = 1;
      for (var v = -Math.floor(L); v <= Math.floor(L); v += step) { if (!v) continue; g.beginPath(); g.moveTo(px(v), 10); g.lineTo(px(v), con.h - 10); g.stroke(); g.beginPath(); g.moveTo(10, py(v)); g.lineTo(con.w - 10, py(v)); g.stroke(); }
      g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(10, py(0)); g.lineTo(con.w - 10, py(0)); g.moveTo(px(0), 10); g.lineTo(px(0), con.h - 10); g.stroke();
      g.fillStyle = C.gray; g.font = '600 22px ' + SANS; g.textAlign = 'right'; g.fillText('I', con.w - 14, py(0) - 10); g.textAlign = 'left'; g.fillText('Q', px(0) + 10, 30);
      g.font = '500 18px ' + MONO; g.fillStyle = C.gray;
      if (st.M >= 16) [-Math.floor(L), Math.floor(L)].forEach(function (t) { if (st.M === 64 && t % 2 === 0) t += t > 0 ? -1 : 1; g.textAlign = 'center'; g.fillText((t > 0 ? '+' : '−') + Math.abs(t), px(t), py(0) + 24); });
      cloud.forEach(function (p) { g.fillStyle = p.ok ? 'rgba(47,109,181,.35)' : 'rgba(192,57,43,.7)'; g.beginPath(); g.arc(px(p.I), py(p.Q), st.M === 64 ? 2.5 : 3.5, 0, 7); g.fill(); });
      // vector to the shown point
      g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(px(0), py(0)); g.lineTo(px(show.I), py(show.Q)); g.stroke();
      g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(px(show.I), py(show.Q)); g.lineTo(px(show.I), py(0)); g.moveTo(px(show.I), py(show.Q)); g.lineTo(px(0), py(show.Q)); g.stroke(); g.setLineDash([]);
      var rad = 34; g.beginPath(); g.arc(px(0), py(0), rad, 0, -show.ph * Math.PI / 180, true); g.stroke();
      var pr = st.M === 64 ? 7 : 11;
      P.forEach(function (p) {
        var isCur = p.bits === show.bits;
        g.beginPath(); g.arc(px(p.I), py(p.Q), isCur ? pr + 5 : pr, 0, 7);
        if (isCur) { g.fillStyle = C.orange; g.fill(); }
        else if (used[p.bits]) { g.fillStyle = C.light; g.fill(); g.strokeStyle = C.orange; g.lineWidth = 2; g.stroke(); }
        else { g.fillStyle = C.navy; g.fill(); }
        if (st.M <= 16 || isCur) {
          g.font = (isCur ? '700 ' : '500 ') + (st.M === 16 ? 18 : 20) + 'px ' + MONO; g.fillStyle = isCur ? C.orange : C.ink; g.textAlign = 'center';
          var ly = py(p.Q) - pr - 9; if (st.M === 8 && p.Q < 0) ly = py(p.Q) + pr + 22;
          if (st.M === 8 && p.Q === 0) { g.textAlign = p.I > 0 ? 'left' : 'right'; g.fillText(p.bits, px(p.I) + (p.I > 0 ? 1 : -1) * (pr + 4), py(p.Q) - pr - 6); }
          else g.fillText(p.bits, px(p.I), ly);
        }
      });
      // ---- chips
      chips.innerHTML = ''; var pd = padded();
      S.forEach(function (s, k) {
        var isPad = k === S.length - 1 && pd.pad > 0;
        var c = h('button', { type: 'button', cls: 'w-chip' + (k === st.cur && !st.pick ? ' cur' : '') + (isPad ? ' pad' : ''), text: s.bits, title: isPad ? pd.pad + ' padding zero(s) added' : 'symbol ' + k });
        c.addEventListener('click', function () { stop(); st.cur = k; st.pick = null; draw(); });
        chips.appendChild(c);
      });
      // ---- waveform
      var w = wave.g, ww = wave.w, wh = wave.h, n = S.length, x0 = 16, x1 = ww - 16, sw = (x1 - x0) / n, mid = wh / 2 + 2, Amax = Math.max.apply(null, P.map(function (p) { return p.A; }));
      var amp = (wh / 2 - 46) / Amax;
      w.clearRect(0, 0, ww, wh); w.fillStyle = C.panel; w.fillRect(0, 0, ww, wh); w.strokeStyle = C.line; w.lineWidth = 1; w.strokeRect(0.5, 0.5, ww - 1, wh - 1);
      if (!st.pick) { w.fillStyle = '#fbe9da'; w.fillRect(x0 + st.cur * sw, 28, sw, wh - 34); }
      w.strokeStyle = C.grid; w.beginPath(); w.moveTo(x0, mid); w.lineTo(x1, mid); w.stroke();
      w.font = '600 ' + (n > 16 ? 16 : 20) + 'px ' + MONO; w.textAlign = 'center';
      for (var k = 0; k < n; k++) {
        if (k) { w.strokeStyle = '#c9d1d9'; w.setLineDash([4, 5]); w.beginPath(); w.moveTo(x0 + k * sw, 28); w.lineTo(x0 + k * sw, wh - 6); w.stroke(); w.setLineDash([]); }
        w.fillStyle = k === st.cur && !st.pick ? C.orange : C.gray; w.fillText(S[k].bits, x0 + (k + 0.5) * sw, 22);
      }
      var cyc = 2;
      function trace(fn, col, lw) {
        w.strokeStyle = col; w.lineWidth = lw; w.beginPath();
        for (var k2 = 0; k2 < n; k2++) for (var j = 0; j <= 60; j++) {
          var tau = j / 60, X = x0 + (k2 + tau) * sw, Y = mid - fn(S[k2], tau) * amp;
          (k2 === 0 && j === 0) ? w.moveTo(X, Y) : w.lineTo(X, Y);
        }
        w.stroke();
      }
      if (st.iq) {
        trace(function (s, t) { return s.I * Math.cos(2 * Math.PI * cyc * t); }, 'rgba(47,109,181,.55)', 2);
        trace(function (s, t) { return -s.Q * Math.sin(2 * Math.PI * cyc * t); }, 'rgba(63,143,90,.6)', 2);
      }
      trace(function (s, t) { return s.I * Math.cos(2 * Math.PI * cyc * t) - s.Q * Math.sin(2 * Math.PI * cyc * t); }, C.navy, 3);
      w.font = '500 18px ' + SANS; w.textAlign = 'right'; w.fillStyle = C.gray;
      w.fillText(st.iq ? 'navy: s(t) = I·cos(2πfct) − Q·sin(2πfct) · blue: I·cos · green: −Q·sin' : 's(t) = A cos(2πfct + φ), 2 carrier cycles per symbol', x1 - 4, wh - 10);
      // ---- detail
      var lab = st.pick ? 'Point ' + show.bits + ' (not in the message)' : 'Symbol ' + st.cur + ' of ' + n;
      detail.innerHTML = '<b>' + lab + '</b>\nBits ' + show.bits + ' → I = ' + fx(show.I, 0) + ', Q = ' + fx(show.Q, 0) +
        '\nA = √(I² + Q²) = ' + fmtA(show.A) + ',  φ = ' + fmtN(show.ph, 1) + '°' +
        '\nSends <b>' + fmtA(show.A) + ' cos(2πfc t + ' + fmtN(show.ph, 1) + '°)</b>';
      rule.textContent = QAM[st.M].rule + (pd.pad ? ' · ' + pd.pad + ' zero(s) padded to fill the last symbol' : '');
      var Sb = st.N / r;
      rate.innerHTML = 'r = log₂ ' + st.M + ' = ' + r + ' bits/symbol\nS = N / r = ' + st.N + ' / ' + r + ' = <b>' + fmtN(Sb, 3) + ' kbaud</b>\nB = (1 + d) S = <b>' + fmtN(Sb, 3) + ' kHz</b> (d = 0)\n' + (st.bits.length + pd.pad) + ' bits → ' + n + ' symbols';
      if (st.noise) {
        var errs = cloud.filter(function (p) { return !p.ok; }).length;
        ser.innerHTML = '400 noisy symbols at ' + st.snr + ' dB: <b style="color:' + (errs ? C.red : C.green) + '">' + errs + ' decoded wrong (' + fmtN(errs / 4, 1) + '%)</b>';
      } else ser.textContent = 'Click any point to read its bits, amplitude and phase.';
    }
    mkCloud(); draw();
  };

  /* =====================================================================
     3. Hamming (7,4): encode, flip bits, syndrome, correct
     ===================================================================== */
  function hamEnc(a) { // a = [a3,a2,a1,a0]
    var a3 = a[0], a2 = a[1], a1 = a[2], a0 = a[3];
    var r0 = a2 ^ a1 ^ a0, r1 = a3 ^ a2 ^ a1, r2 = a1 ^ a0 ^ a3;
    return [a3, a2, a1, a0, r2, r1, r0];
  }
  var HAM_POS = { '000': -1, '001': 6, '010': 5, '011': 1, '100': 4, '101': 3, '110': 0, '111': 2 };
  var HAM_NAMES = ['b₃', 'b₂', 'b₁', 'b₀', 'q₂', 'q₁', 'q₀'];
  function hamDec(b) {
    var b3 = b[0], b2 = b[1], b1 = b[2], b0 = b[3], q2 = b[4], q1 = b[5], q0 = b[6];
    var s0 = b2 ^ b1 ^ b0 ^ q0, s1 = b3 ^ b2 ^ b1 ^ q1, s2 = b1 ^ b0 ^ b3 ^ q2, syn = '' + s2 + s1 + s0, pos = HAM_POS[syn];
    var c = b.slice(); if (pos >= 0) c[pos] ^= 1;
    return { s0: s0, s1: s1, s2: s2, syn: syn, pos: pos, corr: c, data: c.slice(0, 4) };
  }
  W.hamming = function (root) {
    var st = { a: [0, 1, 1, 1], flip: [0, 0, 0, 0, 0, 0, 0] };
    var dataBox = h('div', { cls: 'w-bits' }), encF = h('div', { cls: 'w-f' }), cwBox = h('div', { cls: 'w-bits' });
    var rxBox = h('div', { cls: 'w-bits' }), synF = h('div', { cls: 'w-f' }), tab = h('div'), fixBox = h('div', { cls: 'w-bits' }), verdict = h('div', { cls: 'w-verdict' });
    root.appendChild(h('div', { cls: 'w-col', style: 'gap:18px' }, [
      h('div', { cls: 'w-btns' }, [
        btn('Slide example: 0111, error in b₂', function () { st.a = [0, 1, 1, 1]; st.flip = [0, 1, 0, 0, 0, 0, 0]; draw(); }),
        btn('Random single error', function () { st.flip = [0, 0, 0, 0, 0, 0, 0]; st.flip[Math.floor(Math.random() * 7)] = 1; draw(); }),
        btn('Two errors', function () { st.flip = [0, 0, 0, 0, 0, 0, 0]; var i = Math.floor(Math.random() * 7), j; do { j = Math.floor(Math.random() * 7); } while (j === i); st.flip[i] = st.flip[j] = 1; draw(); }),
        btn('No errors', function () { st.flip = [0, 0, 0, 0, 0, 0, 0]; draw(); })]),
      h('div', { cls: 'w-row', style: 'gap:22px;align-items:stretch' }, [
        h('div', { cls: 'w-card', style: 'width:500px' }, [h('h4', { text: '1 · Sender: click a data bit' }), dataBox, encF, h('p', { cls: 'w-note', text: 'Codeword a₃a₂a₁a₀ r₂r₁r₀' }), cwBox]),
        h('div', { cls: 'w-card', style: 'width:460px' }, [h('h4', { text: '2 · Channel: click a bit to flip it' }), rxBox,
          h('p', { cls: 'w-note', text: 'Received b₃b₂b₁b₀ q₂q₁q₀. Red = changed by noise.' })]),
        h('div', { cls: 'w-card', style: 'width:660px' }, [h('h4', { text: '3 · Receiver: syndrome → correct' }), synF, tab,
          h('p', { cls: 'w-note', text: 'After correction (green = flipped back):' }), fixBox, verdict])])]));
    function bitBtn(v, name, cls, on) {
      var b = h('button', { type: 'button', cls: 'w-bit ' + (cls || ''), 'aria-label': name + ' = ' + v }, [String(v), h('small', { text: name })]);
      if (on) b.addEventListener('click', on); else b.classList.add('ro');
      return b;
    }
    function draw() {
      var a = st.a, cw = hamEnc(a), rx = cw.map(function (v, i) { return v ^ st.flip[i]; }), d = hamDec(rx);
      dataBox.innerHTML = '';
      ['a₃', 'a₂', 'a₁', 'a₀'].forEach(function (nm, i) { dataBox.appendChild(bitBtn(a[i], nm, '', function () { st.a[i] ^= 1; draw(); })); });
      encF.innerHTML = 'r₀ = a₂⊕a₁⊕a₀ = ' + a[1] + '⊕' + a[2] + '⊕' + a[3] + ' = <b>' + cw[6] + '</b>\nr₁ = a₃⊕a₂⊕a₁ = ' + a[0] + '⊕' + a[1] + '⊕' + a[2] + ' = <b>' + cw[5] + '</b>\nr₂ = a₁⊕a₀⊕a₃ = ' + a[2] + '⊕' + a[3] + '⊕' + a[0] + ' = <b>' + cw[4] + '</b>';
      cwBox.innerHTML = ''; cw.forEach(function (v, i) { cwBox.appendChild(bitBtn(v, ['a₃', 'a₂', 'a₁', 'a₀', 'r₂', 'r₁', 'r₀'][i], i > 3 ? 'chk' : '')); });
      rxBox.innerHTML = ''; rx.forEach(function (v, i) { rxBox.appendChild(bitBtn(v, HAM_NAMES[i], (st.flip[i] ? 'err' : (i > 3 ? 'chk' : '')), function () { st.flip[i] ^= 1; draw(); })); });
      synF.innerHTML = 's₀ = b₂⊕b₁⊕b₀⊕q₀ = ' + rx[1] + '⊕' + rx[2] + '⊕' + rx[3] + '⊕' + rx[6] + ' = <b>' + d.s0 + '</b>\ns₁ = b₃⊕b₂⊕b₁⊕q₁ = ' + rx[0] + '⊕' + rx[1] + '⊕' + rx[2] + '⊕' + rx[5] + ' = <b>' + d.s1 + '</b>\ns₂ = b₁⊕b₀⊕b₃⊕q₂ = ' + rx[2] + '⊕' + rx[3] + '⊕' + rx[0] + '⊕' + rx[4] + ' = <b>' + d.s2 + '</b>\nSyndrome s₂s₁s₀ = <b>' + d.syn + '</b>';
      var keys = ['000', '001', '010', '011', '100', '101', '110', '111'], names = ['none', 'q₀', 'q₁', 'b₂', 'q₂', 'b₀', 'b₃', 'b₁'];
      var t = '<table class="w-tab" style="width:100%"><tr><th class="rh">s₂s₁s₀</th>' + keys.map(function (k) { return '<th' + (k === d.syn ? ' style="background:#a64f15"' : '') + '>' + k + '</th>'; }).join('') + '</tr><tr><td class="rh">Error in</td>' +
        names.map(function (nm, i) { return '<td' + (keys[i] === d.syn ? ' style="background:#fbe9da;font-weight:700"' : '') + '>' + nm + '</td>'; }).join('') + '</tr></table>';
      tab.innerHTML = t;
      fixBox.innerHTML = ''; d.corr.forEach(function (v, i) { fixBox.appendChild(bitBtn(v, HAM_NAMES[i], i === d.pos ? 'fix' : (i > 3 ? 'chk' : ''))); });
      var nerr = st.flip.reduce(function (x, y) { return x + y; }, 0), ok = d.data.join('') === a.join('');
      var msg, cls;
      if (nerr === 0) { msg = 'Syndrome 000: no error. Dataword ' + d.data.join('') + ' accepted ✓'; cls = 'ok'; }
      else if (nerr === 1) { msg = 'One error, in ' + HAM_NAMES[st.flip.indexOf(1)] + ': flipped back. Dataword ' + d.data.join('') + ' ✓'; cls = 'ok'; }
      else if (d.syn === '000') { msg = nerr + ' errors but syndrome 000: undetected, wrong dataword ' + d.data.join('') + ' ✗'; cls = 'bad'; }
      else if (ok) { msg = nerr + ' errors: the data bits survived (' + d.data.join('') + '), but only by luck'; cls = 'warn'; }
      else { msg = nerr + ' errors: the syndrome points at ' + (d.pos >= 0 ? HAM_NAMES[d.pos] : 'nothing') + ', so the decoder “corrects” the wrong bit → ' + d.data.join('') + ' ✗ (d_min = 3 corrects only one error)'; cls = 'bad'; }
      verdict.className = 'w-verdict ' + cls; verdict.textContent = msg;
    }
    draw();
  };

  /* =====================================================================
     4. CRC: long division step by step, then the receiver
     ===================================================================== */
  function crcDivide(dividend, gen) {
    var r = gen.length - 1, cur = dividend.split(''), steps = [];
    for (var i = 0; i + r < cur.length; i++) {
      var win = cur.slice(i, i + r + 1).join(''), use = cur[i] === '1' ? gen : '0'.repeat(r + 1), res = '';
      for (var j = 0; j <= r; j++) { res += xor(win[j], use[j]); cur[i + j] = res[j]; }
      steps.push({ i: i, win: win, use: use, res: res });
    }
    return { steps: steps, rem: cur.slice(cur.length - r).join('') };
  }
  function polyStr(g) {
    var n = g.length - 1, t = [];
    for (var i = 0; i < g.length; i++) if (g[i] === '1') { var p = n - i; t.push(p === 0 ? '1' : p === 1 ? 'x' : 'x' + String(p).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]; }).join('')); }
    return t.join(' + ');
  }
  W.crc = function (root) {
    var st = { data: '1001', gen: '1011', step: 0, flip: [] };
    var dIn = h('input', { cls: 'w-in', value: st.data, 'aria-label': 'Dataword', spellcheck: 'false' });
    var gSel = h('select', { cls: 'w-sel', 'aria-label': 'Generator' }, [['1011', '1011 (x³ + x + 1)'], ['1101', '1101 (x³ + x² + 1)'], ['10011', '10011 (x⁴ + x + 1)'], ['100000111', '100000111 (CRC-8)']].map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
    var divLine = h('div', { style: 'font:600 34px ' + MONO + ';letter-spacing:4px;white-space:nowrap' });
    var stepsBox = h('div', { style: 'max-height:430px;overflow:hidden' });
    var resF = h('div', { cls: 'w-f' }), rxBox = h('div', { cls: 'w-bits', style: 'gap:6px' }), rxF = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var stepLbl = h('span', { style: 'font:600 24px ' + MONO + ';color:#5b6672;align-self:center' });
    dIn.addEventListener('input', function () { var v = dIn.value.replace(/[^01]/g, '').slice(0, 16); if (v !== dIn.value) dIn.value = v; st.data = v || '0'; st.step = 0; st.flip = []; draw(); });
    gSel.addEventListener('change', function () { st.gen = gSel.value; st.step = 0; st.flip = []; draw(); });
    function preset(d, g) { st.data = d; st.gen = g; dIn.value = d; gSel.value = g; st.step = 0; st.flip = []; draw(); }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px;align-items:stretch' }, [
      h('div', { cls: 'w-card', style: 'width:1000px' }, [
        h('div', { cls: 'w-row', style: 'gap:14px;align-items:center' }, [h('span', { text: 'Dataword', style: 'font-weight:600' }), h('div', { style: 'width:300px' }, [dIn]), h('span', { text: 'Generator', style: 'font-weight:600' }), gSel]),
        h('div', { cls: 'w-btns' }, [btn('Slide: 1001 ÷ 1011', function () { preset('1001', '1011'); }), btn('Slide: 1101011011 ÷ 10011', function () { preset('1101011011', '10011'); }),
          btn('Next step ▶', function () { st.step = Math.min(st.step + 1, total()); draw(); }, 'acc'), btn('All steps', function () { st.step = total(); draw(); }), btn('Reset', function () { st.step = 0; draw(); }), stepLbl]),
        divLine, stepsBox]),
      h('div', { cls: 'w-col', style: 'width:640px;gap:16px' }, [
        h('div', { cls: 'w-card' }, [h('h4', { text: 'Sender' }), resF]),
        h('div', { cls: 'w-card' }, [h('h4', { text: 'Receiver: click bits to add errors' }), rxBox,
          h('div', { cls: 'w-btns' }, [btn('Clear errors', function () { st.flip = []; draw(); }), btn('Error = generator pattern', function () {
            var cw = codeword(); st.flip = cw.split('').map(function () { return 0; }); for (var j = 0; j < st.gen.length; j++) if (st.gen[j] === '1') st.flip[cw.length - st.gen.length + j] = 1; draw(); })]),
          rxF, verdict])])]));
    function total() { return st.data.length; }
    function codeword() { var r = st.gen.length - 1; return st.data + crcDivide(st.data + '0'.repeat(r), st.gen).rem; }
    function draw() {
      var r = st.gen.length - 1, dv = st.data + '0'.repeat(r), D = crcDivide(dv, st.gen), K = D.steps.length, s = Math.min(st.step, K), cwid = Math.min(36, Math.floor(860 / dv.length));
      stepLbl.textContent = 'step ' + s + ' / ' + K;
      // running dividend after s steps
      var cur = dv.split(''); for (var k = 0; k < s; k++) { var S = D.steps[k]; for (var j = 0; j <= r; j++) cur[S.i + j] = S.res[j]; }
      var html = '';
      cur.forEach(function (c, i) {
        var inWin = s < K && i >= s && i <= s + r, done = i < s, zero = i >= st.data.length;
        var col = done ? '#b8c0c8' : (zero ? C.orange : C.ink);
        html += '<span style="display:inline-block;width:' + cwid + 'px;text-align:center;border-radius:6px;color:' + col + (inWin ? ';background:#fbe9da;outline:2px solid #a64f15' : '') + '">' + c + '</span>';
      });
      divLine.innerHTML = html + '<span style="font:500 24px ' + SANS + ';color:#5b6672;letter-spacing:0;margin-left:16px">÷ ' + st.gen + '</span>';
      var t = '<table class="w-tab" style="width:100%"><tr><th>Step</th><th>Bits under the divisor</th><th>XOR with</th><th>Result</th><th class="rh">Why</th></tr>';
      var from = Math.max(0, s - 8);
      for (var q = from; q < s; q++) { var S2 = D.steps[q]; t += '<tr' + (q === s - 1 ? ' class="cur"' : '') + '><td>' + (q + 1) + '</td><td>' + S2.win + '</td><td>' + S2.use + '</td><td>' + S2.res + '</td><td style="font:500 21px ' + SANS + ';text-align:left">' + (S2.win[0] === '1' ? 'leading 1: use the generator' : 'leading 0: use ' + '0'.repeat(r + 1)) + '</td></tr>'; }
      if (!s) t += '<tr><td colspan="5" style="font:500 22px ' + SANS + ';color:#5b6672">' + r + ' zeros appended (orange). Press “Next step”.</td></tr>';
      t += '</table>';
      stepsBox.innerHTML = t;
      var finished = s >= K;
      resF.innerHTML = 'g(x) = ' + polyStr(st.gen) + ',  r = ' + r + '\nRemainder: <b>' + (finished ? D.rem : '…') + '</b>\nCodeword: <b>' + (finished ? st.data + ' ' + D.rem : '…') + '</b>';
      var cw = st.data + D.rem; if (st.flip.length !== cw.length) st.flip = cw.split('').map(function () { return 0; });
      rxBox.innerHTML = '';
      cw.split('').forEach(function (c, i) {
        var v = (+c) ^ st.flip[i];
        var b = h('button', { type: 'button', cls: 'w-bit' + (st.flip[i] ? ' err' : (i >= st.data.length ? ' chk' : '')), style: 'width:' + Math.min(54, Math.floor((590 - 6 * (cw.length - 1)) / cw.length)) + 'px;height:60px;font-size:' + (cw.length > 12 ? 24 : 30) + 'px', 'aria-label': 'bit ' + i }, [String(v)]);
        b.addEventListener('click', function () { st.flip[i] ^= 1; draw(); });
        rxBox.appendChild(b);
      });
      var rx = cw.split('').map(function (c, i) { return String((+c) ^ st.flip[i]); }).join(''), syn = crcDivide(rx, st.gen).rem, nerr = st.flip.reduce(function (a, b) { return a + b; }, 0);
      rxF.innerHTML = 'Received ÷ ' + st.gen + ' (no zeros added)\nSyndrome: <b>' + syn + '</b>';
      if (!finished) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Finish the division to send the codeword.'; }
      else if (/^0+$/.test(syn) && !nerr) { verdict.className = 'w-verdict ok'; verdict.textContent = 'Syndrome all 0s: accept dataword ' + rx.slice(0, st.data.length) + ' ✓'; }
      else if (/^0+$/.test(syn)) { verdict.className = 'w-verdict bad'; verdict.textContent = nerr + ' bit(s) changed but syndrome is 0: UNDETECTED ✗ (the error pattern is divisible by g(x))'; }
      else { verdict.className = 'w-verdict ok'; verdict.textContent = 'Syndrome ≠ 0: error detected, frame discarded ✓ (CRC detects; it does not correct)'; }
    }
    draw();
  };

  /* =====================================================================
     5. ARQ: Stop-and-Wait, Go-Back-N, Selective Repeat
     ===================================================================== */
  function simulate(p) { return window.ARQ_SIMULATE(p); }
  W.arq = function (root) {
    var st = { proto: 'gbn', m: 3, N: 8, Tp: 3, TO: 14, lostF: [2], lostA: [], T: 0, playing: false };
    var diag = canvas(880, 560);
    var sendStrip = h('div', { cls: 'w-strip' }), recvStrip = h('div', { cls: 'w-strip' }), log = h('div', { cls: 'w-log' }), stats = h('div', { cls: 'w-f' }), cmp = h('div');
    var winLbl = h('p', { cls: 'w-note' });
    var proto = seg([['sw', 'Stop-and-Wait'], ['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']], 'gbn', function (p) { st.proto = p; reset(); });
    var mSl = slider('Seq. bits m', 1, 4, 1, 3, function (v) { return v + ' (0…' + (Math.pow(2, v) - 1) + ')'; }, function (v) { st.m = v; reset(); });
    var nSl = slider('Frames', 4, 12, 1, 8, function (v) { return v; }, function (v) { st.N = v; st.lostF = st.lostF.filter(function (i) { return i < v; }); st.lostA = st.lostA.filter(function (i) { return i <= v; }); reset(); });
    var tpSl = slider('Propagation', 1, 5, 1, 3, function (v) { return v + ' Tf'; }, function (v) { st.Tp = v; st.TO = Math.max(st.TO, 2 * v + 2); toSl.range(2 * v + 2, 2 * v + 20); toSl.set(st.TO); reset(); });
    var toSl = slider('Time-out', 8, 26, 1, 14, function (v) { return v + ' Tf'; }, function (v) { st.TO = v; reset(); });
    var playB = btn('▶ Play', togglePlay, 'acc');
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:22px' }, [
      h('div', { cls: 'w-col', style: 'width:880px;gap:10px' }, [diag.c]),
      h('div', { cls: 'w-col', style: 'width:760px;gap:12px' }, [
        h('div', { cls: 'w-row', style: 'gap:12px;align-items:center;flex-wrap:wrap' }, [proto.el]),
        h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [playB, btn('Step ▶|', stepEv), btn('End', function () { stop(); st.T = sim().tEnd; draw(); }), btn('Reset', function () { stop(); st.T = 0; draw(); })]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:14px 18px' }, [
          h('div', { style: 'font-weight:600;font-size:23px' , text: 'Sender: click a frame to lose its first copy' }), sendStrip,
          h('div', { style: 'font-weight:600;font-size:23px', text: 'Receiver: click a frame to lose the ACK it triggers' }), recvStrip, winLbl]),
        h('div', { cls: 'w-card', style: 'gap:4px;padding:10px 18px;min-height:178px' }, [log]),
        h('div', { cls: 'w-row', style: 'gap:16px' }, [
          h('div', { cls: 'w-card', style: 'width:372px;gap:0;padding:10px 18px' }, [mSl.el, nSl.el]),
          h('div', { cls: 'w-card', style: 'width:372px;gap:0;padding:10px 18px' }, [tpSl.el, toSl.el])])])]));
    // compare row goes under the diagram
    diag.c.parentNode.appendChild(h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 18px' }, [stats, cmp]));

    function Wsize(p, m) { return p === 'sw' ? 1 : p === 'gbn' ? Math.pow(2, m) - 1 : Math.pow(2, m - 1); }
    var cache = null, key = '';
    function sim() {
      var k = JSON.stringify([st.proto, st.m, st.N, st.Tp, st.TO, st.lostF, st.lostA]);
      if (k !== key) { key = k; cache = simulate({ proto: st.proto, N: st.N, Tp: st.Tp, TO: st.TO, W: Wsize(st.proto, st.m), lostF: st.lostF, lostA: st.lostA, lostN: [] }); }
      return cache;
    }
    function reset() { stop(); st.T = 0; draw(); }
    var timer = null, last = 0;
    function togglePlay() {
      if (timer) { stop(); return; }
      if (st.T >= sim().tEnd - 1e-9) st.T = 0;
      last = performance.now(); playB.textContent = '❚❚ Pause';
      timer = requestAnimationFrame(function tick(now) {
        st.T += (now - last) / 1000 * 2.2; last = now;
        if (st.T >= sim().tEnd) { st.T = sim().tEnd; draw(); stop(); return; }
        draw(); timer = requestAnimationFrame(tick);
      });
    }
    function stop() { if (timer) cancelAnimationFrame(timer); timer = null; playB.textContent = '▶ Play'; }
    function stepEv() {
      stop(); var R = sim(), ts = [];
      R.lines.forEach(function (l) { ts.push(l.t0, l.t1); }); R.log.forEach(function (e) { ts.push(e[0]); });
      ts = ts.filter(function (t) { return t > st.T + 1e-6; }).sort(function (a, b) { return a - b; });
      st.T = ts.length ? ts[0] : R.tEnd; draw();
    }
    function snapAt(R, T) { var s = R.snaps[0]; R.snaps.forEach(function (x) { if (x.t <= T + 1e-9) s = x; }); return s; }
    function draw() {
      var R = sim(), T = st.T, g = diag.g, w = diag.w, hh = diag.h, mod = st.proto === 'sw' ? 2 : Math.pow(2, st.m), Wn = R.W;
      mSl.input.disabled = st.proto === 'sw';
      var sx = 150, rx = w - 150, top = 64, bot = 30, scale = (hh - top - bot) / Math.max(R.tEnd, 1);
      var Y = function (t) { return top + t * scale; };
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.font = '600 24px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'center'; g.fillText('Sender', sx, 38); g.fillText('Receiver', rx, 38);
      g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.moveTo(sx, top - 8); g.lineTo(sx, hh - bot); g.moveTo(rx, top - 8); g.lineTo(rx, hh - bot); g.stroke();
      // time ticks
      g.font = '500 18px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'right';
      var tick = R.tEnd > 40 ? 10 : 5;
      for (var t = 0; t <= R.tEnd + 1e-9; t += tick) { g.fillText(t, sx - 26, Y(t) + 6); g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(sx - 18, Y(t)); g.lineTo(sx, Y(t)); g.stroke(); }
      g.save(); g.translate(30, (top + hh) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('time (frame times) ↓', 0, 0); g.restore();
      // lines up to time T
      R.lines.forEach(function (l) {
        if (l.t0 > T + 1e-9) return;
        var isF = l.k === 'F', x0 = isF ? sx : rx, x1 = isF ? rx : sx, endT = l.lost ? (l.t0 + l.t1) / 2 : l.t1;
        var frac = Math.min(1, (T - l.t0) / Math.max(1e-9, endT - l.t0)), xe = x0 + (x1 - x0) * frac, ye = Y(l.t0 + (endT - l.t0) * frac);
        var col = isF ? (l.re ? C.orangeL : C.orange) : (l.k === 'N' ? C.red : C.blue);
        g.strokeStyle = col; g.lineWidth = isF ? 3 : 2.5; g.setLineDash(isF ? (l.re ? [10, 6] : []) : [4, 4]);
        g.beginPath(); g.moveTo(x0, Y(l.t0)); g.lineTo(xe, ye); g.stroke(); g.setLineDash([]);
        if (frac >= 1 && !l.lost) { var ang = Math.atan2(ye - Y(l.t0), xe - x0); g.fillStyle = col; g.beginPath(); g.moveTo(xe, ye); g.lineTo(xe - 14 * Math.cos(ang - 0.4), ye - 14 * Math.sin(ang - 0.4)); g.lineTo(xe - 14 * Math.cos(ang + 0.4), ye - 14 * Math.sin(ang + 0.4)); g.fill(); }
        if (frac >= 1 && l.lost) { g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.moveTo(xe - 11, ye - 11); g.lineTo(xe + 11, ye + 11); g.moveTo(xe + 11, ye - 11); g.lineTo(xe - 11, ye + 11); g.stroke(); }
        g.font = '600 19px ' + MONO; g.fillStyle = col; g.textAlign = isF ? 'right' : 'left';
        var lab = isF ? 'F' + (l.i % mod) : (l.k === 'A' ? 'ACK' : 'NAK') + (l.n % mod);
        g.fillText(lab, isF ? sx - 6 : rx + 8, Y(l.t0) + 6);
      });
      // time cursor
      g.strokeStyle = 'rgba(166,79,21,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, Y(T)); g.lineTo(rx, Y(T)); g.stroke();
      // strips
      var s = snapAt(R, T);
      sendStrip.innerHTML = ''; recvStrip.innerHTML = '';
      for (var i = 0; i < st.N; i++) (function (i) {
        var cls = 'w-cell' + (s.acked[i] ? ' ack' : (i >= s.Sf && i < s.Sn ? ' out' : '')) + (i >= s.Sf && i < s.Sf + Wn ? ' win' : '') + (st.lostF.indexOf(i) >= 0 ? ' lost' : '');
        var b = h('button', { type: 'button', cls: cls, text: String(i % mod), title: 'frame ' + i + ' (sequence number ' + (i % mod) + ')' });
        b.addEventListener('click', function () { var k = st.lostF.indexOf(i); if (k >= 0) st.lostF.splice(k, 1); else st.lostF.push(i); reset(); });
        sendStrip.appendChild(b);
        var del = s.delivered.indexOf(i) >= 0, rw = st.proto === 'sr' ? (i >= s.Rn && i < s.Rn + Wn) : i === s.Rn;
        var c2 = 'w-cell' + (del ? ' ack' : (s.buf[i] ? ' buf' : '')) + (rw ? ' win' : '') + (st.lostA.indexOf(i + 1) >= 0 ? ' lost' : '');
        var b2 = h('button', { type: 'button', cls: c2, text: String(i % mod), title: 'lose the ACK sent after frame ' + i });
        b2.addEventListener('click', function () { var k = st.lostA.indexOf(i + 1); if (k >= 0) st.lostA.splice(k, 1); else st.lostA.push(i + 1); reset(); });
        recvStrip.appendChild(b2);
      })(i);
      winLbl.innerHTML = 'Window: send W<sub>s</sub> = <b style="color:#a64f15">' + Wn + '</b>' + (st.proto === 'sw' ? ' (one frame at a time)' : st.proto === 'gbn' ? ' = 2<sup>m</sup> − 1' : ' = 2<sup>m−1</sup>') +
        ', receive = ' + (st.proto === 'sr' ? Wn : 1) + '. Green: acknowledged/delivered · orange: sent, waiting · blue: stored out of order · Tf = one frame time';
      var ev = R.log.filter(function (e) { return e[0] <= T + 1e-9; }).slice(-5);
      log.innerHTML = ev.length ? ev.map(function (e) { return '<span class="t">t=' + fmtN(e[0], 1).padStart(4) + '</span>  ' + e[1].replace(/frame (\d+)/g, function (_, n) { return 'frame ' + n + ' (seq ' + (n % mod) + ')'; }); }).join('\n') : '<span class="t">Press Play or Step.</span>';
      var resent = R.tx - st.N;
      stats.innerHTML = 'Frames sent: <b>' + R.tx + '</b> (' + st.N + ' new + ' + resent + ' resent)   Done at t = <b>' + fmtN(R.finish, 1) + '</b>';
      var rows = [['sw', 'Stop-and-Wait'], ['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']].map(function (p) {
        var r2 = simulate({ proto: p[0], N: st.N, Tp: st.Tp, TO: st.TO, W: Wsize(p[0], st.m), lostF: st.lostF, lostA: st.lostA, lostN: [] });
        return '<tr' + (p[0] === st.proto ? ' class="cur"' : '') + '><td class="rh">' + p[1] + '</td><td>' + Wsize(p[0], st.m) + '</td><td>' + r2.tx + '</td><td>' + fmtN(r2.finish, 1) + '</td></tr>';
      }).join('');
      cmp.innerHTML = '<table class="w-tab" style="width:100%"><tr><th class="rh">Same losses</th><th>Window</th><th>Frames sent</th><th>Done at t</th></tr>' + rows + '</table>';
    }
    draw();
  };

  /* =====================================================================
     shared: a row of clickable bits
     ===================================================================== */
  function bitRow(st, max, onChange) {
    var box = h('div', { cls: 'w-bits', style: 'gap:6px' });
    function render() {
      box.innerHTML = '';
      st.bits.split('').forEach(function (c, i) {
        var b = h('button', { type: 'button', cls: 'w-bit', style: 'width:46px;height:58px;font-size:30px', 'aria-label': 'bit ' + (i + 1) + ' = ' + c, text: c });
        b.addEventListener('click', function () { st.bits = st.bits.slice(0, i) + (c === '1' ? '0' : '1') + st.bits.slice(i + 1); render(); onChange(); });
        box.appendChild(b);
      });
      var add = h('button', { type: 'button', cls: 'w-btn', text: '+', title: 'add a bit', style: 'padding:6px 14px' });
      add.addEventListener('click', function () { if (st.bits.length < max) { st.bits += '0'; render(); onChange(); } });
      var del = h('button', { type: 'button', cls: 'w-btn', text: '−', title: 'remove the last bit', style: 'padding:6px 16px' });
      del.addEventListener('click', function () { if (st.bits.length > 2) { st.bits = st.bits.slice(0, -1); render(); onChange(); } });
      box.appendChild(add); box.appendChild(del);
    }
    render();
    return { el: box, render: render };
  }
  function randBits(n) { var s = ''; for (var i = 0; i < n; i++) s += Math.random() < 0.5 ? '0' : '1'; return s; }

  /* =====================================================================
     6. Line coding: one bit pattern, many codes
     ===================================================================== */
  // each code returns an array of levels, two half-bit slots per bit (2B1Q: 4 slots per pair of bits)
  var LC = {
    uni: { n: 'Unipolar NRZ', rate: 'N/2', f: function (b) { return b.flatMap(function (c) { return [c, c]; }); } },
    nrzl: { n: 'NRZ-L', rate: 'N/2', f: function (b) { return b.flatMap(function (c) { var l = c ? -1 : 1; return [l, l]; }); } },
    nrzi: { n: 'NRZ-I', rate: 'N/2', f: function (b) { var l = 1; return b.flatMap(function (c) { if (c) l = -l; return [l, l]; }); } },
    rz: { n: 'Polar RZ', rate: 'N', f: function (b) { return b.flatMap(function (c) { return [c ? 1 : -1, 0]; }); } },
    man: { n: 'Manchester', rate: 'N', f: function (b) { return b.flatMap(function (c) { return c ? [-1, 1] : [1, -1]; }); } },
    dman: { n: 'Diff. Manchester', rate: 'N', f: function (b) { var l = 1; return b.flatMap(function (c) { if (!c) l = -l; var a = l; l = -l; return [a, l]; }); } },
    ami: { n: 'AMI', rate: 'N/2', f: function (b) { var p = 1; return b.flatMap(function (c) { if (!c) return [0, 0]; var v = p; p = -p; return [v, v]; }); } },
    pst: { n: 'Pseudoternary', rate: 'N/2', f: function (b) { var p = 1; return b.flatMap(function (c) { if (c) return [0, 0]; var v = p; p = -p; return [v, v]; }); } },
    mlt: { n: 'MLT-3', rate: 'N/3', f: function (b) { var cyc = [0, 1, 0, -1], k = 0; return b.flatMap(function (c) { if (c) k = (k + 1) % 4; return [cyc[k], cyc[k]]; }); } },
    q2: { n: '2B1Q', rate: 'N/4', f: function (b) {
      var m = { '00': -1, '01': -1 / 3, '10': 1, '11': 1 / 3 }, a = b.slice(), o = []; if (a.length % 2) a.push(0);
      for (var k = 0; k < a.length; k += 2) { var v = m['' + a[k] + a[k + 1]]; o.push(v, v, v, v); } return o; } }
  };
  function lcStats(key, bits) {
    var lv = LC[key].f(bits), n = bits.length, slots = lv.length;
    var changes = 0, run = 1, longest = 1;
    for (var i = 1; i < slots; i++) { if (Math.abs(lv[i] - lv[i - 1]) > 1e-9) { changes++; run = 1; } else { run++; if (run > longest) longest = run; } }
    var dc = lv.reduce(function (a, b) { return a + b; }, 0) / slots;
    return { lv: lv, changes: changes, dc: dc, flat: longest / 2, n: n };
  }
  W.linecode = function (root) {
    var st = { bits: '01001110', on: ['nrzl', 'nrzi', 'man', 'ami'] };
    var trace = canvas(1110, 470);
    var row = bitRow(st, 16, draw);
    var chips = h('div', { cls: 'w-btns' });
    var statBox = h('div');
    Object.keys(LC).forEach(function (k) {
      var b = btn(LC[k].n, function () {
        var i = st.on.indexOf(k);
        if (i >= 0) { if (st.on.length > 1) st.on.splice(i, 1); } else { if (st.on.length >= 5) st.on.shift(); st.on.push(k); }
        draw();
      });
      b.dataset.k = k; chips.appendChild(b);
    });
    function setBits(s) { st.bits = s; row.render(); draw(); }
    root.appendChild(h('div', { cls: 'w-col', style: 'gap:14px' }, [
      h('div', { cls: 'w-row', style: 'gap:18px;align-items:center' }, [h('span', { text: 'Bits:', style: 'font-weight:600' }), row.el]),
      h('div', { cls: 'w-row', style: 'gap:22px' }, [
        h('div', { cls: 'w-col', style: 'width:1110px;gap:10px' }, [trace.c, statBox]),
        h('div', { cls: 'w-col', style: 'width:534px;gap:14px' }, [
          h('div', { cls: 'w-card', style: 'gap:8px' }, [h('h4', { text: 'Patterns to try' }), h('div', { cls: 'w-btns' }, [
            btn('01001110 (slides)', function () { setBits('01001110'); }), btn('All 0s', function () { setBits('00000000'); }),
            btn('All 1s', function () { setBits('11111111'); }), btn('0101…', function () { setBits('01010101'); }), btn('Random', function () { setBits(randBits(10)); })])]),
          h('div', { cls: 'w-card', style: 'gap:8px' }, [h('h4', { text: 'Show up to 5 codes' }), chips])])])]));
    function draw() {
      [].forEach.call(chips.children, function (b) { b.classList.toggle('on', st.on.indexOf(b.dataset.k) >= 0); });
      var bits = st.bits.split('').map(Number), n = bits.length, g = trace.g, w = trace.w, hh = trace.h, K = st.on.length;
      var x0 = 190, x1 = w - 18, top = 44, rowH = (hh - top - 10) / K, bw = (x1 - x0) / n;
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.font = '600 26px ' + MONO; g.textAlign = 'center'; g.fillStyle = C.orange;
      for (var i = 0; i < n; i++) g.fillText(bits[i], x0 + (i + 0.5) * bw, 32);
      for (var j = 0; j <= n; j++) { g.strokeStyle = '#dfe4ea'; g.setLineDash([5, 6]); g.beginPath(); g.moveTo(x0 + j * bw, top); g.lineTo(x0 + j * bw, hh - 8); g.stroke(); } g.setLineDash([]);
      var rows = '';
      st.on.forEach(function (k, r) {
        var S = lcStats(k, bits), lv = S.lv, slots = lv.length, sw = (x1 - x0) / slots * (k === 'q2' && n % 2 ? n / (n + 1) : 1);
        if (k === 'q2' && n % 2) sw = bw / 2;
        var y0 = top + r * rowH, mid = y0 + rowH / 2, amp = rowH / 2 - 22;
        g.fillStyle = r % 2 ? 'rgba(231,237,243,.45)' : 'rgba(255,255,255,0)'; g.fillRect(1, y0, w - 2, rowH);
        g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.stroke();
        g.font = '600 24px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(LC[k].n, 14, mid - 4);
        g.font = '500 18px ' + MONO; g.fillStyle = C.gray; g.fillText('+V', x0 - 40, mid - amp + 6); g.fillText('−V', x0 - 40, mid + amp + 6);
        g.strokeStyle = [C.orange, C.blue, C.navy, C.green, '#7a4fb5'][r % 5]; g.lineWidth = 4; g.beginPath();
        var prevY = null;
        for (var s = 0; s < slots; s++) {
          var xa = x0 + s * sw, xb = x0 + (s + 1) * sw, y = mid - lv[s] * amp;
          if (xa > x1 + 1) break;
          if (prevY === null) g.moveTo(xa, y); else g.lineTo(xa, y);
          g.lineTo(Math.min(xb, x1), y); prevY = y;
        }
        g.stroke();
        var dcTxt = Math.abs(S.dc) < 0.005 ? '0' : fx(S.dc, 2) + ' V';
        rows += '<tr><td class="rh">' + LC[k].n + '</td><td>' + S.changes + '</td><td>' + dcTxt + '</td><td' + (S.flat >= 3 ? ' style="color:#c0392b;font-weight:700"' : '') + '>' + fmtN(S.flat, 1) + '</td><td>' + LC[k].rate + '</td></tr>';
      });
      statBox.innerHTML = '<table class="w-tab" style="width:100%;font-size:22px"><tr><th class="rh">Code</th><th>Level changes</th><th>Average (DC)</th><th>Longest flat (bits)</th><th>Signal rate S (avg)</th></tr>' + rows + '</table>' +
        '<p class="w-note" style="margin-top:6px">V = 1. Red: 3 or more bit times without a change, so the receiver can lose its clock. S from Forouzan\'s Table 4.1.</p>';
    }
    draw();
  };

  /* =====================================================================
     7. Digital modulation compared: ASK, FSK, BPSK, QPSK
     ===================================================================== */
  W.digmod = function (root) {
    var st = { bits: '10110010', cyc: 3, dcyc: 1, d: 0, N: 8 };
    var trace = canvas(1120, 650), row = bitRow(st, 14, draw), tab = h('div');
    var cSl = slider('Carrier fc (cycles per bit)', 1, 6, 1, 3, function (v) { return v + ' → ' + v * st.N + ' kHz'; }, function (v) { st.cyc = v; if (st.dcyc >= v) { st.dcyc = v - 0.5 > 0 ? v - 0.5 : 0.5; } dSl2.range(0.5, Math.max(0.5, v - 0.5), 0.5); dSl2.set(st.dcyc); draw(); });
    var dSl2 = slider('FSK shift Δf (× bit rate)', 0.5, 2.5, 0.5, 1, function (v) { return fmtN(v, 1); }, function (v) { st.dcyc = v; draw(); });
    var nSl = slider('Bit rate N', 1, 64, 1, 8, function (v) { return v + ' kbps'; }, function (v) { st.N = v; cSl.set(st.cyc); draw(); });
    var specD = canvas(500, 160);
    var ddSl = slider('Filter factor d', 0, 1, 0.1, 0, function (v) { return fmtN(v, 1); }, function (v) { st.d = v; draw(); });
    root.appendChild(h('div', { cls: 'w-col', style: 'gap:14px' }, [
      h('div', { cls: 'w-row', style: 'gap:18px;align-items:center' }, [h('span', { text: 'Bits:', style: 'font-weight:600' }), row.el,
        btn('Random', function () { st.bits = randBits(8); row.render(); draw(); })]),
      h('div', { cls: 'w-row', style: 'gap:22px' }, [
        trace.c,
        h('div', { cls: 'w-col', style: 'width:524px;gap:12px' }, [
          h('div', { cls: 'w-card', style: 'gap:0;padding:6px 18px' }, [cSl.el, dSl2.el, nSl.el, ddSl.el]),
          h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 16px' }, [tab]), specD.c])])]));
    function draw() {
      var bits = st.bits.split('').map(Number), n = bits.length, g = trace.g, w = trace.w, hh = trace.h;
      var rowsDef = [
        ['Data (unipolar NRZ)', 'data'], ['ASK (OOK): 1 = carrier, 0 = none', 'ask'], ['FSK: 1 = f₁ (higher), 0 = f₀', 'fsk'],
        ['BPSK: 1 = 0°, 0 = 180°', 'psk'], ['QPSK: 2 bits per element', 'qpsk']];
      var x0 = 20, x1 = w - 20, top = 40, K = rowsDef.length, rowH = (hh - top - 6) / K, bw = (x1 - x0) / n;
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.font = '600 26px ' + MONO; g.textAlign = 'center'; g.fillStyle = C.orange;
      for (var i = 0; i < n; i++) g.fillText(bits[i], x0 + (i + 0.5) * bw, 30);
      for (var j = 0; j <= n; j++) { g.strokeStyle = '#dfe4ea'; g.setLineDash([5, 6]); g.beginPath(); g.moveTo(x0 + j * bw, top); g.lineTo(x0 + j * bw, hh - 6); g.stroke(); } g.setLineDash([]);
      var f1 = st.cyc + st.dcyc, f0 = st.cyc - st.dcyc, dib = st.bits + (n % 2 ? '0' : '');
      rowsDef.forEach(function (rd, r) {
        var y0 = top + r * rowH, mid = y0 + rowH / 2 + 10, amp = rowH / 2 - 26, k = rd[1];
        if (r % 2) { g.fillStyle = 'rgba(231,237,243,.45)'; g.fillRect(1, y0, w - 2, rowH); }
        g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(rd[0], x0 + 4, y0 + 22);
        g.strokeStyle = [C.gray, C.orange, C.blue, C.green, '#7a4fb5'][r]; g.lineWidth = r ? 2.5 : 4; g.beginPath();
        var steps = 1400, phase = 0;
        for (var p = 0; p <= steps; p++) {
          var t = p / steps * n, bi = Math.min(n - 1, Math.floor(t)), tb = t - bi, b = bits[bi], v;
          if (k === 'data') v = b ? 1 : -0.0;
          else if (k === 'ask') v = b ? Math.sin(2 * Math.PI * st.cyc * t) : 0;
          else if (k === 'fsk') { // continuous-phase FSK
            if (p) phase += 2 * Math.PI * (bits[Math.min(n - 1, Math.floor((p - 1) / steps * n))] ? f1 : f0) * (n / steps);
            v = Math.sin(phase);
          }
          else if (k === 'psk') v = Math.sin(2 * Math.PI * st.cyc * t + (b ? 0 : Math.PI));
          else { var si = Math.floor(t / 2), sb = dib.substr(si * 2, 2), I = sb[0] === '1' ? 1 : -1, Q = sb[1] === '1' ? 1 : -1; v = (I * Math.cos(2 * Math.PI * st.cyc * t) - Q * Math.sin(2 * Math.PI * st.cyc * t)) / Math.SQRT2; }
          var x = x0 + t * bw, y = mid - (k === 'data' ? (v - 0.5) * 2 * amp * 0.8 : v * amp);
          p ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        if (k === 'qpsk') {
          g.font = '600 20px ' + MONO; g.fillStyle = '#7a4fb5'; g.textAlign = 'center';
          for (var s2 = 0; s2 < dib.length / 2; s2++) {
            var sb2 = dib.substr(s2 * 2, 2), ph = { '11': 45, '01': 135, '00': 225, '10': 315 }[sb2];
            g.fillText(sb2 + ' · ' + ph + '°', x0 + (s2 * 2 + 1) * bw, y0 + rowH - 4);
          }
        }
      });
      var N = st.N, d = st.d, S1 = N, S2 = N / 2, df = st.dcyc * N, fc = st.cyc * N;
      var BW = [['ASK', 'amplitude', 1, S1, (1 + d) * S1, '(1 + d) S'], ['FSK', 'frequency', 1, S1, (1 + d) * S1 + 2 * df, '(1 + d) S + 2Δf'],
        ['BPSK', 'phase', 1, S1, (1 + d) * S1, '(1 + d) S'], ['QPSK', 'phase (4)', 2, S2, (1 + d) * S2, '(1 + d) S']];
      var bmax = Math.max.apply(null, BW.map(function (x) { return x[4]; }));
      tab.innerHTML = '<table class="w-tab" style="width:100%;font-size:22px"><tr><th class="rh">Scheme</th><th>r</th><th>S (kbaud)</th><th>B (kHz)</th></tr>' +
        BW.map(function (x) { return '<tr><td class="rh">' + x[0] + '</td><td>' + x[2] + '</td><td>' + fmtN(x[3], 2) + '</td><td style="text-align:left"><span style="display:inline-block;height:16px;width:' + Math.round(x[4] / bmax * 120) + 'px;background:#a64f15;border-radius:4px;vertical-align:middle;margin-right:8px"></span>' + fmtN(x[4], 2) + '</td></tr>'; }).join('') + '</table>' +
        '<p class="w-note" style="margin-top:6px">FSK: f₁ = ' + fmtN(fc + df, 1) + ', f₀ = ' + fmtN(fc - df, 1) + ' kHz (2Δf = ' + fmtN(2 * df, 1) + ' kHz)</p>';
      // where each band sits on the frequency axis
      var q = specD.g, qw = specD.w, qh = specD.h, bands = [['ASK', fc, (1 + d) * S1, C.orange], ['FSK', fc, (1 + d) * S1 + 2 * df, C.blue], ['BPSK', fc, (1 + d) * S1, C.green], ['QPSK', fc, (1 + d) * S2, '#7a4fb5']];
      var fmaxD = Math.max(fc + df + (1 + d) * S1, 1) * 1.25, qx0 = 74, qx1 = qw - 14, qb = qh - 30, QX = function (f) { return qx0 + f / fmaxD * (qx1 - qx0); }, bad = false;
      q.clearRect(0, 0, qw, qh); q.fillStyle = C.panel; q.fillRect(0, 0, qw, qh); q.strokeStyle = C.line; q.lineWidth = 1; q.strokeRect(0.5, 0.5, qw - 1, qh - 1);
      bands.forEach(function (bd, i) {
        var y = 28 + i * 24, l = bd[1] - bd[2] / 2, r = bd[1] + bd[2] / 2; if (l <= 1e-9) bad = true;
        q.fillStyle = l <= 1e-9 ? 'rgba(192,57,43,.6)' : bd[3]; q.globalAlpha = 0.85; q.fillRect(QX(Math.max(0, l)), y, QX(r) - QX(Math.max(0, l)), 17); q.globalAlpha = 1;
        q.font = '600 17px ' + SANS; q.fillStyle = C.ink; q.textAlign = 'right'; q.fillText(bd[0], qx0 - 8, y + 14);
      });
      q.strokeStyle = C.navy; q.setLineDash([5, 4]); q.beginPath(); q.moveTo(QX(fc), 24); q.lineTo(QX(fc), qb); q.stroke(); q.setLineDash([]);
      q.strokeStyle = C.gray; q.beginPath(); q.moveTo(qx0, qb); q.lineTo(qx1, qb); q.stroke();
      q.font = '500 16px ' + MONO; q.fillStyle = C.gray; q.textAlign = 'center';
      var stp = Math.max(1, Math.round(fmaxD / 5 / 4) * 4 || 1); for (var tf = 0; tf < fmaxD - stp * 0.4; tf += stp) q.fillText(tf, QX(tf), qb + 18);
      q.textAlign = 'right'; q.fillText('kHz', qx1, qb + 18);
      q.font = '600 18px ' + SANS; q.textAlign = 'left'; q.fillStyle = bad ? C.red : C.navy;
      q.fillText(bad ? 'A band reaches 0 Hz: raise fc' : 'Bands centred on fc = ' + fmtN(fc, 1) + ' kHz', qx0, 18);
    }
    draw();
  };

  /* =====================================================================
     8. Analog modulation compared: AM, FM, PM
     ===================================================================== */
  function besselJ(n, x) { // series, fine for n <= 20, x <= 12
    n = Math.abs(n); var sum = 0, term;
    for (var k = 0; k < 60; k++) {
      term = Math.pow(-1, k) * Math.pow(x / 2, 2 * k + n) / (fact(k) * fact(k + n));
      sum += term; if (Math.abs(term) < 1e-12 && k > n) break;
    }
    return sum;
  }
  function fact(k) { var f = 1; for (var i = 2; i <= k; i++) f *= i; return f; }
  W.anamod = function (root) {
    var st = { shape: 'sine', m: 0.5, beta: 4, kp: 1.5, fm: 5, spec: 'fm', fcr: 12 };
    var trace = canvas(1080, 600), spec = canvas(536, 210), form = h('div', { cls: 'w-f' });
    var shp = seg([['sine', 'Sine tone'], ['tri', 'Triangle'], ['sq', 'Smoothed square']], 'sine', function (k) { st.shape = k; draw(); });
    var mSl = slider('AM index m', 0, 1.5, 0.05, 0.5, function (v) { return fmtN(v, 2) + (v > 1 ? ' (over!)' : ''); }, function (v) { st.m = v; draw(); });
    var bSl = slider('FM index β = Δf / fm', 0.5, 8, 0.5, 4, function (v) { return fmtN(v, 1) + ' (Δf = ' + fmtN(v * st.fm, 1) + ' kHz)'; }, function (v) { st.beta = v; draw(); });
    var kSl = slider('PM index β = kp·Am (rad)', 0.25, 3, 0.25, 1.5, function (v) { return fmtN(v, 2); }, function (v) { st.kp = v; draw(); });
    var fSl = slider('Message bandwidth B', 1, 15, 1, 5, function (v) { return v + ' kHz'; }, function (v) { st.fm = v; cSl.set(st.fcr); bSl.set(st.beta); draw(); });
    var cSl = slider('Carrier fc', 1, 20, 1, 12, function (v) { return v + ' × B = ' + v * st.fm + ' kHz'; }, function (v) { st.fcr = v; draw(); });
    var sp = seg([['am', 'AM'], ['fm', 'FM'], ['pm', 'PM']], 'fm', function (k) { st.spec = k; draw(); });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:22px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:10px' }, [shp.el, trace.c,
        h('div', { cls: 'w-row', style: 'gap:22px' }, [h('div', { cls: 'w-card', style: 'width:529px;padding:4px 16px;gap:0' }, [cSl.el]), h('div', { cls: 'w-card', style: 'width:529px;padding:4px 16px;gap:0' }, [fSl.el])])]),
      h('div', { cls: 'w-col', style: 'width:564px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding:8px 16px' }, [mSl.el, bSl.el, kSl.el]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:10px 14px' }, [h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [h('span', { text: 'Spectrum (sine tone):', style: 'font-weight:600;font-size:22px' }), sp.el]), spec.c]),
        h('div', { cls: 'w-card', style: 'padding:10px 16px' }, [form])])]));
    function msg(t) { // t in message periods, |m| <= 1
      var ph = t - Math.floor(t);
      if (st.shape === 'sine') return Math.sin(2 * Math.PI * t);
      if (st.shape === 'tri') return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
      return Math.tanh(6 * Math.sin(2 * Math.PI * t)) / Math.tanh(6);
    }
    function draw() {
      var g = trace.g, w = trace.w, hh = trace.h, P = 2, fcN = st.fcr; // 2 message periods, carrier = fcr × fm
      var rowsDef = [['Message m(t)', C.gray], ['AM: amplitude follows m(t)', C.orange], ['FM: frequency follows m(t)', C.blue], ['PM: phase follows m(t)', C.green]];
      var x0 = 20, x1 = w - 20, top = 8, K = rowsDef.length, rowH = (hh - top - 8) / K;
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      var steps = 2400, dt = P / steps, integ = 0;
      var amAmp = 1 / (1 + Math.max(st.m, 0.0001));
      rowsDef.forEach(function (rd, r) {
        var y0 = top + r * rowH, mid = y0 + rowH / 2 + 12, amp = rowH / 2 - 26;
        if (r % 2) { g.fillStyle = 'rgba(231,237,243,.45)'; g.fillRect(1, y0, w - 2, rowH); }
        g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(rd[0], x0 + 4, y0 + 24);
        g.strokeStyle = C.grid; g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.stroke();
        if (r === 1) { // envelope
          g.strokeStyle = 'rgba(166,79,21,.45)'; g.setLineDash([6, 6]); g.lineWidth = 2;
          [1, -1].forEach(function (sg) { g.beginPath(); for (var q = 0; q <= 400; q++) { var tq = q / 400 * P, e = (1 + st.m * msg(tq)) * amAmp; var X = x0 + tq / P * (x1 - x0), Y = mid - sg * e * amp; q ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke(); });
          g.setLineDash([]);
        }
        g.strokeStyle = rd[1]; g.lineWidth = r ? 2 : 4; g.beginPath(); integ = 0;
        for (var p = 0; p <= steps; p++) {
          var t = p * dt, m = msg(t), v;
          if (r === 0) v = m;
          else if (r === 1) v = (1 + st.m * m) * amAmp * Math.cos(2 * Math.PI * fcN * t);
          else if (r === 2) { v = Math.cos(2 * Math.PI * fcN * t + 2 * Math.PI * st.beta * integ); integ += m * dt; }
          else v = Math.cos(2 * Math.PI * fcN * t + st.kp * m);
          var X2 = x0 + t / P * (x1 - x0), Y2 = mid - v * amp;
          p ? g.lineTo(X2, Y2) : g.moveTo(X2, Y2);
        }
        g.stroke();
      });
      if (st.m > 1) { g.font = '600 22px ' + SANS; g.fillStyle = C.red; g.textAlign = 'right'; g.fillText('m > 1: overmodulation, the envelope no longer copies the message', x1 - 6, top + rowH + 24); }
      // spectrum for a sine tone
      var s = spec.g, sw = spec.w, sh = spec.h, B = st.fm, lines = [], label = '';
      s.clearRect(0, 0, sw, sh); s.fillStyle = '#fff'; s.fillRect(0, 0, sw, sh); s.strokeStyle = C.line; s.strokeRect(0.5, 0.5, sw - 1, sh - 1);
      var beta = st.spec === 'fm' ? st.beta : st.kp, Bw;
      if (st.spec === 'am') { lines = [[0, 1], [-1, st.m / 2], [1, st.m / 2]]; Bw = 2 * B; label = 'B = 2B = ' + fmtN(Bw, 1) + ' kHz'; }
      else { for (var k = -14; k <= 14; k++) lines.push([k, Math.abs(besselJ(k, beta))]); Bw = 2 * (1 + beta) * B; label = 'Carson: 2(1 + β)B = ' + fmtN(Bw, 1) + ' kHz'; }
      // absolute frequency axis, in units of fm (labels in kHz)
      var fcr = st.fcr, half = st.spec === 'am' ? 1 : (1 + beta), lo = fcr - half, hi = fcr + half;
      var xmax = Math.max(fcr + half + 3, 2 * half + 4), x0s = 34, x1s = sw - 16, base = sh - 40, hmax = base - 44;
      var XF = function (f) { return x0s + f / xmax * (x1s - x0s); };
      s.fillStyle = lo <= 0 ? 'rgba(192,57,43,.16)' : 'rgba(240,163,94,.22)'; s.fillRect(XF(Math.max(0, lo)), 34, XF(Math.min(xmax, hi)) - XF(Math.max(0, lo)), base - 34);
      s.strokeStyle = C.gray; s.lineWidth = 1; s.beginPath(); s.moveTo(x0s, base); s.lineTo(x1s, base); s.moveTo(x0s, base); s.lineTo(x0s, 34); s.stroke();
      lines.forEach(function (L) {
        var f = fcr + L[0]; if (f > xmax || L[1] < 0.01) return;
        var fold = f < 0, x = XF(Math.abs(f));
        s.strokeStyle = fold ? C.red : (L[0] === 0 ? C.navy : C.blue); s.lineWidth = 4;
        s.beginPath(); s.moveTo(x, base); s.lineTo(x, base - Math.min(1, L[1]) * hmax); s.stroke();
      });
      var stepT = Math.max(1, Math.ceil(xmax / 6));
      s.font = '500 17px ' + MONO; s.fillStyle = C.gray; s.textAlign = 'center';
      for (var tq = 0; tq <= xmax - stepT * 0.5; tq += stepT) s.fillText(fmtN(tq * B, 0), XF(tq), base + 20);
      s.textAlign = 'right'; s.fillText('kHz', x1s, base + 20);
      s.fillStyle = C.navy; s.textAlign = 'center'; s.font = '600 18px ' + SANS; s.fillText('fc', XF(fcr), base - hmax - 8);
      s.font = '600 19px ' + SANS; s.textAlign = 'left';
      if (lo <= 0) { s.fillStyle = C.red; s.fillText('Band reaches 0 Hz: fc must be above ' + fmtN(half * B, 1) + ' kHz', 10, 22); }
      else { s.fillStyle = C.orange; s.fillText(label + ', centred on fc', 10, 22); }
      // formulas
      var amB = 2 * B, fmB = 2 * (1 + st.beta) * B, pmB = 2 * (1 + st.kp) * B;
      form.innerHTML = 'fc = ' + st.fcr * B + ' kHz: band moves, width same\n' + 'AM: B = 2B = <b>' + fmtN(amB, 1) + ' kHz</b>, sidebands ' + fmtN(100 * (st.m * st.m / 2) / (1 + st.m * st.m / 2), 0) + '%\n' +
        'FM: B = 2(1 + β)B = <b>' + fmtN(fmB, 1) + ' kHz</b>\n' +
        'PM: B = 2(1 + β)B = <b>' + fmtN(pmB, 1) + ' kHz</b>';
    }
    shp.set('sine'); draw();
  };

  /* =====================================================================
     9. Nyquist: can the receiver rebuild the signal?
     ===================================================================== */
  function sincRebuild(xfn, fs, t, kmin, kmax) {
    var s = 0;
    for (var k = kmin; k <= kmax; k++) { var u = fs * t - k; s += xfn(k / fs) * (Math.abs(u) < 1e-9 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u)); }
    return s;
  }
  function aliasOf(f, fs) { var m = Math.round(f / fs); return Math.abs(f - m * fs); }
  W.nyquist = function (root) {
    var st = { f: 5, fs: 30, two: false };
    var tplot = canvas(1100, 400), fplot = canvas(1100, 250), form = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var fSl = slider('Signal frequency f', 1, 10, 0.5, 5, function (v) { return fmtN(v, 1) + ' Hz'; }, function (v) { st.f = v; draw(); });
    var sSl = slider('Sampling rate fs', 1, 40, 0.5, 30, function (v) { return fmtN(v, 1) + ' samples/s'; }, function (v) { st.fs = v; draw(); });
    var sig = seg([[false, 'One tone'], [true, 'Two tones (f and 2.4f)']], false, function (k) { st.two = k; draw(); });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:22px' }, [
      h('div', { cls: 'w-col', style: 'width:1100px;gap:10px' }, [tplot.c, fplot.c]),
      h('div', { cls: 'w-col', style: 'width:544px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px' }, [sig.el, h('div', { cls: 'w-btns' }, [
          btn('Slide example: 5 Hz at 6 /s', function () { st.f = 5; st.fs = 6; st.two = false; sig.set(false); fSl.set(5); sSl.set(6); draw(); }),
          btn('Exactly 2f', function () { st.fs = 2 * st.f; sSl.set(st.fs); draw(); })])]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:8px 18px' }, [fSl.el, sSl.el]),
        h('div', { cls: 'w-card', style: 'padding:12px 16px' }, [form]), verdict])]));
    var PH = 0.6; // phase so that sampling at exactly 2f is not trivially zero
    function comps() { var c = [[st.f, 1]]; if (st.two) c.push([2.4 * st.f, 0.6]); return c; }
    function xfn(t) { return comps().reduce(function (a, c) { return a + c[1] * Math.sin(2 * Math.PI * c[0] * t + PH); }, 0); }
    function draw() {
      var fs = st.fs, cs = comps(), fmax = Math.max.apply(null, cs.map(function (c) { return c[0]; }));
      var T0 = 0, T1 = 1, g = tplot.g, w = tplot.w, hh = tplot.h, x0 = 50, x1 = w - 16, ymid = hh / 2 + 6, A = (hh / 2 - 40) / (st.two ? 1.7 : 1.15);
      var X = function (t) { return x0 + (t - T0) / (T1 - T0) * (x1 - x0); };
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.strokeStyle = C.grid; g.beginPath(); g.moveTo(x0, ymid); g.lineTo(x1, ymid); g.stroke();
      // original
      g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath();
      for (var p = 0; p <= 900; p++) { var t = T0 + (T1 - T0) * p / 900; p ? g.lineTo(X(t), ymid - xfn(t) * A) : g.moveTo(X(t), ymid - xfn(t) * A); }
      g.stroke();
      // reconstruction (ideal low-pass at fs/2): sum of sinc pulses
      var kmin = Math.floor((T0 - 30) * fs), kmax = Math.ceil((T1 + 30) * fs), err = 0, pw = 0, pts = [];
      for (var q = 0; q <= 450; q++) { var tq = T0 + (T1 - T0) * q / 450, r = sincRebuild(xfn, fs, tq, kmin, kmax); pts.push([tq, r]); var e = r - xfn(tq); err += e * e; pw += xfn(tq) * xfn(tq); }
      g.strokeStyle = C.orange; g.lineWidth = 4; g.setLineDash([12, 7]); g.beginPath();
      pts.forEach(function (pt, i) { i ? g.lineTo(X(pt[0]), ymid - pt[1] * A) : g.moveTo(X(pt[0]), ymid - pt[1] * A); }); g.stroke(); g.setLineDash([]);
      // samples
      for (var k = Math.ceil(T0 * fs); k / fs <= T1 + 1e-9; k++) {
        var tk = k / fs, v = xfn(tk);
        g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(X(tk), ymid); g.lineTo(X(tk), ymid - v * A); g.stroke();
        g.fillStyle = C.red; g.beginPath(); g.arc(X(tk), ymid - v * A, 6, 0, 7); g.fill();
      }
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('time: 0 to 1 s', x0, hh - 12);
      g.textAlign = 'right'; g.fillText('blue: original · red: samples · orange dashed: what the receiver rebuilds (ideal low-pass at fs/2)', x1, 24);
      // spectrum
      var s = fplot.g, sw = fplot.w, sh = fplot.h, fx0 = 50, fx1 = sw - 20, base = sh - 44, Fm = Math.max(3 * fs, 2.2 * fmax, 20), Fx = function (f) { return fx0 + f / Fm * (fx1 - fx0); };
      s.clearRect(0, 0, sw, sh); s.fillStyle = C.panel; s.fillRect(0, 0, sw, sh); s.strokeStyle = C.line; s.strokeRect(0.5, 0.5, sw - 1, sh - 1);
      s.fillStyle = 'rgba(240,163,94,.25)'; s.fillRect(Fx(0), 30, Fx(fs / 2) - Fx(0), base - 30);
      s.font = '600 20px ' + SANS; s.fillStyle = C.orange; s.textAlign = 'left'; s.fillText('receiver keeps 0 to fs/2', Fx(0) + 6, 50);
      s.strokeStyle = C.gray; s.lineWidth = 1; s.beginPath(); s.moveTo(fx0, base); s.lineTo(fx1, base); s.stroke();
      s.font = '500 18px ' + MONO; s.fillStyle = C.gray; s.textAlign = 'center';
      for (var tk2 = 0; tk2 <= Fm - (Fm > 60 ? 8 : 4); tk2 += Fm > 60 ? 20 : 10) s.fillText(tk2, Fx(tk2), base + 22);
      s.textAlign = 'right'; s.fillText('Hz', fx1, base + 22);
      [1, 2, 3].forEach(function (m) { if (m * fs <= Fm) { s.strokeStyle = '#c9d1d9'; s.setLineDash([4, 5]); s.beginPath(); s.moveTo(Fx(m * fs), 30); s.lineTo(Fx(m * fs), base); s.stroke(); s.setLineDash([]); s.fillStyle = C.gray; s.textAlign = 'center'; s.fillText(m === 1 ? 'fs' : m + 'fs', Fx(m * fs), 24); } });
      cs.forEach(function (c) {
        for (var m = 0; m * fs - c[0] <= Fm; m++) {
          [m * fs - c[0], m * fs + c[0]].forEach(function (fr, idx) {
            if (fr < 0 || fr > Fm || (m === 0 && idx === 0)) return;
            var orig = m === 0, inBand = fr <= fs / 2 + 1e-9, col = orig ? C.blue : (inBand ? C.red : '#9fb4c9'), hgt = (base - 96) * c[1];
            s.strokeStyle = col; s.lineWidth = orig || inBand ? 6 : 4; s.beginPath(); s.moveTo(Fx(fr), base); s.lineTo(Fx(fr), base - hgt); s.stroke();
            if (!orig && inBand) { s.fillStyle = C.red; s.font = '600 18px ' + SANS; s.textAlign = 'center'; s.fillText('image ' + fmtN(fr, 1) + ' Hz', Fx(fr), base - hgt - 8); }
          });
        }
      });
      // formulas and verdict
      var ok = fs > 2 * fmax + 1e-9, edge = Math.abs(fs - 2 * fmax) < 1e-9, rel = Math.sqrt(err / Math.max(pw, 1e-9)) * 100;
      var al = cs.map(function (c) { return fmtN(aliasOf(c[0], fs), 1); });
      form.innerHTML = 'fmax = ' + fmtN(fmax, 1) + ' Hz → Nyquist rate <b>' + fmtN(2 * fmax, 1) + ' /s</b>\nfs = ' + fmtN(fs, 1) + ' /s,  fs/2 = ' + fmtN(fs / 2, 2) + ' Hz\n' +
        'Receiver rebuilds: <b>' + al.join(' Hz + ') + ' Hz</b>\nError of the rebuilt wave: <b>' + fmtN(rel, 1) + '%</b> (RMS)';
      if (ok && rel < 5) { verdict.className = 'w-verdict ok'; verdict.textContent = 'fs > 2fmax: the samples rebuild the original exactly (the small error is only because the sum is cut off).'; }
      else if (edge) { verdict.className = 'w-verdict warn'; verdict.textContent = 'fs = 2fmax exactly: the result depends on where the samples land (phase). Not safe: sample above 2fmax.'; }
      else { verdict.className = 'w-verdict bad'; verdict.textContent = 'fs < 2fmax: an image falls inside 0 to fs/2, so the receiver rebuilds a different, slower wave (an alias). The original is lost.'; }
    }
    draw();
  };

  /* ---------- mount ---------- */
  if (typeof window !== 'undefined') {
    window.DC_WIDGETS = W;
    /* toolkit for widget files in assets/widgets/*.js: DCW.register('name', function (root) {...}) */
    window.DCW = { W: W, register: function (n, f) { W[n] = f; }, h: h, canvas: canvas, slider: slider, btn: btn, seg: seg,
      fx: fx, fmtN: fmtN, bin: bin, xor: xor, C: C, SANS: SANS, MONO: MONO, bitRow: bitRow, randBits: randBits, besselJ: besselJ };
  }
  function mount() {
    [].forEach.call(document.querySelectorAll('[data-widget]'), function (el) {
      var f = W[el.getAttribute('data-widget')];
      if (f && !el.__mounted) { el.__mounted = true; try { f(el); } catch (e) { el.textContent = 'Widget error: ' + e.message; if (window.console) console.error(e); } }
    });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount(); }
  if (typeof module !== 'undefined') module.exports = { LC: LC, lcStats: lcStats, besselJ: besselJ, sincRebuild: sincRebuild, aliasOf: aliasOf, pcmQuant: pcmQuant, pcmSamples: pcmSamples, PCM_PRE: PCM_PRE, qamSym: qamSym, hamEnc: hamEnc, hamDec: hamDec, crcDivide: crcDivide, polyStr: polyStr };
})();
