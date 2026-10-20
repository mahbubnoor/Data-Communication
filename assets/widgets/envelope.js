(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var FM = 1000, AC = 6, TW = 2 / FM; // message 1 kHz, carrier amplitude 6 V, window = 2 message cycles

  // s(t) = Ac[1 + m cos(2π fm t)] cos(2π fc t)  (am.html). Envelope detector: ideal diode + RC:
  // the capacitor charges to the input when the input is higher, otherwise discharges as e^(−t/RC).
  function sim(m, ratio, RC) {
    var fc = ratio * FM, dt = 1 / (fc * 48), n0 = Math.round(1 / FM / dt), N = Math.round(TW / dt), v = 0, out = [];
    var drop = 0, rise = 0, decay = Math.exp(-dt / RC);
    for (var i = -n0; i <= N; i++) {
      var t = i * dt, msg = AC * (1 + m * Math.cos(2 * Math.PI * FM * t)), s = msg * Math.cos(2 * Math.PI * fc * t);
      v = Math.max(s, v * decay);
      if (i >= 0) {
        var env = Math.abs(msg);
        out.push({ t: t, s: s, r: Math.max(0, s), v: v, msg: msg, env: env });
        rise = Math.max(rise, v - env);              // output above the envelope: cannot follow it down (diagonal clipping)
      }
    }
    // ripple: the largest sag of the output below the envelope, relative to the carrier amplitude
    for (var k = 0; k < out.length; k++) drop = Math.max(drop, out[k].env - out[k].v); // how far below the envelope it sags before the next peak
    var maxRC = m > 0 && m < 1 ? Math.sqrt(1 - m * m) / (2 * Math.PI * FM * m) : (m === 0 ? Infinity : 0);
    // carrier ripple: fraction of its charge the capacitor loses in one carrier period, 1 − e^(−Tc/RC)
    return { fc: fc, pts: out, sag: drop / AC, ripple: 1 - Math.exp(-1 / (fc * RC)), clip: rise / AC, maxRC: maxRC };
  }
  function verdictOf(m, R) {
    if (m > 1) return 'over';
    if (R.clip > 0.06) return 'clip';
    if (R.ripple > 0.2) return 'ripple';
    return 'ok';
  }
  var PRE = { m05: { m: 0.5 }, m1: { m: 1 }, m14: { m: 1.4 }, amx: { m: 2 / 3 } };

  D.register('envelope', function (root) {
    var st = { m: 0.5, ratio: 50, lrc: Math.log10(150) }; // RC stored as log10(µs)
    var cv = D.canvas(1080, 846), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' }), verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    var mSl = D.slider('Modulation index m', 0, 1.5, 0.01, st.m, function (v) { return fmtN(v, 2) + (v > 1 ? ' (over!)' : ''); }, function (v) { st.m = v; pre.set(''); draw(); });
    var fSl = D.slider('Carrier fc / message fm', 5, 100, 1, st.ratio, function (v) { return v + ' (fc = ' + v + ' kHz)'; }, function (v) { st.ratio = v; draw(); });
    var rSl = D.slider('RC time constant', 0.5, 4, 0.01, st.lrc, function (v) { return fmtUs(Math.pow(10, v)); }, function (v) { st.lrc = v; draw(); });
    var pre = D.seg([['m05', 'm = 0.5'], ['m1', 'm = 1'], ['m14', 'm = 1.4'], ['amx', '10 V / 2 V']], 'm05', function (k) { st.m = PRE[k].m; mSl.set(st.m); draw(); });
    function setRC(us) { st.lrc = Math.log10(us); rSl.set(st.lrc); draw(); }
    var rcB = h('div', { cls: 'w-btns' }, [
      D.btn('RC too small', function () { setRC(1e6 / (st.ratio * FM)); }),
      D.btn('RC good', function () { var R = sim(st.m, st.ratio, 1), good = 1e6 * Math.sqrt(1 / (st.ratio * FM * FM)); if (st.m > 0 && st.m < 1) good = Math.min(good, R.maxRC * 1e6 * 0.8); setRC(Math.max(3.2, good)); }),
      D.btn('RC too large', function () { setRC(2e6 / FM); })]);
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Slide examples (amindex)' }), pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:4px 20px 10px' }, [mSl.el, fSl.el, rSl.el, rcB]),
        h('div', { cls: 'w-card', style: 'padding:8px 18px' }, [form]), verdict])]));

    function fmtUs(us) { return us >= 1000 ? fmtN(us / 1000, 2) + ' ms' : fmtN(us, us < 10 ? 1 : 0) + ' µs'; }

    function draw() {
      var RC = Math.pow(10, st.lrc) * 1e-6, R = sim(st.m, st.ratio, RC), P = R.pts, vd = verdictOf(st.m, R);
      var g = cv.g, W = cv.w, H = cv.h;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var x0 = 20, x1 = W - 20, X = function (t) { return x0 + t / TW * (x1 - x0); };
      var vmax = AC * Math.max(1.5, 1 + st.m) * 1.06;
      var lo = Math.min(0, AC * (1 - st.m)) * 1.1; // half panels: from the most negative message value up to vmax
      function panel(y0, hh, title, sub, half) {
        g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(title, x0, y0 + 22);
        g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(sub, x1, y0 + 22);
        var top = y0 + 34, bot = y0 + hh, a = half ? (bot - 8 - top) / (vmax - lo) : (bot - top) / 2 / vmax, ymid = half ? bot - 8 + lo * a : (top + bot) / 2;
        g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, ymid); g.lineTo(x1, ymid); g.stroke();
        return function (v) { return ymid - Math.max(half ? lo : -vmax, Math.min(vmax, v)) * a; };
      }
      function trace(Y, key, col, lw, dash, sign) {
        g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.beginPath();
        for (var i = 0; i < P.length; i++) { var y = Y((sign || 1) * P[i][key]); i ? g.lineTo(X(P[i].t), y) : g.moveTo(X(P[i].t), y); }
        g.stroke(); g.setLineDash([]);
      }
      // 1: AM signal
      var Y1 = panel(6, 290, '1  AM signal s(t) = Ac[1 + m cos 2πfm t] cos 2πfc t', 'dashed: envelope (Ac = 6 V)', false);
      trace(Y1, 's', C.orange, 1.4); trace(Y1, 'msg', C.blue, 3, [10, 7]); trace(Y1, 'msg', C.blue, 3, [10, 7], -1);
      // 2: after the diode
      var Y2 = panel(306, 230, '2  After the diode: only the top half is kept', '', true);
      trace(Y2, 'r', C.orange, 1.4);
      // 3: RC output vs message
      var Y3 = panel(546, 262, '3  RC filter output vs the original message', '', true);
      g.fillStyle = 'rgba(166,79,21,0.08)';
      trace(Y3, 'r', '#ead7c6', 1);
      trace(Y3, 'msg', C.blue, 3, [10, 7]); trace(Y3, 'v', vd === 'ok' ? C.green : C.red, 3.5);
      // legend for panel 3
      g.font = '600 20px ' + SANS; g.textAlign = 'right';
      g.fillStyle = vd === 'ok' ? C.green : C.red; g.fillText('solid: detector output', x1 - 300, 546 + 22);
      g.fillStyle = C.blue; g.fillText('dashed: message', x1, 546 + 22);
      // zero line labels
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'left';
      g.fillText('0', x0 + 2, Y2(0) - 6); g.fillText('0', x0 + 2, Y3(0) - 6);
      g.textAlign = 'center'; g.fillText('time →  (2 message cycles = 2 ms; fm = 1 kHz)', W / 2, H - 10);

      // formulas
      var Tc = 1e6 / R.fc, Tm = 1e6 / FM, rcu = RC * 1e6, amax = AC * (1 + st.m), amin = AC * (1 - st.m);
      var okL = R.ripple <= 0.2, okR = R.clip <= 0.06;
      var lines = [];
      if (st.m <= 1) lines.push('m = (Amax − Amin)/(Amax + Amin)\n  = (' + fmtN(amax, 1) + ' − ' + fmtN(amin, 1) + ')/(' + fmtN(amax, 1) + ' + ' + fmtN(amin, 1) + ') = <b>' + fmtN(st.m, 2) + '</b>');
      else lines.push('m = ' + fmtN(st.m, 2) + ' > 1: Amin = 6(1 − ' + fmtN(st.m, 2) + ') = ' + fmtN(amin, 1) + ' V\n  is negative: the envelope folds');
      lines.push('1/fc ≪ RC ≪ 1/fm\n' + fmtUs(Tc) + ' <span class="' + (okL ? 'ok' : 'bad') + '">' + (okL ? '≪' : 'not ≪') + '</span> <b>' + fmtUs(rcu) + '</b> <span class="' + (okR ? 'ok' : 'bad') + '">' + (okR ? '≪' : 'not ≪') + '</span> ' + fmtUs(Tm));
      lines.push('ripple = 1 − e^(−(1/fc)/RC)\n  = 1 − e^(−' + fmtN(Tc, 1) + '/' + fmtN(rcu, 0) + ') = <b>' + Math.round(R.ripple * 100) + '%</b>');
      if (st.m > 0 && st.m < 1) lines.push('no clipping: RC ≤ √(1−m²)/(2π·fm·m)\n  = √(1−' + fmtN(st.m * st.m, 3) + ')/(2π·1000·' + fmtN(st.m, 2) + ')\n  = ' + fmtUs(R.maxRC * 1e6));
      form.innerHTML = lines.join('\n');
      var msgs = { ok: ['ok', 'The output follows the envelope: the message is back.'],
        ripple: ['bad', 'RC too small: the capacitor empties between peaks, so the output ripples at fc.'],
        clip: ['bad', 'RC too large: the output cannot fall with the message (diagonal clipping).'],
        over: ['bad', 'm > 1: the detector follows |1 + m cos|, not the message, so it is distorted whatever RC is.'] };
      verdict.className = 'w-verdict ' + msgs[vd][0]; verdict.textContent = msgs[vd][1];
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { sim: sim, verdictOf: verdictOf };
})();
