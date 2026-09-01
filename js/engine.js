/* =============================================================================
 * engine.js — Vollstaendiges Schach-Regelwerk
 * -----------------------------------------------------------------------------
 * Brettdarstellung: 0x88 (128 Felder, davon 64 gueltig).
 *   index = rank * 16 + file,  a1 = 0, h8 = 119
 *   Ein Index liegt genau dann ausserhalb des Bretts, wenn (index & 0x88) != 0.
 *
 * Zuege werden als Integer kodiert (schnell, kein GC-Druck in der Suche):
 *   Bit  0.. 7  Startfeld
 *   Bit  8..15  Zielfeld
 *   Bit 16..18  Umwandlungsfigur (0 = keine)
 *   Bit 19..25  Flags
 * ========================================================================== */
(function (global) {
  'use strict';

  /* --- Figuren & Farben --------------------------------------------------- */
  var EMPTY = 0;
  var PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  var WHITE = 8, BLACK = 16;
  var TYPE_MASK = 7, COLOR_MASK = 24;

  /* --- Zug-Flags ---------------------------------------------------------- */
  var F_CAPTURE = 1, F_EP = 2, F_DOUBLE = 4,
      F_CASTLE_K = 8, F_CASTLE_Q = 16, F_PROMO = 32;

  /* --- Rochaderechte ------------------------------------------------------ */
  var C_WK = 1, C_WQ = 2, C_BK = 4, C_BQ = 8;

  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  /* --- Zuggeneratoren-Offsets --------------------------------------------- */
  var KNIGHT_OFFS = [-33, -31, -18, -14, 14, 18, 31, 33];
  var BISHOP_OFFS = [-17, -15, 15, 17];
  var ROOK_OFFS   = [-16, -1, 1, 16];
  var KING_OFFS   = [-17, -16, -15, -1, 1, 15, 16, 17];

  var FILES = 'abcdefgh';
  var PIECE_LETTER = { 1: 'P', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K' };
  var LETTER_PIECE = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING };

  /* Rochaderechte, die beim Beruehren eines Feldes verloren gehen ---------- */
  var CASTLE_MASK = new Int8Array(128);
  for (var i = 0; i < 128; i++) CASTLE_MASK[i] = 15;
  CASTLE_MASK[0]   &= ~C_WQ;          /* a1 */
  CASTLE_MASK[4]   &= ~(C_WK | C_WQ); /* e1 */
  CASTLE_MASK[7]   &= ~C_WK;          /* h1 */
  CASTLE_MASK[112] &= ~C_BQ;          /* a8 */
  CASTLE_MASK[116] &= ~(C_BK | C_BQ); /* e8 */
  CASTLE_MASK[119] &= ~C_BK;          /* h8 */

  /* --- Zug-Kodierung ------------------------------------------------------ */
  function mkMove(from, to, flags, promo) {
    return (from | (to << 8) | ((promo || 0) << 16) | (flags << 19));
  }
  function mFrom(m)  { return m & 0xFF; }
  function mTo(m)    { return (m >> 8) & 0xFF; }
  function mPromo(m) { return (m >> 16) & 7; }
  function mFlags(m) { return (m >> 19) & 0x7F; }

  /* --- Feldnamen ---------------------------------------------------------- */
  function sqName(sq) { return FILES[sq & 7] + ((sq >> 4) + 1); }
  function sqIndex(name) {
    var f = FILES.indexOf(name[0]), r = parseInt(name[1], 10) - 1;
    if (f < 0 || r < 0 || r > 7) return -1;
    return r * 16 + f;
  }
  /* 0x88-Index -> 0..63 (a1 = 0) */
  function sq64(sq) { return (sq >> 4) * 8 + (sq & 7); }

  /* --- Zobrist-Hashing (zwei 32-Bit-Haelften) ----------------------------- */
  var _seed = 0x9E3779B9 >>> 0;
  function rnd32() {
    _seed ^= _seed << 13; _seed >>>= 0;
    _seed ^= _seed >>> 17;
    _seed ^= _seed << 5;  _seed >>>= 0;
    return _seed;
  }
  var ZP_LO = new Int32Array(32 * 128), ZP_HI = new Int32Array(32 * 128);
  for (var z = 0; z < 32 * 128; z++) { ZP_LO[z] = rnd32() | 0; ZP_HI[z] = rnd32() | 0; }
  var ZC_LO = new Int32Array(16), ZC_HI = new Int32Array(16);
  for (var z2 = 0; z2 < 16; z2++) { ZC_LO[z2] = rnd32() | 0; ZC_HI[z2] = rnd32() | 0; }
  var ZE_LO = new Int32Array(128), ZE_HI = new Int32Array(128);
  for (var z3 = 0; z3 < 128; z3++) { ZE_LO[z3] = rnd32() | 0; ZE_HI[z3] = rnd32() | 0; }
  var ZS_LO = rnd32() | 0, ZS_HI = rnd32() | 0;

  /* =========================================================================
   * Position
   * ====================================================================== */
  function Position(fen) {
    this.board = new Int8Array(128);
    this.kings = [-1, -1];      /* [weiss, schwarz] als 0x88-Index */
    this.history = [];
    this.repLo = [];
    this.repHi = [];
    this.setFen(fen || START_FEN);
  }

  Position.prototype.clear = function () {
    this.board.fill(EMPTY);
    this.turn = WHITE;
    this.castling = 0;
    this.ep = -1;
    this.halfmove = 0;
    this.fullmove = 1;
    this.kings[0] = this.kings[1] = -1;
    this.history.length = 0;
    this.repLo.length = 0;
    this.repHi.length = 0;
    this.hashLo = 0; this.hashHi = 0;
  };

  /* --- FEN ---------------------------------------------------------------- */
  Position.prototype.setFen = function (fen) {
    var parts = String(fen).trim().split(/\s+/);
    if (parts.length < 4) throw new Error('Ungueltige FEN: zu wenige Felder');
    this.clear();

    var rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('Ungueltige FEN: 8 Reihen erwartet');
    for (var r = 0; r < 8; r++) {
      var rank = 7 - r, file = 0, row = rows[r];
      for (var c = 0; c < row.length; c++) {
        var ch = row[c];
        if (ch >= '1' && ch <= '8') { file += +ch; continue; }
        var type = LETTER_PIECE[ch.toLowerCase()];
        if (!type) throw new Error('Ungueltige FEN: unbekannte Figur "' + ch + '"');
        if (file > 7) throw new Error('Ungueltige FEN: Reihe zu lang');
        var color = ch === ch.toUpperCase() ? WHITE : BLACK;
        var sq = rank * 16 + file;
        this.board[sq] = type | color;
        if (type === KING) this.kings[color === WHITE ? 0 : 1] = sq;
        file++;
      }
      if (file !== 8) throw new Error('Ungueltige FEN: Reihe ' + (r + 1) + ' passt nicht');
    }
    if (this.kings[0] < 0 || this.kings[1] < 0) throw new Error('Ungueltige FEN: Koenig fehlt');

    this.turn = parts[1] === 'b' ? BLACK : WHITE;

    this.castling = 0;
    if (parts[2].indexOf('K') >= 0) this.castling |= C_WK;
    if (parts[2].indexOf('Q') >= 0) this.castling |= C_WQ;
    if (parts[2].indexOf('k') >= 0) this.castling |= C_BK;
    if (parts[2].indexOf('q') >= 0) this.castling |= C_BQ;

    this.ep = parts[3] === '-' ? -1 : sqIndex(parts[3]);
    this.halfmove = parts.length > 4 ? (parseInt(parts[4], 10) || 0) : 0;
    this.fullmove = parts.length > 5 ? (parseInt(parts[5], 10) || 1) : 1;

    this.computeHash();
    this.repLo.push(this.hashLo);
    this.repHi.push(this.hashHi);
    return this;
  };

  Position.prototype.getFen = function () {
    var out = '';
    for (var rank = 7; rank >= 0; rank--) {
      var empty = 0;
      for (var file = 0; file < 8; file++) {
        var p = this.board[rank * 16 + file];
        if (!p) { empty++; continue; }
        if (empty) { out += empty; empty = 0; }
        var letter = PIECE_LETTER[p & TYPE_MASK];
        out += (p & COLOR_MASK) === WHITE ? letter : letter.toLowerCase();
      }
      if (empty) out += empty;
      if (rank) out += '/';
    }
    out += this.turn === WHITE ? ' w ' : ' b ';
    var cs = '';
    if (this.castling & C_WK) cs += 'K';
    if (this.castling & C_WQ) cs += 'Q';
    if (this.castling & C_BK) cs += 'k';
    if (this.castling & C_BQ) cs += 'q';
    out += (cs || '-') + ' ';
    out += (this.ep >= 0 ? sqName(this.ep) : '-') + ' ';
    out += this.halfmove + ' ' + this.fullmove;
    return out;
  };

  Position.prototype.computeHash = function () {
    var lo = 0, hi = 0;
    for (var sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = this.board[sq];
      if (p) { lo ^= ZP_LO[p * 128 + sq]; hi ^= ZP_HI[p * 128 + sq]; }
    }
    lo ^= ZC_LO[this.castling]; hi ^= ZC_HI[this.castling];
    if (this.ep >= 0) { lo ^= ZE_LO[this.ep]; hi ^= ZE_HI[this.ep]; }
    if (this.turn === BLACK) { lo ^= ZS_LO; hi ^= ZS_HI; }
    this.hashLo = lo | 0; this.hashHi = hi | 0;
  };

  /* --- Angriffserkennung -------------------------------------------------- */
  Position.prototype.isAttacked = function (sq, byColor) {
    var b = this.board, t, p, o, k;

    /* Bauern */
    if (byColor === WHITE) {
      t = sq - 17; if ((t & 0x88) === 0 && b[t] === (PAWN | WHITE)) return true;
      t = sq - 15; if ((t & 0x88) === 0 && b[t] === (PAWN | WHITE)) return true;
    } else {
      t = sq + 17; if ((t & 0x88) === 0 && b[t] === (PAWN | BLACK)) return true;
      t = sq + 15; if ((t & 0x88) === 0 && b[t] === (PAWN | BLACK)) return true;
    }
    /* Springer */
    for (k = 0; k < 8; k++) {
      t = sq + KNIGHT_OFFS[k];
      if ((t & 0x88) === 0 && b[t] === (KNIGHT | byColor)) return true;
    }
    /* Koenig */
    for (k = 0; k < 8; k++) {
      t = sq + KING_OFFS[k];
      if ((t & 0x88) === 0 && b[t] === (KING | byColor)) return true;
    }
    /* Laeufer / Dame (diagonal) */
    for (k = 0; k < 4; k++) {
      o = BISHOP_OFFS[k]; t = sq + o;
      while ((t & 0x88) === 0) {
        p = b[t];
        if (p) {
          if ((p & COLOR_MASK) === byColor) {
            var ty = p & TYPE_MASK;
            if (ty === BISHOP || ty === QUEEN) return true;
          }
          break;
        }
        t += o;
      }
    }
    /* Turm / Dame (gerade) */
    for (k = 0; k < 4; k++) {
      o = ROOK_OFFS[k]; t = sq + o;
      while ((t & 0x88) === 0) {
        p = b[t];
        if (p) {
          if ((p & COLOR_MASK) === byColor) {
            var ty2 = p & TYPE_MASK;
            if (ty2 === ROOK || ty2 === QUEEN) return true;
          }
          break;
        }
        t += o;
      }
    }
    return false;
  };

  Position.prototype.inCheck = function (color) {
    var c = color || this.turn;
    return this.isAttacked(this.kings[c === WHITE ? 0 : 1], c === WHITE ? BLACK : WHITE);
  };

  /* --- Zuggenerierung ----------------------------------------------------- */
  /* opts: { legal: true|false, captures: bool, square: 0x88-Index } */
  Position.prototype.generateMoves = function (opts) {
    opts = opts || {};
    var legal = opts.legal !== false;
    var onlyCaptures = !!opts.captures;
    var single = typeof opts.square === 'number' ? opts.square : -1;

    var us = this.turn, them = us === WHITE ? BLACK : WHITE;
    var b = this.board, moves = [], sq, p, type, k, o, t, tp;

    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      if (single >= 0 && sq !== single) continue;
      p = b[sq];
      if (!p || (p & COLOR_MASK) !== us) continue;
      type = p & TYPE_MASK;

      if (type === PAWN) {
        var dir = us === WHITE ? 16 : -16;
        var startRank = us === WHITE ? 1 : 6;
        var promoRank = us === WHITE ? 7 : 0;
        var one = sq + dir;
        if ((one & 0x88) === 0 && b[one] === EMPTY) {
          var isPromo = (one >> 4) === promoRank;
          if (isPromo) {
            moves.push(mkMove(sq, one, F_PROMO, QUEEN), mkMove(sq, one, F_PROMO, ROOK),
                       mkMove(sq, one, F_PROMO, BISHOP), mkMove(sq, one, F_PROMO, KNIGHT));
          } else if (!onlyCaptures) {
            moves.push(mkMove(sq, one, 0, 0));
            if ((sq >> 4) === startRank) {
              var two = sq + dir + dir;
              if (b[two] === EMPTY) moves.push(mkMove(sq, two, F_DOUBLE, 0));
            }
          }
        }
        for (k = 0; k < 2; k++) {
          t = sq + dir + (k === 0 ? -1 : 1);
          if (t & 0x88) continue;
          tp = b[t];
          if (tp && (tp & COLOR_MASK) === them) {
            if ((t >> 4) === promoRank) {
              moves.push(mkMove(sq, t, F_PROMO | F_CAPTURE, QUEEN), mkMove(sq, t, F_PROMO | F_CAPTURE, ROOK),
                         mkMove(sq, t, F_PROMO | F_CAPTURE, BISHOP), mkMove(sq, t, F_PROMO | F_CAPTURE, KNIGHT));
            } else {
              moves.push(mkMove(sq, t, F_CAPTURE, 0));
            }
          } else if (!tp && t === this.ep) {
            moves.push(mkMove(sq, t, F_CAPTURE | F_EP, 0));
          }
        }
        continue;
      }

      if (type === KNIGHT || type === KING) {
        var offs = type === KNIGHT ? KNIGHT_OFFS : KING_OFFS;
        for (k = 0; k < 8; k++) {
          t = sq + offs[k];
          if (t & 0x88) continue;
          tp = b[t];
          if (!tp) { if (!onlyCaptures) moves.push(mkMove(sq, t, 0, 0)); }
          else if ((tp & COLOR_MASK) === them) moves.push(mkMove(sq, t, F_CAPTURE, 0));
        }
        continue;
      }

      /* Schiebefiguren */
      var slides = type === BISHOP ? BISHOP_OFFS : type === ROOK ? ROOK_OFFS : KING_OFFS;
      for (k = 0; k < slides.length; k++) {
        o = slides[k]; t = sq + o;
        while ((t & 0x88) === 0) {
          tp = b[t];
          if (!tp) { if (!onlyCaptures) moves.push(mkMove(sq, t, 0, 0)); }
          else {
            if ((tp & COLOR_MASK) === them) moves.push(mkMove(sq, t, F_CAPTURE, 0));
            break;
          }
          t += o;
        }
      }
    }

    /* Rochade */
    if (!onlyCaptures) {
      var kingSq = us === WHITE ? 4 : 116;
      if ((single < 0 || single === kingSq) && b[kingSq] === (KING | us)) {
        var rightK = us === WHITE ? C_WK : C_BK;
        var rightQ = us === WHITE ? C_WQ : C_BQ;
        if ((this.castling & rightK) && b[kingSq + 1] === EMPTY && b[kingSq + 2] === EMPTY &&
            b[kingSq + 3] === (ROOK | us) &&
            !this.isAttacked(kingSq, them) && !this.isAttacked(kingSq + 1, them) &&
            !this.isAttacked(kingSq + 2, them)) {
          moves.push(mkMove(kingSq, kingSq + 2, F_CASTLE_K, 0));
        }
        if ((this.castling & rightQ) && b[kingSq - 1] === EMPTY && b[kingSq - 2] === EMPTY &&
            b[kingSq - 3] === EMPTY && b[kingSq - 4] === (ROOK | us) &&
            !this.isAttacked(kingSq, them) && !this.isAttacked(kingSq - 1, them) &&
            !this.isAttacked(kingSq - 2, them)) {
          moves.push(mkMove(kingSq, kingSq - 2, F_CASTLE_Q, 0));
        }
      }
    }

    if (!legal) return moves;

    var out = [];
    for (var m = 0; m < moves.length; m++) {
      this.makeMove(moves[m]);
      if (!this.isAttacked(this.kings[us === WHITE ? 0 : 1], them)) out.push(moves[m]);
      this.undoMove();
    }
    return out;
  };

  /* --- Zug ausfuehren ----------------------------------------------------- */
  Position.prototype.makeMove = function (m) {
    var b = this.board;
    var from = mFrom(m), to = mTo(m), flags = mFlags(m), promo = mPromo(m);
    var piece = b[from];
    var us = piece & COLOR_MASK;
    var them = us === WHITE ? BLACK : WHITE;
    var epCapSq = (flags & F_EP) ? (us === WHITE ? to - 16 : to + 16) : -1;
    var captured = epCapSq >= 0 ? b[epCapSq] : b[to];

    this.history.push({
      move: m, captured: captured, castling: this.castling, ep: this.ep,
      halfmove: this.halfmove, hashLo: this.hashLo, hashHi: this.hashHi
    });

    if (this.ep >= 0) { this.hashLo ^= ZE_LO[this.ep]; this.hashHi ^= ZE_HI[this.ep]; }
    this.hashLo ^= ZC_LO[this.castling]; this.hashHi ^= ZC_HI[this.castling];

    b[from] = EMPTY;
    this.hashLo ^= ZP_LO[piece * 128 + from]; this.hashHi ^= ZP_HI[piece * 128 + from];

    if (captured) {
      var cs = epCapSq >= 0 ? epCapSq : to;
      b[cs] = EMPTY;
      this.hashLo ^= ZP_LO[captured * 128 + cs]; this.hashHi ^= ZP_HI[captured * 128 + cs];
    }

    var newPiece = (flags & F_PROMO) ? (promo | us) : piece;
    b[to] = newPiece;
    this.hashLo ^= ZP_LO[newPiece * 128 + to]; this.hashHi ^= ZP_HI[newPiece * 128 + to];

    if ((piece & TYPE_MASK) === KING) {
      this.kings[us === WHITE ? 0 : 1] = to;
      if (flags & F_CASTLE_K) {
        var rf = from + 3, rt = from + 1, rk = ROOK | us;
        b[rf] = EMPTY; b[rt] = rk;
        this.hashLo ^= ZP_LO[rk * 128 + rf] ^ ZP_LO[rk * 128 + rt];
        this.hashHi ^= ZP_HI[rk * 128 + rf] ^ ZP_HI[rk * 128 + rt];
      } else if (flags & F_CASTLE_Q) {
        var rf2 = from - 4, rt2 = from - 1, rk2 = ROOK | us;
        b[rf2] = EMPTY; b[rt2] = rk2;
        this.hashLo ^= ZP_LO[rk2 * 128 + rf2] ^ ZP_LO[rk2 * 128 + rt2];
        this.hashHi ^= ZP_HI[rk2 * 128 + rf2] ^ ZP_HI[rk2 * 128 + rt2];
      }
    }

    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.hashLo ^= ZC_LO[this.castling]; this.hashHi ^= ZC_HI[this.castling];

    if (flags & F_DOUBLE) {
      this.ep = (from + to) >> 1;
      this.hashLo ^= ZE_LO[this.ep]; this.hashHi ^= ZE_HI[this.ep];
    } else {
      this.ep = -1;
    }

    if ((piece & TYPE_MASK) === PAWN || captured) this.halfmove = 0; else this.halfmove++;
    if (us === BLACK) this.fullmove++;

    this.turn = them;
    this.hashLo ^= ZS_LO; this.hashHi ^= ZS_HI;

    this.repLo.push(this.hashLo);
    this.repHi.push(this.hashHi);
  };

  Position.prototype.undoMove = function () {
    var h = this.history.pop();
    if (!h) return null;
    var b = this.board;
    var m = h.move, from = mFrom(m), to = mTo(m), flags = mFlags(m);

    this.turn = this.turn === WHITE ? BLACK : WHITE;
    var us = this.turn;
    if (us === BLACK) this.fullmove--;

    var piece = (flags & F_PROMO) ? (PAWN | us) : b[to];
    b[from] = piece;
    b[to] = EMPTY;

    if ((piece & TYPE_MASK) === KING) {
      this.kings[us === WHITE ? 0 : 1] = from;
      if (flags & F_CASTLE_K) { b[from + 3] = ROOK | us; b[from + 1] = EMPTY; }
      else if (flags & F_CASTLE_Q) { b[from - 4] = ROOK | us; b[from - 1] = EMPTY; }
    }

    if (h.captured) {
      var cs = (flags & F_EP) ? (us === WHITE ? to - 16 : to + 16) : to;
      b[cs] = h.captured;
    }

    this.castling = h.castling;
    this.ep = h.ep;
    this.halfmove = h.halfmove;
    this.hashLo = h.hashLo;
    this.hashHi = h.hashHi;
    this.repLo.pop();
    this.repHi.pop();
    return m;
  };

  /* --- Nullzug (nur fuer die Suche) ---------------------------------------
   * "Ich setze aus" — wird fuer den Nullzug-Vorwaertsschnitt gebraucht.
   * halfmove wird auf 0 gesetzt, damit die Wiederholungspruefung nicht ueber
   * den Nullzug hinweg sucht (dort stimmt die Zugparitaet nicht mehr).      */
  Position.prototype.makeNull = function () {
    this.history.push({
      move: 0, captured: 0, castling: this.castling, ep: this.ep,
      halfmove: this.halfmove, hashLo: this.hashLo, hashHi: this.hashHi
    });
    if (this.ep >= 0) { this.hashLo ^= ZE_LO[this.ep]; this.hashHi ^= ZE_HI[this.ep]; }
    this.ep = -1;
    this.halfmove = 0;
    this.turn = this.turn === WHITE ? BLACK : WHITE;
    this.hashLo ^= ZS_LO; this.hashHi ^= ZS_HI;
    this.repLo.push(this.hashLo);
    this.repHi.push(this.hashHi);
  };

  Position.prototype.undoNull = function () {
    var h = this.history.pop();
    this.turn = this.turn === WHITE ? BLACK : WHITE;
    this.castling = h.castling;
    this.ep = h.ep;
    this.halfmove = h.halfmove;
    this.hashLo = h.hashLo;
    this.hashHi = h.hashHi;
    this.repLo.pop();
    this.repHi.pop();
  };

  /* --- Partiestatus ------------------------------------------------------- */
  Position.prototype.isRepetition = function (needed) {
    var n = needed || 3, count = 1;
    var last = this.repLo.length - 1;
    var lo = this.repLo[last], hi = this.repHi[last];
    var limit = Math.max(0, last - this.halfmove);
    for (var i = last - 2; i >= limit; i -= 2) {
      if (this.repLo[i] === lo && this.repHi[i] === hi) {
        count++;
        if (count >= n) return true;
      }
    }
    return false;
  };

  Position.prototype.isInsufficientMaterial = function () {
    var b = this.board, minors = [], pieces = 0;
    for (var sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = b[sq];
      if (!p) continue;
      var t = p & TYPE_MASK;
      if (t === KING) continue;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      minors.push({ type: t, color: p & COLOR_MASK, light: ((sq >> 4) + (sq & 7)) % 2 === 1 });
      pieces++;
      if (pieces > 2) return false;
    }
    if (minors.length === 0) return true;                       /* K vs K            */
    if (minors.length === 1) return true;                       /* K+L / K+S vs K    */
    if (minors.length === 2 &&
        minors[0].type === BISHOP && minors[1].type === BISHOP &&
        minors[0].color !== minors[1].color &&
        minors[0].light === minors[1].light) return true;       /* gleichfarbige L   */
    return false;
  };

  /* Liefert { over, type, winner, text } */
  Position.prototype.getStatus = function () {
    var moves = this.generateMoves();
    if (moves.length === 0) {
      if (this.inCheck()) {
        return { over: true, type: 'checkmate', winner: this.turn === WHITE ? BLACK : WHITE };
      }
      return { over: true, type: 'stalemate', winner: null };
    }
    if (this.halfmove >= 100) return { over: true, type: 'fifty', winner: null };
    if (this.isRepetition(3)) return { over: true, type: 'repetition', winner: null };
    if (this.isInsufficientMaterial()) return { over: true, type: 'material', winner: null };
    return { over: false, type: this.inCheck() ? 'check' : 'normal', winner: null, moves: moves };
  };

  /* --- Standard-Algebraische Notation ------------------------------------- */
  Position.prototype.moveToSan = function (m) {
    var flags = mFlags(m), san;
    var from = mFrom(m), to = mTo(m);
    var piece = this.board[from], type = piece & TYPE_MASK;

    if (flags & F_CASTLE_K) san = 'O-O';
    else if (flags & F_CASTLE_Q) san = 'O-O-O';
    else if (type === PAWN) {
      san = (flags & F_CAPTURE) ? FILES[from & 7] + 'x' + sqName(to) : sqName(to);
      if (flags & F_PROMO) san += '=' + PIECE_LETTER[mPromo(m)];
    } else {
      san = PIECE_LETTER[type];
      var all = this.generateMoves(), amb = [];
      for (var i = 0; i < all.length; i++) {
        var o = all[i];
        if (o === m || mTo(o) !== to) continue;
        if (this.board[mFrom(o)] === piece) amb.push(mFrom(o));
      }
      if (amb.length) {
        var sameFile = false, sameRank = false;
        for (var j = 0; j < amb.length; j++) {
          if ((amb[j] & 7) === (from & 7)) sameFile = true;
          if ((amb[j] >> 4) === (from >> 4)) sameRank = true;
        }
        if (!sameFile) san += FILES[from & 7];
        else if (!sameRank) san += ((from >> 4) + 1);
        else san += sqName(from);
      }
      if (flags & F_CAPTURE) san += 'x';
      san += sqName(to);
    }

    this.makeMove(m);
    if (this.inCheck()) san += this.generateMoves().length === 0 ? '#' : '+';
    this.undoMove();
    return san;
  };

  Position.prototype.sanToMove = function (san) {
    var clean = String(san).replace(/[+#!?]/g, '').replace(/0/g, 'O').trim();
    var moves = this.generateMoves();
    for (var i = 0; i < moves.length; i++) {
      if (this.moveToSan(moves[i]).replace(/[+#!?]/g, '') === clean) return moves[i];
    }
    return null;
  };

  /* --- Hilfsfunktionen ---------------------------------------------------- */
  Position.prototype.moveFor = function (from, to, promo) {
    var moves = this.generateMoves({ square: from });
    var fallback = null;
    for (var i = 0; i < moves.length; i++) {
      if (mTo(moves[i]) !== to) continue;
      if (mFlags(moves[i]) & F_PROMO) {
        if (promo && mPromo(moves[i]) === promo) return moves[i];
        if (!promo && mPromo(moves[i]) === QUEEN) fallback = moves[i];
      } else return moves[i];
    }
    return fallback;
  };

  Position.prototype.clone = function () { return new Position(this.getFen()); };

  Position.prototype.perft = function (depth) {
    if (depth === 0) return 1;
    var moves = this.generateMoves(), n = 0;
    if (depth === 1) return moves.length;
    for (var i = 0; i < moves.length; i++) {
      this.makeMove(moves[i]);
      n += this.perft(depth - 1);
      this.undoMove();
    }
    return n;
  };

  /* --- Export ------------------------------------------------------------- */
  var api = {
    Position: Position,
    EMPTY: EMPTY, PAWN: PAWN, KNIGHT: KNIGHT, BISHOP: BISHOP, ROOK: ROOK,
    QUEEN: QUEEN, KING: KING, WHITE: WHITE, BLACK: BLACK,
    TYPE_MASK: TYPE_MASK, COLOR_MASK: COLOR_MASK,
    F_CAPTURE: F_CAPTURE, F_EP: F_EP, F_DOUBLE: F_DOUBLE,
    F_CASTLE_K: F_CASTLE_K, F_CASTLE_Q: F_CASTLE_Q, F_PROMO: F_PROMO,
    START_FEN: START_FEN, FILES: FILES, PIECE_LETTER: PIECE_LETTER,
    mkMove: mkMove, mFrom: mFrom, mTo: mTo, mPromo: mPromo, mFlags: mFlags,
    sqName: sqName, sqIndex: sqIndex, sq64: sq64,
    KNIGHT_OFFS: KNIGHT_OFFS, BISHOP_OFFS: BISHOP_OFFS,
    ROOK_OFFS: ROOK_OFFS, KING_OFFS: KING_OFFS
  };

  global.Chess = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
