/* Try it: signals from real-world sources in both domains (Lecture 2, after the "real sounds" slide) */
(function () {
  'use strict';
  var TAU = 2 * Math.PI;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function fmt(x, d) { var s = (+x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d }); return s.replace('-', '−'); }
  /* band-limited random wave: many sines between f1 and f2 with random phases (seeded) */
  function bandWave(f1, f2, n, seed) { var r = rng(seed), c = []; for (var i = 0; i < n; i++) c.push([f1 + (f2 - f1) * r(), TAU * r(), 0.6 + 0.4 * r()]); var s = 0; c.forEach(function (q) { s += q[2] * q[2] / 2; }); var k = 1 / Math.sqrt(s);
    return function (t) { var v = 0; for (var i = 0; i < c.length; i++) v += c[i][2] * Math.sin(TAU * c[i][0] * t + c[i][1]); return v * k; }; }

  /* ---------- the six sources. gen(p) returns the samples and what to mark ---------- */
  var SRC = {
    mains: { name: 'Mains power', sensor: 'Voltage probe on a wall socket', qty: 'voltage', unit: 'V', fs: 10000, dur: 0.2, db: true,
      t: { scale: 1000, unit: 'ms', view: 0.06, step: 10 }, f: { scale: 1, unit: 'Hz', lo: 0, hi: 600, step: 100 },
      params: [{ key: 'k', label: 'Non-linear loads (LED lights, PC chargers)', min: 0, max: 100, step: 5, val: 40, fmt: function (v) { return v + ' %'; } }],
      gen: function (p) {
        var V1 = 220 * Math.SQRT2, H = [[3, 0.06], [5, 0.04], [7, 0.025], [9, 0.015]], k = p.k / 100, n = Math.round(this.fs * this.dur), x = new Float64Array(n);
        for (var i = 0; i < n; i++) { var t = i / this.fs, v = V1 * Math.sin(TAU * 50 * t); for (var j = 0; j < H.length; j++) v += k * H[j][1] * V1 * Math.sin(TAU * 50 * H[j][0] * t); x[i] = v; }
        var hv = H.map(function (q) { return k * q[1] * V1; }), thd = Math.sqrt(hv.reduce(function (s, v) { return s + v * v; }, 0)) / V1;
        var fm = [{ f: 50, l: '50 Hz: fundamental' }];
        if (k > 0) H.forEach(function (q, j) { fm.push({ f: 50 * q[0], l: ['150 Hz: 3rd', '250 Hz: 5th', '7th', '9th'][j] }); });
        return { x: x, fm: fm,
          read: 'V_peak = 220 × √2 = <b>311 V</b><br>T = 1/50 = <b>20 ms</b><br>harmonics: 3×50, 5×50 … = 150, 250 … Hz<br>THD = √(V₃² + V₅² + V₇² + V₉²) / V₁<br>&nbsp;&nbsp;= √(' + hv.map(function (v) { return fmt(v, 1) + '²'; }).join(' + ') + ') / 311<br>&nbsp;&nbsp;= <b>' + fmt(thd * 100, 1) + ' %</b> <span class="' + (thd <= 0.08 ? 'ok' : 'bad') + '">(limit 8 %)</span>',
          tt: 'Peak 311 V and period 20 ms (50 Hz). The distortion only flattens the tops slightly: at ' + fmt(thd * 100, 1) + ' % it is hard to see.',
          ft: 'Each extra line at 150, 250, 350 … Hz is distortion caused by non-linear loads. Their heights measure it (THD), which is how power companies monitor supply quality.' };
      } },
    ecg: { name: 'Heartbeat (ECG)', sensor: 'Electrodes on the chest (electrocardiogram)', qty: 'voltage', unit: 'mV', fs: 250,
      t: { scale: 1, unit: 's', view: 4, step: 1 }, f: { scale: 1, unit: 'Hz', lo: 0, hi: 60, step: 10 },
      params: [{ key: 'hr', label: 'Heart rate', min: 40, max: 180, step: 1, val: 72, fmt: function (v) { return v + ' beats/min'; } },
        { key: 'hum', label: '50 Hz interference from the mains', min: 0, max: 0.3, step: 0.05, val: 0, fmt: function (v) { return v ? fmt(v, 2) + ' mV' : 'off'; } }],
      gen: function (p) {
        var f0 = p.hr / 60, T = 1 / f0, nb = Math.max(4, Math.round(8 / T)), dur = nb * T, n = Math.round(dur * this.fs), x = new Float64Array(n), r = rng(3);
        var sc = Math.max(0.6, Math.min(1.2, Math.sqrt(T / 0.833))); // P–R and Q–T intervals shorten at high heart rates
        var W = [[0.15, -0.16 * sc, 0.022 * sc], [-0.12, -0.035, 0.01], [1.1, 0, 0.012], [-0.28, 0.035, 0.012], [0.32, 0.26 * sc, 0.042 * sc]];
        for (var i = 0; i < n; i++) {
          var t = i / this.fs, ph = ((t + T / 2) % T + T) % T - T / 2, v = 0; // R peaks at 0, T, 2T, …
          for (var sh = -1; sh <= 1; sh++) for (var j = 0; j < W.length; j++) { var d = ph + sh * T - W[j][1]; v += W[j][0] * Math.exp(-d * d / (2 * W[j][2] * W[j][2])); }
          x[i] = v + p.hum * Math.sin(TAU * 50 * t) + 0.01 * gauss(r);
        }
        var fm = [{ f: f0, l: 'f₀ = ' + fmt(f0, 2) + ' Hz: heart rate (lines every f₀)', top: true }];
        if (p.hum > 0) fm.push({ f: 50, l: '50 Hz: mains interference' });
        var r1 = T; // R peaks at 0, T, 2T …: mark the second beat
        return { x: x, fm: fm, tm: [{ t: r1 + W[0][1], l: 'P' }, { t: r1, l: 'QRS' }, { t: r1 + W[4][1], l: 'T' }],
          read: 'heart rate = ' + p.hr + ' beats/min<br>f₀ = ' + p.hr + ' / 60 = <b>' + fmt(f0, 2) + ' Hz</b><br>T = 1/f₀ = <b>' + fmt(T, 3) + ' s</b> (R to R)<br>lines at f₀, 2f₀, 3f₀ … = ' + fmt(f0, 2) + ', ' + fmt(2 * f0, 2) + ', ' + fmt(3 * f0, 2) + ' … Hz<br>' + (p.hum > 0 ? 'interference: one line at <b>50 Hz</b>' : 'ECG band used by monitors: 0.5–40 Hz'),
          tt: 'The shape of every beat (P wave, QRS complex, T wave) and its timing. Doctors diagnose from this shape, e.g. a QRS wider than about 0.12 s.' + (p.hum > 0 ? ' The 50 Hz interference blurs the trace.' : ''),
          ft: 'The heart rate is the spacing of the lines (f₀ = ' + fmt(f0, 2) + ' Hz). ' + (p.hum > 0 ? 'The interference is one separate spike at 50 Hz: a notch filter removes it without touching the heartbeat.' : 'Turn on the 50 Hz interference: it appears as one separate spike.') };
      } },
    temp: { name: 'Temperature', sensor: 'Weather station, one reading per hour for 14 days', qty: 'temperature', unit: '°C', fs: 1 / 3600, dur: 14 * 86400, demean: true,
      t: { scale: 1 / 86400, unit: 'days', view: 14 * 86400, step: 2 }, f: { scale: 86400, unit: 'cycles/day', lo: 0, hi: 4 / 86400, step: 1 },
      params: [{ key: 'sw', label: 'Daily swing (night to afternoon)', min: 2, max: 14, step: 1, val: 8, fmt: function (v) { return v + ' °C'; } }],
      gen: function (p) {
        var n = 336, x = new Float64Array(n), r = rng(11);
        for (var i = 0; i < n; i++) { var hr = i, d = hr / 24; x[i] = 27 + p.sw / 2 * Math.cos(TAU * (hr - 15) / 24) + 0.18 * p.sw * Math.cos(2 * TAU * (hr - 13) / 24) + 1.6 * Math.sin(TAU * d / 5 + 1) + 0.3 * gauss(r); }
        var day = 1 / 86400;
        return { x: x, fm: [{ f: day / 5, l: '0.2: weather (5 days)' }, { f: day, l: '1 cycle/day: day and night' }, { f: 2 * day, l: '2: day is not a pure sine' }],
          read: 'f = 1 cycle/day = 1 / 86,400 s<br>&nbsp;&nbsp;= <b>11.6 µHz</b><br>amplitude = swing / 2 = ' + p.sw + ' / 2 = <b>' + fmt(p.sw / 2, 1) + ' °C</b><br>weather cycle: 1 / 5 days = <b>0.2 cycles/day</b><br>average (DC) = <b>27 °C</b>, removed from the spectrum',
          tt: 'Today\'s temperature, when the hottest hour is (about 3 pm) and the record high and low.',
          ft: 'The strong daily rhythm (1 cycle/day), its non-sine shape (2 cycles/day) and the slow weather changes near 0.2 cycles/day. Frequency need not be in Hz: here it is cycles per day.' };
      } },
    vib: { name: 'Machine vibration', sensor: 'Accelerometer on a fan motor (5 blades)', qty: 'acceleration', unit: 'm/s²', fs: 4096, dur: 1,
      t: { scale: 1000, unit: 'ms', view: 0.25, step: 50 }, f: { scale: 1, unit: 'Hz', lo: 0, hi: 400, step: 50 },
      params: [{ key: 'rpm', label: 'Motor speed', min: 600, max: 3000, step: 30, val: 1470, fmt: function (v) { return v.toLocaleString('en-US') + ' rpm'; } },
        { key: 'dmg', label: 'Bearing damage', min: 0, max: 100, step: 10, val: 0, fmt: function (v) { return v ? v + ' %' : 'none'; } }],
      gen: function (p) {
        var fr = p.rpm / 60, bp = 3.58 * fr, a = p.dmg / 100, n = this.fs * this.dur, x = new Float64Array(n), r = rng(5), s2 = 0;
        for (var i = 0; i < n; i++) { var t = i / this.fs;
          x[i] = Math.sin(TAU * fr * t) + 0.35 * Math.sin(TAU * 2 * fr * t + 1) + 0.6 * Math.sin(TAU * 5 * fr * t + 2) + a * (0.9 * Math.sin(TAU * bp * t) + 0.5 * Math.sin(TAU * 2 * bp * t + 1) + 0.3 * Math.sin(TAU * 3 * bp * t + 2)) + 0.8 * gauss(r);
          s2 += x[i] * x[i]; }
        var rms = Math.sqrt(s2 / n), fm = [{ f: fr, l: '1×: shaft speed' }, { f: 2 * fr, l: '2×: misalignment' }, { f: 5 * fr, l: '5×: blade pass' }];
        if (a > 0) fm.push({ f: bp, l: '3.58×: bearing fault' });
        return { x: x, fm: fm,
          read: 'f_shaft = ' + p.rpm.toLocaleString('en-US') + ' / 60 = <b>' + fmt(fr, 1) + ' Hz</b><br>blade pass = 5 × ' + fmt(fr, 1) + ' = <b>' + fmt(5 * fr, 1) + ' Hz</b><br>bearing fault line = 3.58 × ' + fmt(fr, 1) + ' = <b>' + fmt(bp, 1) + ' Hz</b><br>overall level (time domain):<br>&nbsp;&nbsp;RMS = √(mean x²) = <b>' + fmt(rms, 2) + ' m/s²</b>',
          tt: 'The overall vibration level (RMS = ' + fmt(rms, 2) + ' m/s²). With so much random noise, a small fault hardly changes the waveform or the RMS.',
          ft: 'Every line has a cause: shaft speed, misalignment, blades. ' + (a > 0 ? 'Bearing damage adds a new line at 3.58 × shaft speed, long before the machine fails (predictive maintenance).' : 'Raise "Bearing damage": a new line appears at 3.58 × shaft speed.') };
      } },
    radio: { name: 'AM radio', sensor: 'Antenna of a radio receiver', qty: 'voltage', unit: 'µV', fs: 4e6, dur: 0.002,
      t: { scale: 1e6, unit: 'µs', view: 40e-6, step: 10 }, f: { scale: 1e-3, unit: 'kHz', lo: 550e3, hi: 1150e3, step: 100, sparse: true },
      params: [{ key: 'ns', label: 'Stations on air', min: 1, max: 5, step: 1, val: 3, fmt: function (v) { return v; } },
        { key: 'tune', label: 'Tune the receiver to', min: 1, max: 5, step: 1, val: 2, fmt: function (v) { return (510 + 120 * v) + ' kHz'; } }],
      stations: [630e3, 750e3, 870e3, 990e3, 1110e3],
      gen: function (p) {
        var n = Math.round(this.fs * this.dur), x = new Float64Array(n), st = this.stations.slice(0, p.ns), A = [60, 45, 70, 50, 40], msg = [[2000, 3500, 5000], [2500, 4000], [2000, 5000], [3000, 4500], [2500, 3500, 5000]];
        for (var i = 0; i < n; i++) { var t = i / this.fs, v = 0;
          for (var s = 0; s < st.length; s++) { var m = 0; for (var q = 0; q < msg[s].length; q++) m += Math.sin(TAU * msg[s][q] * t + s + q); v += A[s] * (1 + 0.6 * m / msg[s].length) * Math.cos(TAU * st[s] * t + s); }
          x[i] = v; }
        var tu = Math.min(p.tune, p.ns) - 1, fc = this.stations[tu], top = Math.max.apply(null, msg[tu]);
        return { x: x, fm: st.map(function (f) { return { f: f, l: f / 1000 + ' kHz' }; }), band: [fc - 5000, fc + 5000],
          read: 'stations: ' + st.map(function (f) { return f / 1000; }).join(', ') + ' kHz<br>tuned to <b>' + fc / 1000 + ' kHz</b><br>its message: tones up to ' + top / 1000 + ' kHz<br>AM: B = 2 × B_m = 2 × ' + top / 1000 + ' = <b>' + 2 * top / 1000 + ' kHz</b><br>slot used: ' + (fc - 5000) / 1000 + ' to ' + (fc + 5000) / 1000 + ' kHz',
          tt: 'At the antenna all ' + p.ns + ' station' + (p.ns > 1 ? 's add' : ' arrives') + ' into one voltage. ' + (p.ns > 1 ? 'The waveform is a jumble: no single station can be read from it.' : 'One station alone: a carrier whose height follows the message.'),
          ft: 'Each station sits in its own 10 kHz slot, so the stations never overlap. Tuning a radio means keeping one slot and rejecting the others: FDM (Lecture 9). The width 2 × B_m is the AM rule of Lecture 8.', tune: fc };
      } },
    quake: { name: 'Earthquake', sensor: 'Seismometer, ground velocity, 50 readings per second', qty: 'ground velocity', unit: 'mm/s', fs: 50, dur: 200,
      t: { scale: 1, unit: 's', view: 200, step: 40 }, f: { scale: 1, unit: 'Hz', lo: 0, hi: 10, step: 2 }, cont: true,
      params: [{ key: 'd', label: 'Distance to the earthquake', min: 20, max: 500, step: 10, val: 200, fmt: function (v) { return v + ' km'; } }],
      gen: function (p) {
        var n = this.fs * this.dur, x = new Float64Array(n), r = rng(17), t0 = 5, tP = t0 + p.d / 6, tS = t0 + p.d / 3.5, tL = t0 + p.d / 3, g = Math.min(2, 150 / p.d);
        var wp = bandWave(3, 8, 40, 21), ws = bandWave(1, 4, 40, 22), wl = bandWave(0.2, 0.8, 25, 23);
        function env(t, a, rise, tau) { return t < a ? 0 : (1 - Math.exp(-(t - a) / rise)) * Math.exp(-(t - a) / tau); }
        for (var i = 0; i < n; i++) { var t = i / this.fs; x[i] = g * (0.35 * env(t, tP, 0.3, 5) * wp(t) + 1.0 * env(t, tS, 0.6, 9) * ws(t) + 0.8 * env(t, tL, 3, 18) * wl(t)) + 0.02 * gauss(r); }
        return { x: x, tm: [{ t: tP, l: 'P' }, { t: tS, l: 'S' }, { t: tL, l: 'surface' }], fb: [[0.2, 0.8, 'surface'], [1, 4, 'S waves'], [3, 8, 'P waves']],
          read: 'P waves travel 6 km/s, S waves 3.5 km/s<br>t_S − t_P = ' + fmt(tS - tP, 1) + ' s<br>d = (t_S − t_P) × 6 × 3.5 / (6 − 3.5)<br>&nbsp;&nbsp;= ' + fmt(tS - tP, 1) + ' × 8.4 = <b>' + fmt((tS - tP) * 8.4, 0) + ' km</b>',
          tt: 'WHEN each wave arrived. The gap between the P and S arrivals gives the distance: d ≈ 8.4 × (t_S − t_P). Three stations locate the earthquake.',
          ft: 'A one-off event has a continuous spectrum. It shows which frequencies shake the ground (tall buildings sway at low frequencies), but it cannot say when the waves arrived.' };
      } }
  };
  var ORDER = ['mains', 'ecg', 'temp', 'vib', 'radio', 'quake'];

  /* Blackman-windowed amplitude spectrum at chosen frequencies (Hz): 2|Σ w x e^(−j2πfn/fs)| / Σ w */
  function spectrum(x, fs, freqs, demean) {
    var n = x.length, w = new Float64Array(n), sw = 0, mean = 0, i;
    for (i = 0; i < n; i++) { w[i] = 0.42 - 0.5 * Math.cos(TAU * i / (n - 1)) + 0.08 * Math.cos(2 * TAU * i / (n - 1)); sw += w[i]; mean += x[i]; }
    mean /= n; var y = new Float64Array(n); for (i = 0; i < n; i++) y[i] = (x[i] - (demean ? mean : 0)) * w[i];
    return freqs.map(function (f) {
      var c = Math.cos(TAU * f / fs), s = -Math.sin(TAU * f / fs), pr = 1, pi = 0, re = 0, im = 0;
      for (var k = 0; k < n; k++) { re += y[k] * pr; im += y[k] * pi; var t = pr * c - pi * s; pi = pr * s + pi * c; pr = t; }
      return (f === 0 ? 1 : 2) * Math.hypot(re, im) / sw;
    });
  }
  function grid(S, p, out) {
    var f = S.f, fs = [];
    if (f.sparse) { // radio: fine steps near each station, coarse elsewhere
      for (var v = f.lo; v <= f.hi; v += 5000) fs.push(v);
      S.stations.slice(0, p.ns).forEach(function (c) { for (var d = -9000; d <= 9000; d += 250) fs.push(c + d); });
      fs.sort(function (a, b) { return a - b; });
    } else for (var i = 0; i <= 600; i++) fs.push(f.lo + (f.hi - f.lo) * i / 600);
    return fs;
  }

  if (typeof window === 'undefined' || !window.DCW) {
    if (typeof module !== 'undefined') module.exports = { SRC: SRC, spectrum: spectrum, grid: grid };
    return;
  }
  var D = window.DCW, h = D.h, C = D.C;

  D.register('sources', function (root) {
    var st = { src: 'mains', p: {}, db: false };
    var cv = D.canvas(1080, 600), g = cv.g, W = cv.w, H = cv.h, SPLIT = 262, pl = 84, pr = 22;
    var info = h('p', { style: 'margin:0;font-size:22px;color:' + C.gray + ';line-height:1.35' });
    var ctl = h('div', { cls: 'w-col', style: 'gap:0' }), fbox = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45' });
    var tTell = h('p', { style: 'margin:0;font-size:22px;line-height:1.35' }), fTell = h('p', { style: 'margin:0;font-size:22px;line-height:1.35' });
    var srcSeg = D.seg(ORDER.map(function (k) { return [k, SRC[k].name]; }), st.src, function (k) { setSrc(k); draw(); });
    var dbSeg = D.seg([['lin', 'Linear'], ['db', 'dB']], 'lin', function (k) { st.db = k === 'db'; draw(); });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c,
        h('div', { cls: 'w-row', style: 'gap:12px;align-items:stretch' }, [
          h('div', { cls: 'w-card', style: 'flex:1;gap:4px;padding:10px 16px;border-top:5px solid ' + C.blue }, [h('h4', { text: 'The time domain tells you', style: 'color:' + C.blue }), tTell]),
          h('div', { cls: 'w-card', style: 'flex:1;gap:4px;padding:10px 16px;border-top:5px solid ' + C.orange }, [h('h4', { text: 'The frequency domain tells you', style: 'color:' + C.orange }), fTell])])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'Where does the signal come from?' }), srcSeg.el, info]),
        h('div', { cls: 'w-card', style: 'gap:4px;padding:8px 18px 10px' }, [ctl, h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [h('span', { text: 'Spectrum scale', style: 'font-size:22px;font-weight:600;color:' + C.navy }), dbSeg.el])]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 18px' }, [fbox])])]));

    var cache = { key: null };
    function setSrc(k) {
      st.src = k; var S = SRC[k]; st.p = {}; ctl.innerHTML = '';
      S.params.forEach(function (q) { st.p[q.key] = q.val; var sl = D.slider(q.label, q.min, q.max, q.step, q.val, q.fmt, function (v) { st.p[q.key] = v; draw(); }); ctl.appendChild(sl.el); });
      st.db = !!S.db; dbSeg.set(st.db ? 'db' : 'lin');
      info.innerHTML = '<b style="color:' + C.navy + '">Sensor:</b> ' + S.sensor + '. <b style="color:' + C.navy + '">Measures:</b> ' + S.qty + ' (' + S.unit + ').';
      st.db = k === 'vib' || k === 'mains' ? st.db : st.db;
    }
    function compute() {
      var S = SRC[st.src], key = st.src + JSON.stringify(st.p);
      if (cache.key === key) return cache;
      var r = S.gen(st.p), fs = grid(S, st.p), amp = spectrum(r.x, S.fs, fs, true);
      cache = { key: key, r: r, fs: fs, amp: amp }; return cache;
    }
    function niceStep(span) { var e = Math.pow(10, Math.floor(Math.log10(span))), m = span / e; return (m < 2 ? 1 : m < 5 ? 2 : 5) * e; }

    function draw() {
      var S = SRC[st.src], K = compute(), r = K.r, x = r.x;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      // ---- time domain
      var nView = Math.min(x.length, Math.round(S.t.view * S.fs)), lo = Infinity, hi = -Infinity, i;
      for (i = 0; i < nView; i++) { lo = Math.min(lo, x[i]); hi = Math.max(hi, x[i]); }
      var pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
      var t1 = 44, t2 = SPLIT - 40, X = function (t) { return pl + t * S.t.scale / (S.t.view * S.t.scale) * (W - pl - pr); }, Y = function (v) { return t1 + (hi - v) / (hi - lo) * (t2 - t1); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.blue; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Time domain: ' + S.qty + ' against time', 14, 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(nView.toLocaleString('en-US') + ' samples shown, ' + fmt(S.fs >= 1 ? S.fs : S.fs * 3600, 0) + (S.fs >= 1 ? ' per second' : ' per hour'), W - pr, 30);
      var ys = niceStep((hi - lo) / 3); g.strokeStyle = C.grid; g.lineWidth = 1; g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textBaseline = 'middle';
      for (var yv = Math.ceil(lo / ys) * ys; yv <= hi; yv += ys) { g.beginPath(); g.moveTo(pl, Y(yv)); g.lineTo(W - pr, Y(yv)); g.stroke(); g.textAlign = 'right'; g.fillText(fmt(yv, ys < 1 ? 1 : 0), pl - 8, Y(yv)); }
      g.save(); g.translate(16, (t1 + t2) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = '500 20px ' + D.SANS; g.fillText(S.unit, 0, 0); g.restore();
      g.textBaseline = 'alphabetic'; g.font = '500 20px ' + D.MONO;
      for (var tv = 0; tv <= S.t.view * S.t.scale + 1e-9; tv += S.t.step) { var xx = X(tv / S.t.scale), last = tv + S.t.step > S.t.view * S.t.scale + 1e-9; g.textAlign = last ? 'right' : 'center'; g.fillText(fmt(tv, 1) + (last ? ' ' + S.t.unit : ''), xx + (last ? 6 : 0), t2 + 26); }
      g.strokeStyle = C.blue; g.lineWidth = nView > 3000 ? 1.2 : 2; g.lineJoin = 'round'; g.beginPath();
      var stp = Math.max(1, Math.floor(nView / 2400));
      for (i = 0; i < nView; i += stp) { var px = X(i / S.fs), py = Y(x[i]); i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      var lastLx = -1e9, lvl = 0;
      if (r.tm) r.tm.forEach(function (m) { if (m.t > S.t.view) return; var mx = X(m.t); lvl = mx - lastLx < 70 ? lvl + 1 : 0; lastLx = mx; var ly = t1 + lvl * 24; g.strokeStyle = C.navy; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(mx, t1); g.lineTo(mx, t2); g.stroke(); g.setLineDash([]);
        g.font = '700 20px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; var tw = g.measureText(m.l).width; g.fillStyle = 'rgba(251,250,247,.9)'; g.fillRect(mx + 3, ly - 1, tw + 8, 24); g.fillStyle = C.navy; g.fillText(m.l, mx + 7, ly + 18); });
      // ---- frequency domain
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(10, SPLIT); g.lineTo(W - 10, SPLIT); g.stroke();
      var f1 = SPLIT + 50, f2 = H - 42, amp = K.amp, fsx = K.fs, amax = Math.max.apply(null, amp) || 1;
      var val = function (a) { return st.db ? Math.max(-60, 20 * Math.log10(a / amax + 1e-12)) : a; };
      var vlo = st.db ? -60 : 0, vhi = st.db ? 0 : amax * 1.15;
      var FX = function (f) { return pl + (f - S.f.lo) / (S.f.hi - S.f.lo) * (W - pl - pr); }, FY = function (a) { return f2 - (val(a) - vlo) / (vhi - vlo) * (f2 - f1); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.orange; g.textAlign = 'left'; g.fillText('Frequency domain: amplitude spectrum' + (S.demean ? ' (average removed)' : ''), 14, SPLIT + 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(st.db ? 'dB relative to the tallest peak' : S.unit + ' (peak amplitude)', W - pr, SPLIT + 30);
      if (r.band) { g.fillStyle = 'rgba(240,163,94,.25)'; g.fillRect(FX(r.band[0]), f1, FX(r.band[1]) - FX(r.band[0]), f2 - f1); g.font = '600 20px ' + D.SANS; g.fillStyle = C.orange; g.textAlign = 'left'; g.fillText('← tuned here', FX(r.band[1]) + 8, (f1 + f2) / 2 + 30); }
      if (r.fb) r.fb.forEach(function (b, j) { var y = f1 + 4 + j * 28; g.fillStyle = 'rgba(47,109,181,.12)'; g.fillRect(FX(b[0]), y, FX(b[1]) - FX(b[0]), 24); g.font = '600 20px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(b[2] + ' ' + fmt(b[0], 1) + '–' + fmt(b[1], 1) + ' Hz', FX(b[1]) + 8, y + 19); });
      if (st.db) { g.strokeStyle = C.grid; g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textBaseline = 'middle'; [0, -20, -40, -60].forEach(function (d) { var y = f2 - (d + 60) / 60 * (f2 - f1); g.beginPath(); g.moveTo(pl, y); g.lineTo(W - pr, y); g.stroke(); g.textAlign = 'right'; g.fillText(d, pl - 8, y); }); g.textBaseline = 'alphabetic'; }
      g.fillStyle = 'rgba(166,79,21,.22)'; g.strokeStyle = C.orange; g.lineWidth = 2; g.beginPath(); g.moveTo(FX(fsx[0]), f2);
      fsx.forEach(function (f, j) { g.lineTo(FX(f), FY(amp[j])); }); g.lineTo(FX(fsx[fsx.length - 1]), f2); g.closePath(); g.fill();
      g.beginPath(); fsx.forEach(function (f, j) { j ? g.lineTo(FX(f), FY(amp[j])) : g.moveTo(FX(f), FY(amp[j])); }); g.stroke();
      g.strokeStyle = C.gray; g.lineWidth = 1.5; g.beginPath(); g.moveTo(pl, f2); g.lineTo(W - pr, f2); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray;
      var fl0 = S.f.lo * S.f.scale, fl1 = S.f.hi * S.f.scale, first = Math.ceil(fl0 / S.f.step - 1e-9) * S.f.step;
      for (var fv = first; fv <= fl1 + 1e-9; fv += S.f.step) { var fxp = FX(fv / S.f.scale), lastf = fv + S.f.step > fl1 + 1e-9; g.textAlign = lastf ? 'right' : 'center'; g.fillText(fmt(fv, 1) + (lastf ? ' ' + S.f.unit : ''), fxp + (lastf ? 6 : 0), f2 + 26); }
      // labels on the known lines
      var placed = [];
      (r.fm || []).forEach(function (m) {
        if (m.f < S.f.lo || m.f > S.f.hi) return;
        var best = 0; fsx.forEach(function (f, j) { if (Math.abs(f - m.f) <= (S.f.hi - S.f.lo) / 120 + 1e-9) best = Math.max(best, amp[j]); });
        var px = FX(m.f), py = FY(best) - 10; g.font = '600 20px ' + D.SANS; var tw = g.measureText(m.l).width, lx = px - tw / 2;
        lx = Math.max(pl, Math.min(W - pr - tw, lx));
        if (m.top) { py = f1 + 6; g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py + 6); g.lineTo(px, FY(best) - 4); g.stroke(); lx = Math.max(pl, px - 20); }
        else if (py < f1 + 18) { lx = Math.min(W - pr - tw, px + 14); py = FY(best) + 24; }
        for (var tries = 0; tries < 6 && placed.some(function (q) { return lx < q[0] + q[2] + 8 && lx + tw + 8 > q[0] && Math.abs(py - q[1]) < 24; }); tries++) py -= 26;
        if (py < f1 - 6) py = f1 - 6;
        placed.push([lx, py, tw]); g.fillStyle = 'rgba(251,250,247,.85)'; g.fillRect(lx - 3, py - 19, tw + 6, 24); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(m.l, lx, py);
        g.fillStyle = C.orange; g.beginPath(); g.arc(px, FY(best), 4, 0, TAU); g.fill();
      });
      fbox.innerHTML = r.read; tTell.textContent = r.tt; fTell.textContent = r.ft;
    }
    setSrc('mains'); draw();
  });
})();
