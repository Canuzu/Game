/* =============================================================================
 * audio.js — Chiptune-Musik und Klänge
 * -----------------------------------------------------------------------------
 * Alles wird zur Laufzeit erzeugt: vier Kanäle (Melodie, Begleitung, Bass,
 * Schlagzeug) auf Oszillatoren und Rauschen, dazu ein kleiner Sequencer, der
 * immer ein Stück im Voraus plant. Es wird keine einzige Audiodatei geladen —
 * das Spiel bleibt eine Datei und läuft offline.
 *
 * Gliederung:  1) Tonleiter   2) Klangerzeugung   3) Stücke   4) Sequencer
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});

  /* ---------- 1) Tonleiter ------------------------------------------------- */

  var STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  /** "A4" oder "F#3" → Frequenz in Hertz. */
  function freq(note) {
    if (!note || note === '-' || note === '.') return 0;
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
    if (!m) return 0;
    var semi = STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    var midi = (parseInt(m[3], 10) + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---------- 2) Klangerzeugung -------------------------------------------- */

  var ctx = null, master = null, noiseBuffer = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // Rauschen für das Schlagzeug: eine Sekunde reicht, wir schneiden daraus.
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0), i;
    for (i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  /** Ein Ton mit hartem Ein- und weichem Ausschwingen — typisch Chiptune. */
  function tone(when, hz, dur, type, vol, glide) {
    if (!hz) return;
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, when);
    if (glide) osc.frequency.exponentialRampToValueAtTime(hz * glide, when + dur);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(vol, when + 0.008);
    gain.gain.setValueAtTime(vol, when + dur * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain).connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  /** Schlagzeug aus gefiltertem Rauschen. */
  function drum(when, kind) {
    var src = ctx.createBufferSource(), gain = ctx.createGain(), filt = ctx.createBiquadFilter();
    src.buffer = noiseBuffer;
    filt.type = kind === 'hat' ? 'highpass' : 'bandpass';
    filt.frequency.value = kind === 'hat' ? 7000 : kind === 'snare' ? 1800 : 200;
    var dur = kind === 'hat' ? 0.03 : kind === 'snare' ? 0.11 : 0.13;
    var vol = kind === 'hat' ? 0.035 : kind === 'snare' ? 0.07 : 0.09;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filt).connect(gain).connect(master);
    src.start(when, 0, dur + 0.02);
    if (kind === 'kick') {
      var osc = ctx.createOscillator(), kg = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, when);
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
      kg.gain.setValueAtTime(0.12, when);
      kg.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
      osc.connect(kg).connect(master);
      osc.start(when);
      osc.stop(when + 0.16);
    }
  }

  /* ---------- 3) Stücke ------------------------------------------------------
   * Jedes Stück ist ein Raster aus Sechzehnteln. '-' hält den Ton, '.' ist
   * eine Pause. Die Melodie bleibt in der Tonart, die Begleitung nimmt
   * Akkordtöne, der Bass die Grundtöne — schlicht, aber es trägt.
   * ------------------------------------------------------------------------ */

  function pattern(s) { return s.trim().split(/\s+/); }

  var TRACKS = {
    // Route: C-Dur, freundlich, mittleres Tempo
    route: {
      bpm: 132, lead: 'square', harm: 'triangle', bass: 'triangle',
      melody: pattern(`
        E5 . G5 . C6 . G5 . A5 . G5 . E5 . . .
        F5 . A5 . C6 . A5 . G5 . . . . . . .
        D5 . F5 . A5 . F5 . G5 . F5 . D5 . . .
        C5 . E5 . G5 . E5 . C5 . . . . . . .`),
      chords: pattern(`
        C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 .
        F4 . A4 . C5 . A4 . F4 . A4 . C5 . A4 .
        D4 . F4 . A4 . F4 . G4 . B4 . D5 . B4 .
        C4 . E4 . G4 . E4 . G4 . E4 . C4 . . .`),
      low: pattern(`
        C2 . . . G2 . . . C2 . . . G2 . . .
        F2 . . . C3 . . . F2 . . . A2 . . .
        D2 . . . A2 . . . G2 . . . B2 . . .
        C2 . . . G2 . . . C2 . . . G2 . . .`),
      beat: pattern(`
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h . s h s h`)
    },

    // Stadt: F-Dur, ruhiger, weniger Schlagzeug
    town: {
      bpm: 108, lead: 'triangle', harm: 'triangle', bass: 'triangle',
      melody: pattern(`
        A4 . . C5 . . F5 . . E5 . . C5 . . .
        G4 . . B4 . . D5 . . C5 . . A4 . . .
        F4 . . A4 . . C5 . . D5 . . C5 . . .
        A4 . . G4 . . F4 . . . . . . . . .`),
      chords: pattern(`
        F4 . A4 . C5 . A4 . F4 . A4 . C5 . A4 .
        G4 . B4 . D5 . B4 . G4 . B4 . D5 . B4 .
        F4 . A4 . C5 . A4 . D4 . F4 . A4 . F4 .
        C4 . E4 . G4 . E4 . F4 . A4 . C5 . . .`),
      low: pattern(`
        F2 . . . . . . . C3 . . . . . . .
        G2 . . . . . . . D3 . . . . . . .
        F2 . . . . . . . D2 . . . . . . .
        C2 . . . . . . . F2 . . . . . . .`),
      beat: pattern(`
        . . h . . . h . . . h . . . h .
        . . h . . . h . . . h . . . h .
        . . h . . . h . . . h . . . h .
        . . h . . . h . . . h . . . h .`)
    },

    // Höhle: a-Moll, spärlich, tief
    cave: {
      bpm: 96, lead: 'triangle', harm: 'sine', bass: 'triangle',
      melody: pattern(`
        A4 . . . . . E4 . . . . . F4 . . .
        . . . . E4 . . . . . D4 . . . . .
        C5 . . . . . A4 . . . . . B4 . . .
        . . . . A4 . . . . . . . . . . .`),
      chords: pattern(`
        A3 . . . E4 . . . A3 . . . C4 . . .
        E3 . . . B3 . . . E3 . . . G3 . . .
        F3 . . . C4 . . . F3 . . . A3 . . .
        E3 . . . B3 . . . E3 . . . . . . .`),
      low: pattern(`
        A2 . . . . . . . . . . . . . . .
        E2 . . . . . . . . . . . . . . .
        F2 . . . . . . . . . . . . . . .
        E2 . . . . . . . . . . . . . . .`),
      beat: pattern(`
        . . . . . . . . k . . . . . . .
        . . . . . . . . k . . . . . . .
        . . . . . . . . k . . . . . . .
        . . . . . . . . k . . . . . h .`)
    },

    // Kampf: a-Moll, schnell, treibend
    battle: {
      bpm: 156, lead: 'square', harm: 'square', bass: 'triangle',
      melody: pattern(`
        A5 . A5 . C6 . B5 . A5 . G5 . E5 . . .
        F5 . F5 . A5 . G5 . F5 . E5 . D5 . . .
        E5 . G5 . B5 . A5 . G5 . E5 . D5 . C5 .
        A4 . C5 . E5 . A5 . G5 . E5 . . . . .`),
      chords: pattern(`
        A4 E4 A4 E4 A4 E4 A4 E4 A4 E4 A4 E4 A4 E4 A4 E4
        F4 C4 F4 C4 F4 C4 F4 C4 F4 C4 F4 C4 F4 C4 F4 C4
        G4 D4 G4 D4 G4 D4 G4 D4 E4 B3 E4 B3 E4 B3 E4 B3
        A4 E4 A4 E4 A4 E4 A4 E4 A4 E4 C5 . E5 . . .`),
      low: pattern(`
        A2 . A2 . A2 . A2 . A2 . A2 . E2 . E2 .
        F2 . F2 . F2 . F2 . F2 . F2 . C3 . C3 .
        G2 . G2 . G2 . G2 . E2 . E2 . E2 . E2 .
        A2 . A2 . A2 . A2 . A2 . A2 . A2 . . .`),
      beat: pattern(`
        k . h s k . h s k . h s k . h s
        k . h s k . h s k . h s k . h s
        k . h s k . h s k . h s k . h s
        k . h s k . h s k . h s k s k s`)
    },

    // Arenaleiter und Liga: d-Moll, schwerer, noch schneller
    boss: {
      bpm: 172, lead: 'square', harm: 'square', bass: 'square',
      melody: pattern(`
        D5 . F5 . A5 . D6 . C6 . A5 . F5 . D5 .
        Bb4 . D5 . F5 . Bb5 . A5 . F5 . D5 . . .
        C5 . E5 . G5 . C6 . Bb5 . G5 . E5 . C5 .
        A4 . D5 . F5 . A5 . D6 . . . . . . .`),
      chords: pattern(`
        D4 A4 D4 A4 D4 A4 D4 A4 D4 A4 D4 A4 D4 A4 D4 A4
        Bb3 F4 Bb3 F4 Bb3 F4 Bb3 F4 Bb3 F4 Bb3 F4 Bb3 F4 Bb3 F4
        C4 G4 C4 G4 C4 G4 C4 G4 C4 G4 C4 G4 C4 G4 C4 G4
        D4 A4 D4 A4 D4 A4 D4 A4 A3 E4 A3 E4 A3 E4 A3 E4`),
      low: pattern(`
        D2 D2 . D2 . D2 D2 . D2 D2 . D2 . D2 D2 .
        Bb1 Bb1 . Bb1 . Bb1 Bb1 . Bb1 Bb1 . Bb1 . Bb1 Bb1 .
        C2 C2 . C2 . C2 C2 . C2 C2 . C2 . C2 C2 .
        D2 D2 . D2 . D2 D2 . A1 A1 . A1 . A1 A1 .`),
      beat: pattern(`
        k h s h k h s h k h s h k h s h
        k h s h k h s h k h s h k h s h
        k h s h k h s h k h s h k h s h
        k h s h k h s h k h s h s s s s`)
    }
  };

  // Kurze Fanfare nach einem Sieg — läuft einmal, dann geht das Stück weiter.
  var JINGLE = {
    bpm: 150, lead: 'square', bass: 'triangle',
    melody: pattern('C5 . E5 . G5 . C6 . . G5 . C6 . . . .'),
    low: pattern('C3 . . . E3 . . . G3 . . . C3 . . .'),
    beat: pattern('k . h . k . h . k . h . k s k s')
  };

  /* ---------- 4) Sequencer ---------------------------------------------------
   * Geplant wird ein Viertelsekunde im Voraus; ein Timer schiebt das Fenster
   * weiter. Das hält den Takt stabil, auch wenn der Browser kurz beschäftigt
   * ist.
   * ------------------------------------------------------------------------ */

  var current = null, timer = null, nextTime = 0, step = 0, enabled = true, volume = 0.5;
  var jingleUntil = 0, resumeTrack = null;

  function stepDur(track) { return 60 / track.bpm / 4; }

  function scheduleStep(track, when, i) {
    var n = track.melody.length;
    var lead = track.melody[i % n];
    var harm = track.chords ? track.chords[i % track.chords.length] : null;
    var bass = track.low ? track.low[i % track.low.length] : null;
    var beat = track.beat ? track.beat[i % track.beat.length] : '.';
    var d = stepDur(track);

    if (lead && lead !== '.' && lead !== '-') tone(when, freq(lead), d * 3.2, track.lead || 'square', 0.055);
    if (harm && harm !== '.' && harm !== '-') tone(when, freq(harm), d * 1.6, track.harm || 'triangle', 0.028);
    if (bass && bass !== '.' && bass !== '-') tone(when, freq(bass), d * 3.0, track.bass || 'triangle', 0.075);
    if (beat === 'k') drum(when, 'kick');
    else if (beat === 's') drum(when, 'snare');
    else if (beat === 'h') drum(when, 'hat');
  }

  function pump() {
    if (!ctx || !current) return;
    // Solange der Browser den Ton anhält (vor der ersten Eingabe), wird nicht
    // geplant — sonst kämen beim Fortsetzen alle Töne auf einmal.
    if (ctx.state === 'suspended') { nextTime = ctx.currentTime + 0.05; return; }
    var horizon = ctx.currentTime + 0.25;
    while (nextTime < horizon) {
      var track = (jingleUntil > nextTime) ? JINGLE : current;
      scheduleStep(track, nextTime, step);
      nextTime += stepDur(track);
      step++;
      if (jingleUntil && nextTime >= jingleUntil) {
        jingleUntil = 0;
        step = 0;
        if (resumeTrack) { current = resumeTrack; resumeTrack = null; }
      }
    }
  }

  function play(name) {
    if (!enabled) { current = TRACKS[name] || current; return; }
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    var track = TRACKS[name];
    if (!track || current === track) { current = track || current; if (!timer) startTimer(); return; }
    current = track;
    step = 0;
    nextTime = Math.max(ctx.currentTime + 0.05, nextTime);
    startTimer();
  }

  function startTimer() {
    if (timer) return;
    nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
    timer = root.setInterval(pump, 60);
    pump();
  }

  /** Hält die Wiedergabe an, merkt sich aber das Stück für später. */
  function stop() {
    if (timer) { root.clearInterval(timer); timer = null; }
    jingleUntil = 0;
  }

  function jingle() {
    if (!enabled || !ctx || !current) return;
    resumeTrack = current;
    step = 0;
    nextTime = Math.max(ctx.currentTime + 0.02, nextTime);
    jingleUntil = nextTime + JINGLE.melody.length * stepDur(JINGLE);
  }

  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) { stop(); }
    else if (current && ensure()) { if (ctx.state === 'suspended') ctx.resume(); startTimer(); }
    if (master) master.gain.value = enabled ? volume : 0;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = enabled ? volume : 0;
  }

  /** Welches Stück gehört zu diesem Ort? */
  function trackFor(kind, biome) {
    if (kind === 'boss') return 'boss';
    if (kind === 'battle') return 'battle';
    if (biome === 'stadt' || biome === 'arena' || kind === 'shop') return 'town';
    if (biome === 'hoehle' || biome === 'nacht' || biome === 'liga') return 'cave';
    return 'route';
  }

  PL.audio = {
    play: play, stop: stop, jingle: jingle,
    setEnabled: setEnabled, setVolume: setVolume,
    trackFor: trackFor, tracks: TRACKS,
    isEnabled: function () { return enabled; },
    current: function () { return current; },
    freq: freq
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.audio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
