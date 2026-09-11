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
    },

    /* Legenden: e-Moll, acht Zeilen statt vier — das einzige Stück im Spiel,
     * das sich Zeit lässt, bevor es zuschlägt.
     *
     * Alle anderen Stücke sind vier Zeilen lang und wiederholen sich nach
     * knapp zehn Sekunden. Für einen Kampf gegen einen Arenaleiter reicht
     * das. Der Legendäre Run dauert Stunden, und wer 125-mal dasselbe
     * Vierzeilenstück hört, dreht den Ton ab. Also: zwei Zeilen Anlauf ohne
     * Schlagzeug, dann das Thema, eine absteigende Fortspinnung, und zum
     * Schluss ein Oktavsprung nach oben. Das Tempo liegt unter dem des
     * Arenaleiterstücks — Schwere entsteht nicht durch Hetze.
     *
     * Geschrieben, nicht abgehört: Die Musik der Spiele gehört Nintendo und
     * hat hier nichts zu suchen. Gesucht war die Stimmung von etwas, das
     * größer ist als man selbst. */
    legenden: {
      bpm: 138, lead: 'square', harm: 'triangle', bass: 'square',
      melody: pattern(`
        E4 . . . B4 . . . E5 . . . B4 . . .
        C5 . . . B4 . . . A4 . . . G4 . F#4 .
        E5 . . B5 . . G5 . A5 . B5 . . . . .
        C6 . . B5 . . A5 . G5 . F#5 . E5 . . .
        D5 . . A5 . . F#5 . G5 . A5 . B5 . . .
        C6 . . . B5 . . . A5 . G5 . A5 . . .
        B5 . . . E6 . . . D6 . . . B5 . . .
        C6 . B5 . A5 . G5 . E5 . B5 . E6 . . .`),
      chords: pattern(`
        E4 B4 E4 B4 E4 B4 E4 B4 E4 B4 E4 B4 E4 B4 E4 B4
        C4 G4 C4 G4 C4 G4 C4 G4 B3 F#4 B3 F#4 B3 F#4 B3 F#4
        E4 B4 E4 B4 G4 D5 G4 D5 E4 B4 E4 B4 G4 D5 G4 D5
        C4 G4 C4 G4 C4 G4 C4 G4 D4 A4 D4 A4 D4 A4 D4 A4
        D4 A4 D4 A4 D4 A4 D4 A4 G4 D5 G4 D5 G4 D5 G4 D5
        C4 G4 C4 G4 C4 G4 C4 G4 A3 E4 A3 E4 A3 E4 A3 E4
        B3 F#4 B3 F#4 B3 F#4 B3 F#4 E4 B4 E4 B4 E4 B4 E4 B4
        C4 G4 C4 G4 D4 A4 D4 A4 E4 B4 E4 B4 E4 B4 E4 B4`),
      low: pattern(`
        E2 . . . E2 . . . E2 . . . E2 . E2 .
        C2 . . . C2 . . . B1 . . . B1 . B1 .
        E2 . E2 . G2 . G2 . E2 . E2 . G2 . G2 .
        C2 . C2 . C2 . C2 . D2 . D2 . D2 . D2 .
        D2 . D2 . D2 . D2 . G2 . G2 . G2 . G2 .
        C2 . C2 . C2 . C2 . A1 . A1 . A1 . A1 .
        B1 . B1 . B1 . B1 . E2 . E2 . E2 . E2 .
        C2 . C2 . D2 . D2 . E2 . E2 . E2 E2 E2 E2`),
      beat: pattern(`
        k . . . . . . . k . . . . . . .
        k . . . . . . . k . . . k . k .
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h . s . h s
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h s k s h s
        k h k h s h s h k h k h s h s h
        k h s h k h s h k s k s k s k s`)
    }
  };

  /* ---------- 3b) Die neun Regionen -------------------------------------------
   * Jede Region bekommt ihr eigenes Stück: eigene Tonart, eigenes Tempo,
   * eigene Wellenform, eigener Rhythmus. Wer von Kanto nach Johto zieht, hört
   * das, ohne hinzusehen — und wer denselben Run zweimal spielt, erkennt die
   * Region am Klang wieder.
   *
   * Die Stücke sind hier eigens geschrieben und keine Übertragungen aus den
   * Spielen: Deren Musik gehört Nintendo und darf hier nicht liegen. Gesucht
   * war die Stimmung, nicht die Melodie — ein Marsch für Kanto, etwas
   * Wiegendes für Johto, Synkopen für Hoenn, Kälte für Sinnoh, Antrieb für
   * Einall, ein Walzer für Kalos, Inselruhe für Alola, ein schwerer Schritt
   * für Galar, phrygische Gitarren für Paldea.
   *
   * `halb` verschiebt Stadt- und Höhlenstück in dieselbe Tonart — so klingt
   * eine Region auch dort nach sich selbst, ohne dass 27 Melodien von Hand
   * geschrieben werden müssten.
   * ------------------------------------------------------------------------ */

  var REGION_TRACKS = {
    // 1 — Kanto: C-Dur, aufrechter Marsch, klare Quinten
    1: {
      halb: 0, bpm: 138, lead: 'square', harm: 'triangle', bass: 'triangle',
      melody: pattern(`
        G4 . . . C5 . . . E5 . D5 . C5 . . .
        D5 . . . G4 . . . B4 . C5 . D5 . . .
        E5 . . . G5 . . . F5 . E5 . D5 . . .
        C5 . . . E5 . G5 . C6 . . . . . . .`),
      chords: pattern(`
        C4 . G4 . E4 . G4 . C4 . G4 . E4 . G4 .
        G3 . D4 . B3 . D4 . G3 . D4 . B3 . D4 .
        F3 . C4 . A3 . C4 . G3 . D4 . B3 . D4 .
        C4 . G4 . E4 . G4 . C4 . E4 . G4 . . .`),
      low: pattern(`
        C2 . . . C2 . . . G2 . . . G2 . . .
        G2 . . . G2 . . . D2 . . . D2 . . .
        F2 . . . F2 . . . G2 . . . G2 . . .
        C2 . . . C2 . . . G2 . . . C2 . . .`),
      beat: pattern(`
        k . . . s . . . k . . . s . . .
        k . . . s . . . k . . . s . . .
        k . . . s . . . k . . . s . . .
        k . . . s . . . k . . s . k s .`)
    },

    // 2 — Johto: G-Dur, wiegend, weiche Dreiecke, wie eine ferne Glocke
    2: {
      halb: 7, bpm: 112, lead: 'triangle', harm: 'sine', bass: 'triangle',
      melody: pattern(`
        D5 . . B4 . . G4 . . B4 . . D5 . . .
        E5 . . . . . D5 . . B4 . . G4 . . .
        C5 . . A4 . . F4 . . A4 . . C5 . . .
        B4 . . . . . G4 . . . . . . . . .`),
      chords: pattern(`
        G3 . B3 . D4 . B3 . G3 . B3 . D4 . B3 .
        C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 .
        F3 . A3 . C4 . A3 . F3 . A3 . C4 . A3 .
        G3 . B3 . D4 . B3 . D4 . B3 . G3 . . .`),
      low: pattern(`
        G2 . . . . . . . D3 . . . . . . .
        C3 . . . . . . . G2 . . . . . . .
        F2 . . . . . . . C3 . . . . . . .
        G2 . . . . . . . D3 . . . . . . .`),
      beat: pattern(`
        k . . . . . h . s . . . . . h .
        k . . . . . h . s . . . . . h .
        k . . . . . h . s . . . . . h .
        k . . . . . h . s . . . h . h .`)
    },

    // 3 — Hoenn: D-Dur, synkopiert und hell, Wellen und Wind
    3: {
      halb: 2, bpm: 148, lead: 'square', harm: 'square', bass: 'triangle',
      melody: pattern(`
        . . A4 . D5 . . F#5 . E5 . . D5 . . .
        . . B4 . E5 . . G5 . F#5 . . E5 . . .
        . . A4 . D5 . . A5 . F#5 . . D5 . . .
        . . G4 . B4 . . D5 . . A4 . D5 . . .`),
      chords: pattern(`
        D4 . F#4 . A4 . F#4 . D4 . F#4 . A4 . F#4 .
        E4 . G4 . B4 . G4 . E4 . G4 . B4 . G4 .
        D4 . F#4 . A4 . F#4 . D4 . A4 . F#4 . D4 .
        G3 . B3 . D4 . B3 . A3 . C#4 . E4 . . .`),
      low: pattern(`
        D2 . . D2 . . D2 . A2 . . A2 . . . .
        E2 . . E2 . . E2 . B2 . . B2 . . . .
        D2 . . D2 . . D2 . A2 . . A2 . . . .
        G2 . . G2 . . A2 . A2 . . D3 . . . .`),
      beat: pattern(`
        k . h . . s h . k . h . . s h .
        k . h . . s h . k . h . . s h .
        k . h . . s h . k . h . . s h .
        k . h . . s h . k . h . s h s .`)
    },

    // 4 — Sinnoh: a-Moll mit Dur-Aufhellung, langsam, weit, kalt
    4: {
      halb: 9, bpm: 100, lead: 'triangle', harm: 'sine', bass: 'triangle',
      melody: pattern(`
        A4 . . . . . C5 . . . E5 . . . . .
        D5 . . . . . C5 . . . B4 . . . . .
        F4 . . . . . A4 . . . C5 . . . . .
        E5 . . . D5 . . . C5 . . . A4 . . .`),
      chords: pattern(`
        A3 . E4 . A3 . E4 . A3 . E4 . A3 . E4 .
        F3 . C4 . F3 . C4 . G3 . D4 . G3 . D4 .
        F3 . A3 . F3 . A3 . C4 . E4 . C4 . E4 .
        E3 . B3 . E3 . B3 . A3 . E4 . A3 . . .`),
      low: pattern(`
        A2 . . . . . . . E2 . . . . . . .
        F2 . . . . . . . G2 . . . . . . .
        F2 . . . . . . . C3 . . . . . . .
        E2 . . . . . . . A2 . . . . . . .`),
      beat: pattern(`
        . . . . k . . . . . . . s . . .
        . . . . k . . . . . . . s . . .
        . . . . k . . . . . . . s . . .
        . . . . k . . . . . . . s . h .`)
    },

    // 5 — Einall: e-Moll, städtisch und treibend, harter Rückschlag
    5: {
      halb: 4, bpm: 154, lead: 'square', harm: 'square', bass: 'square',
      melody: pattern(`
        E5 . E5 . G5 . E5 . B4 . . . D5 . . .
        C5 . C5 . E5 . C5 . G4 . . . B4 . . .
        A4 . A4 . C5 . A4 . E5 . D5 . C5 . . .
        B4 . D5 . E5 . G5 . E5 . . . . . . .`),
      chords: pattern(`
        E4 B3 E4 B3 E4 B3 E4 B3 E4 B3 E4 B3 E4 B3 E4 B3
        C4 G3 C4 G3 C4 G3 C4 G3 C4 G3 C4 G3 C4 G3 C4 G3
        A3 E3 A3 E3 A3 E3 A3 E3 A3 E3 A3 E3 A3 E3 A3 E3
        B3 F#4 B3 F#4 B3 F#4 B3 F#4 E4 B3 E4 B3 E4 B3 . .`),
      low: pattern(`
        E2 . E2 . . E2 . . E2 . E2 . . E2 . .
        C2 . C2 . . C2 . . C2 . C2 . . C2 . .
        A2 . A2 . . A2 . . A2 . A2 . . A2 . .
        B2 . B2 . . B2 . . E2 . E2 . E2 . . .`),
      beat: pattern(`
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h . s . h .
        k . h . s . h . k . h . s s s s`)
    },

    // 6 — Kalos: F-Dur, ein Walzer in Dreiergruppen, zierlich
    6: {
      halb: 5, bpm: 126, lead: 'triangle', harm: 'triangle', bass: 'triangle',
      melody: pattern(`
        F5 . . A5 . . G5 . . F5 . . E5 . . .
        D5 . . F5 . . E5 . . D5 . . C5 . . .
        Bb4 . . D5 . . F5 . . A5 . . G5 . . .
        F5 . . E5 . . D5 . . C5 . . F5 . . .`),
      chords: pattern(`
        F4 . . A4 . . C5 . . A4 . . F4 . . .
        Bb3 . . D4 . . F4 . . D4 . . Bb3 . . .
        Bb3 . . D4 . . F4 . . C4 . . E4 . . .
        F4 . . A4 . . C5 . . C4 . . F4 . . .`),
      low: pattern(`
        F2 . . . . . C3 . . . . . A2 . . .
        Bb1 . . . . . F2 . . . . . D2 . . .
        Bb1 . . . . . F2 . . . . . C2 . . .
        F2 . . . . . C3 . . . . . F2 . . .`),
      beat: pattern(`
        k . . h . . h . . k . . h . . .
        k . . h . . h . . k . . h . . .
        k . . h . . h . . k . . h . . .
        k . . h . . h . . k . . h . s .`)
    },

    // 7 — Alola: B-Dur, entspannt, Betonung auf der Nebenzeit
    7: {
      halb: 10, bpm: 110, lead: 'triangle', harm: 'square', bass: 'triangle',
      melody: pattern(`
        . . D5 . . F5 . . D5 . . C5 . . . .
        . . C5 . . Eb5 . . C5 . . Bb4 . . . .
        . . F5 . . D5 . . Bb4 . . D5 . . . .
        . . C5 . . D5 . . F5 . . Bb5 . . . .`),
      chords: pattern(`
        . . Bb3 . . D4 . . F4 . . D4 . . Bb3 .
        . . Eb4 . . G4 . . Bb4 . . G4 . . Eb4 .
        . . Bb3 . . D4 . . F4 . . Bb4 . . F4 .
        . . F3 . . A3 . . C4 . . Bb3 . . D4 .`),
      low: pattern(`
        Bb1 . . . . . F2 . . . . . Bb1 . . .
        Eb2 . . . . . Bb2 . . . . . Eb2 . . .
        Bb1 . . . . . F2 . . . . . D2 . . .
        F2 . . . . . C3 . . . . . Bb1 . . .`),
      beat: pattern(`
        k . . h . . s . . h . . k . . h
        k . . h . . s . . h . . k . . h
        k . . h . . s . . h . . k . . h
        k . . h . . s . . h . . k . s .`)
    },

    // 8 — Galar: d-Moll, schwerer Schritt, breite Quinten wie Blechbläser
    8: {
      halb: 2, bpm: 130, lead: 'square', harm: 'square', bass: 'square',
      melody: pattern(`
        D5 . . . D5 . F5 . E5 . . . D5 . . .
        A4 . . . A4 . C5 . D5 . . . . . . .
        F5 . . . E5 . D5 . C5 . . . A4 . . .
        Bb4 . . . C5 . D5 . A5 . . . . . . .`),
      chords: pattern(`
        D4 A4 . . D4 A4 . . D4 A4 . . D4 A4 . .
        A3 E4 . . A3 E4 . . A3 E4 . . A3 E4 . .
        F4 C5 . . F4 C5 . . D4 A4 . . D4 A4 . .
        Bb3 F4 . . Bb3 F4 . . A3 E4 . . D4 A4 . .`),
      low: pattern(`
        D2 . . . D2 . . . A2 . . . A2 . . .
        A1 . . . A1 . . . E2 . . . E2 . . .
        F2 . . . F2 . . . D2 . . . D2 . . .
        Bb1 . . . Bb1 . . . A1 . . . D2 . . .`),
      beat: pattern(`
        k . . . s . . h k . . . s . . h
        k . . . s . . h k . . . s . . h
        k . . . s . . h k . . . s . . h
        k . . . s . . h k . k . s s s .`)
    },

    // 9 — Paldea: e-phrygisch, gezupfte Arpeggien, Kastagnettentakt
    9: {
      halb: 4, bpm: 132, lead: 'square', harm: 'triangle', bass: 'triangle',
      melody: pattern(`
        E5 . F5 . E5 . D5 . C5 . B4 . . . . .
        C5 . B4 . A4 . B4 . C5 . D5 . E5 . . .
        F5 . E5 . D5 . C5 . B4 . C5 . D5 . . .
        E5 . . . B4 . . . E5 . . . . . . .`),
      chords: pattern(`
        E4 . B4 . E4 . G4 . E4 . B4 . E4 . G4 .
        F4 . C5 . F4 . A4 . F4 . C5 . F4 . A4 .
        E4 . B4 . E4 . G4 . D4 . A4 . D4 . F4 .
        E4 . B4 . E4 . G4 . B4 . E5 . . . . .`),
      low: pattern(`
        E2 . . E2 . . E2 . B2 . . B2 . . . .
        F2 . . F2 . . F2 . C3 . . C3 . . . .
        E2 . . E2 . . E2 . D2 . . D2 . . . .
        E2 . . E2 . . B2 . E2 . . . . . . .`),
      beat: pattern(`
        k . h h s . h . k . h h s . h .
        k . h h s . h . k . h h s . h .
        k . h h s . h . k . h h s . h .
        k . h h s . h . k h k h s s s .`)
    }
  };

  /* ---------- 3c) Umstimmen ---------------------------------------------------
   * Stadt und Höhle gibt es nur einmal — sie werden in die Tonart der Region
   * gerückt. Ein Halbtonschritt ist im Zwölfertakt der Tonleiter eine
   * Addition, mehr steckt hier nicht dahinter.
   * ------------------------------------------------------------------------ */

  var NAMEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function noteZuHalb(note) {
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
    if (!m) return null;
    var semi = STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return (parseInt(m[3], 10) + 1) * 12 + semi;
  }

  function halbZuNote(midi) {
    return NAMEN[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  }

  function schiebe(reihe, halb) {
    return reihe.map(function (n) {
      if (!n || n === '.' || n === '-') return n;
      var midi = noteZuHalb(n);
      return midi === null ? n : halbZuNote(midi + halb);
    });
  }

  var umgestimmt = {};

  /** Ein Stück in der Tonart einer Region — gerechnet wird einmal je Paar. */
  function fuerRegion(name, gen) {
    var quelle = TRACKS[name];
    var region = REGION_TRACKS[gen];
    if (!quelle || !region || !region.halb) return quelle;
    var schluessel = name + ':' + gen;
    if (umgestimmt[schluessel]) return umgestimmt[schluessel];
    var kopie = {
      bpm: quelle.bpm, lead: quelle.lead, harm: quelle.harm, bass: quelle.bass,
      melody: schiebe(quelle.melody, region.halb),
      chords: quelle.chords ? schiebe(quelle.chords, region.halb) : null,
      low: quelle.low ? schiebe(quelle.low, region.halb) : null,
      beat: quelle.beat
    };
    umgestimmt[schluessel] = kopie;
    return kopie;
  }

  /* ---------- 3b) Ein Motiv für jedes legendäre Pokémon ------------------------
   * 125 Stücke von Hand zu schreiben wäre nicht ehrlich machbar — und neun
   * Generationsthemen wären zu wenig: Mewtu darf nicht klingen wie Arktos.
   * Also entsteht jedes Stück aus dem Pokémon selbst. Seine Pokédex-Nummer
   * setzt den Würfel, sein erster Typ wählt die Tonleiter, seine Werte das
   * Tempo. Dasselbe Pokémon klingt deshalb immer gleich und nie wie das
   * nächste.
   *
   * Damit nichts Beliebiges herauskommt, würfelt der Bau nicht die Töne
   * einzeln: Akkordfolge, Rhythmus und Bewegung stehen in kurzen Listen, und
   * die Melodie läuft in Akkordtönen mit Durchgangsnoten. Die Titelträger —
   * Mewtu, Lugia, Rayquaza und ihresgleichen — bringen darüber hinaus ein
   * von Hand geschriebenes Motiv mit, das an dieselbe Begleitung geht.
   * ------------------------------------------------------------------------ */

  var SKALEN = {
    moll:        [0, 2, 3, 5, 7, 8, 10],
    harmonisch:  [0, 2, 3, 5, 7, 8, 11],
    dorisch:     [0, 2, 3, 5, 7, 9, 10],
    phrygisch:   [0, 1, 3, 5, 7, 8, 10],
    lydisch:     [0, 2, 4, 6, 7, 9, 11],
    dur:         [0, 2, 4, 5, 7, 9, 11]
  };

  // Welcher Typ klingt wonach. Unlicht und Geist dunkel, Psycho und Fee weit,
  // Drache und Kampf feierlich-streng, Wasser und Eis schwebend.
  var TYP_SKALA = {
    Dark: 'phrygisch', Ghost: 'phrygisch', Poison: 'phrygisch',
    Dragon: 'harmonisch', Fighting: 'harmonisch', Steel: 'harmonisch',
    Psychic: 'lydisch', Fairy: 'lydisch',
    Water: 'dorisch', Ice: 'dorisch', Flying: 'dorisch',
    Fire: 'moll', Electric: 'moll', Rock: 'moll', Ground: 'moll',
    Grass: 'dur', Bug: 'dur', Normal: 'dur'
  };

  // Vier Stufenfolgen, alle vier Takte lang. Stufe 0 ist der Grundton.
  var FOLGEN = [
    [0, 5, 3, 4],
    [0, 3, 5, 4],
    [0, 6, 5, 4],
    [0, 4, 5, 3]
  ];

  // Rhythmen der Melodie: 1 = Ton, 0 = Pause. Sechzehn Schritte je Takt.
  var RHYTHMEN = [
    [1,0,1,0, 1,0,0,1, 0,1,0,0, 1,0,0,0],
    [1,0,0,1, 0,1,0,0, 1,0,1,0, 1,0,0,0],
    [1,1,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0],
    [1,0,0,0, 1,0,1,0, 0,1,0,1, 0,0,1,0]
  ];

  var SCHLAG = [
    pattern('k . h . s . h . k . h . s . h .'),
    pattern('k . h k s . h . k . h k s . h s'),
    pattern('k h . h s h . h k h . h s h k h')
  ];

  /**
   * Von Hand geschriebene Motive für die Titelträger. »motiv« sind Stufen der
   * gewählten Tonleiter über zwei Takte (32 Schritte), -1 ist eine Pause;
   * die Zahl zählt Tonleiterstufen über dem Grundton, 7 ist die Oktave.
   */
  var HAND_MOTIVE = {
    // Mewtu: ein enger, drohender Gedanke, der sich nach oben schraubt
    mewtwo: { ton: 'D', skala: 'harmonisch', bpm: 152, folge: 0, motiv: [
      0,-1,-1, 1, 2,-1, 1,-1, 4,-1,-1,-1, 3,-1, 2,-1,
      0,-1, 2,-1, 4,-1, 6,-1, 7,-1,-1,-1,-1,-1,-1,-1] },
    // Mew: leicht, spielerisch, immer eine Stufe weiter als erwartet
    mew: { ton: 'A', skala: 'lydisch', bpm: 138, folge: 3, motiv: [
      4,-1, 5,-1, 6,-1, 5,-1, 4,-1,-1, 2,-1,-1,-1,-1,
      2,-1, 3,-1, 4,-1, 6,-1, 7,-1,-1,-1,-1,-1,-1,-1] },
    // Lugia: weite, ruhige Bögen über dem Meer
    lugia: { ton: 'G', skala: 'dorisch', bpm: 124, folge: 1, motiv: [
      0,-1,-1,-1, 4,-1,-1,-1, 3,-1,-1, 2,-1,-1,-1,-1,
      4,-1,-1,-1, 7,-1,-1,-1, 6,-1,-1,-1, 4,-1,-1,-1] },
    // Ho-Oh: eine Fanfare, die aufsteigt und oben stehen bleibt
    hooh: { ton: 'C', skala: 'dur', bpm: 146, folge: 0, motiv: [
      0,-1, 2,-1, 4,-1,-1,-1, 7,-1,-1,-1,-1,-1, 6,-1,
      4,-1, 6,-1, 7,-1,-1,-1, 9,-1,-1,-1,-1,-1,-1,-1] },
    // Kyogre: schwer und tief, wie Wasser, das sich hebt
    kyogre: { ton: 'E', skala: 'dorisch', bpm: 116, folge: 2, motiv: [
      0,-1,-1,-1,-1,-1, 2,-1, 3,-1,-1,-1,-1,-1,-1,-1,
      4,-1,-1,-1, 3,-1, 2,-1, 0,-1,-1,-1,-1,-1,-1,-1] },
    // Groudon: stampfend, kurze harte Schritte
    groudon: { ton: 'F', skala: 'moll', bpm: 132, folge: 2, motiv: [
      0,-1, 0,-1, 2,-1,-1,-1, 0,-1, 0,-1, 3,-1,-1,-1,
      4,-1, 4,-1, 3,-1, 2,-1, 0,-1,-1,-1,-1,-1,-1,-1] },
    // Rayquaza: ein langer Sturzflug von oben nach unten
    rayquaza: { ton: 'B', skala: 'harmonisch', bpm: 158, folge: 0, motiv: [
      7,-1, 6,-1, 5,-1, 4,-1, 3,-1, 2,-1, 1,-1, 0,-1,
      4,-1,-1,-1, 7,-1,-1,-1,-1,-1, 6,-1,-1,-1,-1,-1] },
    // Dialga: ein Uhrwerk, gleichmäßig und unnachgiebig
    dialga: { ton: 'D', skala: 'harmonisch', bpm: 140, folge: 1, motiv: [
      0,-1,-1,-1, 0,-1,-1,-1, 4,-1,-1,-1, 4,-1,-1,-1,
      3,-1,-1,-1, 3,-1,-1,-1, 2,-1, 1,-1, 0,-1,-1,-1] },
    // Palkia: dasselbe Uhrwerk, aber gegen den Takt versetzt
    palkia: { ton: 'C', skala: 'lydisch', bpm: 140, folge: 1, motiv: [
      -1, 0,-1,-1,-1, 3,-1,-1,-1, 5,-1,-1,-1, 4,-1,-1,
      -1, 2,-1,-1,-1, 5,-1,-1,-1, 7,-1,-1,-1,-1,-1,-1] },
    // Giratina: kriechend, in engen Halbtönen
    giratina: { ton: 'A', skala: 'phrygisch', bpm: 112, folge: 2, motiv: [
      0,-1, 1,-1, 0,-1,-1,-1, 1,-1, 2,-1, 1,-1,-1,-1,
      0,-1,-1, 1,-1,-1, 3,-1, 2,-1,-1,-1,-1,-1,-1,-1] },
    // Arceus: feierlich, in großen Schritten, ohne Eile
    arceus: { ton: 'C', skala: 'dur', bpm: 104, folge: 3, motiv: [
      0,-1,-1,-1,-1,-1,-1,-1, 4,-1,-1,-1,-1,-1,-1,-1,
      7,-1,-1,-1, 6,-1,-1,-1, 4,-1,-1,-1, 2,-1,-1,-1] },
    // Zacian: ein schneller Hieb, zweimal geführt
    zacian: { ton: 'E', skala: 'harmonisch', bpm: 168, folge: 0, motiv: [
      0, 2, 4,-1, 7,-1,-1,-1, 0, 2, 4,-1, 7,-1,-1,-1,
      6,-1, 5,-1, 4,-1, 2,-1, 0,-1,-1,-1,-1,-1,-1,-1] },
    // Eternatus: bedrohlich, aus der Tiefe nach oben
    eternatus: { ton: 'F', skala: 'phrygisch', bpm: 148, folge: 2, motiv: [
      0,-1,-1, 1,-1,-1, 0,-1,-1, 3,-1,-1, 2,-1,-1,-1,
      0,-1, 3,-1, 5,-1, 7,-1,-1,-1,-1,-1,-1,-1,-1,-1] }
  };

  /** Ein winziger, wiederholbarer Würfel — dieselbe Zahl, dasselbe Stück. */
  function wuerfel(saat) {
    var s = (saat | 0) || 1;
    return function () {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Hält einen Ton in der Lage, in der ein Rechteckgenerator noch angenehm
   * klingt: unter G4 säuft die Melodie im Bass ab, über G6 pfeift sie.
   */
  function inLage(midi) {
    while (midi > 91) midi -= 12;
    while (midi < 67) midi += 12;
    return midi;
  }

  /** Stufe der Tonleiter (auch über die Oktave hinaus) in Halbtöne. */
  function stufeZuHalb(skala, stufe) {
    var okt = Math.floor(stufe / skala.length);
    var rest = ((stufe % skala.length) + skala.length) % skala.length;
    return skala[rest] + okt * 12;
  }

  /**
   * Baut das Stück. Übergeben wird alles, was es unterscheidet: Grundton,
   * Tonleiter, Tempo, Akkordfolge — und entweder ein Motiv von Hand oder ein
   * Würfel, der eines erfindet.
   */
  function baueLegendenstueck(o) {
    var skala = SKALEN[o.skala] || SKALEN.moll;
    var folge = FOLGEN[o.folge % FOLGEN.length];
    var grund = noteZuHalb(o.ton + '4');
    var melody = [], chords = [], low = [], beat = [];
    var rnd = o.rnd || wuerfel(1);
    var rhythmus = RHYTHMEN[o.rhythmus % RHYTHMEN.length];
    var schlag = SCHLAG[o.schlag % SCHLAG.length];
    var takt, i;

    for (takt = 0; takt < 4; takt++) {
      var stufe = folge[takt];
      var akkord = [stufe, stufe + 2, stufe + 4];
      var wurzel = grund + stufeZuHalb(skala, stufe) - 24;      // zwei Oktaven tiefer
      for (i = 0; i < 16; i++) {
        // Begleitung: der Akkord als gebrochene Figur auf jeder Achtel
        if (i % 2 === 0) {
          var ton = akkord[(i / 2) % 3];
          chords.push(halbZuNote(grund + stufeZuHalb(skala, ton) - 12));
        } else chords.push('.');

        // Bass: Grundton auf der Eins, Quinte in der Mitte
        if (i === 0 || i === 8) low.push(halbZuNote(wurzel));
        else if (i === 6 || i === 12) low.push(halbZuNote(wurzel + 7));
        else low.push('.');

        beat.push(schlag[i % schlag.length]);

        // Melodie: entweder das Motiv von Hand, oder eine gewürfelte Linie
        // in Akkordtönen mit Durchgangsnoten dazwischen.
        if (o.motiv) {
          var m = o.motiv[(takt % 2) * 16 + i];
          melody.push(m === undefined || m < 0 ? '.' : halbZuNote(inLage(grund + stufeZuHalb(skala, m) + 12)));
        } else if (!rhythmus[i]) {
          melody.push('.');
        } else {
          var w = rnd();
          var wahl = w < 0.62
            ? akkord[Math.floor(rnd() * 3)]                     // Akkordton
            : stufe + (rnd() < 0.5 ? 1 : 3);                    // Durchgang
          if (rnd() < 0.22) wahl += 7;                          // Oktavsprung
          melody.push(halbZuNote(inLage(grund + stufeZuHalb(skala, wahl) + 12)));
        }
      }
    }
    return {
      bpm: o.bpm, lead: 'square', harm: 'triangle', bass: 'triangle',
      melody: melody, chords: chords, low: low, beat: beat
    };
  }

  var legendenCache = {};

  /**
   * Das Stück eines legendären Pokémon. Ohne Pokédex-Eintrag — etwa in einer
   * Prüfung ohne Daten — bleibt es beim gemeinsamen Legendenstück.
   */
  function legendenStueck(sp) {
    if (!sp || sp.i === undefined) return TRACKS.legenden;
    if (legendenCache[sp.id]) return legendenCache[sp.id];
    var hand = HAND_MOTIVE[sp.id];
    var stueck;
    if (hand) {
      stueck = baueLegendenstueck({
        ton: hand.ton, skala: hand.skala, bpm: hand.bpm, folge: hand.folge,
        motiv: hand.motiv, rhythmus: 0, schlag: 1
      });
    } else {
      var rnd = wuerfel(sp.i * 2654435761);
      var typ = (sp.t && sp.t[0]) || 'Normal';
      var bst = sp.bst || 600;
      stueck = baueLegendenstueck({
        ton: NAMEN[sp.i % 12].replace('#', '#'),
        skala: TYP_SKALA[typ] || 'moll',
        // Je stärker das Pokémon, desto drängender das Tempo: 118 bis 162.
        bpm: Math.round(118 + Math.min(1, Math.max(0, (bst - 480) / 240)) * 44),
        folge: sp.i % FOLGEN.length,
        rhythmus: (sp.i >> 2) % RHYTHMEN.length,
        schlag: (sp.i >> 1) % SCHLAG.length,
        rnd: rnd
      });
    }
    legendenCache[sp.id] = stueck;
    return stueck;
  }

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
  var gen = 0;            // Generation der Region, 0 = keine (Titel, Liga)
  var currentName = null; // damit ein Regionswechsel dasselbe Stück neu wählt

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

  /**
   * Welches Stück steckt hinter diesem Namen? Auf der Route spielt die Region
   * ihr eigenes; Stadt und Höhle stehen in ihrer Tonart. Kampf und Liga
   * bleiben, wie sie sind — ein Kampf soll überall wie ein Kampf klingen.
   */
  function resolve(name) {
    // »legende:mewtwo« ist kein fester Name, sondern eine Bestellung: Das
    // Stück dieses Pokémon wird beim ersten Mal gebaut und dann behalten.
    if (typeof name === 'string' && name.slice(0, 8) === 'legende:') {
      var sp = PL.dex && PL.dex.sp ? PL.dex.sp(name.slice(8)) : null;
      return legendenStueck(sp);
    }
    if (gen && REGION_TRACKS[gen]) {
      if (name === 'route') return REGION_TRACKS[gen];
      if (name === 'town' || name === 'cave') return fuerRegion(name, gen);
    }
    return TRACKS[name];
  }

  /** Sagt der Musik, in welcher Region gespielt wird (Generation 1 bis 9). */
  function setRegion(g) {
    g = Number(g) || 0;
    if (g === gen) return;
    gen = g;
    // Läuft gerade ein Stück, das von der Region abhängt, wird es gewechselt.
    if (currentName) play(currentName);
  }

  function play(name) {
    currentName = name;
    if (!enabled) { current = resolve(name) || current; return; }
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    var track = resolve(name);
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
  function trackFor(kind, biome, art) {
    // Jede Legende hat ihr eigenes Stück; ohne Angabe bleibt es beim
    // gemeinsamen.
    if (kind === 'legend') return art ? 'legende:' + art : 'legenden';
    if (kind === 'boss') return 'boss';
    if (kind === 'battle') return 'battle';
    if (biome === 'stadt' || biome === 'arena' || kind === 'shop') return 'town';
    if (biome === 'hoehle' || biome === 'nacht' || biome === 'liga') return 'cave';
    return 'route';
  }

  PL.audio = {
    play: play, stop: stop, jingle: jingle,
    setEnabled: setEnabled, setVolume: setVolume, setRegion: setRegion,
    regionTracks: REGION_TRACKS, regionVariant: fuerRegion, tracks: TRACKS,
    trackFor: trackFor, legendenStueck: legendenStueck, handMotive: HAND_MOTIVE,
    isEnabled: function () { return enabled; },
    current: function () { return current; },
    freq: freq
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.audio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
