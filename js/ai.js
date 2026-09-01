/* =============================================================================
 * ai.js — Suchalgorithmus der Computergegner
 * -----------------------------------------------------------------------------
 * Negamax mit Alpha-Beta-Schnitten, dazu:
 *   - Iterative Vertiefung (liefert nach jedem Zeitlimit einen gueltigen Zug)
 *   - Transpositionstabelle (Zobrist-Hash, 2^20 Eintraege)
 *   - Ruhesuche, damit die Engine nicht mitten im Abtausch stehenbleibt
 *   - Zugsortierung: Hashzug > Schlagzuege (MVV-LVA) > Killer > History
 *   - Nullzug-Vorwaertsschnitt und Late Move Reductions
 *
 * Die Suche laeuft im Haupt-Thread, gibt aber zwischen den Wurzelzuegen die
 * Kontrolle an den Browser zurueck (await yieldToUi). So bleibt die Oberflaeche
 * bedienbar, ohne dass ein Web Worker noetig waere — der liesse sich beim
 * Oeffnen per Doppelklick (file://) gar nicht laden.
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = global.Chess, E = global.ChessEval;
  var mFrom = C.mFrom, mTo = C.mTo, mFlags = C.mFlags, mPromo = C.mPromo;
  var TYPE_MASK = C.TYPE_MASK, COLOR_MASK = C.COLOR_MASK;
  var PAWN = C.PAWN, KING = C.KING, QUEEN = C.QUEEN, WHITE = C.WHITE;
  var F_CAPTURE = C.F_CAPTURE, F_PROMO = C.F_PROMO;

  var MATE = 30000;
  var MATE_THRESHOLD = 29000;
  var INFINITY = 100000;

  /* --- Schwierigkeitsstufen ----------------------------------------------
   * spread    : wie viele Centipawns schlechter ein Zug sein darf, um trotzdem
   *             gewaehlt zu werden (erzeugt Abwechslung und menschliche Fehler)
   * blunder   : Wahrscheinlichkeit fuer einen bewusst schwachen Zug
   * quiescence: Ruhesuche aktiv? Ohne sie uebersieht die Engine Abtausche —
   *             genau das macht die unteren Stufen schlagbar.               */
  var LEVELS = [
    { id: 1, key: 'anfaenger',   name: 'Anfänger',       elo: '~600',
      maxDepth: 2, timeMs: 250,  spread: 130, blunder: 0.28, quiescence: false, book: false,
      hint: 'Übersieht viel und verschenkt Figuren.' },
    { id: 2, key: 'gelegenheit', name: 'Gelegenheitsspieler', elo: '~1000',
      maxDepth: 3, timeMs: 500,  spread: 55,  blunder: 0.10, quiescence: true,  book: true,
      hint: 'Sieht einfache Abtausche, patzt aber regelmäßig.' },
    { id: 3, key: 'klub',        name: 'Klubspieler',    elo: '~1600',
      maxDepth: 6, timeMs: 1400, spread: 18,  blunder: 0.02, quiescence: true,  book: true,
      hint: 'Solide Taktik, bestraft grobe Fehler zuverlässig.' },
    { id: 4, key: 'meister',     name: 'Meister',        elo: '~2000+',
      maxDepth: 64, timeMs: 3000, spread: 0,  blunder: 0,    quiescence: true,  book: true,
      hint: 'Rechnet tief und spielt kompromisslos auf Gewinn.' }
  ];

  /* --- Transpositionstabelle ---------------------------------------------- */
  var TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  var ttLo = new Int32Array(TT_SIZE);
  var ttHi = new Int32Array(TT_SIZE);
  var ttMove = new Int32Array(TT_SIZE);
  var ttScore = new Int32Array(TT_SIZE);
  var ttDepth = new Int8Array(TT_SIZE);
  var ttFlag = new Int8Array(TT_SIZE);   /* 0 leer, 1 exakt, 2 untere, 3 obere Schranke */
  var ttGen = new Int8Array(TT_SIZE);
  var generation = 0;

  function ttClear() {
    ttFlag.fill(0); ttLo.fill(0); ttHi.fill(0);
    ttMove.fill(0); ttDepth.fill(0); ttGen.fill(0);
    generation = 0;
  }

  /* --- Suchzustand -------------------------------------------------------- */
  var MAX_PLY = 64;
  var killers = new Int32Array(MAX_PLY * 2);
  var historyTable = new Int32Array(32 * 128);
  var nodes = 0, deadline = 0, aborted = false, useQuiescence = true;
  /* Wahr, solange findBestMove laeuft. Suche und Schnellbewertung teilen sich
   * diese Zustandsvariablen, deshalb darf immer nur eine von beiden laufen.  */
  var searching = false;

  function checkTime() {
    if ((nodes & 2047) === 0 && Date.now() >= deadline) aborted = true;
    return aborted;
  }

  /* --- Zugsortierung ------------------------------------------------------
   * MVV-LVA: wertvolles Opfer mit billigem Angreifer zuerst pruefen.        */
  var MVV = [0, 100, 300, 320, 500, 900, 2000];

  function scoreMove(pos, m, ply, hashMove) {
    if (m === hashMove) return 2000000;
    var flags = mFlags(m);
    if (flags & F_CAPTURE) {
      var victim = pos.board[mTo(m)];
      var vt = victim ? (victim & TYPE_MASK) : PAWN;   /* en passant schlaegt Bauer */
      var attacker = pos.board[mFrom(m)] & TYPE_MASK;
      return 1000000 + MVV[vt] * 16 - MVV[attacker];
    }
    if (flags & F_PROMO) return 900000 + MVV[mPromo(m)];
    if (killers[ply * 2] === m) return 800000;
    if (killers[ply * 2 + 1] === m) return 790000;
    var piece = pos.board[mFrom(m)];
    return historyTable[piece * 128 + mTo(m)];
  }

  function sortMoves(pos, moves, ply, hashMove) {
    var scored = new Array(moves.length);
    for (var i = 0; i < moves.length; i++) {
      scored[i] = { m: moves[i], s: scoreMove(pos, moves[i], ply, hashMove) };
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    for (var j = 0; j < scored.length; j++) moves[j] = scored[j].m;
    return moves;
  }

  /* --- Ruhesuche ----------------------------------------------------------
   * Sucht nur noch Schlagzuege weiter, bis die Stellung "ruhig" ist.        */
  function quiescence(pos, alpha, beta, ply) {
    nodes++;
    if (checkTime()) return 0;

    var stand = E.evaluate(pos);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply >= MAX_PLY - 1) return stand;

    var moves = pos.generateMoves({ captures: true, legal: false });
    sortMoves(pos, moves, ply, 0);

    var us = pos.turn, them = us === WHITE ? C.BLACK : WHITE;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];

      /* Delta-Pruning: selbst mit dem Gewinn dieser Figur reicht es nicht */
      var victim = pos.board[mTo(m)];
      if (victim && stand + MVV[victim & TYPE_MASK] + 200 < alpha) continue;

      pos.makeMove(m);
      if (pos.isAttacked(pos.kings[us === WHITE ? 0 : 1], them)) { pos.undoMove(); continue; }
      var score = -quiescence(pos, -beta, -alpha, ply + 1);
      pos.undoMove();

      if (aborted) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  /* --- Hauptsuche --------------------------------------------------------- */
  function negamax(pos, depth, alpha, beta, ply, allowNull) {
    nodes++;
    if (checkTime()) return 0;

    var alphaOrig = alpha;
    var inCheck = pos.inCheck();

    /* Remis durch Wiederholung / 50-Zuege-Regel */
    if (ply > 0 && (pos.halfmove >= 100 || pos.isRepetition(2))) return 0;

    /* Schach verlaengert die Suche — sonst uebersieht man Mattnetze */
    if (inCheck) depth++;

    if (depth <= 0) {
      return useQuiescence ? quiescence(pos, alpha, beta, ply) : E.evaluate(pos);
    }

    /* Transpositionstabelle abfragen */
    var idx = (pos.hashLo & TT_MASK) >>> 0;
    var hashMove = 0;
    if (ttFlag[idx] !== 0 && ttLo[idx] === pos.hashLo && ttHi[idx] === pos.hashHi) {
      hashMove = ttMove[idx];
      if (ply > 0 && ttDepth[idx] >= depth) {
        var ts = ttScore[idx];
        if (ts > MATE_THRESHOLD) ts -= ply;
        else if (ts < -MATE_THRESHOLD) ts += ply;
        var fl = ttFlag[idx];
        if (fl === 1) return ts;
        if (fl === 2 && ts > alpha) alpha = ts;
        else if (fl === 3 && ts < beta) beta = ts;
        if (alpha >= beta) return ts;
      }
    }

    /* Nullzug: "ich setze aus" — wenn der Gegner das nicht nutzen kann,
     * ist die Stellung so gut, dass wir hier abbrechen duerfen.             */
    if (allowNull && !inCheck && depth >= 3 && ply > 0 && hasNonPawnMaterial(pos)) {
      var R = 2 + (depth > 6 ? 1 : 0);
      pos.makeNull();
      var nullScore = -negamax(pos, depth - 1 - R, -beta, -beta + 1, ply + 1, false);
      pos.undoNull();

      if (aborted) return 0;
      if (nullScore >= beta) return beta;
    }

    var moves = pos.generateMoves({ legal: false });
    sortMoves(pos, moves, ply, hashMove);

    var us = pos.turn, them = us === WHITE ? C.BLACK : WHITE;
    var bestScore = -INFINITY, bestMove = 0, legalCount = 0;

    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      pos.makeMove(m);
      if (pos.isAttacked(pos.kings[us === WHITE ? 0 : 1], them)) { pos.undoMove(); continue; }
      legalCount++;

      var score;
      var isQuiet = !(mFlags(m) & (F_CAPTURE | F_PROMO));

      if (legalCount === 1) {
        score = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        /* Späte, ruhige Zuege zuerst flacher pruefen (Late Move Reduction) */
        var reduction = 0;
        if (depth >= 3 && legalCount > 3 && isQuiet && !inCheck) {
          reduction = legalCount > 8 ? 2 : 1;
          if (reduction >= depth) reduction = depth - 1;
        }
        score = -negamax(pos, depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && (reduction > 0 || score < beta)) {
          score = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, true);
        }
      }
      pos.undoMove();
      if (aborted) return 0;

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
        if (score > alpha) {
          alpha = score;
          if (alpha >= beta) {
            if (isQuiet) {
              if (killers[ply * 2] !== m) {
                killers[ply * 2 + 1] = killers[ply * 2];
                killers[ply * 2] = m;
              }
              historyTable[pos.board[mFrom(m)] * 128 + mTo(m)] += depth * depth;
            }
            break;
          }
        }
      }
    }

    /* Kein legaler Zug: Matt oder Patt */
    if (legalCount === 0) return inCheck ? -MATE + ply : 0;

    /* Ergebnis in die Tabelle schreiben */
    var store = bestScore;
    if (store > MATE_THRESHOLD) store += ply;
    else if (store < -MATE_THRESHOLD) store -= ply;
    if (ttFlag[idx] === 0 || ttDepth[idx] <= depth || ttGen[idx] !== generation) {
      ttLo[idx] = pos.hashLo; ttHi[idx] = pos.hashHi;
      ttMove[idx] = bestMove; ttScore[idx] = store;
      ttDepth[idx] = depth > 127 ? 127 : depth;
      ttFlag[idx] = bestScore <= alphaOrig ? 3 : bestScore >= beta ? 2 : 1;
      ttGen[idx] = generation;
    }
    return bestScore;
  }

  function hasNonPawnMaterial(pos) {
    var b = pos.board, turn = pos.turn;
    for (var sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = b[sq];
      if (!p || (p & COLOR_MASK) !== turn) continue;
      var t = p & TYPE_MASK;
      if (t !== PAWN && t !== KING) return true;
    }
    return false;
  }

  function yieldToUi() {
    return new Promise(function (r) { setTimeout(r, 0); });
  }

  /* =========================================================================
   * findBestMove — oeffentliche Schnittstelle
   *   pos      : Position (wird nicht veraendert)
   *   level    : Stufenobjekt aus LEVELS oder dessen id
   *   history  : bisherige Zuege in SAN (fuer das Eroeffnungsbuch)
   *   onInfo   : optionaler Callback pro Iteration {depth, score, pv, nodes}
   * Liefert ein Promise auf { move, score, depth, nodes, ms, fromBook }
   * ====================================================================== */
  async function findBestMove(pos, level, history, onInfo) {
    var cfg = typeof level === 'object' ? level : getLevel(level);
    var started = Date.now();

    /* 1. Eroeffnungsbuch */
    if (cfg.book && global.ChessBook) {
      var bookSan = global.ChessBook.pick(history || []);
      if (bookSan) {
        var bm = pos.sanToMove(bookSan);
        if (bm) {
          await new Promise(function (r) { setTimeout(r, 180 + Math.random() * 220); });
          return { move: bm, score: 0, depth: 0, nodes: 0, ms: Date.now() - started, fromBook: true };
        }
      }
    }

    var rootMoves = pos.generateMoves();
    if (rootMoves.length === 0) return null;
    if (rootMoves.length === 1) {
      return { move: rootMoves[0], score: 0, depth: 0, nodes: 0, ms: Date.now() - started, forced: true };
    }

    /* 2. Gelegentlicher Patzer auf niedrigen Stufen */
    if (cfg.blunder > 0 && Math.random() < cfg.blunder) {
      var safeish = rootMoves.filter(function (m) { return !losesQueenOrRookImmediately(pos, m); });
      var pool = safeish.length ? safeish : rootMoves;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      await new Promise(function (r) { setTimeout(r, 200 + Math.random() * 300); });
      return { move: pick, score: 0, depth: 0, nodes: 0, ms: Date.now() - started, blunder: true };
    }

    /* 3. Iterative Vertiefung */
    searching = true;
    try {
      nodes = 0;
      aborted = false;
      useQuiescence = cfg.quiescence;
      deadline = Date.now() + cfg.timeMs;
      generation = (generation + 1) & 127;
      killers.fill(0);
      for (var h = 0; h < historyTable.length; h++) historyTable[h] = (historyTable[h] / 8) | 0;

      var best = { move: rootMoves[0], score: 0, depth: 0 };
      var rootScores = new Map();

      for (var depth = 1; depth <= cfg.maxDepth; depth++) {
        var iterBest = null, iterScore = -INFINITY;
        var alpha = -INFINITY, beta = INFINITY;
        var scoresThisIter = new Map();

        /* Beste Zuege der Vorrunde zuerst */
        rootMoves.sort(function (a, b) {
          return (rootScores.get(b) === undefined ? -INFINITY : rootScores.get(b)) -
                 (rootScores.get(a) === undefined ? -INFINITY : rootScores.get(a));
        });

        for (var i = 0; i < rootMoves.length; i++) {
          var m = rootMoves[i];
          pos.makeMove(m);
          var sc;
          if (i === 0) {
            sc = -negamax(pos, depth - 1, -beta, -alpha, 1, true);
          } else {
            sc = -negamax(pos, depth - 1, -alpha - 1, -alpha, 1, true);
            if (!aborted && sc > alpha) sc = -negamax(pos, depth - 1, -beta, -alpha, 1, true);
          }
          pos.undoMove();

          if (aborted) break;
          scoresThisIter.set(m, sc);
          if (sc > iterScore) { iterScore = sc; iterBest = m; }
          if (sc > alpha) alpha = sc;

          /* Oberflaeche atmen lassen */
          if ((i & 1) === 1) await yieldToUi();
        }

        if (aborted && iterBest === null) break;
        if (!aborted) {
          rootScores = scoresThisIter;
          best = { move: iterBest, score: iterScore, depth: depth };
          if (onInfo) onInfo({ depth: depth, score: iterScore, nodes: nodes, move: iterBest });
        }
        if (aborted) break;
        /* Matt gefunden — tiefer suchen bringt nichts mehr */
        if (Math.abs(iterScore) > MATE_THRESHOLD) break;
        /* Nicht genug Zeit fuer die naechste Iteration */
        if (Date.now() - started > cfg.timeMs * 0.5) break;
        await yieldToUi();
      }

      /* 4. Streuung: unter mehreren fast gleich guten Zuegen zufaellig waehlen */
      var chosen = best.move;
      if (cfg.spread > 0 && rootScores.size > 1) {
        var bestScore = rootScores.get(best.move);
        var candidates = [];
        rootScores.forEach(function (sc, mv) {
          if (bestScore - sc <= cfg.spread) candidates.push(mv);
        });
        if (candidates.length > 1) chosen = candidates[Math.floor(Math.random() * candidates.length)];
      }

    } finally {
      /* Auch bei einem Fehler wieder freigeben, sonst bliebe quickEval
       * dauerhaft blockiert.                                              */
      searching = false;
    }

    var elapsed = Date.now() - started;
    if (elapsed < 220) await new Promise(function (r) { setTimeout(r, 220 - elapsed); });

    return {
      move: chosen,
      score: rootScores.get(chosen) !== undefined ? rootScores.get(chosen) : best.score,
      depth: best.depth,
      nodes: nodes,
      ms: Date.now() - started,
      fromBook: false
    };
  }

  /* Grober Check fuer den "Patzer"-Modus: haengt danach Dame oder Turm? */
  function losesQueenOrRookImmediately(pos, m) {
    var to = mTo(m);
    var piece = pos.board[mFrom(m)] & TYPE_MASK;
    if (piece !== QUEEN && piece !== C.ROOK) return false;
    var us = pos.turn, them = us === WHITE ? C.BLACK : WHITE;
    pos.makeMove(m);
    var hanging = pos.isAttacked(to, them);
    pos.undoMove();
    return hanging;
  }

  /**
   * Schnelle Bewertung fuer die Anzeigeleiste (nur Ruhesuche, keine Tiefe).
   * Liefert null, wenn gerade eine richtige Suche laeuft — die duerfte sonst
   * ihren eigenen Zeitpunkt und Abbruchstatus ueberschrieben bekommen.
   */
  function quickEval(pos) {
    if (searching) return null;
    aborted = false;
    useQuiescence = true;
    deadline = Date.now() + 60;
    nodes = 0;
    var s = quiescence(pos, -INFINITY, INFINITY, 0);
    return pos.turn === WHITE ? s : -s;   /* immer aus Sicht von Weiss */
  }

  function getLevel(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return LEVELS[1];
  }

  global.ChessAI = {
    findBestMove: findBestMove,
    quickEval: quickEval,
    ttClear: ttClear,
    LEVELS: LEVELS,
    getLevel: getLevel,
    MATE: MATE,
    MATE_THRESHOLD: MATE_THRESHOLD
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.ChessAI;
})(typeof window !== 'undefined' ? window : globalThis);
