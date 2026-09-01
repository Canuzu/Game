/* =============================================================================
 * book.js — Eroeffnungsbuch
 * -----------------------------------------------------------------------------
 * Die Hauptvarianten der gaengigen Eroeffnungen als SAN-Zugfolgen. Daraus wird
 * beim Laden ein Praefixbaum gebaut. Jeder Knoten kennt die Haeufigkeit seiner
 * Fortsetzungen, sodass Hauptvarianten oefter gewaehlt werden als Nebenwege —
 * die KI eroeffnet dadurch abwechslungsreich, aber nicht beliebig.
 * ========================================================================== */
(function (global) {
  'use strict';

  var LINES = [
    /* --- Offene Spiele (1.e4 e5) ------------------------------------------ */
    ['Spanisch, Geschlossen',   'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O'],
    ['Spanisch, Abtausch',      'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4'],
    ['Spanisch, Berlin',        'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5'],
    ['Italienisch',             'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O'],
    ['Italienisch, Giuoco Pia', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3'],
    ['Zweispringerspiel',       'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6'],
    ['Schottisch',              'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7'],
    ['Russisch (Petroff)',      'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Be7 O-O Nc6'],
    ['Wiener Partie',           'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7'],
    ['Koenigsgambit',           'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6'],
    ['Vierspringerspiel',       'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O'],
    ['Philidor',                'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7'],

    /* --- Sizilianisch ------------------------------------------------------ */
    ['Sizilianisch, Najdorf',   'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6'],
    ['Sizilianisch, Drache',    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O'],
    ['Sizilianisch, Klassisch', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6 Qd2 Be7'],
    ['Sizilianisch, Sweschni',  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6'],
    ['Sizilianisch, Taimanow',  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Be2 Nf6'],
    ['Sizilianisch, Geschloss', 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 Be3 e6'],
    ['Sizilianisch, Alapin',    'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Be2 Be7'],
    ['Sizilianisch, Rossolimo', 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 c3 O-O'],

    /* --- Franzoesisch ------------------------------------------------------ */
    ['Franzoesisch, Klassisch', 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7'],
    ['Franzoesisch, Winawer',   'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7'],
    ['Franzoesisch, Tarrasch',  'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6'],
    ['Franzoesisch, Vorstoss',  'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 Nh6'],

    /* --- Caro-Kann --------------------------------------------------------- */
    ['Caro-Kann, Klassisch',    'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7'],
    ['Caro-Kann, Vorstoss',     'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7'],
    ['Caro-Kann, Panow',        'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7'],

    /* --- Weitere Antworten auf 1.e4 ---------------------------------------- */
    ['Skandinavisch',           'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5'],
    ['Aljechin-Verteidigung',   'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7'],
    ['Pirc',                    'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6'],
    ['Modern',                  'e4 g6 d4 Bg7 Nc3 d6 f4 Nf6 Nf3 O-O'],

    /* --- Geschlossene Spiele (1.d4) ---------------------------------------- */
    ['Damengambit abgelehnt',   'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6'],
    ['Slawisch',                'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5'],
    ['Halbslawisch, Meran',     'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 Bb4 O-O O-O'],
    ['Damengambit angenommen',  'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6'],
    ['London-System',           'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6'],
    ['Nimzoindisch',            'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5'],
    ['Damenindisch',            'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O'],
    ['Koenigsindisch',          'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6'],
    ['Gruenfeld-Indisch',       'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5'],
    ['Katalanisch',             'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4'],
    ['Benoni',                  'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6'],
    ['Hollaendisch',            'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6'],

    /* --- Flankeneroeffnungen ------------------------------------------------ */
    ['Englisch, Symmetrisch',   'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O'],
    ['Englisch, Umgekehrt Sizi','c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6'],
    ['Reti',                    'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O']
  ];

  /* --- Baum aufbauen ------------------------------------------------------- */
  var MAX_BOOK_PLY = 14;
  var root = { children: Object.create(null), count: 0, names: [] };

  for (var i = 0; i < LINES.length; i++) {
    var name = LINES[i][0];
    var moves = LINES[i][1].split(' ');
    var node = root;
    for (var j = 0; j < moves.length && j < MAX_BOOK_PLY; j++) {
      var san = moves[j];
      if (!node.children[san]) {
        node.children[san] = { children: Object.create(null), count: 0, names: [] };
      }
      node = node.children[san];
      node.count++;
      if (node.names.indexOf(name) < 0) node.names.push(name);
    }
  }

  function findNode(history) {
    var node = root;
    for (var i = 0; i < history.length; i++) {
      var san = String(history[i]).replace(/[+#!?]/g, '');
      var next = null;
      for (var key in node.children) {
        if (key.replace(/[+#!?]/g, '') === san) { next = node.children[key]; break; }
      }
      if (!next) return null;
      node = next;
    }
    return node;
  }

  /**
   * Waehlt eine Buchfortsetzung.
   * @param {string[]} history bisherige Zuege in SAN
   * @returns {string|null} SAN des naechsten Buchzuges
   */
  function pick(history) {
    if (history.length >= MAX_BOOK_PLY) return null;
    var node = findNode(history);
    if (!node) return null;

    var keys = Object.keys(node.children);
    if (!keys.length) return null;

    var total = 0, k;
    for (k = 0; k < keys.length; k++) total += node.children[keys[k]].count;

    var roll = Math.random() * total;
    for (k = 0; k < keys.length; k++) {
      roll -= node.children[keys[k]].count;
      if (roll <= 0) return keys[k];
    }
    return keys[keys.length - 1];
  }

  /** Name der erkannten Eroeffnung fuer die aktuelle Zugfolge. */
  function nameFor(history) {
    for (var len = Math.min(history.length, MAX_BOOK_PLY); len >= 2; len--) {
      var node = findNode(history.slice(0, len));
      if (node && node.names.length === 1) return node.names[0];
      if (node && node.names.length > 1 && len >= 4) {
        /* Mehrere Varianten teilen sich diesen Weg — gemeinsamen Namen kuerzen */
        var first = node.names[0].split(',')[0];
        var allSame = node.names.every(function (n) { return n.split(',')[0] === first; });
        if (allSame) return first;
      }
    }
    return null;
  }

  global.ChessBook = { pick: pick, nameFor: nameFor, lineCount: LINES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.ChessBook;
})(typeof window !== 'undefined' ? window : globalThis);
