/* Try it: real sounds in both domains (Lecture 2, after slide "twobw").
   Web Audio: built-in synthesised sounds or the microphone feed an AnalyserNode; waveform, spectrum and spectrogram.
   With no audio (headless, nothing played yet) a static frame is computed in JS with our own FFT. */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;
  var FMAX = 5000, DB_LO = -110, DB_HI = -10, SPAN = 30, CPS = 30;       // chart 0–5 kHz, dB range, "within 30 dB", spectrogram columns per s
  var F0 = 120, CHORD = [523.25, 659.26, 783.99];                         // vowel pitch; C5, E5, G5
  var VOWELS = {                                                          // Peterson & Barney (1952), adult male averages
    aa: { F: [730, 1090, 2440], B: [80, 100, 120], lab: '"aa" as in father' },
    ee: { F: [270, 2290, 3010], B: [60, 100, 120], lab: '"ee" as in see' },
    oo: { F: [300, 870, 2240], B: [60, 100, 120], lab: '"oo" as in boot' } };
  var LOOP = { vowel: 1, whistle: 3, chirp: 2.4, noise: 2, clap: 0.6 };   // seamless loop lengths (s)

  /* ---------- pure DSP (exported for node) ---------- */
  function fft(re, im) {                                                  // in-place radix-2, N a power of 2
    var n = re.length, i, j, k, len, t;
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          var a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  var WIN = {};
  function blackman(N) {                                                  // the AnalyserNode window (alpha = 0.16)
    if (WIN[N]) return WIN[N];
    var w = new Float64Array(N); for (var i = 0; i < N; i++) w[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / N) + 0.08 * Math.cos(4 * Math.PI * i / N);
    return (WIN[N] = w);
  }
  /* magnitude spectrum in dB, same convention as AnalyserNode: 20 log10(|X[k]| / N), Blackman window */
  function spectrumDb(x, start, N) {
    var w = blackman(N), re = new Float64Array(N), im = new Float64Array(N), out = new Float32Array(N / 2);
    for (var i = 0; i < N; i++) re[i] = (x[start + i] || 0) * w[i];
    fft(re, im);
    for (var k = 0; k < N / 2; k++) { var m = Math.hypot(re[k], im[k]) / N; out[k] = m > 1e-12 ? 20 * Math.log10(m) : -240; }
    return out;
  }
  /* formant envelope: cascade of second-order resonators, gain 1 at 0 Hz */
  function formantGain(f, v) {
    var V = VOWELS[v], g = 1;
    for (var i = 0; i < V.F.length; i++) { var r = f / V.F[i]; g /= Math.sqrt((1 - r * r) * (1 - r * r) + Math.pow(f * V.B[i] / (V.F[i] * V.F[i]), 2)); }
    return g;
  }
  function vowelAmps(v, fs) {                                             // harmonic k: source 1/k (−6 dB/octave) times formant gain
    var K = Math.floor(Math.min(fs / 2 - 100, 6000) / F0), a = [];
    for (var k = 1; k <= K; k++) a.push(formantGain(k * F0, v) / k);
    return a;
  }
  function noiseAt(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return 2 * (x - Math.floor(x)) - 1; }
  /* n samples of a built-in sound starting at absolute time t0 (s) */
  function synth(src, p, fs, t0, n) {
    var out = new Float32Array(n), i, t, TAU = 2 * Math.PI, n0 = Math.round(t0 * fs);
    if (src === 'tone') for (i = 0; i < n; i++) out[i] = 0.3 * Math.sin(TAU * p.f * (t0 + i / fs));
    else if (src === 'chord') for (i = 0; i < n; i++) { t = t0 + i / fs; out[i] = 0.12 * (Math.sin(TAU * CHORD[0] * t) + Math.sin(TAU * CHORD[1] * t) + Math.sin(TAU * CHORD[2] * t)); }
    else if (src === 'vowel') {
      var A = vowelAmps(p.v, fs), sum = 0; A.forEach(function (a) { sum += a; });
      for (var k = 1; k <= A.length; k++) {                                // phasor rotation: cos(2π k F0 t)
        var a = 0.35 * A[k - 1] / sum, th = TAU * k * F0 * t0, c = Math.cos(th), s = Math.sin(th), dc = Math.cos(TAU * k * F0 / fs), ds = Math.sin(TAU * k * F0 / fs);
        for (i = 0; i < n; i++) { out[i] += a * c; var c2 = c * dc - s * ds; s = s * dc + c * ds; c = c2; }
      }
    } else if (src === 'whistle') for (i = 0; i < n; i++) {                // f(t) = 1,800 + 600 sin(2πt/3): glides 1,200–2,400 Hz
      t = t0 + i / fs; out[i] = 0.3 * Math.sin(TAU * (1800 * t - 900 / Math.PI * Math.cos(TAU * t / 3))) + 0.004 * noiseAt(n0 + i);
    } else if (src === 'chirp') for (i = 0; i < n; i++) {                  // 200 → 4,000 Hz linearly in 2 s, then 0.4 s gap
      t = t0 + i / fs; var tau = ((t % 2.4) + 2.4) % 2.4;
      if (tau < 2) { var env = Math.min(1, tau / 0.01, (2 - tau) / 0.01); out[i] = 0.3 * env * Math.sin(TAU * (200 * tau + 950 * tau * tau)); }
    } else if (src === 'noise') for (i = 0; i < n; i++) out[i] = 0.3 * noiseAt(n0 + i);
    else if (src === 'clap') for (i = 0; i < n; i++) {                     // decaying noise burst every 0.6 s
      t = t0 + i / fs; var q = ((t % 0.6) + 0.6) % 0.6;
      if (q < 0.15) out[i] = 0.85 * Math.exp(-q / 0.02) * noiseAt(n0 + i);
    }
    return out;
  }
  /* readouts from one dB spectrum: peak (parabolic interpolation) and the span within 30 dB of it, inside 20 Hz–5 kHz */
  function analyse(db, fs, N) {
    var df = fs / N, k0 = Math.max(1, Math.ceil(20 / df)), k1 = Math.min(N / 2 - 2, Math.floor(FMAX / df)), pk = k0;
    for (var k = k0; k <= k1; k++) if (db[k] > db[pk]) pk = k;
    var a = db[pk - 1], b = db[pk], c = db[pk + 1], d = (a - 2 * b + c) ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
    var thr = b - SPAN, lo = pk, hi = pk;
    for (k = k0; k <= k1; k++) if (db[k] >= thr) { lo = k; break; }
    for (k = k1; k >= k0; k--) if (db[k] >= thr) { hi = k; break; }
    return { peakF: (pk + d) * df, peakDb: b, thr: thr, lo: lo * df, hi: hi * df, B: (hi - lo) * df, df: df, quiet: b < -95,
      loEdge: lo === k0, hiEdge: hi === k1 };
  }
  function hz(x) { return Math.round(x).toLocaleString('en-US'); }
  function sgn(x) { return String(Math.round(x)).replace('-', '−'); }

  /* ---------- widget ---------- */
  D.register('listen', function (root) {
    var st = { src: 'vowel', f: 1000, v: 'aa', vol: 0.5, phone: true, log: false, frozen: false, playing: false, err: '', mic: '' };
    var STATIC_FS = 16000, STATIC_N = 2048, LIVE_N = 4096;
    var wv = D.canvas(1080, 170), sp = D.canvas(1080, 280), sg = D.canvas(1080, 280);
    var SGL = 78, SGR = 100, SGT = 44, SGB = 40, sgW = 1080 - SGL - SGR, sgH = 280 - SGT - SGB, NCOL = Math.floor(sgW / 3);
    var off = document.createElement('canvas'); off.width = sgW * 2; off.height = sgH * 2; var og = off.getContext('2d');
    var frame = null, audio = null, raf = 0, lastT = 0, acc = 0;

    var teach = h('div', { style: 'font-size:24px;line-height:1.35' });
    var readout = h('div', { cls: 'w-f' });
    var status = h('p', { cls: 'w-note', style: 'min-height:60px' });
    var sub = h('div', { cls: 'w-col', style: 'gap:6px;min-height:96px;justify-content:center' });

    var SRC = [['mic', 'Microphone'], ['tone', 'Tone'], ['chord', 'Chord'], ['vowel', 'Vowel'], ['whistle', 'Whistle'], ['chirp', 'Chirp'], ['noise', 'Noise'], ['clap', 'Clap']];
    var srcSeg = D.seg(SRC, st.src, function (k) { pick(k); });
    [].forEach.call(srcSeg.el.children, function (b) { b.style.padding = '9px 13px'; });
    srcSeg.el.style.gap = '8px';
    var fSl = D.slider('Tone frequency f', 100, 4000, 10, st.f, function (v) { return hz(v) + ' Hz'; }, function (v) { setF(v); });
    var fPre = h('div', { cls: 'w-btns', style: 'gap:8px' }, [[300, '300 Hz'], [1000, '1,000 Hz'], [3400, '3,400 Hz']].map(function (p) {
      return D.btn(p[1], function () { fSl.set(p[0]); setF(p[0]); }); }));
    var vSeg = D.seg([['aa', '"aa"'], ['ee', '"ee"'], ['oo', '"oo"']], st.v, function (k) { st.v = k; restartIfPlaying(); refreshSub(); showStatic(); });
    var subNote = h('p', { cls: 'w-note' });
    var playB = D.btn('▶ Play', function () { if (st.playing) stopAll(); else start(); }, 'acc');
    var frzB = D.btn('Freeze', function () { st.frozen = !st.frozen; frzB.classList.toggle('on', st.frozen); frzB.textContent = st.frozen ? 'Resume' : 'Freeze'; setStatus(); render(); });
    var phB = D.btn('Phone band', function () { st.phone = !st.phone; phB.classList.toggle('on', st.phone); render(); });
    var logB = D.btn('Log f', function () { st.log = !st.log; logB.classList.toggle('on', st.log); render(); });
    phB.classList.toggle('on', st.phone);
    var volSl = D.slider('Volume (speakers only)', 0, 100, 1, st.vol * 100, function (v) { return v + '%'; }, function (v) { st.vol = v / 100; if (audio && audio.vol) audio.vol.gain.value = st.vol; });

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [wv.c, sp.c, sg.c, h('div', { cls: 'w-card', style: 'padding:10px 20px' }, [teach])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px;padding:14px 20px' }, [h('h4', { text: 'Sound source' }), srcSeg.el, sub]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:14px 20px' }, [h('div', { cls: 'w-btns', style: 'gap:8px' }, [playB, frzB, phB, logB]), volSl.el, status]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:14px 20px' }, [readout])])]));

    function setF(v) { st.f = v; if (audio && audio.osc) audio.osc.forEach(function (o) { o.frequency.setTargetAtTime(v, audio.ctx.currentTime, 0.01); }); if (!st.playing) showStatic(); else teachText(); }
    function refreshSub() {
      sub.innerHTML = '';
      if (st.src === 'tone') { sub.appendChild(fSl.el); sub.appendChild(fPre); return; }
      if (st.src === 'vowel') { sub.appendChild(vSeg.el); subNote.textContent = VOWELS[st.v].lab + ': pitch 120 Hz, F1 = ' + hz(VOWELS[st.v].F[0]) + ' Hz, F2 = ' + hz(VOWELS[st.v].F[1]) + ' Hz'; sub.appendChild(subNote); return; }
      subNote.textContent = {
        mic: 'Press Start mic and allow access. Speak, whistle or clap near the mic. Nothing is recorded.',
        chord: 'C–E–G (C major): three sines at 523, 659 and 784 Hz played together.',
        whistle: 'A whistle whose pitch glides 1,200 → 2,400 → 1,200 Hz every 3 s.',
        chirp: 'A sweep from 200 Hz to 4,000 Hz in 2 s, repeated.',
        noise: 'White noise: random samples, equal power at every frequency.',
        clap: 'A clap: a short burst of noise, decaying in about 50 ms, every 0.6 s.' }[st.src];
      sub.appendChild(subNote);
    }
    function pick(k) { st.src = k; st.err = ''; srcSeg.set(k); refreshSub(); sync(); if (st.playing) { stopAll(true); start(); } else showStatic(); }
    function restartIfPlaying() { if (st.playing && st.src === 'vowel') { stopAll(true); start(); } }

    /* ---------- static frame (own FFT) ---------- */
    function showStatic() {
      var src = st.src === 'mic' ? 'vowel' : st.src, p = { f: st.f, v: st.src === 'mic' ? 'aa' : st.v }, fs = STATIC_FS, N = STATIC_N;
      var tSnap = { clap: 12.09, chirp: 13.2 }[src] || 12, span = (NCOL - 1) / CPS, tStart = tSnap - span - N / fs;
      var x = synth(src, p, fs, tStart, Math.ceil((tSnap - tStart) * fs) + 1);
      og.fillStyle = cmap(0); og.fillRect(0, 0, off.width, off.height);
      for (var i = 0; i < NCOL; i++) {
        var s0 = Math.round((tSnap - (NCOL - 1 - i) / CPS - N / fs - tStart) * fs);
        paintCol(spectrumDb(x, s0, N), fs, N, sgW * 2 - (NCOL - i) * 6, 6);
      }
      var tw = src === 'clap' ? 11.999 : tSnap - 0.06;
      frame = { fs: fs, N: N, db: spectrumDb(x, x.length - N - 1, N), wave: synth(src, p, fs, tw, Math.ceil(0.06 * fs)), mode: 'static', src: src };
      render();
    }

    /* ---------- audio ---------- */
    function start() {
      st.err = ''; st.mic = '';
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { st.err = 'Web Audio is not available in this browser, so the displays show a computed preview.'; setStatus(); return; }
      var ctx = audio && audio.ctx || new AC();
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var an = ctx.createAnalyser(); an.fftSize = LIVE_N; an.smoothingTimeConstant = 0.5;
      var vol = ctx.createGain(); vol.gain.value = st.vol; vol.connect(ctx.destination);
      audio = { ctx: ctx, an: an, vol: vol, nodes: [], osc: null, stream: null };
      og.fillStyle = cmap(0); og.fillRect(0, 0, off.width, off.height);
      if (st.src === 'mic') {
        if (!window.isSecureContext) return micFail('The microphone needs a secure page (https or localhost). The built-in sounds still work.');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return micFail('This browser gives no microphone access here. The built-in sounds still work.');
        st.playing = true; st.mic = 'asking'; sync();
        var mine = audio;
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (stream) {
          if (audio !== mine || !st.playing) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
          audio.stream = stream; var ms = ctx.createMediaStreamSource(stream); ms.connect(an); audio.nodes.push(ms);  // not to the speakers: no feedback
          var tr = stream.getAudioTracks()[0]; st.mic = 'on' + (tr && tr.label ? ' (' + tr.label + ')' : ''); sync(); loop();
        }).catch(function (e) {
          if (audio !== mine) return;
          var n = e && e.name;
          micFail(n === 'NotAllowedError' || n === 'SecurityError' ? 'Microphone permission was denied. Allow it in the browser\'s address bar, or use the built-in sounds.' :
            n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No microphone was found on this computer. Use the built-in sounds.' :
            n === 'NotReadableError' ? 'The microphone is busy in another program. Close it, or use the built-in sounds.' :
            'The microphone could not start (' + (n || 'error') + '). Use the built-in sounds.');
        });
        return;
      }
      var mix = ctx.createGain(); mix.connect(an); mix.connect(vol); audio.nodes.push(mix);
      if (st.src === 'tone' || st.src === 'chord') {
        var fr = st.src === 'tone' ? [st.f] : CHORD; audio.osc = [];
        fr.forEach(function (f) {
          var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = st.src === 'tone' ? 0.3 : 0.12;
          o.connect(g); g.connect(mix); o.start(); audio.nodes.push(o, g);
        });
        if (st.src === 'tone') audio.osc = audio.nodes.filter(function (nd) { return nd.frequency; });
      } else {
        var fs = ctx.sampleRate, len = Math.round(LOOP[st.src] * fs), buf = ctx.createBuffer(1, len, fs);
        buf.getChannelData(0).set(synth(st.src, { f: st.f, v: st.v }, fs, 0, len));
        var bs = ctx.createBufferSource(); bs.buffer = buf; bs.loop = true; bs.connect(mix); bs.start(); audio.nodes.push(bs);
      }
      mix.gain.setValueAtTime(0, ctx.currentTime); mix.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
      st.playing = true; sync(); loop();
    }
    function micFail(msg) { st.err = msg; st.mic = ''; release(); st.playing = false; sync(); showStatic(); }
    function release() {
      if (!audio) return;
      audio.nodes.forEach(function (n) { try { if (n.stop) n.stop(); } catch (e) { /* already stopped */ } try { n.disconnect(); } catch (e) { /* ok */ } });
      if (audio.stream) audio.stream.getTracks().forEach(function (t) { t.stop(); });
      try { audio.vol.disconnect(); audio.an.disconnect(); } catch (e) { /* ok */ }
      audio = { ctx: audio.ctx, nodes: [] };
    }
    function stopAll(keep) {
      release(); st.playing = false; st.mic = '';
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (st.frozen) { st.frozen = false; frzB.classList.remove('on'); frzB.textContent = 'Freeze'; }
      if (!keep) { if (audio && audio.ctx && audio.ctx.suspend) audio.ctx.suspend(); sync(); showStatic(); }
    }
    function sync() { playB.textContent = st.playing ? '■ Stop' : (st.src === 'mic' ? '● Start mic' : '▶ Play'); setStatus(); }
    function setStatus() {
      var t;
      if (st.err) t = '<span style="color:' + C.red + ';font-weight:600">' + st.err + '</span>';
      else if (st.playing && st.mic === 'asking') t = 'Waiting for microphone permission…';
      else if (st.playing && st.frozen) t = '<b style="color:' + C.navy + '">Frozen:</b> displays paused so you can point at them. The sound continues.';
      else if (st.playing) t = '<b style="color:' + C.green + '">Live</b> ' + (st.src === 'mic' ? 'microphone ' + st.mic : 'sound through the speakers') +
        ' · ' + hz(LIVE_N) + '-point FFT at ' + hz(audio.ctx.sampleRate) + ' Hz';
      else t = '<b style="color:' + C.navy + '">Preview</b> ' + (st.src === 'mic' ? 'of the built-in vowel "aa", computed in JS (mic off). Press Start mic.' : 'computed in JS with our own FFT (no audio). Press Play to hear it.');
      status.innerHTML = t;
    }
    function loop() {
      if (raf) return;
      lastT = 0; acc = 0;
      raf = requestAnimationFrame(function tick(now) {
        raf = requestAnimationFrame(tick);
        if (!st.playing || !audio || !audio.an || st.frozen) { lastT = now; return; }
        if (lastT) acc += now - lastT; lastT = now;
        if (acc < 1000 / CPS - 2) return;
        var cols = Math.min(4, Math.max(1, Math.round(acc * CPS / 1000))); acc = 0;
        var an = audio.an, N = an.fftSize, db = new Float32Array(N / 2), wave = new Float32Array(N);
        an.getFloatFrequencyData(db); an.getFloatTimeDomainData(wave);
        og.drawImage(off, -cols * 6, 0); paintCol(db, audio.ctx.sampleRate, N, off.width - cols * 6, cols * 6);
        frame = { fs: audio.ctx.sampleRate, N: N, db: db, wave: wave, mode: 'live', src: st.src };
        render();
      });
    }

    /* ---------- spectrogram columns ---------- */
    var CM = [[0, [15, 27, 43]], [0.3, [42, 63, 122]], [0.55, [166, 79, 21]], [0.8, [240, 163, 94]], [1, [255, 246, 214]]];
    function cmapRGB(u) {
      u = Math.max(0, Math.min(1, u));
      for (var i = 1; i < CM.length; i++) if (u <= CM[i][0]) {
        var a = CM[i - 1], b = CM[i], t = (u - a[0]) / (b[0] - a[0]);
        return [0, 1, 2].map(function (j) { return Math.round(a[1][j] + t * (b[1][j] - a[1][j])); });
      }
      return CM[CM.length - 1][1];
    }
    function cmap(u) { var c = cmapRGB(u); return 'rgb(' + c.join(',') + ')'; }
    var CDB = [-100, -25];
    function paintCol(db, fs, N, x, w) {
      var Hp = off.height, img = og.createImageData(w, Hp), d = img.data;
      for (var y = 0; y < Hp; y++) {
        var fHi = (1 - y / Hp) * FMAX, fLo = (1 - (y + 1) / Hp) * FMAX, k0 = Math.max(0, Math.floor(fLo * N / fs)), k1 = Math.max(k0, Math.round(fHi * N / fs)), m = -300;
        for (var k = k0; k <= k1 && k < db.length; k++) if (db[k] > m) m = db[k];
        var c = cmapRGB((m - CDB[0]) / (CDB[1] - CDB[0]));
        for (var j = 0; j < w; j++) { var o = (y * w + j) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
      }
      og.putImageData(img, x, 0);
    }

    /* ---------- drawing ---------- */
    function panel(g, W, H, title, right) {
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(title, 14, 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(right, W - 14, 30);
    }
    function badge(g, x, y) {
      var m = frame.mode === 'live' ? (st.frozen ? ['FROZEN', C.navy] : ['LIVE', C.green]) : ['PREVIEW', C.gray];
      g.font = '600 20px ' + D.SANS; var w = g.measureText(m[0]).width + 20;
      g.fillStyle = m[1]; g.beginPath(); g.roundRect ? g.roundRect(x, y - 22, w, 30, 8) : g.rect(x, y - 22, w, 30); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(m[0], x + w / 2, y);
    }
    function drawWave() {
      var g = wv.g, W = wv.w, H = wv.h, fs = frame.fs, x = frame.wave, nW = Math.round(0.025 * fs), pl = 78, pr = 20, pt = 42, pb = 34;
      panel(g, W, H, 'Time domain: waveform', 'amplitude against time (ms), 25 ms window');
      g.font = '600 22px ' + D.SANS; badge(g, 14 + g.measureText('Time domain: waveform').width + 18, 29);
      var lim = Math.max(1, x.length - nW - 1), s0 = 0;
      for (var i = 1; i < lim; i++) if (x[i - 1] < 0 && x[i] >= 0) { s0 = i; break; }
      var mx = 0; for (i = 0; i < nW; i++) mx = Math.max(mx, Math.abs(x[s0 + i] || 0));
      var ym = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1].filter(function (v) { return v >= mx * 1.05; })[0] || 1;
      var X = function (t) { return pl + t / 0.025 * (W - pl - pr); }, Y = function (v) { return pt + (ym - v) / (2 * ym) * (H - pt - pb); };
      g.strokeStyle = C.grid; g.lineWidth = 1;
      for (var k = 0; k <= 25; k += 5) { g.beginPath(); g.moveTo(X(k / 1000), pt); g.lineTo(X(k / 1000), H - pb); g.stroke(); }
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(pl, Y(0)); g.lineTo(W - pr, Y(0)); g.stroke();
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(D.fmtN(ym, 2), pl - 8, Y(ym) + 4); g.fillText(D.fmtN(-ym, 2), pl - 8, Y(-ym) - 4);
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      for (k = 0; k <= 25; k += 5) g.fillText(k + (k === 25 ? ' ms' : ''), X(k / 1000) - (k === 25 ? 14 : 0), H - 8);
      g.strokeStyle = C.blue; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath();
      for (i = 0; i <= nW; i++) { var v = x[s0 + i] || 0; i ? g.lineTo(X(i / fs), Y(v)) : g.moveTo(X(0), Y(v)); }
      g.stroke();
      var T = frame.src === 'tone' ? 1 / st.f : (frame.src === 'vowel' ? 1 / F0 : 0);
      if (T >= 0.0015 && T <= 0.025) {                                       // one period, starting at the trigger point
        var yb = pt + 6; g.strokeStyle = C.orange; g.lineWidth = 2.5; g.beginPath();
        g.moveTo(X(0), yb); g.lineTo(X(T), yb); g.moveTo(X(0), yb - 7); g.lineTo(X(0), yb + 7); g.moveTo(X(T), yb - 7); g.lineTo(X(T), yb + 7); g.stroke();
        g.fillStyle = C.orange; g.font = '600 20px ' + D.SANS; g.textAlign = 'left'; g.fillText('T = ' + D.fmtN(T * 1000, 2) + ' ms', X(T) + 8, yb + 7);
      }
    }
    function fX(f, L, R) {
      if (!st.log) return L + f / FMAX * (R - L);
      return L + Math.log(Math.max(f, 50) / 50) / Math.log(FMAX / 50) * (R - L);
    }
    function drawSpec(A) {
      var g = sp.g, W = sp.w, H = sp.h, db = frame.db, fs = frame.fs, N = frame.N, pl = 78, pr = 22, pt = 44, pb = 40, R = W - pr;
      panel(g, W, H, 'Frequency domain: spectrum', 'level (dB) against frequency (Hz), ' + (st.log ? 'log' : 'linear') + ' axis');
      var Y = function (d) { return pt + (DB_HI - Math.max(DB_LO, Math.min(DB_HI, d))) / (DB_HI - DB_LO) * (H - pt - pb); }, X = function (f) { return fX(f, pl, R); };
      var ticks = st.log ? [50, 100, 200, 500, 1000, 2000, 5000] : [0, 1000, 2000, 3000, 4000, 5000];
      g.strokeStyle = C.grid; g.lineWidth = 1;
      ticks.forEach(function (f) { g.beginPath(); g.moveTo(X(f), pt); g.lineTo(X(f), H - pb); g.stroke(); });
      [-100, -80, -60, -40, -20].forEach(function (d) { g.beginPath(); g.moveTo(pl, Y(d)); g.lineTo(R, Y(d)); g.stroke(); });
      if (st.phone) {
        g.fillStyle = 'rgba(22,50,79,.08)'; g.fillRect(X(300), pt, X(3400) - X(300), H - pt - pb);
        g.strokeStyle = C.navy; g.setLineDash([7, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(300), pt); g.lineTo(X(300), H - pb); g.moveTo(X(3400), pt); g.lineTo(X(3400), H - pb); g.stroke(); g.setLineDash([]);
        g.font = '600 20px ' + D.SANS; tag(g, 'phone channel 300–3,400 Hz', X(3400) - 10, !A.quiet && Y(A.peakDb) < pt + 50 ? Y(-75) : pt + 22, 'right', C.navy);
      }
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      [-100, -80, -60, -40, -20].forEach(function (d) { g.fillText(String(d).replace('-', '−'), pl - 8, Y(d)); });
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      ticks.forEach(function (f, i) { var lab = f >= 1000 ? f / 1000 + 'k' : String(f); if (i === ticks.length - 1) { g.textAlign = 'right'; lab += ' Hz'; } g.fillText(lab, X(f) + (i === ticks.length - 1 ? 8 : 0), H - 12); });
      // curve: per pixel column, the strongest bin it covers
      var pts = [];
      for (var px = pl; px <= R; px++) {
        var fa = invX(px, pl, R), fb = invX(px + 1, pl, R), k0 = Math.floor(fa * N / fs), k1 = Math.max(k0, Math.floor(fb * N / fs)), m = -300;
        if (k1 === k0) { var u = fa * N / fs - k0; m = (db[k0] || -300) * (1 - u) + (db[k0 + 1] || -300) * u; }
        else for (var k = k0; k <= k1 && k < db.length; k++) m = Math.max(m, db[k]);
        pts.push([px, Y(m)]);
      }
      g.beginPath(); g.moveTo(pl, Y(DB_LO)); pts.forEach(function (p) { g.lineTo(p[0], p[1]); }); g.lineTo(R, Y(DB_LO)); g.closePath();
      g.fillStyle = 'rgba(159,193,230,.55)'; g.fill();
      g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.strokeStyle = C.blue; g.lineWidth = 2; g.stroke();
      g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(pl, H - pb); g.lineTo(R, H - pb); g.moveTo(pl, pt); g.lineTo(pl, H - pb); g.stroke();
      if (A.quiet) { g.fillStyle = C.gray; g.font = '600 22px ' + D.SANS; g.textAlign = 'center'; g.fillText('too quiet: no clear peak', (pl + R) / 2, Y(-60)); return; }
      // −30 dB span and the peak
      var yT = Y(A.thr), xl = X(A.lo), xh = X(A.hi);
      g.strokeStyle = C.orange; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(pl, yT); g.lineTo(R, yT); g.stroke(); g.setLineDash([]);
      var yb = H - pb - 12; g.lineWidth = 3; g.beginPath(); g.moveTo(xl, yb); g.lineTo(xh, yb); g.moveTo(xl, yb - 9); g.lineTo(xl, yb + 9); g.moveTo(xh, yb - 9); g.lineTo(xh, yb + 9); g.stroke();
      g.font = '600 20px ' + D.SANS;
      var bl = 'B ≈ ' + hz(A.B) + ' Hz', right = xh > R - 220;
      tag(g, bl, right ? Math.max(xl, pl + 230) - 10 : xh + 10, yb + 7, right ? 'right' : 'left', C.orange);
      tag(g, 'peak − 30 dB', R - 8, yT - 8, 'right', C.orange);
      var xp = X(A.peakF), yp = Y(A.peakDb);
      g.fillStyle = C.orange; g.beginPath(); g.arc(xp, yp, 7, 0, 7); g.fill();
      tag(g, 'peak ' + hz(A.peakF) + ' Hz', xp + (xp > R - 200 ? -12 : 12), Math.max(pt + 18, yp + 6), xp > R - 200 ? 'right' : 'left', C.orange);
    }
    function tag(g, t, x, y, al, col) {                                    // text on a light box so it stays readable over the curve
      var w = g.measureText(t).width, x0 = al === 'right' ? x - w : x;
      g.fillStyle = 'rgba(251,250,247,.88)'; g.fillRect(x0 - 4, y - 19, w + 8, 25);
      g.fillStyle = col; g.textAlign = al; g.fillText(t, x, y);
    }
    function invX(px, L, R) { var u = (px - L) / (R - L); return st.log ? 50 * Math.pow(FMAX / 50, u) : u * FMAX; }
    function drawSg() {
      var g = sg.g, W = sg.w, H = sg.h, L = SGL, T = SGT, R = SGL + sgW, Bt = SGT + sgH;
      panel(g, W, H, 'Spectrogram: time →, frequency ↑, colour = level', '');
      g.drawImage(off, L, T, sgW, sgH);
      g.strokeStyle = C.gray; g.lineWidth = 1; g.strokeRect(L - 0.5, T - 0.5, sgW + 1, sgH + 1);
      var Y = function (f) { return Bt - f / FMAX * sgH; };
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      [0, 1000, 2000, 3000, 4000, 5000].forEach(function (f) { g.fillText(f ? f / 1000 + 'k' : '0', L - 8, Math.min(Bt - 8, Math.max(T + 8, Y(f)))); });
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      var secs = (NCOL - 1) / CPS;
      for (var s = 0; s <= secs; s += 2) { var xs = R - s / secs * (sgW - 3); g.fillText(s ? '−' + s + ' s' : 'now', Math.max(L + 30, xs - (s ? 0 : 20)), H - 12); }
      if (st.phone) {
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath();
        g.moveTo(L, Y(300)); g.lineTo(R, Y(300)); g.moveTo(L, Y(3400)); g.lineTo(R, Y(3400)); g.stroke(); g.setLineDash([]);
        g.font = '600 20px ' + D.SANS; g.textAlign = 'left'; g.fillStyle = 'rgba(15,27,43,.75)'; g.fillRect(L + 6, Y(3400) + 5, 268, 26);
        g.fillStyle = '#fff'; g.fillText('phone channel 300–3,400 Hz', L + 12, Y(3400) + 25);
      }
      // colour bar
      var cx = R + 16, cw = 18;
      for (var i = 0; i < sgH; i++) { g.fillStyle = cmap(1 - i / sgH); g.fillRect(cx, T + i, cw, 1.5); }
      g.strokeStyle = C.line; g.strokeRect(cx, T, cw, sgH);
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'left';
      g.fillText(String(CDB[1]).replace('-', '−'), cx + cw + 6, T + 14); g.fillText(String(CDB[0]).replace('-', '−'), cx + cw + 6, Bt);
      g.fillText('dB', cx + cw + 6, (T + Bt) / 2 + 7);
    }
    function teachText() {
      var V = VOWELS[st.v], m = {
        mic: '<b>Your voice:</b> hold "aaa", then "eee". The harmonics stay at multiples of your pitch while the formant peaks move. Hiss "sss": its energy sits high, beyond the phone band.',
        tone: '<b>Pure tone, f = ' + hz(st.f) + ' Hz:</b> one spike at ' + hz(st.f) + ' Hz and one horizontal line in the spectrogram. The waveform repeats every T = 1/f = 1/' + hz(st.f) + ' = ' + D.fmtN(1000 / st.f, 3) + ' ms.',
        chord: '<b>Chord C–E–G:</b> three sines, so three spikes (523, 659, 784 Hz) and three horizontal lines. B = 784 − 523 = 261 Hz (measured a bit wider: spikes have width).',
        vowel: '<b>Vowel ' + V.lab.split(' ')[0] + ':</b> periodic, T = 1/120 = 8.33 ms. Harmonics at 120, 240, 360 … Hz (stacked lines); their heights peak at the formants F1 ≈ ' + hz(V.F[0]) + ' and F2 ≈ ' + hz(V.F[1]) + ' Hz.',
        whistle: '<b>Whistle:</b> almost a pure tone, so one spike, but its pitch glides between 1,200 and 2,400 Hz: the spike slides and the spectrogram line curves.',
        chirp: '<b>Chirp:</b> one sine whose frequency rises from 200 to 4,000 Hz in 2 s, a rising line in the spectrogram. Slope = (4,000 − 200)/2 = 1,900 Hz per second.',
        noise: '<b>White noise:</b> aperiodic, no shape repeats. Its power is spread over every frequency: a flat spectrum and an evenly filled spectrogram.',
        clap: '<b>Clap:</b> a short aperiodic burst. It holds a wide band of frequencies at once, so each clap is a vertical stripe in the spectrogram.' };
      teach.innerHTML = m[st.src];
    }
    function render() {
      if (!frame) return;
      var A = analyse(frame.db, frame.fs, frame.N);
      drawWave(); drawSpec(A); drawSg(); teachText();
      var r;
      if (A.quiet) r = 'peak: <span class="bad">too quiet</span>\n(make a sound near the mic)';
      else {
        r = 'peak = <b>' + hz(A.peakF) + ' Hz</b> (' + sgn(A.peakDb) + ' dB)\n';
        r += 'B (within 30 dB of peak)\n  = f_hi − f_lo\n  = ' + hz(A.hi) + ' − ' + hz(A.lo) + ' = <b>' + hz(A.B) + ' Hz</b>\n';
        r += '<span style="color:' + C.gray + '">' + (A.B <= 6 * A.df ? 'one spike, so really B ≈ 0' : (A.loEdge || A.hiEdge) ? 'hits the chart edge: even wider' : 'edges on the dashed −30 dB line') + '</span>\n';
        r += 'phone: 3,400 − 300 = 3,100 Hz\n';
        var one = A.B <= 6 * A.df, fl = one ? A.peakF : A.lo, fh = one ? A.peakF : A.hi, cutL = Math.round(fl) < 300, cutH = Math.round(fh) > 3400;
        r += !cutL && !cutH ? '<span class="ok">fits inside the phone band</span>' :
          '<span class="bad">phone cuts ' + (cutL && cutH ? 'below 300 and above 3,400' : cutL ? (one ? hz(fl) + ' Hz (below 300)' : hz(fl) + '–300 Hz') : (one ? hz(fh) + ' Hz (above 3,400)' : '3,400–' + hz(fh) + ' Hz')) + '</span>';
      }
      readout.innerHTML = r;
    }

    /* stop the sound and release the microphone when the slide is hidden */
    setInterval(function () { if (st.playing && (!root.isConnected || root.offsetParent === null)) stopAll(); }, 500);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting && st.playing) stopAll(); }); }).observe(root);

    refreshSub(); sync(); showStatic();
  });
  if (typeof module !== 'undefined') module.exports = { fft: fft, spectrumDb: spectrumDb, synth: synth, analyse: analyse, formantGain: formantGain, vowelAmps: vowelAmps, VOWELS: VOWELS };
})();
