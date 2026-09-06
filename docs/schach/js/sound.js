/* =============================================================================
 * sound.js — Klaenge
 * -----------------------------------------------------------------------------
 * Alle Geraeusche werden zur Laufzeit mit der Web Audio API erzeugt. Dadurch
 * kommt das Spiel ohne eine einzige Audiodatei aus und laesst sich per
 * Doppelklick auf index.html starten.
 *
 * Der AudioContext wird erst beim ersten Nutzerklick gestartet — Browser
 * blockieren Tonausgabe ohne vorherige Interaktion.
 * ========================================================================== */
(function (global) {
  'use strict';

  var ctx = null;
  var master = null;
  var enabled = true;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  /* Kurzer perkussiver Anschlag: Sinuston mit schnell fallender Huellkurve */
  function tone(freq, start, dur, gain, type, sweepTo) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g); g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  /* Gefiltertes Rauschen — gibt dem Aufsetzen der Figur den "Klack"-Anteil */
  function noise(start, dur, gain, freq, q) {
    var len = Math.ceil(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q || 1.2;
    var g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(start);
  }

  var SOUNDS = {
    move: function (t) {
      noise(t, 0.05, 0.35, 1500, 1.4);
      tone(210, t, 0.09, 0.20, 'sine');
    },
    capture: function (t) {
      noise(t, 0.09, 0.55, 900, 0.9);
      tone(150, t, 0.14, 0.28, 'triangle', 90);
    },
    castle: function (t) {
      noise(t, 0.05, 0.30, 1500, 1.4);
      tone(210, t, 0.08, 0.18, 'sine');
      noise(t + 0.1, 0.05, 0.30, 1400, 1.4);
      tone(200, t + 0.1, 0.08, 0.18, 'sine');
    },
    check: function (t) {
      tone(880, t, 0.11, 0.20, 'triangle');
      tone(1320, t + 0.09, 0.16, 0.17, 'triangle');
    },
    promote: function (t) {
      tone(523, t, 0.10, 0.16, 'sine');
      tone(659, t + 0.07, 0.10, 0.16, 'sine');
      tone(784, t + 0.14, 0.10, 0.16, 'sine');
      tone(1047, t + 0.21, 0.24, 0.18, 'sine');
    },
    win: function (t) {
      tone(523, t, 0.16, 0.18, 'sine');
      tone(659, t + 0.13, 0.16, 0.18, 'sine');
      tone(784, t + 0.26, 0.16, 0.18, 'sine');
      tone(1047, t + 0.39, 0.5, 0.20, 'sine');
    },
    lose: function (t) {
      tone(392, t, 0.20, 0.18, 'triangle');
      tone(330, t + 0.18, 0.20, 0.18, 'triangle');
      tone(262, t + 0.36, 0.55, 0.20, 'triangle');
    },
    draw: function (t) {
      tone(440, t, 0.24, 0.16, 'sine');
      tone(415, t + 0.22, 0.45, 0.16, 'sine');
    },
    illegal: function (t) {
      tone(150, t, 0.11, 0.20, 'square', 110);
    },
    tick: function (t) {
      noise(t, 0.02, 0.18, 2600, 3);
    },
    lowTime: function (t) {
      tone(1200, t, 0.07, 0.16, 'square');
    }
  };

  /** Spielt einen Klang, sofern der Ton nicht abgeschaltet ist. */
  function play(name) {
    if (!enabled) return;
    if (!ensure()) return;
    var fn = SOUNDS[name];
    if (!fn) return;
    try { fn(ctx.currentTime + 0.001); } catch (e) { /* Ton ist optional */ }
  }

  function setEnabled(v) {
    enabled = !!v;
    if (enabled) ensure();
  }

  function isEnabled() { return enabled; }

  /** Beim ersten Klick den AudioContext freischalten. */
  function unlock() { ensure(); }

  global.ChessSound = {
    play: play,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    unlock: unlock
  };
})(typeof window !== 'undefined' ? window : globalThis);
