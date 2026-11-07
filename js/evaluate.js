/* =============================================================================
 * evaluate.js — Stellungsbewertung
 * -----------------------------------------------------------------------------
 * Getaperte Bewertung: es werden zwei Werte (Mittelspiel / Endspiel) gefuehrt
 * und am Ende anhand der noch vorhandenen Figuren interpoliert. Dadurch zieht
 * der Koenig im Endspiel automatisch zur Brettmitte, statt in der Ecke zu
 * bleiben.
 *
 * Alle Werte in Centipawns (100 = ein Bauer) aus Sicht von Weiss.
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = global.Chess;
  var PAWN = C.PAWN, KNIGHT = C.KNIGHT, BISHOP = C.BISHOP, ROOK = C.ROOK,
      QUEEN = C.QUEEN, KING = C.KING, WHITE = C.WHITE, BLACK = C.BLACK,
      TYPE_MASK = C.TYPE_MASK, COLOR_MASK = C.COLOR_MASK;

  /* Figurenwerte (Mittelspiel / Endspiel) */
  var VALUE_MG = [0, 100, 325, 340, 500, 975, 0];
  var VALUE_EG = [0, 120, 300, 320, 545, 980, 0];

  /* Phasengewicht pro Figur — 24 = volles Mittelspiel, 0 = blankes Endspiel */
  var PHASE_W = [0, 0, 1, 1, 2, 4, 0];
  var PHASE_MAX = 24;

  /* --- Positionstabellen --------------------------------------------------
   * Notiert aus Sicht von Weiss, Reihe 8 zuerst (so wie man das Brett sieht).
   * Werden unten in die interne a1-basierte Reihenfolge gedreht.             */
  function flip(table) {
    var out = new Int16Array(64);
    for (var r = 0; r < 8; r++)
      for (var f = 0; f < 8; f++)
        out[(7 - r) * 8 + f] = table[r * 8 + f];
    return out;
  }

  var PST_MG = [];
  var PST_EG = [];

  PST_MG[PAWN] = flip([
      0,   0,   0,   0,   0,   0,   0,   0,
     50,  50,  50,  50,  50,  50,  50,  50,
     10,  10,  20,  30,  30,  20,  10,  10,
      5,   5,  10,  27,  27,  10,   5,   5,
      0,   0,   0,  25,  25,   0,   0,   0,
      5,  -5, -10,   0,   0, -10,  -5,   5,
      5,  10,  10, -25, -25,  10,  10,   5,
      0,   0,   0,   0,   0,   0,   0,   0 ]);

  PST_EG[PAWN] = flip([
      0,   0,   0,   0,   0,   0,   0,   0,
     90,  90,  90,  90,  90,  90,  90,  90,
     55,  55,  55,  55,  55,  55,  55,  55,
     32,  32,  32,  32,  32,  32,  32,  32,
     18,  18,  18,  18,  18,  18,  18,  18,
      8,   8,   8,   8,   8,   8,   8,   8,
      4,   4,   4,   4,   4,   4,   4,   4,
      0,   0,   0,   0,   0,   0,   0,   0 ]);

  PST_MG[KNIGHT] = flip([
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20,   0,   5,   5,   0, -20, -40,
    -30,   5,  10,  15,  15,  10,   5, -30,
    -30,   0,  15,  20,  20,  15,   0, -30,
    -30,   5,  15,  20,  20,  15,   5, -30,
    -30,   0,  10,  15,  15,  10,   0, -30,
    -40, -20,   0,   0,   0,   0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50 ]);
  PST_EG[KNIGHT] = PST_MG[KNIGHT];

  PST_MG[BISHOP] = flip([
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,  10,  10,   5,   0, -10,
    -10,   5,   5,  10,  10,   5,   5, -10,
    -10,   0,  10,  10,  10,  10,   0, -10,
    -10,  10,  10,  10,  10,  10,  10, -10,
    -10,   5,   0,   0,   0,   0,   5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20 ]);
  PST_EG[BISHOP] = PST_MG[BISHOP];

  PST_MG[ROOK] = flip([
      0,   0,   0,   0,   0,   0,   0,   0,
      5,  10,  10,  10,  10,  10,  10,   5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
     -5,   0,   0,   0,   0,   0,   0,  -5,
      0,   0,   5,  10,  10,   5,   0,   0 ]);
  PST_EG[ROOK] = PST_MG[ROOK];

  PST_MG[QUEEN] = flip([
    -20, -10, -10,  -5,  -5, -10, -10, -20,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,   5,   5,   5,   0, -10,
     -5,   0,   5,   5,   5,   5,   0,  -5,
      0,   0,   5,   5,   5,   5,   0,  -5,
    -10,   5,   5,   5,   5,   5,   0, -10,
    -10,   0,   5,   0,   0,   0,   0, -10,
    -20, -10, -10,  -5,  -5, -10, -10, -20 ]);
  PST_EG[QUEEN] = PST_MG[QUEEN];

  PST_MG[KING] = flip([
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
     20,  20,   0,   0,   0,   0,  20,  20,
     20,  35,  10,   0,   0,  10,  35,  20 ]);

  PST_EG[KING] = flip([
    -50, -30, -30, -30, -30, -30, -30, -50,
    -30, -25,   0,   0,   0,   0, -25, -30,
    -25, -20,  20,  25,  25,  20, -20, -25,
    -20, -15,  30,  40,  40,  30, -15, -20,
    -15, -10,  35,  45,  45,  35, -10, -15,
    -10,  10,  20,  25,  25,  20,  10, -10,
      5,  10,  15,  20,  20,  15,  10,   5,
    -20,  -5,  10,  15,  15,  10,  -5, -20 ]);

  /* Freibauern-Bonus nach erreichter Reihe (aus Sicht des Bauern) */
  var PASSED_MG = [0, 5, 10, 20, 35, 60, 100, 0];
  var PASSED_EG = [0, 10, 20, 35, 60, 100, 160, 0];

  var DOUBLED_PENALTY = 14;
  var ISOLATED_PENALTY = 16;
  var BACKWARD_PENALTY = 8;
  var BISHOP_PAIR = 32;
  var ROOK_OPEN_FILE = 20;
  var ROOK_HALF_OPEN = 9;
  var ROOK_ON_7TH = 22;
  var TEMPO = 10;

  /* Mobilitaetsgewichte pro Figurentyp */
  var MOB_MG = [0, 0, 4, 4, 2, 1, 0];
  var MOB_EG = [0, 0, 4, 3, 4, 2, 0];
  var MOB_BASE = [0, 0, 4, 6, 7, 13, 0]; /* durchschnittliche Zugzahl, abgezogen */

  var KNIGHT_OFFS = C.KNIGHT_OFFS, BISHOP_OFFS = C.BISHOP_OFFS,
      ROOK_OFFS = C.ROOK_OFFS, KING_OFFS = C.KING_OFFS;

  /* Wiederverwendete Puffer — keine Allokation pro Bewertung */
  var wPawnFiles = new Int8Array(8), bPawnFiles = new Int8Array(8);
  var wPawnMin = new Int8Array(8), wPawnMax = new Int8Array(8);
  var bPawnMin = new Int8Array(8), bPawnMax = new Int8Array(8);

  /**
   * Bewertet die Stellung aus Sicht der Seite am Zug (negamax-Konvention).
   */
  function evaluate(pos) {
    var b = pos.board;
    var mg = 0, eg = 0, phase = 0;
    var sq, p, type, color, idx, k, o, t, tp, i;
    var wBishops = 0, bBishops = 0;

    wPawnFiles.fill(0); bPawnFiles.fill(0);
    wPawnMin.fill(9); wPawnMax.fill(0);
    bPawnMin.fill(9); bPawnMax.fill(0);

    /* Durchgang 1: Bauernstruktur erfassen */
    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq];
      if (!p || (p & TYPE_MASK) !== PAWN) continue;
      var file = sq & 7, rank = sq >> 4;
      if ((p & COLOR_MASK) === WHITE) {
        wPawnFiles[file]++;
        if (rank < wPawnMin[file]) wPawnMin[file] = rank;
        if (rank > wPawnMax[file]) wPawnMax[file] = rank;
      } else {
        bPawnFiles[file]++;
        if (rank < bPawnMin[file]) bPawnMin[file] = rank;
        if (rank > bPawnMax[file]) bPawnMax[file] = rank;
      }
    }

    /* Durchgang 2: Figuren bewerten */
    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = b[sq];
      if (!p) continue;
      type = p & TYPE_MASK;
      color = p & COLOR_MASK;
      var white = color === WHITE;
      var f = sq & 7, r = sq >> 4;
      /* Tabellenindex: fuer Schwarz das Brett spiegeln */
      idx = white ? (r * 8 + f) : ((7 - r) * 8 + f);

      phase += PHASE_W[type];

      var vmg = VALUE_MG[type] + PST_MG[type][idx];
      var veg = VALUE_EG[type] + PST_EG[type][idx];

      if (type === PAWN) {
        var own = white ? wPawnFiles : bPawnFiles;
        var opp = white ? bPawnFiles : wPawnFiles;

        /* Doppelbauer */
        if (own[f] > 1) { vmg -= DOUBLED_PENALTY; veg -= DOUBLED_PENALTY; }
        /* Isolani */
        var hasNeighbour = (f > 0 && own[f - 1] > 0) || (f < 7 && own[f + 1] > 0);
        if (!hasNeighbour) { vmg -= ISOLATED_PENALTY; veg -= ISOLATED_PENALTY + 4; }
        /* Freibauer: keine gegnerischen Bauern vor sich auf eigener oder
         * benachbarter Linie                                                */
        var passed = true;
        for (var df = -1; df <= 1 && passed; df++) {
          var nf = f + df;
          if (nf < 0 || nf > 7) continue;
          if (opp[nf] === 0) continue;
          /* Weiss zieht Richtung Reihe 8: blockiert, wenn ein schwarzer Bauer
           * auf dieser Linie weiter oben steht (und umgekehrt).             */
          if (white) { if (bPawnMax[nf] > r) passed = false; }
          else { if (wPawnMin[nf] < r) passed = false; }
        }
        if (passed) {
          var adv = white ? r : (7 - r);
          vmg += PASSED_MG[adv]; veg += PASSED_EG[adv];
        }
      } else if (type === BISHOP) {
        if (white) wBishops++; else bBishops++;
        vmg += mobility(b, sq, BISHOP_OFFS, true, color, MOB_MG[BISHOP], MOB_BASE[BISHOP]);
        veg += mobility(b, sq, BISHOP_OFFS, true, color, MOB_EG[BISHOP], MOB_BASE[BISHOP]);
      } else if (type === KNIGHT) {
        vmg += mobility(b, sq, KNIGHT_OFFS, false, color, MOB_MG[KNIGHT], MOB_BASE[KNIGHT]);
        veg += mobility(b, sq, KNIGHT_OFFS, false, color, MOB_EG[KNIGHT], MOB_BASE[KNIGHT]);
      } else if (type === ROOK) {
        vmg += mobility(b, sq, ROOK_OFFS, true, color, MOB_MG[ROOK], MOB_BASE[ROOK]);
        veg += mobility(b, sq, ROOK_OFFS, true, color, MOB_EG[ROOK], MOB_BASE[ROOK]);
        var ownP = white ? wPawnFiles[f] : bPawnFiles[f];
        var oppP = white ? bPawnFiles[f] : wPawnFiles[f];
        if (ownP === 0) { vmg += oppP === 0 ? ROOK_OPEN_FILE : ROOK_HALF_OPEN; }
        if ((white && r === 6) || (!white && r === 1)) { vmg += ROOK_ON_7TH; veg += ROOK_ON_7TH; }
      } else if (type === QUEEN) {
        vmg += mobility(b, sq, KING_OFFS, true, color, MOB_MG[QUEEN], MOB_BASE[QUEEN]);
        veg += mobility(b, sq, KING_OFFS, true, color, MOB_EG[QUEEN], MOB_BASE[QUEEN]);
      } else if (type === KING) {
        /* Bauernschild vor dem Koenig (nur Mittelspiel) */
        var shield = 0;
        for (var sf = f - 1; sf <= f + 1; sf++) {
          if (sf < 0 || sf > 7) { shield -= 6; continue; }
          var cnt = white ? wPawnFiles[sf] : bPawnFiles[sf];
          if (cnt === 0) { shield -= 14; continue; }
          var pr = white ? wPawnMin[sf] : bPawnMax[sf];
          var dist = white ? (pr - r) : (r - pr);
          if (dist === 1) shield += 6;
          else if (dist === 2) shield += 2;
          else shield -= 6;
        }
        vmg += shield;
      }

      if (white) { mg += vmg; eg += veg; } else { mg -= vmg; eg -= veg; }
    }

    if (wBishops >= 2) { mg += BISHOP_PAIR; eg += BISHOP_PAIR + 12; }
    if (bBishops >= 2) { mg -= BISHOP_PAIR; eg -= BISHOP_PAIR + 12; }

    if (phase > PHASE_MAX) phase = PHASE_MAX;
    var score = ((mg * phase) + (eg * (PHASE_MAX - phase))) / PHASE_MAX;

    score += pos.turn === WHITE ? TEMPO : -TEMPO;
    return pos.turn === WHITE ? Math.round(score) : -Math.round(score);
  }

  /* Zaehlt erreichbare Felder und gewichtet sie */
  function mobility(b, sq, offs, sliding, color, weight, base) {
    var n = 0, k, o, t, p;
    for (k = 0; k < offs.length; k++) {
      o = offs[k]; t = sq + o;
      if (sliding) {
        while ((t & 0x88) === 0) {
          p = b[t];
          if (p) { if ((p & COLOR_MASK) !== color) n++; break; }
          n++; t += o;
        }
      } else {
        if ((t & 0x88) === 0) {
          p = b[t];
          if (!p || (p & COLOR_MASK) !== color) n++;
        }
      }
    }
    return (n - base) * weight;
  }

  /* Reines Material (fuer Anzeige des Materialvorteils) */
  function materialCount(pos) {
    var b = pos.board, w = 0, s = 0;
    var simple = [0, 1, 3, 3, 5, 9, 0];
    for (var sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = b[sq];
      if (!p) continue;
      var v = simple[p & TYPE_MASK];
      if ((p & COLOR_MASK) === WHITE) w += v; else s += v;
    }
    return { white: w, black: s, diff: w - s };
  }

  global.ChessEval = {
    evaluate: evaluate,
    materialCount: materialCount,
    VALUE_MG: VALUE_MG,
    PHASE_W: PHASE_W,
    PHASE_MAX: PHASE_MAX
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.ChessEval;
})(typeof window !== 'undefined' ? window : globalThis);
