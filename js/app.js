/* =============================================================================
 * app.js — Spielsteuerung und Oberflaeche
 * -----------------------------------------------------------------------------
 * Verbindet Regelwerk (engine.js), Suche (ai.js) und DOM. Gliederung:
 *   1) Symbole      2) Zustand      3) Brettaufbau     4) Darstellung
 *   5) Eingabe      6) Zugablauf    7) Uhr             8) Computerzug
 *   9) Verlauf     10) Dialoge     11) Speichern      12) Start
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.Chess, EV = window.ChessEval, AI = window.ChessAI,
      PIECES = window.ChessPieces, SND = window.ChessSound, BOOK = window.ChessBook;

  var WHITE = C.WHITE, BLACK = C.BLACK;
  var mFrom = C.mFrom, mTo = C.mTo, mFlags = C.mFlags, mPromo = C.mPromo;

  /* ---------- 1) Symbole -------------------------------------------------- */
  var ICONS = {
    soundOn:  '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/></svg>',
    flip:     '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    gear:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.9 6.1l-1.4 1.4M7.5 16.5l-1.4 1.4M17.9 17.9l-1.4-1.4M7.5 7.5L6.1 6.1"/></svg>',
    undo:     '<svg viewBox="0 0 24 24"><path d="M4 8h10a5.5 5.5 0 0 1 0 11H8"/><path d="M7.5 4.5L4 8l3.5 3.5"/></svg>',
    hint:     '<svg viewBox="0 0 24 24"><path d="M9.5 18h5M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
    flag:     '<svg viewBox="0 0 24 24"><path d="M5.5 21V3.5"/><path d="M5.5 4.5h11l-2 3.5 2 3.5h-11"/></svg>',
    share:    '<svg viewBox="0 0 24 24"><path d="M4 14v5.5h16V14"/><path d="M12 3.5v11M8 10.5l4 4 4-4"/></svg>',
    trophy:   '<svg viewBox="0 0 24 24" fill="none" stroke="#7bb872" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5.5H5.5V7a3 3 0 0 0 3 3M16 5.5h2.5V7a3 3 0 0 1-3 3"/><path d="M12 13v4M9 20h6M10 17h4"/></svg>',
    lost:     '<svg viewBox="0 0 24 24" fill="none" stroke="#d9705f" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20V4"/><path d="M6 5h11l-2 3.5L17 12H6"/></svg>',
    handshake:'<svg viewBox="0 0 24 24" fill="none" stroke="#6d9fd4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l3.5-3.5h4L13 11l-2 2-2-2"/><path d="M21 12l-3.5-3.5h-4"/><path d="M13 11l3 3 1.5-1.5"/><path d="M11 13l3 3M9.5 14.5l2.5 2.5"/></svg>',
    clock:    '<svg viewBox="0 0 24 24" fill="none" stroke="#e0b464" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>',
    robot:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4.5v3.5M8.5 13h.01M15.5 13h.01M9.5 16.2h5"/></svg>',
    person:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>'
  };

  /* Kleine Figurensilhouette fuer Auswahl und Spielerleiste */
  function pieceIcon(type, color) {
    return '<svg viewBox="0 0 45 45" class="' + (color === 'w' ? 'cc-white' : 'cc-black') +
           '"><use href="#pc-' + type + '"/></svg>';
  }

  /* ---------- 2) Zustand -------------------------------------------------- */
  var DEFAULT_SETTINGS = {
    sound: true,
    animations: true,
    showHints: true,
    showCoords: true,
    showEval: true,
    boardTheme: 'walnuss'
  };

  var TIME_CONTROLS = [
    { key: 'none', label: 'Ohne Uhr', base: 0, inc: 0 },
    { key: '1+0',  label: '1 min',    base: 60, inc: 0 },
    { key: '3+2',  label: '3 + 2',    base: 180, inc: 2 },
    { key: '5+0',  label: '5 min',    base: 300, inc: 0 },
    { key: '10+0', label: '10 min',   base: 600, inc: 0 },
    { key: '15+10', label: '15 + 10', base: 900, inc: 10 }
  ];

  var state = {
    pos: new C.Position(),
    startFen: C.START_FEN,
    mode: 'ai',
    level: 3,
    humanColor: WHITE,
    orientation: 'w',
    moves: [],
    viewPly: 0,
    viewPos: null,
    startTurnBlack: false,
    startMoveNo: 1,
    selected: -1,
    targets: [],
    thinking: false,
    result: null,
    timeControl: TIME_CONTROLS[0],
    clock: { w: 0, b: 0, running: false, last: 0, timer: null, lowWarned: { w: false, b: false } },
    settings: Object.assign({}, DEFAULT_SETTINGS),
    gameId: 0,
    started: false,
    pendingPromo: null,
    drag: null
  };

  var el = {};        /* zwischengespeicherte DOM-Knoten   */
  var squareEls = []; /* 64 Felder in Anzeigereihenfolge   */
  var sqToEl = {};    /* 0x88-Index -> Feldelement         */
  var pieceEls = {};  /* 0x88-Index -> Figurenelement      */

  function $(id) { return document.getElementById(id); }

  /* ---------- 3) Brettaufbau ---------------------------------------------- */
  function cacheDom() {
    ['board', 'squares', 'pieces', 'movelist-body', 'movelist-empty', 'modal-root',
     'modal-card', 'modal-backdrop', 'toast', 'mode-label', 'opening-tag', 'status-line',
     'engine-note', 'evalbar', 'evalbar-fill', 'evalbar-value', 'promo-layer',
     'bar-top', 'bar-bottom', 'name-top', 'name-bottom', 'avatar-top', 'avatar-bottom',
     'captured-top', 'captured-bottom', 'clock-top', 'clock-bottom',
     'btn-sound', 'btn-flip', 'btn-settings', 'btn-new',
     'act-undo', 'act-hint', 'act-resign', 'act-share',
     'nav-start', 'nav-prev', 'nav-next', 'nav-end'
    ].forEach(function (id) { el[id] = $(id); });
  }

  function buildSquares() {
    var frag = document.createDocumentFragment();
    squareEls = [];
    for (var i = 0; i < 64; i++) {
      var d = document.createElement('div');
      d.className = 'sq';
      frag.appendChild(d);
      squareEls.push(d);
    }
    el.squares.innerHTML = '';
    el.squares.appendChild(frag);
    layoutSquares();
  }

  /** Weist den 64 Feldelementen je nach Blickrichtung ihren Index zu. */
  function layoutSquares() {
    sqToEl = {};
    for (var i = 0; i < 64; i++) {
      var row = Math.floor(i / 8), col = i % 8;
      var file = state.orientation === 'w' ? col : 7 - col;
      var rank = state.orientation === 'w' ? 7 - row : row;
      var sq = rank * 16 + file;

      var d = squareEls[i];
      d.className = 'sq ' + ((file + rank) % 2 === 0 ? 'dark' : 'light');
      d.dataset.sq = sq;
      sqToEl[sq] = d;

      var coords = '';
      if (row === 7) coords += '<span class="coord coord-file">' + C.FILES[file] + '</span>';
      if (col === 0) coords += '<span class="coord coord-rank">' + (rank + 1) + '</span>';
      d.innerHTML = coords;
    }
  }

  function transformFor(sq) {
    var f = sq & 7, r = sq >> 4;
    var col = state.orientation === 'w' ? f : 7 - f;
    var row = state.orientation === 'w' ? 7 - r : r;
    return 'translate(' + (col * 100) + '%,' + (row * 100) + '%)';
  }

  function pieceKey(p) {
    return ((p & C.COLOR_MASK) === WHITE ? 'w' : 'b') +
           C.PIECE_LETTER[p & C.TYPE_MASK].toLowerCase();
  }

  function makePieceEl(p, sq) {
    var key = pieceKey(p);
    var d = document.createElement('div');
    d.className = 'piece';
    d.dataset.piece = key;
    d.dataset.sq = sq;
    d.style.transform = transformFor(sq);
    d.innerHTML = PIECES.markup(key[1], key[0]);
    d.setAttribute('aria-label', PIECES.pieceName(key[1], key[0]) + ' auf ' + C.sqName(sq));
    return d;
  }

  /** Gleicht die Figurenebene mit der Stellung ab — ohne Animation. */
  function reconcilePieces(pos) {
    var sq, p;
    for (var key in pieceEls) {
      sq = +key;
      p = pos.board[sq];
      if (!p || pieceKey(p) !== pieceEls[sq].dataset.piece) {
        pieceEls[sq].remove();
        delete pieceEls[sq];
      }
    }
    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      p = pos.board[sq];
      if (!p || pieceEls[sq]) continue;
      var d = makePieceEl(p, sq);
      el.pieces.appendChild(d);
      pieceEls[sq] = d;
    }
  }

  function repositionAll() {
    for (var key in pieceEls) {
      pieceEls[key].classList.remove('animating');
      pieceEls[key].style.transform = transformFor(+key);
    }
  }

  /* ---------- 4) Darstellung ---------------------------------------------- */
  function displayedPos() {
    return state.viewPly === state.moves.length ? state.pos : state.viewPos;
  }
  function isLive() { return state.viewPly === state.moves.length; }

  function render(opts) {
    opts = opts || {};
    var pos = displayedPos();
    if (!opts.skipPieces) reconcilePieces(pos);
    updateHighlights();
    updatePlayers();
    updateMoveList();
    updateControls();
    updateEvalBar();
    updateOpeningTag();
    renderClocks();
  }

  function updateHighlights() {
    var pos = displayedPos();
    for (var i = 0; i < 64; i++) {
      squareEls[i].classList.remove('last', 'sel', 'check', 'hover-target');
      var extra = squareEls[i].querySelectorAll('.dot,.ring');
      for (var k = 0; k < extra.length; k++) extra[k].remove();
    }

    /* letzter gespielter Zug */
    if (state.viewPly > 0) {
      var last = state.moves[state.viewPly - 1].move;
      if (sqToEl[mFrom(last)]) sqToEl[mFrom(last)].classList.add('last');
      if (sqToEl[mTo(last)]) sqToEl[mTo(last)].classList.add('last');
    }

    /* Koenig im Schach */
    if (pos.inCheck()) {
      var ks = pos.kings[pos.turn === WHITE ? 0 : 1];
      if (sqToEl[ks]) sqToEl[ks].classList.add('check');
    }

    /* Auswahl und moegliche Ziele */
    if (state.selected >= 0 && sqToEl[state.selected]) {
      sqToEl[state.selected].classList.add('sel');
      for (var t = 0; t < state.targets.length; t++) {
        var to = mTo(state.targets[t]);
        var sqEl = sqToEl[to];
        if (!sqEl) continue;
        var occupied = pos.board[to] || (mFlags(state.targets[t]) & C.F_EP);
        var mark = document.createElement('span');
        mark.className = occupied ? 'ring' : 'dot';
        sqEl.appendChild(mark);
      }
    }
  }

  function updatePlayers() {
    var pos = displayedPos();
    var topColor = state.orientation === 'w' ? BLACK : WHITE;
    var botColor = state.orientation === 'w' ? WHITE : BLACK;

    setPlayerBar('top', topColor);
    setPlayerBar('bottom', botColor);

    var turn = state.result ? null : pos.turn;
    el['bar-top'].classList.toggle('is-turn', turn === topColor);
    el['bar-bottom'].classList.toggle('is-turn', turn === botColor);

    renderCaptured('top', topColor);
    renderCaptured('bottom', botColor);
  }

  function playerName(color) {
    if (state.mode === 'human') return color === WHITE ? 'Weiß' : 'Schwarz';
    if (color === state.humanColor) return 'Du';
    return AI.getLevel(state.level).name;
  }

  function setPlayerBar(side, color) {
    var isHuman = state.mode === 'human' || color === state.humanColor;
    var tag = state.mode === 'human'
      ? (color === WHITE ? 'Spieler 1' : 'Spieler 2')
      : (isHuman ? (color === WHITE ? 'Weiß' : 'Schwarz') : AI.getLevel(state.level).elo);

    el['name-' + side].innerHTML = escapeHtml(playerName(color)) +
      '<span class="player-tag">' + escapeHtml(tag) + '</span>';

    var avatar = el['avatar-' + side];
    avatar.className = 'player-avatar ' + (color === WHITE ? 'is-white' : 'is-black');
    avatar.innerHTML = isHuman ? ICONS.person : ICONS.robot;
    avatar.style.color = 'var(--text-dim)';
  }

  /* Geschlagene Figuren des Gegners + Materialvorteil */
  var CAPTURE_ORDER = ['q', 'r', 'b', 'n', 'p'];
  function renderCaptured(side, color) {
    var pos = displayedPos();
    var startCounts = { w: { p: 8, n: 2, b: 2, r: 2, q: 1 }, b: { p: 8, n: 2, b: 2, r: 2, q: 1 } };
    var cur = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    for (var sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = pos.board[sq];
      if (!p) continue;
      var t = C.PIECE_LETTER[p & C.TYPE_MASK].toLowerCase();
      if (t === 'k') continue;
      cur[(p & C.COLOR_MASK) === WHITE ? 'w' : 'b'][t]++;
    }

    /* Von dieser Farbe geschlagen = fehlende Figuren der Gegenfarbe */
    var victimKey = color === WHITE ? 'b' : 'w';
    var html = '';
    for (var i = 0; i < CAPTURE_ORDER.length; i++) {
      var type = CAPTURE_ORDER[i];
      var missing = startCounts[victimKey][type] - cur[victimKey][type];
      for (var n = 0; n < missing; n++) html += pieceIcon(type, victimKey);
    }

    var mat = EV.materialCount(pos);
    var diff = color === WHITE ? mat.diff : -mat.diff;
    if (diff > 0) html += '<span class="mat-diff">+' + diff + '</span>';

    el['captured-' + side].innerHTML = html;
  }

  function updateMoveList() {
    var body = el['movelist-body'];
    if (!state.moves.length) {
      body.innerHTML = '';
      el['movelist-empty'].hidden = false;
      return;
    }
    el['movelist-empty'].hidden = true;

    var startsBlack = state.startTurnBlack;
    var firstNo = state.startMoveNo;
    var rows = [], i = 0;

    if (startsBlack && state.moves.length) {
      rows.push(row(firstNo, null, state.moves[0], 0));
      i = 1;
    }
    for (; i < state.moves.length; i += 2) {
      var no = firstNo + Math.floor((i + (startsBlack ? 1 : 0)) / 2);
      rows.push(row(no, state.moves[i], state.moves[i + 1], i));
    }
    body.innerHTML = rows.join('');

    function row(no, wm, bm, idx) {
      var wIdx = wm ? idx : -1;
      var bIdx = wm ? idx + 1 : idx;
      return '<tr>' +
        '<td class="mv-no">' + no + '.</td>' +
        '<td class="mv-cell">' + (wm ? cell(wm, wIdx) : '') + '</td>' +
        '<td class="mv-cell">' + (bm ? cell(bm, bIdx) : '') + '</td>' +
        '</tr>';
    }
    function cell(m, idx) {
      var cur = state.viewPly === idx + 1 ? ' current' : '';
      var book = m.book ? '<span class="mv-book"> ♦</span>' : '';
      return '<button class="mv' + cur + '" data-ply="' + (idx + 1) + '">' +
             escapeHtml(m.san) + book + '</button>';
    }

    var currentBtn = body.querySelector('.mv.current');
    if (currentBtn) {
      var wrap = currentBtn.closest('.movelist-wrap');
      if (wrap) {
        var top = currentBtn.offsetTop - wrap.clientHeight / 2;
        wrap.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }
  }

  function updateControls() {
    var live = isLive();
    el['nav-start'].disabled = state.viewPly === 0;
    el['nav-prev'].disabled = state.viewPly === 0;
    el['nav-next'].disabled = live;
    el['nav-end'].disabled = live;

    el['act-undo'].disabled = !(state.started && !state.thinking && state.moves.length > 0);
    el['act-hint'].disabled = !state.started || state.thinking || !!state.result || !live ||
                             (state.mode === 'ai' && state.pos.turn !== state.humanColor);
    el['act-resign'].disabled = !state.started || !!state.result;
    el['act-share'].disabled = !state.started;
    updateStatusLine();
  }

  function updateStatusLine() {
    var line = el['status-line'];
    if (!state.started) {
      line.innerHTML = 'Wähle <strong>Neue Partie</strong>, um zu starten.';
      return;
    }
    if (state.result) { line.innerHTML = escapeHtml(state.result.headline); return; }
    if (!isLive()) {
      line.innerHTML = 'Verlaufsansicht — <strong>→</strong> führt zurück zur Partie.';
      return;
    }
    if (state.thinking) {
      line.innerHTML = '<span class="thinking">' + escapeHtml(AI.getLevel(state.level).name) +
                       ' überlegt <i></i><i></i><i></i></span>';
      return;
    }
    var pos = state.pos;
    var side = pos.turn === WHITE ? 'Weiß' : 'Schwarz';
    if (pos.inCheck()) { line.innerHTML = '<strong>Schach!</strong> ' + side + ' ist am Zug.'; return; }
    if (state.mode === 'ai' && pos.turn === state.humanColor) line.innerHTML = '<strong>Du bist am Zug.</strong>';
    else line.innerHTML = '<strong>' + side + '</strong> ist am Zug.';
  }

  function updateEvalBar() {
    var bar = el['evalbar'];
    if (!state.settings.showEval || !state.started) { bar.style.display = 'none'; return; }
    bar.style.display = '';

    var pos = displayedPos();
    var status = state.result;
    var cp;
    if (status && status.type === 'checkmate') cp = status.winner === WHITE ? 12000 : -12000;
    else if (status) cp = 0;
    else cp = AI.quickEval(pos);

    /* Waehrend einer laufenden Suche liefert quickEval nichts — dann bleibt
     * einfach der zuletzt angezeigte Wert stehen.                           */
    if (cp === null || cp === undefined) return;

    var pct, label;
    if (Math.abs(cp) > AI.MATE_THRESHOLD) {
      var plies = AI.MATE - Math.abs(cp);
      label = 'M' + Math.max(1, Math.ceil(plies / 2));
      pct = cp > 0 ? 100 : 0;
    } else if (Math.abs(cp) >= 10000) {
      label = cp > 0 ? '1-0' : '0-1';
      pct = cp > 0 ? 100 : 0;
    } else {
      pct = 100 / (1 + Math.exp(-cp / 320));
      pct = Math.max(3, Math.min(97, pct));
      label = (cp >= 0 ? '+' : '−') + (Math.abs(cp) / 100).toFixed(1);
      if (Math.abs(cp) < 20) label = '0.0';
    }

    /* Die Leiste zeigt immer Weiss unten — ausser das Brett ist gedreht */
    var whiteAtBottom = state.orientation === 'w';
    el['evalbar-fill'].style.height = (whiteAtBottom ? pct : 100 - pct) + '%';
    el['evalbar-value'].textContent = label;
    var valueOnTop = whiteAtBottom ? pct < 50 : pct >= 50;
    el['evalbar-value'].classList.toggle('is-top', valueOnTop);
  }

  /* ---------- 5) Eingabe --------------------------------------------------- */
  function squareFromPoint(x, y) {
    var r = el.board.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return -1;
    var col = Math.floor((x - r.left) / (r.width / 8));
    var row = Math.floor((y - r.top) / (r.height / 8));
    col = Math.max(0, Math.min(7, col));
    row = Math.max(0, Math.min(7, row));
    var file = state.orientation === 'w' ? col : 7 - col;
    var rank = state.orientation === 'w' ? 7 - row : row;
    return rank * 16 + file;
  }

  function humanMayMove() {
    if (!state.started || state.result || state.thinking || !isLive() || state.pendingPromo) return false;
    if (state.mode === 'human') return true;
    return state.pos.turn === state.humanColor;
  }

  function selectSquare(sq) {
    var pos = state.pos;
    var p = pos.board[sq];
    if (!p || (p & C.COLOR_MASK) !== pos.turn) { clearSelection(); return false; }
    state.selected = sq;
    state.targets = pos.generateMoves({ square: sq });
    updateHighlights();
    return true;
  }

  function clearSelection() {
    state.selected = -1;
    state.targets = [];
    updateHighlights();
  }

  function targetMove(to) {
    for (var i = 0; i < state.targets.length; i++) {
      if (mTo(state.targets[i]) === to) return state.targets[i];
    }
    return null;
  }

  function onPointerDown(ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    SND.unlock();

    if (!isLive() && state.started) { goToPly(state.moves.length); return; }
    if (!humanMayMove()) return;

    var sq = squareFromPoint(ev.clientX, ev.clientY);
    if (sq < 0) return;

    /* Auf ein markiertes Ziel geklickt -> Zug ausfuehren */
    if (state.selected >= 0) {
      var mv = targetMove(sq);
      if (mv) { ev.preventDefault(); startMove(mv, false); return; }
    }

    var pos = state.pos;
    var p = pos.board[sq];
    if (!p || (p & C.COLOR_MASK) !== pos.turn) { clearSelection(); return; }

    ev.preventDefault();
    var wasSelected = state.selected === sq;
    selectSquare(sq);

    var pieceEl = pieceEls[sq];
    if (!pieceEl) return;
    state.drag = {
      sq: sq, el: pieceEl, startX: ev.clientX, startY: ev.clientY,
      moved: false, wasSelected: wasSelected, pointerId: ev.pointerId
    };
  }

  function onPointerMove(ev) {
    var d = state.drag;
    if (!d) return;
    var dx = ev.clientX - d.startX, dy = ev.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;

    if (!d.moved) {
      d.moved = true;
      d.el.classList.add('dragging');
      d.el.classList.remove('animating');
    }
    var r = el.board.getBoundingClientRect();
    var size = r.width / 8;
    var x = ev.clientX - r.left - size / 2;
    var y = ev.clientY - r.top - size / 2;
    d.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';

    var over = squareFromPoint(ev.clientX, ev.clientY);
    for (var i = 0; i < 64; i++) squareEls[i].classList.remove('hover-target');
    if (over >= 0 && targetMove(over) && sqToEl[over]) sqToEl[over].classList.add('hover-target');
  }

  function onPointerUp(ev) {
    var d = state.drag;
    if (!d) return;
    state.drag = null;
    for (var i = 0; i < 64; i++) squareEls[i].classList.remove('hover-target');

    if (!d.moved) {
      /* Reiner Klick: Auswahl umschalten */
      if (d.wasSelected) clearSelection();
      return;
    }

    d.el.classList.remove('dragging');
    var to = squareFromPoint(ev.clientX, ev.clientY);
    var mv = to >= 0 ? targetMove(to) : null;

    if (mv) {
      d.el.style.transform = transformFor(mTo(mv));
      startMove(mv, true);
    } else {
      d.el.style.transform = transformFor(d.sq);
      if (to !== d.sq && to >= 0) SND.play('illegal');
      clearSelection();
    }
  }

  /* ---------- 6) Zugablauf ------------------------------------------------- */
  /** Faengt Umwandlungen ab und fuehrt den Zug sonst direkt aus. */
  function startMove(move, wasDrag) {
    if (mFlags(move) & C.F_PROMO) {
      var choices = state.targets.filter(function (m) {
        return mTo(m) === mTo(move) && mFrom(m) === mFrom(move) && (mFlags(m) & C.F_PROMO);
      });
      if (choices.length > 1) { showPromotion(move, choices, wasDrag); return; }
    }
    playMove(move, { animate: !wasDrag });
  }

  function showPromotion(sample, choices, wasDrag) {
    var to = mTo(sample);
    var color = state.pos.turn === WHITE ? 'w' : 'b';
    state.pendingPromo = true;

    var layer = el['promo-layer'];
    var f = to & 7, r = to >> 4;
    var col = state.orientation === 'w' ? f : 7 - f;
    var row = state.orientation === 'w' ? 7 - r : r;
    var fromTop = row < 4;

    var order = [C.QUEEN, C.KNIGHT, C.ROOK, C.BISHOP];
    var html = '<div class="promo-col' + (fromTop ? '' : ' from-bottom') + '" style="left:' +
               (col * 12.5) + '%;' + (fromTop ? 'top:' + (row * 12.5) + '%' :
               'bottom:' + ((7 - row) * 12.5) + '%') + '">';
    for (var i = 0; i < order.length; i++) {
      var letter = C.PIECE_LETTER[order[i]].toLowerCase();
      html += '<button class="promo-opt" data-promo="' + order[i] + '" title="' +
              PIECES.NAMES[letter] + '">' +
              PIECES.markup(letter, color) + '</button>';
    }
    html += '</div>';
    layer.innerHTML = html;
    layer.hidden = false;

    layer.onclick = function (ev) {
      var btn = ev.target.closest('.promo-opt');
      closePromotion();
      if (!btn) { clearSelection(); return; }
      var want = +btn.dataset.promo;
      for (var j = 0; j < choices.length; j++) {
        if (mPromo(choices[j]) === want) { playMove(choices[j], { animate: !wasDrag }); return; }
      }
    };
  }

  function closePromotion() {
    state.pendingPromo = null;
    el['promo-layer'].hidden = true;
    el['promo-layer'].innerHTML = '';
    el['promo-layer'].onclick = null;
  }

  /**
   * Fuehrt einen Zug aus: Animation, Klang, Uhr, Verlauf, Statusprüfung.
   * @param {number} move  kodierter Zug
   * @param {object} opts  { animate, engine }
   */
  function playMove(move, opts) {
    opts = opts || {};
    var pos = state.pos;

    /* Schutznetz: nur wirklich legale Zuege ausfuehren. Ueber die Oberflaeche
     * kann hier nichts Ungueltiges ankommen, aber playMove ist auch von aussen
     * erreichbar — und ein ungeprueftes makeMove wuerde das Brett zerstoeren. */
    if (pos.generateMoves().indexOf(move) < 0) {
      console.warn('Zug abgelehnt, in dieser Stellung nicht legal:', move);
      return false;
    }

    var flags = mFlags(move);
    var san = pos.moveToSan(move);
    var isCapture = !!(flags & C.F_CAPTURE);
    var from = mFrom(move), to = mTo(move);

    clearSelection();
    clearHintMark();

    /* Uhrstand vor dem Zug sichern, damit Zurücknehmen ihn wiederherstellt */
    var clockBefore = { w: state.clock.w, b: state.clock.b };

    /* --- Figuren bewegen (gezielt, damit es fluessig aussieht) --- */
    var animate = opts.animate !== false && state.settings.animations;
    var movingEl = pieceEls[from];
    var capSq = (flags & C.F_EP) ? (pos.turn === WHITE ? to - 16 : to + 16) : to;

    if (pieceEls[capSq] && capSq !== from) {
      var dying = pieceEls[capSq];
      delete pieceEls[capSq];
      dying.classList.add('fading');
      setTimeout(function () { dying.remove(); }, 180);
    }
    if (movingEl) {
      delete pieceEls[from];
      if (pieceEls[to]) { pieceEls[to].remove(); }
      pieceEls[to] = movingEl;
      movingEl.dataset.sq = to;
      if (animate) movingEl.classList.add('animating');
      movingEl.style.transform = transformFor(to);
    }
    if (flags & (C.F_CASTLE_K | C.F_CASTLE_Q)) {
      var rf = (flags & C.F_CASTLE_K) ? from + 3 : from - 4;
      var rt = (flags & C.F_CASTLE_K) ? from + 1 : from - 1;
      var rookEl = pieceEls[rf];
      if (rookEl) {
        delete pieceEls[rf];
        pieceEls[rt] = rookEl;
        rookEl.dataset.sq = rt;
        if (animate) rookEl.classList.add('animating');
        rookEl.style.transform = transformFor(rt);
      }
    }

    pos.makeMove(move);

    if (flags & C.F_PROMO) {
      var np = pos.board[to];
      var key = pieceKey(np);
      if (pieceEls[to]) {
        pieceEls[to].dataset.piece = key;
        pieceEls[to].innerHTML = PIECES.markup(key[1], key[0]);
      }
    }

    /* --- Verlauf --- */
    state.moves.push({
      move: move, san: san, clockBefore: clockBefore,
      book: !!opts.book, engine: opts.engine || null
    });
    state.viewPly = state.moves.length;

    /* --- Klang --- */
    var inCheck = pos.inCheck();
    if (inCheck) SND.play('check');
    else if (flags & C.F_PROMO) SND.play('promote');
    else if (flags & (C.F_CASTLE_K | C.F_CASTLE_Q)) SND.play('castle');
    else if (isCapture) SND.play('capture');
    else SND.play('move');

    /* --- Uhr --- */
    if (state.timeControl.base > 0) {
      var moverKey = (pos.turn === WHITE ? 'b' : 'w');
      state.clock[moverKey] += state.timeControl.inc * 1000;
    }

    setTimeout(function () { reconcilePieces(state.pos); }, animate ? 210 : 0);
    render({ skipPieces: true });
    saveGame();

    var status = pos.getStatus();
    if (status.over) { finishGame(status); return true; }

    startClock();
    scheduleAi();
    return true;
  }

  /* ---------- 7) Uhr ------------------------------------------------------- */
  function startClock() {
    if (state.timeControl.base <= 0 || state.result || !state.started) return;
    state.clock.running = true;
    state.clock.last = Date.now();
    if (!state.clock.timer) state.clock.timer = setInterval(tickClock, 100);
    renderClocks();
  }

  function stopClock() {
    state.clock.running = false;
    if (state.clock.timer) { clearInterval(state.clock.timer); state.clock.timer = null; }
  }

  function tickClock() {
    if (!state.clock.running) return;
    var now = Date.now();
    var delta = now - state.clock.last;
    state.clock.last = now;

    var key = state.pos.turn === WHITE ? 'w' : 'b';
    state.clock[key] -= delta;

    if (state.clock[key] <= 10000 && !state.clock.lowWarned[key] && state.clock[key] > 0) {
      state.clock.lowWarned[key] = true;
      SND.play('lowTime');
    }
    if (state.clock[key] <= 0) {
      state.clock[key] = 0;
      stopClock();
      flagFall(state.pos.turn);
      return;
    }
    renderClocks();
  }

  function flagFall(loser) {
    /* Kann der Gegner ueberhaupt noch mattsetzen? Sonst ist es remis. */
    var winner = loser === WHITE ? BLACK : WHITE;
    var canMate = hasMatingMaterial(state.pos, winner);
    finishGame(canMate
      ? { over: true, type: 'timeout', winner: winner }
      : { over: true, type: 'timeout-draw', winner: null });
  }

  function hasMatingMaterial(pos, color) {
    var minor = 0;
    for (var sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      var p = pos.board[sq];
      if (!p || (p & C.COLOR_MASK) !== color) continue;
      var t = p & C.TYPE_MASK;
      if (t === C.PAWN || t === C.ROOK || t === C.QUEEN) return true;
      if (t === C.KNIGHT || t === C.BISHOP) minor++;
    }
    return minor >= 2;
  }

  function fmtClock(ms) {
    if (ms < 0) ms = 0;
    var total = Math.ceil(ms / 1000);
    var m = Math.floor(total / 60), s = total % 60;
    if (ms < 20000) {
      var tenth = Math.floor((ms % 1000) / 100);
      return m + ':' + (s < 10 ? '0' : '') + s + '.' + tenth;
    }
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderClocks() {
    var on = state.timeControl.base > 0;
    var topColor = state.orientation === 'w' ? BLACK : WHITE;
    var botColor = state.orientation === 'w' ? WHITE : BLACK;

    [['top', topColor], ['bottom', botColor]].forEach(function (pair) {
      var node = el['clock-' + pair[0]];
      node.hidden = !on;
      if (!on) return;
      var key = pair[1] === WHITE ? 'w' : 'b';
      var ms = state.clock[key];
      node.querySelector('.clock-time').textContent = fmtClock(ms);
      node.classList.toggle('is-active', !state.result && state.pos.turn === pair[1]);
      node.classList.toggle('is-low', ms <= 30000);
    });
  }

  /* ---------- 8) Computerzug ---------------------------------------------- */
  function scheduleAi() {
    if (state.mode !== 'ai' || state.result || !state.started) return;
    if (state.pos.turn === state.humanColor) return;
    runAi();
  }

  function runAi() {
    var myGame = state.gameId;
    state.thinking = true;
    updateControls();

    var sans = state.moves.map(function (m) { return m.san; });
    var level = aiLevelForClock();

    AI.findBestMove(state.pos, level, sans, function (info) {
      if (state.gameId !== myGame) return;
      el['engine-note'].textContent = 'Tiefe ' + info.depth;
    }).then(function (res) {
      if (state.gameId !== myGame) return;
      state.thinking = false;
      if (!res || state.result) { updateControls(); return; }

      el['engine-note'].textContent = res.fromBook
        ? 'Buch'
        : 'Tiefe ' + res.depth + ' · ' + (res.ms / 1000).toFixed(1) + 's';

      playMove(res.move, {
        animate: true,
        book: res.fromBook,
        engine: { depth: res.depth, ms: res.ms, nodes: res.nodes }
      });
    }).catch(function (err) {
      state.thinking = false;
      updateControls();
      console.error('Fehler in der Zugsuche:', err);
      toast('Die Zugsuche ist auf einen Fehler gelaufen.');
    });
  }

  /**
   * Die Stufe mit einem an die Restzeit angepassten Zeitbudget.
   * Ohne das wuerde der Meister in einer Blitzpartie an der eigenen Uhr
   * scheitern: drei Sekunden pro Zug halten keine 60-Sekunden-Partie durch.
   */
  function aiLevelForClock() {
    var level = AI.getLevel(state.level);
    if (state.timeControl.base <= 0) return level;

    var remaining = state.clock[state.pos.turn === WHITE ? 'w' : 'b'];
    var budget = remaining / 25 + state.timeControl.inc * 700;
    budget = Math.max(150, Math.min(level.timeMs, budget));
    return Object.assign({}, level, { timeMs: budget });
  }

  /* ---------- 9) Verlauf --------------------------------------------------- */
  function goToPly(n) {
    n = Math.max(0, Math.min(state.moves.length, n));

    /* Erst die Stellung aufbauen, dann den Index umstellen — sonst zeigt
     * viewPly bereits in die Vergangenheit, waehrend viewPos noch fehlt.   */
    if (n === state.moves.length) {
      state.viewPos = null;
    } else {
      var p = new C.Position(state.startFen);
      for (var i = 0; i < n; i++) p.makeMove(state.moves[i].move);
      state.viewPos = p;
    }
    state.viewPly = n;

    clearSelection();
    clearHintMark();
    reconcilePieces(displayedPos());
    repositionAll();
    render({ skipPieces: true });
    renderClocks();
  }

  function undoMove() {
    if (!state.moves.length || state.thinking) return;
    var count = 1;
    if (state.mode === 'ai') {
      /* So weit zurueck, dass der Mensch wieder am Zug ist */
      count = state.pos.turn === state.humanColor ? 2 : 1;
      count = Math.min(count, state.moves.length);
    }
    var restore = state.moves[state.moves.length - count].clockBefore;
    for (var i = 0; i < count; i++) { state.pos.undoMove(); state.moves.pop(); }

    state.clock.w = restore.w;
    state.clock.b = restore.b;
    state.clock.lowWarned = { w: false, b: false };
    state.result = null;
    state.viewPly = state.moves.length;
    state.viewPos = null;
    el['engine-note'].textContent = '';

    reconcilePieces(state.pos);
    repositionAll();
    render({ skipPieces: true });
    renderClocks();
    saveGame();
    SND.play('move');

    if (state.timeControl.base > 0) startClock();
    scheduleAi();
  }

  function clearHintMark() {
    var old = el.board.querySelector('.hint-mark');
    if (old) old.remove();
  }

  function showHint() {
    if (state.thinking) return;
    state.thinking = true;
    updateControls();
    el['status-line'].innerHTML = '<span class="thinking">Suche einen guten Zug <i></i><i></i><i></i></span>';

    var myGame = state.gameId;
    var level = Object.assign({}, AI.getLevel(4), { book: false, timeMs: 1200, spread: 0, blunder: 0 });
    AI.findBestMove(state.pos, level, []).then(function (res) {
      state.thinking = false;
      if (state.gameId !== myGame || !res) { updateControls(); return; }
      clearHintMark();
      var layer = document.createElement('div');
      layer.className = 'hint-mark';
      [mFrom(res.move), mTo(res.move)].forEach(function (sq) {
        var f = sq & 7, r = sq >> 4;
        var col = state.orientation === 'w' ? f : 7 - f;
        var row = state.orientation === 'w' ? 7 - r : r;
        var d = document.createElement('div');
        d.className = 'hm-sq';
        d.style.left = (col * 12.5) + '%';
        d.style.top = (row * 12.5) + '%';
        layer.appendChild(d);
      });
      el.board.appendChild(layer);
      updateControls();
      toast('Vorschlag: ' + state.pos.moveToSan(res.move));
    });
  }

  /* ---------- 10) Partieende ----------------------------------------------- */
  var RESULT_TEXT = {
    checkmate: 'Schachmatt',
    stalemate: 'Patt — der Spieler am Zug hat keinen legalen Zug, steht aber nicht im Schach.',
    fifty: 'Remis nach der 50-Züge-Regel.',
    repetition: 'Remis durch dreifache Stellungswiederholung.',
    material: 'Remis — mit dem verbliebenen Material ist kein Matt mehr möglich.',
    timeout: 'Zeit abgelaufen.',
    'timeout-draw': 'Zeit abgelaufen, aber das Material reicht nicht zum Matt — remis.',
    resign: 'Aufgegeben.',
    agreed: 'Remis vereinbart.'
  };

  function finishGame(status) {
    stopClock();
    state.result = buildResult(status);
    state.thinking = false;
    clearSelection();
    render({ skipPieces: true });
    renderClocks();
    saveGame();

    if (status.winner === null) SND.play('draw');
    else if (state.mode === 'human') SND.play('win');
    else SND.play(status.winner === state.humanColor ? 'win' : 'lose');

    setTimeout(showResultDialog, 520);
  }

  function buildResult(status) {
    var r = { type: status.type, winner: status.winner };
    if (status.winner === null) {
      r.score = '½ – ½';
      r.title = 'Remis';
      r.tone = 'draw';
      r.headline = 'Die Partie endet remis.';
    } else {
      var wName = playerName(status.winner);
      r.score = status.winner === WHITE ? '1 – 0' : '0 – 1';
      if (state.mode === 'ai') {
        var won = status.winner === state.humanColor;
        r.tone = won ? 'win' : 'lose';
        r.title = won ? 'Du gewinnst!' : 'Du verlierst';
      } else {
        r.tone = 'win';
        r.title = (status.winner === WHITE ? 'Weiß' : 'Schwarz') + ' gewinnt';
      }
      r.headline = wName + ' gewinnt — ' + (RESULT_TEXT[status.type] || '').toLowerCase();
    }
    r.reason = RESULT_TEXT[status.type] || '';
    if (status.type === 'checkmate') {
      r.reason = 'Schachmatt — der König kann dem Angriff nicht mehr entkommen.';
    }
    return r;
  }

  /* ---------- 11) Dialoge -------------------------------------------------- */
  function openModal(html, onMount) {
    el['modal-card'].innerHTML = html;
    el['modal-root'].hidden = false;
    if (onMount) onMount(el['modal-card']);
    var first = el['modal-card'].querySelector('.btn-primary, button');
    if (first) first.focus();
  }
  function closeModal() {
    el['modal-root'].hidden = true;
    el['modal-card'].innerHTML = '';
  }

  function showNewGameDialog() {
    var draft = {
      mode: state.mode,
      level: state.level,
      color: state.mode === 'ai' ? (state.humanColor === WHITE ? 'w' : 'b') : 'w',
      time: state.timeControl.key
    };

    openModal(renderNewGame(draft), function (card) {
      card.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-set]');
        if (btn) {
          var parts = btn.dataset.set.split(':');
          var key = parts[0], value = parts.slice(1).join(':');
          draft[key] = key === 'level' ? +value : value;
          card.innerHTML = renderNewGame(draft);
          return;
        }
        if (ev.target.closest('#ng-start')) {
          closeModal();
          startGame(draft);
        }
        if (ev.target.closest('#ng-cancel')) closeModal();
      });
    });
  }

  function renderNewGame(d) {
    var levels = AI.LEVELS.map(function (lv) {
      return '<button class="choice' + (d.level === lv.id && d.mode === 'ai' ? ' selected' : '') +
             '" data-set="level:' + lv.id + '">' +
             '<span class="choice-title">' + lv.name +
             '<span class="choice-badge">' + lv.elo + '</span></span>' +
             '<span class="choice-desc">' + lv.hint + '</span></button>';
    }).join('');

    var colors = [
      ['w', 'Weiß', 'k'], ['b', 'Schwarz', 'k'], ['r', 'Zufall', 'q']
    ].map(function (c) {
      var icon = c[0] === 'r'
        ? '<svg viewBox="0 0 45 45" class="cc-white" style="opacity:.75"><use href="#pc-q"/></svg>'
        : pieceIcon('k', c[0]);
      return '<button class="choice color-choice' + (d.color === c[0] ? ' selected' : '') +
             '" data-set="color:' + c[0] + '">' + icon +
             '<span class="choice-title">' + c[1] + '</span></button>';
    }).join('');

    var times = TIME_CONTROLS.map(function (t) {
      return '<button class="chip' + (d.time === t.key ? ' selected' : '') +
             '" data-set="time:' + t.key + '">' + t.label + '</button>';
    }).join('');

    return '' +
      '<h2 class="modal-title">Neue Partie</h2>' +
      '<p class="modal-sub">Alles läuft lokal auf diesem Gerät — es wird nichts hochgeladen.</p>' +

      '<div class="field"><span class="field-label">Spielmodus</span>' +
        '<div class="choice-grid cols-2">' +
          '<button class="choice' + (d.mode === 'ai' ? ' selected' : '') + '" data-set="mode:ai">' +
            '<span class="choice-title">Gegen den Computer</span>' +
            '<span class="choice-desc">Vier Stufen vom Anfänger bis zum Meister.</span></button>' +
          '<button class="choice' + (d.mode === 'human' ? ' selected' : '') + '" data-set="mode:human">' +
            '<span class="choice-title">Zu zweit</span>' +
            '<span class="choice-desc">Abwechselnd an einem Gerät spielen.</span></button>' +
        '</div></div>' +

      (d.mode === 'ai'
        ? '<div class="field"><span class="field-label">Schwierigkeit</span>' +
          '<div class="choice-grid">' + levels + '</div></div>' +
          '<div class="field"><span class="field-label">Deine Farbe</span>' +
          '<div class="choice-grid cols-3">' + colors + '</div></div>'
        : '') +

      '<div class="field"><span class="field-label">Bedenkzeit</span>' +
        '<div class="chip-row">' + times + '</div></div>' +

      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" id="ng-cancel">Abbrechen</button>' +
        '<button class="btn btn-primary" id="ng-start">Partie starten</button>' +
      '</div>';
  }

  function showSettingsDialog() {
    var themes = [
      ['walnuss', 'Walnuss'], ['smaragd', 'Smaragd'],
      ['marmor', 'Marmor'], ['nacht', 'Nacht']
    ];
    var rows = [
      ['sound', 'Klänge', 'Zug-, Schlag- und Schachgeräusche.'],
      ['animations', 'Animationen', 'Figuren gleiten zu ihrem Zielfeld.'],
      ['showHints', 'Zugmarkierungen', 'Punkte auf allen erlaubten Zielfeldern.'],
      ['showCoords', 'Koordinaten', 'Linien- und Reihenbezeichnung am Brettrand.'],
      ['showEval', 'Bewertungsleiste', 'Zeigt an, wer gerade besser steht.']
    ];

    openModal(
      '<h2 class="modal-title">Einstellungen</h2>' +
      '<p class="modal-sub">Wird auf diesem Gerät gespeichert.</p>' +
      '<div class="field"><span class="field-label">Brett</span><div class="chip-row">' +
        themes.map(function (t) {
          return '<button class="chip' + (state.settings.boardTheme === t[0] ? ' selected' : '') +
                 '" data-theme="' + t[0] + '">' + t[1] + '</button>';
        }).join('') +
      '</div></div>' +
      '<div class="field">' + rows.map(function (r) {
        return '<div class="toggle-row"><span class="toggle-text"><b>' + r[1] + '</b><span>' +
               r[2] + '</span></span>' +
               '<button class="switch' + (state.settings[r[0]] ? ' on' : '') +
               '" data-toggle="' + r[0] + '" role="switch" aria-checked="' +
               (state.settings[r[0]] ? 'true' : 'false') + '" aria-label="' + r[1] + '"></button></div>';
      }).join('') + '</div>' +
      '<div class="modal-actions"><button class="btn btn-primary" id="set-close">Fertig</button></div>',
      function (card) {
        card.addEventListener('click', function (ev) {
          var th = ev.target.closest('[data-theme]');
          if (th) {
            state.settings.boardTheme = th.dataset.theme;
            applySettings(); saveSettings();
            card.querySelectorAll('[data-theme]').forEach(function (b) {
              b.classList.toggle('selected', b.dataset.theme === th.dataset.theme);
            });
            return;
          }
          var tg = ev.target.closest('[data-toggle]');
          if (tg) {
            var k = tg.dataset.toggle;
            state.settings[k] = !state.settings[k];
            tg.classList.toggle('on', state.settings[k]);
            tg.setAttribute('aria-checked', state.settings[k] ? 'true' : 'false');
            applySettings(); saveSettings();
            return;
          }
          if (ev.target.closest('#set-close')) closeModal();
        });
      }
    );
  }

  function showResultDialog() {
    var r = state.result;
    if (!r) return;
    var icon = r.tone === 'win' ? ICONS.trophy : r.tone === 'lose' ? ICONS.lost : ICONS.handshake;

    openModal(
      '<div class="result-head">' +
        '<div class="result-icon ' + r.tone + '">' + icon + '</div>' +
        '<h2 class="result-title">' + escapeHtml(r.title) + '</h2>' +
        '<p class="result-reason">' + escapeHtml(r.reason) + '</p>' +
        '<span class="result-score">' + r.score + '</span>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" id="res-review">Partie ansehen</button>' +
        '<button class="btn btn-ghost" id="res-share">PGN</button>' +
        '<button class="btn btn-primary" id="res-again">Nochmal</button>' +
      '</div>',
      function (card) {
        card.addEventListener('click', function (ev) {
          if (ev.target.closest('#res-review')) { closeModal(); goToPly(0); }
          if (ev.target.closest('#res-share')) { closeModal(); showShareDialog(); }
          if (ev.target.closest('#res-again')) { closeModal(); showNewGameDialog(); }
        });
      }
    );
  }

  function showShareDialog() {
    var pgn = buildPgn();
    var fen = state.pos.getFen();

    openModal(
      '<h2 class="modal-title">Partie sichern &amp; laden</h2>' +
      '<p class="modal-sub">PGN gibt die ganze Partie wieder, FEN nur die aktuelle Stellung.</p>' +
      '<div class="field"><span class="field-label">PGN</span>' +
        '<textarea class="codebox" id="sh-pgn" rows="7" readonly>' + escapeHtml(pgn) + '</textarea>' +
        '<div class="modal-actions" style="margin-top:10px">' +
          '<button class="btn btn-ghost" id="sh-copy-pgn">Kopieren</button>' +
          '<button class="btn btn-ghost" id="sh-dl">Herunterladen</button>' +
        '</div></div>' +
      '<div class="field"><span class="field-label">FEN — Stellung laden oder kopieren</span>' +
        '<textarea class="codebox" id="sh-fen" rows="2">' + escapeHtml(fen) + '</textarea>' +
        '<div class="modal-actions" style="margin-top:10px">' +
          '<button class="btn btn-ghost" id="sh-copy-fen">Kopieren</button>' +
          '<button class="btn btn-ghost" id="sh-load">Stellung laden</button>' +
        '</div></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" id="sh-close">Schließen</button></div>',
      function (card) {
        card.addEventListener('click', function (ev) {
          if (ev.target.closest('#sh-copy-pgn')) copyText(pgn, 'PGN kopiert.');
          if (ev.target.closest('#sh-copy-fen')) copyText($('sh-fen').value.trim(), 'FEN kopiert.');
          if (ev.target.closest('#sh-dl')) downloadPgn(pgn);
          if (ev.target.closest('#sh-close')) closeModal();
          if (ev.target.closest('#sh-load')) {
            var v = $('sh-fen').value.trim();
            try {
              var test = new C.Position(v);
              closeModal();
              startGame({ mode: state.mode, level: state.level,
                          color: state.humanColor === WHITE ? 'w' : 'b',
                          time: state.timeControl.key, fen: test.getFen() });
              toast('Stellung geladen.');
            } catch (e) {
              toast('Diese FEN konnte ich nicht lesen: ' + e.message);
            }
          }
        });
      }
    );
  }

  function showResignDialog() {
    var side = state.pos.turn === WHITE ? 'Weiß' : 'Schwarz';
    var who = state.mode === 'ai' ? 'Möchtest du wirklich aufgeben?'
                                  : side + ' ist am Zug. Aufgeben oder Remis vereinbaren?';
    openModal(
      '<h2 class="modal-title">Partie beenden</h2>' +
      '<p class="modal-sub">' + escapeHtml(who) + '</p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" id="rs-cancel">Weiterspielen</button>' +
        '<button class="btn btn-ghost" id="rs-draw">Remis</button>' +
        '<button class="btn btn-primary" id="rs-resign">Aufgeben</button>' +
      '</div>',
      function (card) {
        card.addEventListener('click', function (ev) {
          if (ev.target.closest('#rs-cancel')) closeModal();
          if (ev.target.closest('#rs-draw')) {
            closeModal();
            finishGame({ over: true, type: 'agreed', winner: null });
          }
          if (ev.target.closest('#rs-resign')) {
            closeModal();
            var loser = state.mode === 'ai' ? state.humanColor : state.pos.turn;
            finishGame({ over: true, type: 'resign', winner: loser === WHITE ? BLACK : WHITE });
          }
        });
      }
    );
  }

  /* ---------- PGN ---------------------------------------------------------- */
  function buildPgn() {
    var d = new Date();
    var date = d.getFullYear() + '.' +
               String(d.getMonth() + 1).padStart(2, '0') + '.' +
               String(d.getDate()).padStart(2, '0');
    var result = '*';
    if (state.result) {
      result = state.result.winner === null ? '1/2-1/2'
             : state.result.winner === WHITE ? '1-0' : '0-1';
    }

    var white = state.mode === 'human' ? 'Spieler 1'
              : (state.humanColor === WHITE ? 'Mensch' : 'Schach-KI (' + AI.getLevel(state.level).name + ')');
    var black = state.mode === 'human' ? 'Spieler 2'
              : (state.humanColor === BLACK ? 'Mensch' : 'Schach-KI (' + AI.getLevel(state.level).name + ')');

    var head = [
      '[Event "Freie Partie"]',
      '[Site "Schach — lokal im Browser"]',
      '[Date "' + date + '"]',
      '[Round "-"]',
      '[White "' + white + '"]',
      '[Black "' + black + '"]',
      '[Result "' + result + '"]'
    ];
    if (state.timeControl.base > 0) {
      head.push('[TimeControl "' + state.timeControl.base + '+' + state.timeControl.inc + '"]');
    }
    if (state.startFen !== C.START_FEN) {
      head.push('[SetUp "1"]', '[FEN "' + state.startFen + '"]');
    }

    var no = state.startMoveNo, blackFirst = state.startTurnBlack;
    var body = [], i = 0;
    if (blackFirst && state.moves.length) { body.push(no + '...'); }
    for (i = 0; i < state.moves.length; i++) {
      var isWhiteMove = blackFirst ? (i % 2 === 1) : (i % 2 === 0);
      if (isWhiteMove) body.push(no + '.');
      body.push(state.moves[i].san);
      if (!isWhiteMove) no++;
    }
    body.push(result);

    /* Auf 80 Zeichen umbrechen, wie es die PGN-Norm vorsieht */
    var line = '', out = [];
    body.forEach(function (tok) {
      if ((line + ' ' + tok).trim().length > 80) { out.push(line.trim()); line = ''; }
      line += (line ? ' ' : '') + tok;
    });
    if (line.trim()) out.push(line.trim());

    return head.join('\n') + '\n\n' + out.join('\n') + '\n';
  }

  function downloadPgn(pgn) {
    try {
      var blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'partie-' + new Date().toISOString().slice(0, 10) + '.pgn';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('PGN heruntergeladen.');
    } catch (e) {
      toast('Download nicht möglich — bitte den Text kopieren.');
    }
  }

  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); },
                                              function () { toast('Kopieren nicht erlaubt.'); });
    } else {
      toast('Kopieren wird hier nicht unterstützt — bitte manuell markieren.');
    }
  }

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2600);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* ---------- 12) Partie starten & speichern ------------------------------- */
  function startGame(cfg) {
    state.gameId++;
    stopClock();
    closePromotion();
    clearHintMark();

    state.mode = cfg.mode || 'ai';
    state.level = cfg.level || state.level;
    state.startFen = cfg.fen || C.START_FEN;
    state.pos = new C.Position(state.startFen);
    state.startTurnBlack = state.pos.turn === BLACK;
    state.startMoveNo = state.pos.fullmove;
    state.moves = [];
    state.viewPly = 0;
    state.viewPos = null;
    state.result = null;
    state.thinking = false;
    state.started = true;
    state.selected = -1;
    state.targets = [];

    var color = cfg.color || 'w';
    if (color === 'r') color = Math.random() < 0.5 ? 'w' : 'b';
    state.humanColor = color === 'w' ? WHITE : BLACK;
    state.orientation = state.mode === 'ai' ? (state.humanColor === WHITE ? 'w' : 'b') : 'w';

    var tc = TIME_CONTROLS.filter(function (t) { return t.key === (cfg.time || 'none'); })[0]
             || TIME_CONTROLS[0];
    state.timeControl = tc;
    state.clock = { w: tc.base * 1000, b: tc.base * 1000, running: false, last: 0,
                    timer: null, lowWarned: { w: false, b: false } };

    AI.ttClear();
    el['engine-note'].textContent = '';
    el['modal-card'].innerHTML = '';

    el['mode-label'].textContent = state.mode === 'ai'
      ? 'Gegen ' + AI.getLevel(state.level).name
      : 'Zwei Spieler';

    layoutSquares();
    el.pieces.innerHTML = '';
    pieceEls = {};
    reconcilePieces(state.pos);
    repositionAll();
    render({ skipPieces: true });
    renderClocks();
    updateOpeningTag();
    saveGame();

    if (cfg.skipAi) return;
    if (tc.base > 0) startClock();
    scheduleAi();
  }

  function updateOpeningTag() {
    var tag = el['opening-tag'];
    if (!BOOK || !state.moves.length) { tag.hidden = true; return; }
    var name = BOOK.nameFor(state.moves.map(function (m) { return m.san; }));
    if (!name) { tag.hidden = true; return; }
    tag.textContent = name;
    tag.hidden = false;
  }

  var SAVE_KEY = 'schach.partie.v1';
  var SETTINGS_KEY = 'schach.einstellungen.v1';

  function saveGame() {
    if (!state.started) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        startFen: state.startFen,
        sans: state.moves.map(function (m) { return m.san; }),
        mode: state.mode,
        level: state.level,
        humanColor: state.humanColor === WHITE ? 'w' : 'b',
        orientation: state.orientation,
        time: state.timeControl.key,
        clock: { w: state.clock.w, b: state.clock.b },
        result: state.result ? { type: state.result.type, winner: state.result.winner } : null,
        savedAt: Date.now()
      }));
    } catch (e) { /* Speicher voll oder gesperrt — Spiel laeuft trotzdem */ }
  }

  function loadSavedGame() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.sans || !s.sans.length || s.result) return null;
      return s;
    } catch (e) { return null; }
  }

  function resumeGame(s) {
    startGame({
      mode: s.mode, level: s.level, color: s.humanColor,
      time: s.time, fen: s.startFen, skipAi: true
    });

    for (var i = 0; i < s.sans.length; i++) {
      var mv = state.pos.sanToMove(s.sans[i]);
      if (!mv) break;
      var san = state.pos.moveToSan(mv);
      state.pos.makeMove(mv);
      state.moves.push({ move: mv, san: san, clockBefore: { w: state.clock.w, b: state.clock.b }, book: false });
    }
    state.viewPly = state.moves.length;
    state.orientation = s.orientation || state.orientation;
    if (s.clock) { state.clock.w = s.clock.w; state.clock.b = s.clock.b; }

    layoutSquares();
    el.pieces.innerHTML = '';
    pieceEls = {};
    reconcilePieces(state.pos);
    repositionAll();
    render({ skipPieces: true });
    renderClocks();
    updateOpeningTag();

    var status = state.pos.getStatus();
    if (status.over) { finishGame(status); return; }
    if (state.timeControl.base > 0) startClock();
    scheduleAi();
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (e) {}
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) Object.assign(state.settings, JSON.parse(raw));
    } catch (e) {}
  }

  function applySettings() {
    document.body.dataset.boardTheme = state.settings.boardTheme;
    document.body.classList.toggle('no-coords', !state.settings.showCoords);
    document.body.classList.toggle('no-hints', !state.settings.showHints);
    document.body.classList.toggle('no-anim', !state.settings.animations);
    SND.setEnabled(state.settings.sound);
    el['btn-sound'].innerHTML = state.settings.sound ? ICONS.soundOn : ICONS.soundOff;
    el['btn-sound'].classList.toggle('is-off', !state.settings.sound);
    updateEvalBar();
  }

  /* ---------- Aufbau ------------------------------------------------------- */
  function bindEvents() {
    el.board.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    el['btn-new'].onclick = showNewGameDialog;
    el['btn-settings'].onclick = showSettingsDialog;
    el['btn-sound'].onclick = function () {
      state.settings.sound = !state.settings.sound;
      applySettings(); saveSettings();
      if (state.settings.sound) { SND.unlock(); SND.play('move'); }
    };
    el['btn-flip'].onclick = flipBoard;

    el['act-undo'].onclick = undoMove;
    el['act-hint'].onclick = showHint;
    el['act-resign'].onclick = showResignDialog;
    el['act-share'].onclick = showShareDialog;

    el['nav-start'].onclick = function () { goToPly(0); };
    el['nav-prev'].onclick = function () { goToPly(state.viewPly - 1); };
    el['nav-next'].onclick = function () { goToPly(state.viewPly + 1); };
    el['nav-end'].onclick = function () { goToPly(state.moves.length); };

    el['movelist-body'].addEventListener('click', function (ev) {
      var b = ev.target.closest('.mv');
      if (b) goToPly(+b.dataset.ply);
    });

    el['modal-backdrop'].onclick = function () {
      /* Der Startdialog der ersten Partie bleibt offen */
      if (!state.started) return;
      closeModal();
    };

    document.addEventListener('keydown', function (ev) {
      if (ev.target.matches('input, textarea')) return;
      if (ev.key === 'Escape') { closeModal(); closePromotion(); clearSelection(); return; }
      if (!el['modal-root'].hidden) return;
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); goToPly(state.viewPly - 1); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); goToPly(state.viewPly + 1); }
      else if (ev.key === 'Home') { ev.preventDefault(); goToPly(0); }
      else if (ev.key === 'End') { ev.preventDefault(); goToPly(state.moves.length); }
      else if (ev.key === 'f' || ev.key === 'F') flipBoard();
      else if (ev.key === 'u' || ev.key === 'U') { if (!el['act-undo'].disabled) undoMove(); }
      else if (ev.key === 'h' || ev.key === 'H') { if (!el['act-hint'].disabled) showHint(); }
      else if (ev.key === 'n' || ev.key === 'N') showNewGameDialog();
    });

    window.addEventListener('resize', function () { repositionAll(); });
  }

  function flipBoard() {
    state.orientation = state.orientation === 'w' ? 'b' : 'w';
    layoutSquares();
    repositionAll();
    render({ skipPieces: true });
    renderClocks();
  }

  function fillStaticIcons() {
    el['btn-flip'].innerHTML = ICONS.flip;
    el['btn-settings'].innerHTML = ICONS.gear;
    document.querySelectorAll('.action-icon[data-icon]').forEach(function (n) {
      n.innerHTML = ICONS[n.dataset.icon] || '';
    });
  }

  function showWelcome() {
    var saved = loadSavedGame();
    if (!saved) { showNewGameDialog(); return; }

    var when = new Date(saved.savedAt || Date.now());
    var desc = saved.mode === 'ai'
      ? 'Gegen ' + AI.getLevel(saved.level).name
      : 'Zwei Spieler';
    openModal(
      '<h2 class="modal-title">Willkommen zurück</h2>' +
      '<p class="modal-sub">Es liegt noch eine unbeendete Partie vor: <strong>' +
        escapeHtml(desc) + '</strong>, ' + saved.sans.length + ' Halbzüge, zuletzt gespielt am ' +
        when.toLocaleDateString('de-DE') + '.</p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" id="wc-new">Neue Partie</button>' +
        '<button class="btn btn-primary" id="wc-resume">Fortsetzen</button>' +
      '</div>',
      function (card) {
        card.addEventListener('click', function (ev) {
          if (ev.target.closest('#wc-resume')) { closeModal(); resumeGame(saved); }
          if (ev.target.closest('#wc-new')) { closeModal(); showNewGameDialog(); }
        });
      }
    );
  }

  function init() {
    cacheDom();
    PIECES.installSprite(document);
    buildSquares();
    fillStaticIcons();
    loadSettings();
    applySettings();
    bindEvents();
    render();
    showWelcome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Fuer Tests im Browser zugaenglich machen */
  window.SchachApp = {
    state: state, startGame: startGame, goToPly: goToPly,
    buildPgn: buildPgn, playMove: playMove, undoMove: undoMove
  };
})();
