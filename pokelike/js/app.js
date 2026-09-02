/* =============================================================================
 * app.js — Spielsteuerung und Bildschirme
 * -----------------------------------------------------------------------------
 * Verbindet Run-Logik (run.js), Kampf-Engine (battle.js) und Oberfläche
 * (ui.js). Ein einziger Zustand, ein einziger Renderpfad: show(name) baut den
 * jeweiligen Bildschirm neu auf.
 *
 * Gliederung:  1) Zustand und Rahmen     2) Titel und neuer Run
 *              3) Karte                  4) Kampf
 *              5) Szenen                 6) Team
 *              7) Pokédex und Statistik  8) Ende und Start
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL;
  var U = PL.ui, dex = PL.dex, mons = PL.mon, T = PL.t, meta = PL.meta;
  var el = U.el, clear = U.clear, $ = U.$;
  var doc = root.document;

  var App = {
    run: null,
    screen: 'title',
    battle: null,
    autoPlay: false,
    speeds: { sofort: 0, schnell: 180, normal: 420, langsam: 820 }
  };

  /* ---------- 1) Zustand und Rahmen -------------------------------------------- */

  function settings() { return meta.settings(); }
  function delayMs() { return App.speeds[settings().speed] !== undefined ? App.speeds[settings().speed] : 420; }

  function applyTheme() {
    // 'auto' überlässt die Entscheidung der Umgebung: erst der Seite, in der
    // das Spiel steckt, sonst dem Betriebssystem.
    var theme = settings().theme;
    if (theme === 'light' || theme === 'dark') doc.documentElement.setAttribute('data-app-theme', theme);
    else doc.documentElement.removeAttribute('data-app-theme');
    T.setLang(settings().lang);
  }

  function autosave() {
    if (App.run && App.run.state !== 'gameover' && App.run.state !== 'victory') meta.saveRun(App.run);
  }

  var SCREENS = {};

  function show(name, arg) {
    App.screen = name;
    var host = $('#screen');
    clear(host);
    doc.body.setAttribute('data-screen', name);
    var view = SCREENS[name];
    if (!view) { host.appendChild(el('p', { text: 'Unbekannter Bildschirm: ' + name })); return; }
    host.appendChild(view(arg));
    renderHeader();
    host.scrollTop = 0;
  }
  App.show = show;

  function renderHeader() {
    var head = $('#topbar');
    clear(head);
    var run = App.run;
    var left = el('div', { className: 'topbar-left' }, [
      el('button', {
        className: 'logo', type: 'button', title: 'Zum Hauptmenü',
        onclick: function () { openMenu(); }
      }, [el('span', { className: 'logo-ball' }), el('span', { text: 'Pokélike' })])
    ]);

    var mid = el('div', { className: 'topbar-mid' });
    if (run && App.screen !== 'title' && App.screen !== 'newrun') {
      var region = run.leagueStage >= 0 ? { name: 'Pokémon-Liga', color: '#c9a227' } : run.currentRegion();
      mid.appendChild(el('span', { className: 'region-badge', style: { borderColor: region.color }, text: region.name }));
      mid.appendChild(el('span', { className: 'chip', text: '👑 ' + (run.leagueStage >= 0 ? 'Finale' : 'Region ' + (run.region + 1) + '/' + (run.mode === 'endlos' ? '∞' : run.totalRegions())) }));
      mid.appendChild(el('span', { className: 'chip', text: '💰 ' + U.money(run.money) }));
      mid.appendChild(el('span', { className: 'chip', title: 'Höchstes erreichbares Level', text: '⬆ Lv ' + run.levelCap }));
      if (run.ascension) mid.appendChild(el('span', { className: 'chip warn', text: '🔥 Aufstieg ' + run.ascension }));
      if (run.nuzlocke) mid.appendChild(el('span', { className: 'chip warn', text: '💀 Nuzlocke' }));
    }

    var right = el('div', { className: 'topbar-right' });
    if (run && App.screen !== 'title' && App.screen !== 'newrun') {
      right.appendChild(iconBtn('👥', 'Team', function () { show('team'); }));
      right.appendChild(iconBtn('🎒', 'Beutel', function () { openBag(); }));
      right.appendChild(iconBtn('🏛️', 'Relikte', function () { openRelics(); }));
    }
    right.appendChild(iconBtn('☰', 'Menü', function () { openMenu(); }));

    head.appendChild(left);
    head.appendChild(mid);
    head.appendChild(right);
  }

  function iconBtn(icon, title, onClick) {
    return el('button', { className: 'icon-btn', type: 'button', title: title, onclick: onClick }, [
      el('span', { text: icon }), el('span', { className: 'icon-label', text: title })
    ]);
  }

  function partyStrip(opts) {
    opts = opts || {};
    var run = App.run;
    return el('div', { className: 'party-strip' }, run.party.map(function (mon, i) {
      return U.monCard(mon, {
        onClick: function () { openMonSheet(i); },
        badge: opts.badges ? opts.badges[i] : null
      });
    }).concat(run.party.length < 6 ? [el('div', { className: 'mon-card empty', text: 'Platz frei' })] : []));
  }

  /* ---------- 2) Titel und neuer Run --------------------------------------------- */

  SCREENS.title = function () {
    var m = meta.load();
    var d = meta.dexStats();
    var wrap = el('div', { className: 'title-screen' }, [
      el('div', { className: 'title-hero' }, [
        el('h1', { className: 'game-title' }, [
          el('span', { className: 'title-poke', text: 'Poké' }),
          el('span', { className: 'title-like', text: 'like' }),
          el('span', { className: 'title-plus', text: '+' })
        ]),
        el('p', { className: 'tagline', text: 'Ein Roguelike durch neun Generationen. Ein Team, ein Weg, kein Zurück.' })
      ]),
      el('div', { className: 'title-actions' }, [
        meta.hasRun() ? el('button', {
          className: 'btn big primary', type: 'button',
          onclick: function () { continueRun(); }
        }, '▶ Run fortsetzen') : null,
        el('button', {
          className: 'btn big' + (meta.hasRun() ? '' : ' primary'), type: 'button',
          onclick: function () {
            if (meta.hasRun()) {
              U.confirm('Der laufende Run wird dabei gelöscht. Wirklich neu anfangen?', function () { show('newrun'); }, { danger: true });
            } else show('newrun');
          }
        }, '✦ Neuer Run'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('dex'); } }, '📖 Pokédex'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('stats'); } }, '📊 Statistik'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('settings'); } }, '⚙ Einstellungen')
      ]),
      el('div', { className: 'title-stats' }, [
        stat('Runs', m.runs), stat('Siege', m.wins),
        stat('Pokédex', d.caught + ' / ' + d.total),
        stat('Schillernde', d.shinies),
        stat('Beste Region', m.bestRegion + 1)
      ]),
      !meta.available() ? el('p', { className: 'warn-note', text: 'Hinweis: Dieser Browser erlaubt kein Speichern — der Fortschritt geht beim Schließen verloren.' }) : null
    ]);
    return wrap;
  };

  function stat(label, value) {
    return el('div', { className: 'stat-tile' }, [
      el('strong', { text: String(value) }), el('span', { text: label })
    ]);
  }

  SCREENS.newrun = function () {
    var chosen = { mode: 'standard', ascension: 0, nuzlocke: false, starter: null };
    var maxAsc = meta.maxAscension();

    var modeBox = el('div', { className: 'choice-row' });
    Object.keys(PL.Run.MODES).forEach(function (key) {
      var mode = PL.Run.MODES[key];
      var btn = el('button', {
        className: 'choice' + (key === chosen.mode ? ' selected' : ''), type: 'button',
        onclick: function () {
          chosen.mode = key;
          Array.prototype.forEach.call(modeBox.children, function (c) { c.classList.remove('selected'); });
          btn.classList.add('selected');
          if (key === 'taeglich') U.toast('Tages-Run: fester Startwert vom ' + new Date().toISOString().slice(0, 10));
        }
      }, [el('strong', { text: mode.name }), el('span', { text: mode.desc })]);
      modeBox.appendChild(btn);
    });

    var ascLabel = el('span', { className: 'asc-value', text: 'Aufstieg 0 — ' + meta.ASCENSIONS[0] });
    var ascInput = el('input', {
      type: 'range', min: 0, max: Math.max(0, maxAsc), value: 0, className: 'slider',
      oninput: function () {
        chosen.ascension = +ascInput.value;
        ascLabel.textContent = 'Aufstieg ' + chosen.ascension + ' — ' + meta.ASCENSIONS[chosen.ascension];
      }
    });

    var nuzBtn = el('button', {
      className: 'toggle', type: 'button',
      onclick: function () {
        chosen.nuzlocke = !chosen.nuzlocke;
        nuzBtn.classList.toggle('on', chosen.nuzlocke);
        nuzBtn.querySelector('.toggle-state').textContent = chosen.nuzlocke ? 'an' : 'aus';
      }
    }, [
      el('strong', { text: 'Nuzlocke' }),
      el('span', { text: 'Besiegte Pokémon verlassen das Team für immer.' }),
      el('span', { className: 'toggle-state', text: 'aus' })
    ]);

    var startBtn = el('button', {
      className: 'btn big primary', type: 'button', disabled: true,
      onclick: function () { startRun(chosen); }
    }, 'Los geht’s');

    var starterGrid = el('div', { className: 'starter-grid' });
    meta.starters().forEach(function (s) {
      var card = el('button', {
        className: 'starter' + (s.unlocked ? '' : ' locked'), type: 'button',
        disabled: !s.unlocked,
        title: s.unlocked ? (s.special || 'Generation ' + s.gen) : s.needText,
        onclick: function () {
          chosen.starter = s.id;
          Array.prototype.forEach.call(starterGrid.children, function (c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          startBtn.disabled = false;
        }
      }, [
        U.sprite(s.species, { className: 'starter-sprite' }),
        el('span', { className: 'starter-name', text: T.species(s.species) }),
        el('span', { className: 'starter-types' }, s.species.t.map(function (t) { return U.typeChip(t, true); })),
        s.unlocked ? null : el('span', { className: 'lock', text: '🔒' })
      ]);
      starterGrid.appendChild(card);
    });

    return el('div', { className: 'newrun' }, [
      el('h2', { text: 'Neuer Run' }),
      el('section', {}, [el('h3', { text: 'Modus' }), modeBox]),
      el('section', {}, [
        el('h3', { text: 'Schwierigkeit' }),
        el('div', { className: 'asc-box' }, [
          ascInput, ascLabel,
          maxAsc === 0 ? el('span', { className: 'muted', text: 'Höhere Aufstiege schaltest du frei, indem du Runs gewinnst.' }) : null
        ]),
        nuzBtn
      ]),
      el('section', {}, [
        el('h3', { text: 'Startpokémon' }),
        el('p', { className: 'muted', text: 'Dein erster Begleiter. Weitere schaltest du durch Erfolge frei.' }),
        starterGrid
      ]),
      el('div', { className: 'newrun-actions' }, [
        el('button', { className: 'btn', type: 'button', onclick: function () { show('title'); } }, 'Zurück'),
        startBtn
      ])
    ]);
  };

  function startRun(chosen) {
    var seed;
    if (chosen.mode === 'taeglich') seed = PL.util.hashSeed('daily-' + new Date().toISOString().slice(0, 10));
    App.run = new PL.Run({
      mode: chosen.mode, ascension: chosen.ascension, nuzlocke: chosen.nuzlocke,
      starter: chosen.starter, seed: seed
    });
    App.run.party.forEach(function (m) { meta.noteCaught(m); });
    meta.save();
    autosave();
    show('map');
  }

  function continueRun() {
    var run = meta.loadRun();
    if (!run) { U.toast('Kein gespeicherter Run gefunden.', 'bad'); return; }
    App.run = run;
    // Ein unterbrochener Knoten wird neu betreten — nichts wird übersprungen.
    if (run.pendingNode) {
      var scene = run.enterNode(run.pendingNode.row, run.pendingNode.col, true);
      if (scene) {
        U.toast('Der unterbrochene Knoten wird neu ausgespielt.');
        openScene(scene);
        return;
      }
    }
    show('map');
  }

  /* ---------- 3) Karte ------------------------------------------------------------ */

  SCREENS.map = function () {
    var run = App.run;
    if (!run) { return el('p', { text: 'Kein Run aktiv.' }); }
    if (run.state === 'gameover' || run.state === 'victory') return SCREENS.end();

    var region = run.leagueStage >= 0
      ? { name: 'Pokémon-Liga', motto: 'Vier Meister und der Champ.', color: '#c9a227' }
      : run.currentRegion();
    var available = run.available();
    var openSet = {};
    available.forEach(function (a) { openSet[a.row + ':' + a.col] = true; });

    var rowsWrap = el('div', { className: 'map-rows' });
    var nodeEls = {};
    for (var r = run.map.length - 1; r >= 0; r--) {
      var row = run.map[r];
      var rowEl = el('div', { className: 'map-row' + (r === run.rowIndex ? ' current' : '') });
      row.forEach(function (node) {
        var info = PL.Run.NODE_INFO[node.type] || { name: node.type, icon: '?' };
        var isOpen = openSet[node.row + ':' + node.col];
        var isHere = run.pos && run.pos.row === node.row && run.pos.col === node.col;
        var btn = el('button', {
          className: 'map-node t-' + node.type + (isOpen ? ' open' : '') + (isHere ? ' here' : '') +
            (node.done ? ' done' : ''),
          type: 'button', disabled: !isOpen,
          title: info.name + ' — ' + info.desc,
          onclick: function () { enterNode(node.row, node.col); }
        }, [
          el('span', { className: 'node-badge' }, el('span', { className: 'node-icon', text: info.icon })),
          el('span', { className: 'node-name', text: info.name })
        ]);
        nodeEls[node.row + ':' + node.col] = btn;
        rowEl.appendChild(btn);
      });
      rowsWrap.appendChild(rowEl);
    }

    // Kulisse der Region hinter die Route legen
    var stage = el('div', { className: 'map-stage' });
    if (PL.scenery) {
      var list = PL.scenery.regionBiomes[region.id];
      PL.scenery.render(stage, run.leagueStage >= 0 ? 'liga' : (list ? list[0] : 'wiese'),
        { tiled: true, particles: false });
    }

    // Verbindungen als SVG hinterlegen, sobald die Knoten ihre Plätze haben.
    var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map-links');
    stage.appendChild(svg);
    stage.appendChild(rowsWrap);
    root.requestAnimationFrame(function () { drawLinks(run, rowsWrap, svg, nodeEls); });

    return el('div', { className: 'map-screen' }, [
      el('div', { className: 'region-header', style: { '--region-color': region.color } }, [
        el('h2', { text: region.name }),
        el('p', { className: 'muted', text: region.motto || '' }),
        el('div', { className: 'region-progress' }, [
          el('span', { text: 'Route ' + Math.max(0, run.rowIndex + 1) + ' / ' + run.map.length }),
          run.leagueStage < 0 ? el('span', { text: 'Nur ein Weg führt zum Arenaleiter.' }) : null
        ])
      ]),
      stage,
      el('h3', { className: 'section-label', text: 'Dein Team' }),
      partyStrip()
    ]);
  };

  /** Zeichnet die Wege zwischen den Knoten. */
  function drawLinks(run, wrap, svg, nodeEls) {
    var box = svg.parentNode.getBoundingClientRect();
    if (!box.width) return;
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    function centre(node) {
      var e = nodeEls[node.row + ':' + node.col];
      if (!e) return null;
      var r = e.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, top: r.top - box.top, bottom: r.bottom - box.top };
    }

    run.map.forEach(function (row) {
      row.forEach(function (node) {
        var from = centre(node);
        if (!from || !node.next) return;
        node.next.forEach(function (col) {
          var target = run.map[node.row + 1] && run.map[node.row + 1][col];
          if (!target) return;
          var to = centre(target);
          if (!to) return;
          // Die spätere Reihe liegt weiter oben: von der Oberkante zur Unterkante
          var y1 = from.top, y2 = to.bottom;
          var path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
          var midY = (y1 + y2) / 2;
          path.setAttribute('d', 'M' + from.x + ' ' + y1 + ' C' + from.x + ' ' + midY +
            ' ' + to.x + ' ' + midY + ' ' + to.x + ' ' + y2);
          var live = run.pos && run.pos.row === node.row && run.pos.col === node.col;
          var walked = node.done && target.done;
          path.setAttribute('class', 'map-link' + (live ? ' live' : '') + (walked ? ' walked' : ''));
          svg.appendChild(path);
        });
      });
    });
  }

  function enterNode(row, col) {
    var run = App.run;
    var scene = run.enterNode(row, col);
    if (!scene) return;
    autosave();
    openScene(scene);
  }

  function openScene(scene) {
    switch (scene.kind) {
      case 'battle': startBattle(scene.battle); break;
      case 'catch': show('scene', { type: 'catch', scene: scene }); break;
      case 'item': show('scene', { type: 'item', scene: scene }); break;
      case 'relic': show('scene', { type: 'relic', scene: scene }); break;
      case 'shop': show('scene', { type: 'shop', scene: scene }); break;
      case 'event': show('scene', { type: 'event', scene: scene }); break;
      case 'rest': show('scene', { type: 'rest', scene: scene }); break;
      default: backToMap();
    }
  }

  function backToMap() {
    var run = App.run;
    var before = run.region;
    run.closeScene();
    if (run.state === 'victory' || run.state === 'gameover') { finishRun(); return; }
    if (run.region !== before) {
      U.toast(run.leagueStage >= 0 ? 'Die Pokémon-Liga öffnet ihre Tore!' : 'Neue Region: ' + run.currentRegion().name);
    }
    autosave();
    show('map');
  }
  App.backToMap = backToMap;

  /* ---------- 4) Kampf ------------------------------------------------------------ */

  var BV = null;   // laufende Kampfansicht

  function startBattle(bt) {
    App.battle = bt;
    bt.start();
    bt.sides[0].team.forEach(function (m) { m.seen = 1; });
    bt.sides[1].team.forEach(function (m) { meta.noteSeen(m.sp); });
    meta.save();
    show('battle');
  }

  SCREENS.battle = function () {
    var bt = App.battle;
    var wrap = el('div', { className: 'battle' });

    var stage = el('div', { className: 'battle-stage' });
    var scene = PL.scenery ? PL.scenery.get(bt.biome || 'wiese') : null;
    function platform(w, h) {
      if (!PL.scenery) return el('div', { className: 'platform' });
      return el('img', {
        className: 'platform', alt: '',
        src: PL.scenery.platform(w, h, scene.platform, scene.edge)
      });
    }
    var slots = [
      el('div', { className: 'stage-slot slot-mine' }, platform(44, 13)),
      el('div', { className: 'stage-slot slot-enemy' }, platform(36, 11))
    ];
    var frames = [
      el('div', { className: 'frame-wrap frame-mine' }),
      el('div', { className: 'frame-wrap frame-enemy' })
    ];

    BV = {
      bt: bt,
      slots: slots,
      frames: frames,
      log: el('div', { className: 'battle-log', 'aria-live': 'polite' }),
      controls: el('div', { className: 'battle-controls' }),
      field: el('div', { className: 'field-effects' }),
      stage: stage,
      pendingMega: false,
      busy: false
    };

    stage.appendChild(slots[1]);
    stage.appendChild(slots[0]);
    stage.appendChild(frames[1]);
    stage.appendChild(frames[0]);
    stage.appendChild(BV.field);
    if (PL.scenery) PL.scenery.render(stage, bt.biome || 'wiese');

    wrap.appendChild(stage);
    if (App.run && App.run.hasMod('scout') && !bt.wild) wrap.appendChild(scoutPanel(bt));
    BV.moveArea = el('div', { className: 'move-area' });
    BV.actionRow = el('div', { className: 'action-row' });
    wrap.appendChild(BV.log);
    BV.controls.appendChild(BV.moveArea);
    BV.controls.appendChild(BV.actionRow);
    wrap.appendChild(BV.controls);

    renderSide(0);
    renderSide(1);
    renderField();
    playLog(bt.log.slice(), function () { awaitInput(); });
    return wrap;
  };

  /** Typenkompass: zeigt vor dem Kampf, was der Gegner im Ärmel hat. */
  function scoutPanel(bt) {
    return el('div', { className: 'scout' }, [
      el('strong', { text: '🧭 Gegnerisches Team:' })
    ].concat(bt.sides[1].team.map(function (m) {
      var sp = dex.sp(m.sp);
      return el('span', { className: 'scout-mon' + (m.hp <= 0 ? ' out' : '') }, [
        U.sprite(m, { className: 'tiny' }),
        el('span', { text: mons.name(m) + ' Lv' + m.lvl }),
        el('span', {}, sp.t.map(function (t) { return U.typeChip(t, true); }))
      ]);
    })));
  }

  /** Baut eine Kampfseite neu auf: Standplatz und Anzeige. */
  function renderSide(sideId) {
    var bt = App.battle, side = bt.sides[sideId], act = side.active;
    var slot = BV.slots[sideId], frameHost = BV.frames[sideId];
    if (!slot || !frameHost) return;
    // Die Plattform bleibt stehen, nur das Pokémon wird ausgetauscht.
    var oldArt = slot.querySelector('.mon-art');
    if (oldArt) slot.removeChild(oldArt);
    clear(frameHost);
    if (!act) return;

    var mon = act.mon, max = act.stats[0], isMine = sideId === 0;

    var art = el('div', { className: 'mon-art' }, [
      U.sprite(mon, { back: isMine, eager: true, className: 'battle-sprite' + (mon.hp <= 0 ? ' fainted' : '') }),
      mon.shiny ? el('span', { className: 'shiny-mark', text: '✦' }) : null,
      act.vol.substitute ? el('span', { className: 'sub-mark', title: 'Delegator', text: '🪆' }) : null
    ]);
    slot.appendChild(art);

    var bar = U.hpBar(mon.hp, max);
    frameHost.appendChild(el('div', { className: 'mon-frame' }, [
      el('div', { className: 'frame-head' }, [
        el('strong', { text: act.megaName ? act.megaName : mons.name(mon) }),
        U.genderMark(mon.gender),
        el('span', { className: 'lvl', text: 'Lv ' + mon.lvl }),
        act.mega ? el('span', { className: 'mega-mark', title: 'Mega-entwickelt', text: '◈' }) : null
      ]),
      el('div', { className: 'frame-types' }, act.types.map(function (t) { return U.typeChip(t, true); })),
      bar,
      el('div', { className: 'frame-sub' }, [
        el('span', { className: 'hp-num', text: isMine ? mon.hp + ' / ' + max : Math.round(mon.hp / max * 100) + ' %' }),
        U.statusChip(mon.status),
        boostChips(act)
      ]),
      isMine ? U.expBar(mon) : null,
      el('div', { className: 'team-dots' }, side.team.map(function (m) {
        return el('i', {
          className: 'dot' + (m.hp <= 0 ? ' out' : '') + (m === mon ? ' active' : ''),
          title: mons.name(m) + ' — ' + (m.hp <= 0 ? 'besiegt' : m.hp + '/' + mons.maxHP(m) + ' KP')
        });
      }))
    ]));

    BV['bar' + sideId] = bar;
    BV['art' + sideId] = art;
  }

  function boostChips(act) {
    var out = [];
    PL.battleInternals.BOOSTABLE.forEach(function (k) {
      var v = act.boosts[k];
      if (!v) return;
      out.push(el('span', {
        className: 'boost-chip ' + (v > 0 ? 'up' : 'down'),
        text: (k === 'acc' ? 'GEN' : k === 'eva' ? 'FLU' : T.statShort(k)) + ' ' + (v > 0 ? '+' : '') + v
      }));
    });
    return el('span', { className: 'boost-chips' }, out);
  }

  function renderField() {
    var bt = App.battle, f = bt.field;
    clear(BV.field);
    var chips = [];
    if (f.weather) chips.push(el('span', { className: 'field-chip weather', text: '🌤 ' + T.weather(f.weather) + ' (' + f.weatherTurns + ')' }));
    if (f.terrain) chips.push(el('span', { className: 'field-chip terrain', text: '🌐 ' + T.terrain(f.terrain) + ' (' + f.terrainTurns + ')' }));
    if (f.trickroom) chips.push(el('span', { className: 'field-chip', text: '🔄 Bizarroraum (' + f.trickroom + ')' }));
    [0, 1].forEach(function (i) {
      var side = bt.sides[i], label = i === 0 ? 'Du' : 'Gegner', h = side.hazards, s = side.screens;
      if (h.stealthrock) chips.push(hazardChip(label, 'Tarnsteine'));
      if (h.spikes) chips.push(hazardChip(label, 'Stachler ×' + h.spikes));
      if (h.toxicspikes) chips.push(hazardChip(label, 'Giftspitzen ×' + h.toxicspikes));
      if (h.stickyweb) chips.push(hazardChip(label, 'Klebenetz'));
      if (s.reflect) chips.push(hazardChip(label, 'Reflektor (' + s.reflect + ')'));
      if (s.lightscreen) chips.push(hazardChip(label, 'Lichtschild (' + s.lightscreen + ')'));
      if (s.auroraveil) chips.push(hazardChip(label, 'Auroraschleier (' + s.auroraveil + ')'));
      if (s.tailwind) chips.push(hazardChip(label, 'Rückenwind (' + s.tailwind + ')'));
    });
    chips.forEach(function (c) { BV.field.appendChild(c); });
  }

  function hazardChip(who, what) {
    return el('span', { className: 'field-chip hazard', text: (who === 'Du' ? '⬇ ' : '⬆ ') + what });
  }

  /* --- Protokoll abspielen ------------------------------------------------------- */

  var LOG_CLASS = {
    move: 'l-move', damage: '', crit: 'l-crit', super: 'l-super', resist: 'l-resist',
    faint: 'l-faint', switchin: 'l-switch', switchout: 'l-switch', status: 'l-status',
    heal: 'l-heal', boost: 'l-boost', item: 'l-item', ability: 'l-ability', weather: 'l-field',
    field: 'l-field', side: 'l-field', mega: 'l-mega', caught: 'l-caught',
    end: 'l-end', turn: 'l-turn', miss: 'l-miss', immune: 'l-miss', protect: 'l-item',
    ball: 'l-item', ballfail: 'l-miss'
  };

  function pushLine(entry) {
    if (!entry.s) return;
    var line = el('div', { className: 'log-line ' + (LOG_CLASS[entry.k] || ''), text: entry.s });
    BV.log.appendChild(line);
    while (BV.log.children.length > 60) BV.log.removeChild(BV.log.firstChild);
    BV.log.scrollTop = BV.log.scrollHeight;
  }

  /** Spielt Protokolleinträge nacheinander ab und ruft danach done() auf. */
  function playLog(entries, done) {
    var i = 0, speed = delayMs();
    BV.busy = true;
    clear(BV.moveArea);
    BV.moveArea.appendChild(el('div', { className: 'waiting', text: '▾' }));
    renderActions();

    function step() {
      if (!BV || BV.bt !== App.battle) return;          // Ansicht gewechselt
      if (i >= entries.length) {
        BV.busy = false;
        renderSide(0); renderSide(1); renderField();
        if (done) done();
        return;
      }
      var e = entries[i++];
      pushLine(e);
      applyLogVisual(e);
      var wait = speed;
      if (!e.s) wait = Math.min(speed, 90);
      if (e.k === 'turn') wait = Math.min(speed, 140);
      if (e.k === 'faint' || e.k === 'caught' || e.k === 'end') wait = speed * 1.6;
      if (speed === 0) { step(); return; }
      root.setTimeout(step, wait);
    }
    step();
  }

  function applyLogVisual(e) {
    if (e.side === undefined || e.side === null) return;
    var bar = BV['bar' + e.side], art = BV['art' + e.side];
    if (e.k === 'damage' && bar && e.max) {
      bar.setFraction(e.hp, e.max);
      if (art) flash(art, 'hit');
      sfx('hit');
      var num = BV.frames[e.side].querySelector('.hp-num');
      if (num) num.textContent = e.side === 0 ? e.hp + ' / ' + e.max : Math.round(e.hp / e.max * 100) + ' %';
    } else if (e.k === 'heal' && bar && e.max) {
      bar.setFraction(e.hp, e.max);
      sfx('heal');
      var n2 = BV.frames[e.side].querySelector('.hp-num');
      if (n2) n2.textContent = e.side === 0 ? e.hp + ' / ' + e.max : Math.round(e.hp / e.max * 100) + ' %';
    } else if (e.k === 'faint') {
      if (art) flash(art, 'faint');
      sfx('faint');
    } else if (e.k === 'switchin') {
      renderSide(e.side);
    } else if (e.k === 'mega') {
      renderSide(e.side);
      if (BV['art' + e.side]) flash(BV['art' + e.side], 'shine');
      sfx('mega');
    } else if (e.k === 'boost' || e.k === 'status') {
      renderSide(e.side);
    } else if (e.k === 'weather' || e.k === 'field' || e.k === 'side') {
      renderField();
    } else if (e.k === 'move') {
      if (art) flash(art, 'attack');
    }
  }

  function flash(node, kind) {
    node.classList.remove('fx-hit', 'fx-faint', 'fx-attack', 'fx-shine');
    void node.offsetWidth;
    node.classList.add('fx-' + kind);
  }

  /* --- Eingabe -------------------------------------------------------------------- */

  function awaitInput() {
    var bt = App.battle;
    if (!bt) return;
    if (bt.ended) { endBattle(); return; }
    if (bt.pending !== null && bt.pending !== undefined) { askReplacement(); return; }
    if (bt.pendingSelfSwitchSide === 0) { askReplacement(true); return; }
    renderControls();
    if (App.autoPlay) {
      root.setTimeout(function () {
        if (App.autoPlay && !BV.busy && App.battle === bt && !bt.ended) {
          var a = PL.ai.chooseAction(bt, 0, 4, { bag: App.run ? App.run.bag : null });
          if (a.type === 'item' && App.run) App.run.removeItem(a.item, 1);
          BV.pendingMega = false;
          submitAction(a);
        }
      }, Math.max(120, delayMs() * 0.6));
    }
  }

  /**
   * Bedienung: vier Attackenkacheln und darunter eine Zeile mit den übrigen
   * Aktionen. Die Zeile bleibt auch stehen, während das Protokoll abläuft —
   * so lässt sich der Auto-Kampf jederzeit wieder abschalten.
   */
  function renderControls() {
    renderMoves();
    renderActions();
  }

  function renderMoves() {
    var bt = App.battle;
    clear(BV.moveArea);
    var moves = bt.legalMoves(0);
    var foe = bt.sides[1].active, me = bt.sides[0].active;
    var grid = el('div', { className: 'move-grid' });

    moves.forEach(function (mv) {
      var m = mv.move, effTag = null;
      if (m.c !== 'T' && foe && foe.mon.hp > 0) {
        var eff = bt.effectiveness(m.t, foe, m, me);
        if (eff === 0) effTag = { c: 'none', t: 'wirkungslos' };
        else if (eff > 1) effTag = { c: 'super', t: eff >= 4 ? '×4' : '×2' };
        else if (eff < 1) effTag = { c: 'weak', t: eff <= 0.25 ? '×¼' : '×½' };
      }
      grid.appendChild(el('button', {
        className: 'move-btn' + (mv.disabled ? ' disabled' : ''),
        type: 'button', disabled: mv.disabled,
        style: { '--move-color': U.TYPE_COLOR[m.t] || '#777' },
        title: (mv.why ? mv.why + ' — ' : '') + T.moveDesc(m),
        onclick: function () { submitAction({ type: 'move', index: mv.index }); }
      }, [
        el('span', { className: 'move-btn-name', text: m.n }),
        el('span', { className: 'move-btn-meta' }, [
          el('span', { className: 'move-btn-type', text: T.type(m.t) }),
          el('span', { text: U.CAT_ICON[m.c] }),
          el('span', { text: mv.pp + '/' + mv.maxPP }),
          effTag ? el('span', { className: 'move-eff ' + effTag.c, text: effTag.t }) : null
        ])
      ]));
    });
    BV.moveArea.appendChild(grid);
  }

  function actionBtn(label, enabled, onClick, className) {
    return el('button', {
      className: 'action-btn' + (className ? ' ' + className : ''),
      type: 'button', disabled: !enabled, onclick: onClick
    }, label);
  }

  function renderActions() {
    var bt = App.battle, run = App.run;
    clear(BV.actionRow);
    var busy = BV.busy;

    BV.actionRow.appendChild(actionBtn('🔄 Wechseln', !busy && bt.canSwitch(0), function () { openSwitchDialog(); }));
    BV.actionRow.appendChild(actionBtn('🎒 Beutel', !busy, function () { openBattleBag(); }));
    if (bt.wild) {
      BV.actionRow.appendChild(actionBtn('🔴 Ball', !busy, function () { openBallDialog(); }));
      BV.actionRow.appendChild(actionBtn('🏃 Fliehen', !busy, function () { submitAction({ type: 'run' }); }));
    }
    if (bt.canMega(bt.sides[0].active)) {
      var form = bt.megaFormFor(bt.sides[0].active);
      var primal = /Primal/.test(form.n);
      BV.actionRow.appendChild(actionBtn(
        (primal ? '☀ Proto' : '◈ Mega') + ' ' + form.n.replace(/^[^-]+-/, ''),
        !busy,
        function () {
          BV.pendingMega = !BV.pendingMega;
          renderActions();
          U.toast(BV.pendingMega
            ? (primal ? 'Protoform vorgemerkt — wähle deine Attacke.' : 'Mega-Entwicklung vorgemerkt — wähle deine Attacke.')
            : 'Mega-Entwicklung abgewählt.');
        },
        'mega' + (BV.pendingMega ? ' on' : '')
      ));
    }
    // Der Auto-Schalter ist immer bedienbar, auch mitten im Ablauf.
    BV.actionRow.appendChild(el('button', {
      className: 'action-btn auto' + (App.autoPlay ? ' on' : ''),
      type: 'button',
      title: 'Der Computer übernimmt die Kämpfe und spielt auf Sieg',
      onclick: function () {
        App.autoPlay = !App.autoPlay;
        renderActions();
        if (App.autoPlay && !BV.busy) awaitInput();
      }
    }, App.autoPlay ? '⚡ Auto AN' : '⚡ Auto'));
  }

  function submitAction(action) {
    var bt = App.battle;
    if (!bt || BV.busy || bt.ended) return;
    if (BV.pendingMega && action.type === 'move') action.mega = true;
    BV.pendingMega = false;
    var enemyAction = PL.ai.chooseAction(bt, 1, bt.aiLevel === undefined ? 1 : bt.aiLevel);
    var entries = bt.runTurn([action, enemyAction]);
    App.run.stats.turns++;
    playLog(entries, function () { awaitInput(); });
  }

  function askReplacement(voluntary) {
    var bt = App.battle;
    // Im Auto-Kampf entscheidet der Computer auch, wer nachrückt.
    if (App.autoPlay) {
      var pick = PL.ai.chooseSwitch(bt, bt.sides[0], !voluntary);
      if (voluntary && pick < 0) { bt.pendingSelfSwitchSide = null; awaitInput(); return; }
      if (pick < 0) pick = bt.sides[0].team.findIndex(function (m) { return m.hp > 0; });
      if (pick >= 0) {
        clear(BV.moveArea);
        BV.moveArea.appendChild(el('div', { className: 'waiting', text: '▾' }));
        root.setTimeout(function () {
          if (!App.autoPlay || App.battle !== bt) { askReplacementManual(voluntary); return; }
          bt.replace(0, pick);
          bt.pendingSelfSwitchSide = null;
          renderSide(0);
          pushLine({ k: 'switchin', s: 'Los, ' + mons.name(bt.sides[0].team[pick]) + '!' });
          if (bt.ended) endBattle(); else awaitInput();
        }, Math.max(120, delayMs() * 0.6));
        return;
      }
    }
    askReplacementManual(voluntary);
  }

  function askReplacementManual(voluntary) {
    var bt = App.battle;
    clear(BV.moveArea);
    BV.moveArea.appendChild(el('div', { className: 'prompt', text: voluntary ? 'Wen schickst du nach?' : 'Dein Pokémon ist kampfunfähig. Wer übernimmt?' }));
    var list = el('div', { className: 'switch-row' });
    bt.sides[0].team.forEach(function (mon, i) {
      if (mon.hp <= 0 || i === bt.sides[0].activeIndex) return;
      list.appendChild(U.monCard(mon, {
        onClick: function () {
          bt.replace(0, i);
          var entries = bt.log.slice(-8).filter(function (e) { return e.k === 'switchin' || e.k === 'text'; });
          renderSide(0);
          entries.forEach(pushLine);
          if (bt.ended) endBattle(); else awaitInput();
        }
      }));
    });
    if (voluntary) {
      list.appendChild(el('button', {
        className: 'btn', type: 'button',
        onclick: function () { bt.pendingSelfSwitchSide = null; awaitInput(); }
      }, 'Bleiben'));
    }
    BV.moveArea.appendChild(list);
    renderActions();
  }

  function openSwitchDialog() {
    var bt = App.battle;
    var box = U.modal({
      title: 'Pokémon wechseln',
      wide: true,
      content: el('div', { className: 'switch-grid' }, bt.sides[0].team.map(function (mon, i) {
        return U.monCard(mon, {
          disabled: mon.hp <= 0 || i === bt.sides[0].activeIndex,
          onClick: function () {
            box.close();
            submitAction({ type: 'switch', to: i });
          }
        });
      })),
      actions: [{ label: 'Abbrechen' }]
    });
  }

  function openBallDialog() {
    var run = App.run, bt = App.battle;
    var balls = Object.keys(run.bag).map(function (id) { return PL.items.get(id); })
      .filter(function (it) { return it && it.kind === 'ball'; });
    if (run.hasMod('freeMasterball') && !run.masterballUsed) {
      balls.unshift({ id: '__free', name: 'Meisterball-Splitter', desc: 'Einmal pro Run: garantierter Fang.', kind: 'ball', free: true });
    }
    if (!balls.length) { U.toast('Du hast keine Bälle mehr.', 'bad'); return; }
    var box = U.modal({
      title: 'Welchen Ball?',
      content: el('div', { className: 'list' }, balls.map(function (it) {
        return U.itemRow(it, {
          count: it.free ? 1 : run.bag[it.id],
          onClick: function () {
            box.close();
            if (it.free) {
              run.masterballUsed = true;
              submitAction({ type: 'ball', item: 'masterball' });
            } else {
              run.removeItem(it.id, 1);
              submitAction({ type: 'ball', item: it.id });
            }
          }
        });
      })),
      actions: [{ label: 'Zurück' }]
    });
  }

  function openBattleBag() {
    var run = App.run, bt = App.battle;
    var usable = Object.keys(run.bag).map(function (id) { return PL.items.get(id); })
      .filter(function (it) { return it && it.use && !it.outsideOnly; });
    if (!usable.length) { U.toast('Nichts Brauchbares im Beutel.', 'bad'); return; }
    var box = U.modal({
      title: 'Beutel',
      content: el('div', { className: 'list' }, usable.map(function (it) {
        return U.itemRow(it, {
          count: run.bag[it.id],
          onClick: function () {
            box.close();
            pickTarget(it, function (index) {
              run.removeItem(it.id, 1);
              submitAction({ type: 'item', item: it.id, target: index });
            });
          }
        });
      })),
      actions: [{ label: 'Zurück' }]
    });
  }

  function pickTarget(item, onPick) {
    var bt = App.battle;
    var box = U.modal({
      title: item.name + ' — für wen?',
      wide: true,
      content: el('div', { className: 'switch-grid' }, bt.sides[0].team.map(function (mon, i) {
        return U.monCard(mon, { onClick: function () { box.close(); onPick(i); } });
      })),
      actions: [{ label: 'Abbrechen' }]
    });
  }

  /* --- Kampfende ------------------------------------------------------------------- */

  function endBattle() {
    var bt = App.battle, run = App.run;
    var result = run.finishBattle(bt);
    if (bt.outcome === 'caught' && bt.caught) meta.noteCaught(bt.caught);
    run.party.forEach(function (m) { if (m.hp === 1) meta.award('notafraid'); });
    bt.sides[0].team.forEach(function (m) { void m; });
    if (bt.sides[0].megaUsed) meta.award('mega');
    if (bt.sides[0].active && /Primal/.test(bt.sides[0].active.megaName || '')) meta.award('primal');
    if (run.party.length >= 6) meta.award('full_team');
    if (Object.keys(run.relics).length >= 10) meta.award('relic10');
    if (run.money >= 50000) meta.award('rich');
    if (bt.outcome === 'win' && bt.sides[1].team.length >= 3 &&
        Object.keys(bt.sides[0].used || {}).length === 1) meta.award('sweep');
    if (run.party.some(function (m) { return m.lvl >= 100; })) meta.award('level100');
    meta.refreshAchievements();
    meta.save();

    if (run.state === 'gameover') { finishRun(); return; }
    show('scene', { type: 'aftermath', result: result, battle: bt });
  }

  /* ---------- 5) Szenen ------------------------------------------------------------ */

  SCREENS.scene = function (arg) {
    switch (arg.type) {
      case 'aftermath': return sceneAftermath(arg);
      case 'catch': return sceneCatch(arg.scene);
      case 'item': return sceneItem(arg.scene);
      case 'relic': return sceneRelic(arg.scene);
      case 'shop': return sceneShop(arg.scene);
      case 'event': return sceneEvent(arg.scene);
      case 'rest': return sceneRest(arg.scene);
      default: return el('p', { text: '…' });
    }
  };

  function sceneFrame(title, subtitle, body, actions) {
    return el('div', { className: 'scene' }, [
      el('h2', { text: title }),
      subtitle ? el('p', { className: 'muted', text: subtitle }) : null,
      el('div', { className: 'scene-body' }, body),
      el('div', { className: 'scene-actions' }, actions)
    ]);
  }

  function sceneAftermath(arg) {
    var run = App.run, res = arg.result, bt = arg.battle;
    var lines = [];
    if (bt.outcome === 'caught' && res.caught) {
      lines.push(el('p', { className: 'good', text: mons.name(res.caught.mon) + (res.caught.to === 'team' ? ' ist jetzt im Team!' : ' wartet in der Box.') }));
    }
    if (res.money) lines.push(el('p', { text: 'Du erhältst ' + U.money(res.money) + '.' }));
    res.levelUps.forEach(function (up) {
      lines.push(el('p', { text: mons.name(up.mon) + ' steigt auf Level ' + up.mon.lvl + '!' }));
    });
    res.evolutions.forEach(function (evo) {
      lines.push(el('p', { className: 'good', text: 'Was? ' + evo.from + ' entwickelt sich zu ' + evo.to + '!' }));
    });
    res.faintedOut.forEach(function (name) {
      lines.push(el('p', { className: 'bad', text: name + ' ist für immer gegangen (Nuzlocke).' }));
    });
    if (!lines.length) lines.push(el('p', { text: bt.outcome === 'fled' ? 'Entkommen.' : 'Weiter geht’s.' }));

    var pending = [];
    res.levelUps.forEach(function (up) {
      (up.learned || []).forEach(function (l) { pending.push({ mon: up.mon, move: l.move }); });
    });

    var reward = (bt.outcome === 'win') ? run.battleRewards(bt) : null;
    var body = [el('div', { className: 'aftermath' }, lines), partyStrip()];

    var actions = [el('button', {
      className: 'btn big primary', type: 'button',
      onclick: function () {
        processMoveLearning(pending, function () {
          if (reward) openScene(reward);
          else backToMap();
        });
      }
    }, reward ? 'Belohnung ansehen' : 'Weiter')];

    return sceneFrame(bt.outcome === 'caught' ? 'Gefangen!' : 'Kampf gewonnen', null, body, actions);
  }

  /** Fragt nacheinander ab, ob neu gelernte Attacken übernommen werden. */
  function processMoveLearning(queue, done) {
    if (!queue.length) { done(); return; }
    var item = queue.shift();
    var mon = item.mon, move = dex.move(item.move);
    if (mon.moves.some(function (s) { return s.m === item.move; })) { processMoveLearning(queue, done); return; }
    if (mon.moves.length < 4) {
      mon.moves.push({ m: item.move, pp: move.pp, ppUp: 0, used: 0 });
      U.toast(mons.name(mon) + ' lernt ' + move.n + '!');
      processMoveLearning(queue, done);
      return;
    }
    var box = U.modal({
      title: mons.name(mon) + ' will ' + move.n + ' lernen',
      wide: true,
      dismissable: false,
      content: el('div', {}, [
        el('p', { text: 'Vier Attacken sind das Maximum. Welche soll weichen?' }),
        U.moveRow({ m: item.move, pp: move.pp, ppUp: 0 }, { className: 'highlight' }),
        el('div', { className: 'list' }, mon.moves.map(function (slot, i) {
          return U.moveRow(slot, {
            onClick: function () {
              mon.moves[i] = { m: item.move, pp: move.pp, ppUp: 0, used: 0 };
              box.close();
              U.toast(mons.name(mon) + ' lernt ' + move.n + '!');
              processMoveLearning(queue, done);
            }
          });
        }))
      ]),
      actions: [{
        label: 'Nicht lernen',
        onClick: function () { processMoveLearning(queue, done); }
      }]
    });
  }

  function sceneCatch(scene) {
    var run = App.run;
    var grid = el('div', { className: 'offer-grid' }, scene.offers.map(function (mon) {
      var sp = dex.sp(mon.sp);
      return el('button', { className: 'offer', type: 'button', onclick: function () { takeMon(mon); } }, [
        el('div', { className: 'offer-art' }, [
          U.sprite(mon, { eager: true }),
          mon.shiny ? el('span', { className: 'shiny-mark', text: '✦' }) : null
        ]),
        el('strong', { text: mons.name(mon) }),
        el('span', { className: 'offer-types' }, sp.t.map(function (t) { return U.typeChip(t, true); })),
        el('span', { className: 'muted', text: 'Lv ' + mon.lvl + ' · ' + T.nature(mon.nat) }),
        el('span', { className: 'muted', text: mon.ab }),
        el('span', { className: 'muted small', text: 'BWS ' + sp.bst + (dex.evosLeft(sp) ? ' · entwickelt sich noch' : '') })
      ]);
    }));

    function takeMon(mon) {
      if (scene.locked) {
        meta.noteSeen(mon.sp);
        meta.save();
        U.toast('Nuzlocke: In dieser Region darfst du niemanden mehr mitnehmen.', 'bad');
        backToMap();
        return;
      }
      var res = run.takeOffer(mon);
      meta.noteCaught(mon);
      meta.save();
      U.toast(mons.name(mon) + (res.to === 'team' ? ' schließt sich an!' : ' wandert in die Box.'));
      backToMap();
    }

    return sceneFrame('Begegnung', scene.text, [grid, partyStrip()], [
      el('button', { className: 'btn', type: 'button', onclick: backToMap },
        scene.locked ? 'Weitergehen' : 'Keines nehmen')
    ]);
  }

  function sceneItem(scene) {
    var run = App.run;
    var list = el('div', { className: 'list' }, scene.offers.map(function (item) {
      return U.itemRow(item, {
        onClick: function () {
          run.addItem(item.id, 1);
          U.toast(item.name + ' eingesteckt.');
          backToMap();
        }
      });
    }));
    return sceneFrame('Fundstück', scene.text, [list], [
      el('button', { className: 'btn', type: 'button', onclick: backToMap }, 'Nichts nehmen')
    ]);
  }

  function sceneRelic(scene) {
    var run = App.run;
    var grid = el('div', { className: 'relic-grid' }, scene.offers.map(function (r) {
      return el('button', { className: 'relic-card r-' + r.rarity, type: 'button', onclick: function () {
        run.takeRelic(r.id);
        U.toast('Relikt erhalten: ' + r.name);
        if (Object.keys(run.relics).length >= 10) meta.award('relic10');
        backToMap();
      } }, [
        el('span', { className: 'relic-icon', text: r.icon || '🏛️' }),
        el('strong', { text: r.name }),
        el('span', { className: 'relic-rarity', text: r.rarity }),
        el('span', { className: 'muted', text: r.desc })
      ]);
    }));
    return sceneFrame('Relikt wählen', scene.text, [grid], [
      el('button', { className: 'btn', type: 'button', onclick: backToMap }, 'Nichts nehmen')
    ]);
  }

  function sceneShop(scene) {
    var run = App.run;
    var listHost = el('div', { className: 'list' });

    function draw() {
      clear(listHost);
      scene.stock.forEach(function (entry) {
        listHost.appendChild(U.itemRow(entry.item, {
          price: entry.price,
          className: entry.sold ? 'sold' : '',
          disabled: entry.sold || run.money < entry.price,
          onClick: function () {
            if (run.buy(entry)) {
              U.toast(entry.item.name + ' gekauft.');
              sfx('coin');
              draw();
              renderHeader();
            }
          }
        }));
      });
    }
    draw();

    var sellBtn = el('button', { className: 'btn', type: 'button', onclick: function () { openSellDialog(draw); } }, '💱 Verkaufen');

    return sceneFrame('Händler', scene.text, [
      el('p', { className: 'muted', text: 'Dein Geld: ' + U.money(run.money) }),
      listHost
    ], [
      sellBtn,
      el('button', { className: 'btn primary', type: 'button', onclick: backToMap }, 'Weiterziehen')
    ]);
  }

  function openSellDialog(after) {
    var run = App.run;
    var ids = Object.keys(run.bag);
    if (!ids.length) { U.toast('Der Beutel ist leer.'); return; }
    var box = U.modal({
      title: 'Verkaufen',
      wide: true,
      content: el('div', { className: 'list' }, ids.map(function (id) {
        var it = PL.items.get(id);
        if (!it) return null;
        return U.itemRow(it, {
          count: run.bag[id],
          price: Math.floor(it.price * 0.4),
          onClick: function () {
            var got = run.sell(id, 1);
            U.toast('Verkauft für ' + U.money(got) + '.');
            box.close();
            renderHeader();
            if (after) after();
          }
        });
      }).filter(Boolean)),
      actions: [{ label: 'Fertig' }]
    });
  }

  function sceneEvent(scene) {
    var run = App.run;
    var body = [el('p', { className: 'event-text', text: scene.text })];
    var options = el('div', { className: 'option-list' }, scene.options.map(function (o) {
      return el('button', {
        className: 'option', type: 'button', disabled: !o.enabled,
        onclick: function () { resolveEvent(o.index); }
      }, [el('strong', { text: o.label }), el('span', { className: 'muted', text: o.desc })]);
    }));
    body.push(options);

    function resolveEvent(index) {
      var out = run.chooseEvent(index);
      if (!out) return;
      if (out.scene) { openScene(out.scene); return; }
      if (out.tutor) { openTutor(function () { backToMap(); }); return; }
      if (out.trade) { openTrade(function () { backToMap(); }); return; }
      U.modal({
        title: scene.title,
        content: el('p', { text: out.text || 'Nichts passiert.' }),
        actions: [{ label: 'Weiter', primary: true, onClick: backToMap }]
      });
    }

    return sceneFrame(scene.title, null, body, []);
  }

  function sceneRest(scene) {
    var run = App.run;
    var body = [el('div', { className: 'option-list' }, run.restOptions().map(function (o) {
      return el('button', { className: 'option', type: 'button', onclick: function () { doRest(o.id); } }, [
        el('strong', { text: o.label }), el('span', { className: 'muted', text: o.desc })
      ]);
    })), partyStrip()];

    function doRest(id) {
      if (id === 'heal') {
        U.toast(run.doRest('heal'));
        backToMap();
      } else if (id === 'train') {
        U.toast(run.doRest('train'));
        backToMap();
      } else if (id === 'tutor') {
        openTutor(function () { backToMap(); });
      } else if (id === 'evolve') {
        openEvolveDialog(function () { backToMap(); });
      } else if (id === 'box') {
        show('team');
      }
    }

    return sceneFrame('Rastplatz', 'Ein Feuer, ein bisschen Ruhe. Was tust du?', body, []);
  }

  /* --- Ereignishelfer -------------------------------------------------------------- */

  function openTutor(done) {
    var run = App.run;
    var box = U.modal({
      title: 'Wer soll etwas lernen?',
      wide: true,
      content: el('div', { className: 'switch-grid' }, run.party.map(function (mon, i) {
        return U.monCard(mon, { onClick: function () { box.close(); pickMove(mon); } });
      })),
      actions: [{ label: 'Abbrechen', onClick: done }]
    });

    function pickMove(mon) {
      var sp = dex.sp(mon.sp);
      var pool = dex.movepool(sp).filter(function (mi) {
        var m = dex.move(mi);
        return m && !m.np && !mon.moves.some(function (s) { return s.m === mi; }) &&
          mon.lvl >= mons.tmMinLevel(m) * 0.8;
      });
      run.rng.shuffle(pool);
      var offers = pool.slice(0, 5);
      if (!offers.length) { U.toast('Nichts Neues zu lernen.'); done(); return; }
      var box2 = U.modal({
        title: mons.name(mon) + ' — welche Attacke?',
        wide: true,
        content: el('div', { className: 'list' }, offers.map(function (mi) {
          var m = dex.move(mi);
          return U.moveRow({ m: mi, pp: m.pp, ppUp: 0 }, {
            onClick: function () {
              box2.close();
              processMoveLearning([{ mon: mon, move: mi }], done);
            }
          });
        })),
        actions: [{ label: 'Abbrechen', onClick: done }]
      });
    }
  }

  function openTrade(done) {
    var run = App.run;
    var box = U.modal({
      title: 'Wen gibst du her?',
      wide: true,
      content: el('div', { className: 'switch-grid' }, run.party.map(function (mon, i) {
        return U.monCard(mon, {
          onClick: function () {
            box.close();
            var level = Math.min(run.levelCap, mon.lvl + 3);
            var pool = PL.world.encounterPool({ level: level, anyGen: true });
            var sp = PL.world.pickEncounter(run.rng, pool, level, { rare: true });
            var fresh = PL.world.buildMon(run.rng, sp, level, { quality: 0.9, ivFloor: 14 });
            run.party[i] = fresh;
            meta.noteCaught(fresh);
            meta.save();
            U.modal({
              title: 'Getauscht!',
              content: el('div', { className: 'trade-result' }, [
                el('p', { text: mons.name(mon) + ' geht — ' + mons.name(fresh) + ' kommt.' }),
                U.monCard(fresh, {})
              ]),
              actions: [{ label: 'Weiter', primary: true, onClick: done }]
            });
          }
        });
      })),
      actions: [{ label: 'Doch nicht', onClick: done }]
    });
  }

  function openEvolveDialog(done) {
    var run = App.run;
    var rows = [];
    run.party.forEach(function (mon) {
      var list = mons.evolutions(mon, { items: run.bag });
      list.forEach(function (evo) {
        rows.push(el('button', {
          className: 'option' + (evo.ready ? '' : ' disabled'), type: 'button', disabled: !evo.ready,
          onclick: function () {
            if (evo.item && run.bag[PL.util.toID(evo.item)]) run.removeItem(PL.util.toID(evo.item), 1);
            var from = mons.name(mon);
            mons.evolve(mon, evo.to, run.rng);
            run.stats.evolutions++;
            meta.noteCaught(mon);
            meta.save();
            U.toast(from + ' entwickelt sich zu ' + mons.name(mon) + '!');
            if (done) done();
          }
        }, [
          el('strong', { text: mons.name(mon) + ' → ' + T.species(evo.to) }),
          el('span', { className: 'muted', text: evo.ready ? 'Bereit' : 'Bedingung: ' + evo.text })
        ]));
      });
    });
    if (!rows.length) rows.push(el('p', { text: 'Im Moment kann sich niemand entwickeln.' }));
    U.modal({
      title: 'Entwicklungen',
      wide: true,
      content: el('div', { className: 'option-list' }, rows),
      actions: [{ label: 'Schließen', onClick: done }]
    });
  }

  /* ---------- 6) Team ---------------------------------------------------------------- */

  SCREENS.team = function () {
    var run = App.run;
    var sel = { index: 0 };
    var detail = el('div', { className: 'team-detail' });
    var listHost = el('div', { className: 'team-list' });
    var boxHost = el('div', { className: 'box-list' });

    function drawList() {
      clear(listHost);
      run.party.forEach(function (mon, i) {
        listHost.appendChild(U.monCard(mon, {
          selected: i === sel.index,
          onClick: function () { sel.index = i; drawList(); drawDetail(); }
        }));
      });
      clear(boxHost);
      if (!run.box.length) {
        boxHost.appendChild(el('p', { className: 'muted', text: 'Die Box ist leer.' }));
      } else {
        run.box.forEach(function (mon, i) {
          boxHost.appendChild(U.monCard(mon, {
            onClick: function () { swapWithBox(i); }
          }));
        });
      }
    }

    function swapWithBox(boxIndex) {
      if (run.party.length < 6) {
        run.party.push(run.box.splice(boxIndex, 1)[0]);
        U.toast(mons.name(run.party[run.party.length - 1]) + ' kommt ins Team.');
      } else {
        var mon = run.party[sel.index];
        run.party[sel.index] = run.box[boxIndex];
        run.box[boxIndex] = mon;
        U.toast('Getauscht: ' + mons.name(mon) + ' ↔ ' + mons.name(run.party[sel.index]));
      }
      autosave();
      drawList(); drawDetail();
    }

    function drawDetail() {
      clear(detail);
      var mon = run.party[sel.index];
      if (!mon) return;
      detail.appendChild(U.monDetail(mon));
      detail.appendChild(el('div', { className: 'team-tools' }, [
        el('button', { className: 'btn', type: 'button', onclick: function () { openHoldItem(mon, drawDetail); } },
          mon.item ? '🎒 ' + PL.items.label(mon.item) + ' abnehmen/tauschen' : '🎒 Gegenstand geben'),
        el('button', { className: 'btn', type: 'button', onclick: function () { openUseItem(mon, drawDetail); } }, '🧪 Gegenstand benutzen'),
        el('button', { className: 'btn', type: 'button', onclick: function () { openTeachTM(mon, drawDetail); } }, '💿 TM beibringen'),
        el('button', { className: 'btn', type: 'button', onclick: function () { openEvolveDialog(function () { drawList(); drawDetail(); }); } }, '💠 Entwickeln'),
        sel.index > 0 ? el('button', {
          className: 'btn', type: 'button',
          onclick: function () {
            var m = run.party.splice(sel.index, 1)[0];
            run.party.splice(sel.index - 1, 0, m);
            sel.index--;
            drawList(); drawDetail(); autosave();
          }
        }, '⬆ Nach vorn') : null,
        run.party.length > 1 ? el('button', {
          className: 'btn danger', type: 'button',
          onclick: function () {
            U.confirm(mons.name(mon) + ' in die Box legen?', function () {
              run.box.push(run.party.splice(sel.index, 1)[0]);
              sel.index = 0;
              drawList(); drawDetail(); autosave();
            });
          }
        }, '📦 In die Box') : null
      ]));
    }

    drawList();
    drawDetail();

    return el('div', { className: 'team-screen' }, [
      el('div', { className: 'team-head' }, [
        el('h2', { text: 'Team' }),
        el('button', { className: 'btn', type: 'button', onclick: function () { show('map'); } }, 'Zurück zur Karte')
      ]),
      el('div', { className: 'team-cols' }, [
        el('div', {}, [listHost, el('h3', { className: 'section-label', text: 'Box' }), boxHost]),
        detail
      ])
    ]);
  };

  function openMonSheet(index) {
    var run = App.run, mon = run.party[index];
    if (!mon) return;
    U.modal({
      title: mons.name(mon),
      wide: true,
      content: U.monDetail(mon),
      actions: [
        { label: 'Team öffnen', onClick: function () { show('team'); } },
        { label: 'Schließen', primary: true }
      ]
    });
  }

  function openHoldItem(mon, after) {
    var run = App.run;
    var holdables = Object.keys(run.bag).map(function (id) { return PL.items.get(id); })
      .filter(function (it) { return it && it.hold; });
    var content = [];
    if (mon.item) {
      content.push(el('button', {
        className: 'option', type: 'button',
        onclick: function () {
          run.addItem(mon.item, 1);
          U.toast(PL.items.label(mon.item) + ' abgenommen.');
          mon.item = null;
          box.close(); if (after) after();
        }
      }, [el('strong', { text: 'Abnehmen: ' + PL.items.label(mon.item) })]));
    }
    holdables.forEach(function (it) {
      content.push(U.itemRow(it, {
        count: run.bag[it.id],
        onClick: function () {
          if (mon.item) run.addItem(mon.item, 1);
          run.removeItem(it.id, 1);
          mon.item = it.id;
          U.toast(mons.name(mon) + ' trägt jetzt ' + it.name + '.');
          box.close(); if (after) after();
        }
      }));
    });
    if (!content.length) content.push(el('p', { text: 'Keine tragbaren Gegenstände im Beutel.' }));
    var box = U.modal({ title: 'Gegenstand tragen', wide: true, content: el('div', { className: 'list' }, content), actions: [{ label: 'Schließen' }] });
  }

  function openUseItem(mon, after) {
    var run = App.run;
    var usable = Object.keys(run.bag).map(function (id) { return PL.items.get(id); })
      .filter(function (it) { return it && it.use && it.useOutside; });
    if (!usable.length) { U.toast('Nichts Benutzbares im Beutel.'); return; }
    var box = U.modal({
      title: 'Gegenstand benutzen',
      wide: true,
      content: el('div', { className: 'list' }, usable.map(function (it) {
        return U.itemRow(it, {
          count: run.bag[it.id],
          onClick: function () {
            box.close();
            useItemOn(it, mon, after);
          }
        });
      })),
      actions: [{ label: 'Schließen' }]
    });
  }

  function useItemOn(it, mon, after) {
    var run = App.run;
    function finish(extra) {
      var res = it.use(null, { team: run.party, activeIndex: run.party.indexOf(mon) }, mon, run, extra);
      if (res === false) { U.toast('Das bringt gerade nichts.', 'bad'); return; }
      run.removeItem(it.id, 1);
      U.toast(res && res.text ? res.text : it.name + ' benutzt.');
      autosave();
      if (after) after();
    }
    if (it.needsChoice === 'nature') {
      var box = U.modal({
        title: 'Welches Wesen?',
        wide: true,
        content: el('div', { className: 'nature-grid' }, dex.natures.map(function (n) {
          return el('button', {
            className: 'nature-pick', type: 'button',
            onclick: function () { box.close(); finish(n.n); }
          }, [
            el('strong', { text: T.nature(n.n) }),
            el('span', { className: 'muted', text: n.p ? '+' + T.statShort(n.p) + ' / −' + T.statShort(n.m) : 'neutral' })
          ]);
        })),
        actions: [{ label: 'Abbrechen' }]
      });
      return;
    }
    if (it.needsMove) {
      var box3 = U.modal({
        title: 'Welche Attacke?',
        content: el('div', { className: 'list' }, mon.moves.map(function (slot, i) {
          return U.moveRow(slot, { onClick: function () { box3.close(); finish(i); } });
        })),
        actions: [{ label: 'Abbrechen' }]
      });
      return;
    }
    finish();
  }

  function openTeachTM(mon, after) {
    var run = App.run;
    var tms = Object.keys(run.tms || {}).filter(function (k) { return run.tms[k] > 0; });
    if (!tms.length) { U.toast('Du hast keine TMs.'); return; }
    var sp = dex.sp(mon.sp);
    var pool = dex.movepool(sp);
    var box = U.modal({
      title: 'TM beibringen',
      wide: true,
      content: el('div', { className: 'list' }, tms.map(function (key) {
        var mi = +key, m = dex.move(mi);
        var learnable = pool.indexOf(mi) >= 0;
        var known = mon.moves.some(function (s) { return s.m === mi; });
        return U.moveRow({ m: mi, pp: m.pp, ppUp: 0 }, {
          className: learnable && !known ? '' : 'disabled',
          onClick: (learnable && !known) ? function () {
            box.close();
            run.tms[key]--;
            if (run.tms[key] <= 0) delete run.tms[key];
            processMoveLearning([{ mon: mon, move: mi }], function () { if (after) after(); });
          } : null
        });
      })),
      actions: [{ label: 'Schließen' }]
    });
  }

  /* --- Beutel, Relikte, Menü ---------------------------------------------------------- */

  function openBag() {
    var run = App.run;
    var ids = Object.keys(run.bag);
    var tmIds = Object.keys(run.tms || {});
    var content = [];
    if (!ids.length && !tmIds.length) content.push(el('p', { text: 'Der Beutel ist leer.' }));
    ['ball', 'heal', 'status', 'boost', 'special', 'hold', 'evo'].forEach(function (kind) {
      var group = ids.map(function (id) { return PL.items.get(id); })
        .filter(function (it) { return it && it.kind === kind; });
      if (!group.length) return;
      content.push(el('h4', { className: 'bag-group', text: bagGroupName(kind) }));
      group.forEach(function (it) {
        content.push(U.itemRow(it, { count: run.bag[it.id], right: el('span', { className: 'count', text: '×' + run.bag[it.id] }) }));
      });
    });
    if (tmIds.length) {
      content.push(el('h4', { className: 'bag-group', text: 'TMs' }));
      tmIds.forEach(function (key) {
        var m = dex.move(+key);
        content.push(U.moveRow({ m: +key, pp: m.pp, ppUp: 0 }, { className: 'small' }));
      });
    }
    U.modal({ title: 'Beutel', wide: true, content: el('div', { className: 'list' }, content), actions: [{ label: 'Schließen', primary: true }] });
  }

  function bagGroupName(kind) {
    return { ball: 'Bälle', heal: 'Heilung', status: 'Statusheilung', boost: 'Kampfhilfen',
      special: 'Besonderes', hold: 'Tragegegenstände', evo: 'Entwicklungssteine' }[kind] || kind;
  }

  function openRelics() {
    var run = App.run;
    var ids = Object.keys(run.relics);
    var content = ids.length
      ? ids.map(function (id) {
        var r = PL.relics.get(id);
        return el('div', { className: 'relic-row r-' + r.rarity }, [
          el('span', { className: 'relic-icon', text: r.icon || '🏛️' }),
          el('div', {}, [el('strong', { text: r.name }), el('div', { className: 'muted', text: r.desc })])
        ]);
      })
      : [el('p', { text: 'Noch keine Relikte. Schreine und Arenaleiter halten welche bereit.' })];
    U.modal({ title: 'Relikte', wide: true, content: el('div', { className: 'list' }, content), actions: [{ label: 'Schließen', primary: true }] });
  }

  function openMenu() {
    var run = App.run;
    var actions = [];
    if (run && App.screen !== 'title') {
      actions.push({ label: 'Weiterspielen', primary: true });
      actions.push({ label: 'Speichern & zum Titel', onClick: function () { autosave(); App.battle = null; show('title'); } });
    }
    actions.push({ label: 'Pokédex', onClick: function () { show('dex'); } });
    actions.push({ label: 'Erfolge', onClick: function () { show('achievements'); } });
    actions.push({ label: 'Statistik', onClick: function () { show('stats'); } });
    actions.push({ label: 'Einstellungen', onClick: function () { show('settings'); } });
    if (!run || App.screen === 'title') actions.push({ label: 'Schließen' });
    U.modal({
      title: 'Menü',
      content: el('div', { className: 'menu-hint' }, [
        el('p', { className: 'muted', text: 'Tasten: 1–4 Attacken · W Wechseln · B Beutel · M Mega · A Auto · Esc Menü' })
      ]),
      actions: actions
    });
  }

  /* ---------- 7) Pokédex, Statistik, Erfolge, Einstellungen -------------------------- */

  SCREENS.dex = function () {
    var m = meta.load(), stats = meta.dexStats();
    var filter = { gen: 0, only: 'alle', text: '' };
    var grid = el('div', { className: 'dex-grid' });

    function draw() {
      clear(grid);
      var q = filter.text.toLowerCase();
      var shown = 0;
      dex.species.forEach(function (sp) {
        if (filter.gen && sp.g !== filter.gen) return;
        var caught = !!m.caught[sp.i], seen = !!m.seen[sp.i];
        if (filter.only === 'gefangen' && !caught) return;
        if (filter.only === 'fehlend' && caught) return;
        if (q && (T.species(sp) + ' ' + sp.n).toLowerCase().indexOf(q) < 0) return;
        if (shown++ > 900) return;
        grid.appendChild(el('button', {
          className: 'dex-cell' + (caught ? ' caught' : seen ? ' seen' : ' unknown'),
          type: 'button',
          title: caught || seen ? T.species(sp) : 'Noch nicht gesehen',
          onclick: function () { openDexEntry(sp, caught || seen); }
        }, [
          caught || seen ? U.sprite(sp, { shiny: !!m.shinies[sp.i] }) : el('span', { className: 'dex-silhouette' }),
          el('span', { className: 'dex-num', text: '#' + String(sp.num).padStart(4, '0') }),
          el('span', { className: 'dex-name', text: caught || seen ? T.species(sp) : '???' }),
          m.shinies[sp.i] ? el('span', { className: 'shiny-mark small', text: '✦' }) : null
        ]));
      });
      if (!shown) grid.appendChild(el('p', { className: 'muted', text: 'Nichts gefunden.' }));
    }

    var genRow = el('div', { className: 'filter-row' }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (g) {
      return el('button', {
        className: 'filter' + (g === 0 ? ' selected' : ''), type: 'button',
        onclick: function (e) {
          filter.gen = g;
          Array.prototype.forEach.call(genRow.children, function (c) { c.classList.remove('selected'); });
          e.currentTarget.classList.add('selected');
          draw();
        }
      }, g === 0 ? 'Alle' : 'Gen ' + g);
    }));

    var onlyRow = el('div', { className: 'filter-row' }, ['alle', 'gefangen', 'fehlend'].map(function (k) {
      return el('button', {
        className: 'filter' + (k === 'alle' ? ' selected' : ''), type: 'button',
        onclick: function (e) {
          filter.only = k;
          Array.prototype.forEach.call(onlyRow.children, function (c) { c.classList.remove('selected'); });
          e.currentTarget.classList.add('selected');
          draw();
        }
      }, k[0].toUpperCase() + k.slice(1));
    }));

    var search = el('input', {
      type: 'search', placeholder: 'Suchen …', className: 'search',
      oninput: function () { filter.text = search.value; draw(); }
    });

    draw();

    var genBars = el('div', { className: 'dex-gens' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (g) {
      var d = stats.byGen[g];
      return el('div', { className: 'dex-gen' }, [
        el('span', { text: 'Gen ' + g }),
        el('div', { className: 'mini-bar' }, el('i', { style: { width: (d.caught / d.total * 100).toFixed(0) + '%' } })),
        el('span', { className: 'muted', text: d.caught + '/' + d.total })
      ]);
    }));

    return el('div', { className: 'dex-screen' }, [
      el('div', { className: 'team-head' }, [
        el('h2', { text: 'Pokédex' }),
        el('button', { className: 'btn', type: 'button', onclick: function () { show(App.run ? 'map' : 'title'); } }, 'Zurück')
      ]),
      el('div', { className: 'dex-summary' }, [
        stat('Gefangen', stats.caught), stat('Gesehen', stats.seen),
        stat('Gesamt', stats.total), stat('Schillernd', stats.shinies)
      ]),
      genBars,
      el('div', { className: 'dex-filters' }, [genRow, onlyRow, search]),
      grid
    ]);
  };

  function openDexEntry(sp, known) {
    if (!known) return;
    var m = meta.load();
    var content = el('div', { className: 'dex-entry' }, [
      el('div', { className: 'dex-entry-art' }, [
        U.sprite(sp, { eager: true, className: 'big' }),
        m.shinies[sp.i] ? U.sprite(sp, { eager: true, shiny: true, className: 'big' }) : null
      ]),
      el('div', {}, [
        el('h3', { text: T.species(sp) + ' · Nr. ' + sp.num }),
        el('div', { className: 'mon-detail-types' }, sp.t.map(function (t) { return U.typeChip(t); })),
        el('p', { className: 'muted', text: 'Generation ' + sp.g + ' · ' + sp.wt + ' kg · ' + sp.ht + ' m' }),
        el('p', { className: 'muted', text: 'Fähigkeiten: ' + mons.abilityOptions(sp).join(', ') }),
        el('div', { className: 'stat-block' }, PL.STATS.map(function (key, i) {
          return el('div', { className: 'stat-row' }, [
            el('span', { className: 'stat-name', text: T.statShort(key) }),
            el('span', { className: 'stat-value', text: sp.bs[i] }),
            el('div', { className: 'stat-bar' }, el('i', { style: { width: Math.min(100, sp.bs[i] / 2.55) + '%' } }))
          ]);
        })),
        el('p', { text: 'Basiswertsumme ' + sp.bst + (m.caught[sp.i] ? ' · ' + m.caught[sp.i] + '× gefangen' : '') })
      ])
    ]);
    U.modal({ title: T.species(sp), wide: true, content: content, actions: [{ label: 'Schließen', primary: true }] });
  }

  SCREENS.stats = function () {
    var m = meta.load();
    var t = m.totals;
    var rows = [
      ['Runs gestartet', m.runs], ['Runs gewonnen', m.wins],
      ['Beste Region', m.bestRegion + 1], ['Höchster Aufstieg', Math.max(0, m.bestAscension)],
      ['Kämpfe', t.battles], ['Besiegte Pokémon', t.kos], ['Gefangen', t.catches],
      ['Eigene Ausfälle', t.faints], ['Arenaleiter besiegt', t.bosses || 0],
      ['Entwicklungen', t.evolutions], ['Runden gekämpft', t.turns],
      ['Verdientes Geld', U.money(t.money)]
    ];
    var history = m.history.length
      ? m.history.map(function (h) {
        return el('div', { className: 'history-row ' + (h.outcome === 'sieg' ? 'won' : 'lost') }, [
          el('span', { className: 'history-date', text: h.date }),
          el('span', { text: PL.Run.MODES[h.mode] ? PL.Run.MODES[h.mode].name : h.mode }),
          el('span', { text: 'Aufstieg ' + h.ascension + (h.nuzlocke ? ' · Nuzlocke' : '') }),
          el('span', { text: 'Region ' + (h.region + 1) }),
          el('span', { text: h.battles + ' Kämpfe' }),
          el('span', { className: 'history-team' }, h.team.map(function (p) {
            return U.sprite(dex.species[p.sp], { shiny: p.shiny, className: 'tiny' });
          })),
          el('strong', { className: 'history-out', text: h.outcome === 'sieg' ? 'Sieg' : 'Niederlage' })
        ]);
      })
      : [el('p', { className: 'muted', text: 'Noch keine abgeschlossenen Runs.' })];

    return el('div', { className: 'stats-screen' }, [
      el('div', { className: 'team-head' }, [
        el('h2', { text: 'Statistik' }),
        el('button', { className: 'btn', type: 'button', onclick: function () { show(App.run ? 'map' : 'title'); } }, 'Zurück')
      ]),
      el('div', { className: 'stat-grid' }, rows.map(function (r) { return stat(r[0], r[1]); })),
      el('h3', { className: 'section-label', text: 'Vergangene Runs' }),
      el('div', { className: 'history' }, history)
    ]);
  };

  SCREENS.achievements = function () {
    var list = meta.achievements();
    return el('div', { className: 'ach-screen' }, [
      el('div', { className: 'team-head' }, [
        el('h2', { text: 'Erfolge (' + list.filter(function (a) { return a.done; }).length + ' / ' + list.length + ')' }),
        el('button', { className: 'btn', type: 'button', onclick: function () { show(App.run ? 'map' : 'title'); } }, 'Zurück')
      ]),
      el('div', { className: 'ach-grid' }, list.map(function (a) {
        return el('div', { className: 'ach' + (a.done ? ' done' : '') }, [
          el('span', { className: 'ach-mark', text: a.done ? '★' : '☆' }),
          el('div', {}, [el('strong', { text: a.name }), el('div', { className: 'muted', text: a.desc })])
        ]);
      }))
    ]);
  };

  SCREENS.settings = function () {
    var s = settings();
    function row(label, desc, control) {
      return el('div', { className: 'setting' }, [
        el('div', {}, [el('strong', { text: label }), el('div', { className: 'muted', text: desc })]),
        control
      ]);
    }
    function picker(options, current, onPick) {
      var host = el('div', { className: 'filter-row' }, options.map(function (o) {
        return el('button', {
          className: 'filter' + (o.value === current ? ' selected' : ''), type: 'button',
          onclick: function (e) {
            onPick(o.value);
            Array.prototype.forEach.call(host.children, function (c) { c.classList.remove('selected'); });
            e.currentTarget.classList.add('selected');
          }
        }, o.label);
      }));
      return host;
    }

    return el('div', { className: 'settings-screen' }, [
      el('div', { className: 'team-head' }, [
        el('h2', { text: 'Einstellungen' }),
        el('button', { className: 'btn', type: 'button', onclick: function () { show(App.run ? 'map' : 'title'); } }, 'Zurück')
      ]),
      row('Ansicht', 'Automatisch richtet sich nach deinem System.', picker(
        [{ value: 'auto', label: 'Automatisch' }, { value: 'dark', label: 'Dunkel' }, { value: 'light', label: 'Hell' }],
        s.theme, function (v) { meta.setSetting('theme', v); applyTheme(); })),
      row('Sprache der Pokémon-Namen', 'Attacken und Fähigkeiten bleiben englisch — so heißen sie überall.', picker(
        [{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'Englisch' }], s.lang,
        function (v) { meta.setSetting('lang', v); applyTheme(); })),
      row('Kampftempo', 'Wie schnell das Protokoll durchläuft.', picker(
        [{ value: 'langsam', label: 'Langsam' }, { value: 'normal', label: 'Normal' },
         { value: 'schnell', label: 'Schnell' }, { value: 'sofort', label: 'Sofort' }], s.speed,
        function (v) { meta.setSetting('speed', v); })),
      row('Töne', 'Kurze Klänge bei Treffern und Aktionen.', picker(
        [{ value: true, label: 'An' }, { value: false, label: 'Aus' }], s.sound,
        function (v) { meta.setSetting('sound', v); })),
      el('div', { className: 'danger-zone' }, [
        el('h3', { text: 'Gefahrenzone' }),
        el('button', {
          className: 'btn danger', type: 'button',
          onclick: function () {
            U.confirm('Wirklich alles löschen? Pokédex, Erfolge, Statistik und der laufende Run sind dann weg.',
              function () { meta.reset(); App.run = null; applyTheme(); show('title'); U.toast('Alles zurückgesetzt.'); },
              { danger: true, yes: 'Alles löschen' });
          }
        }, 'Fortschritt zurücksetzen')
      ]),
      el('p', { className: 'muted small', text: 'Gespeichert wird ausschließlich im Browser dieses Geräts. Es werden keine Daten übertragen; die Pokémon-Bilder kommen von Pokémon Showdown und PokeAPI.' })
    ]);
  };

  /* ---------- 8) Ende, Töne, Start ---------------------------------------------------- */

  function finishRun() {
    var run = App.run;
    var outcome = run.state === 'victory' ? 'sieg' : 'niederlage';
    var fresh = meta.recordRun(run, outcome);
    meta.clearRun();
    fresh.forEach(function (a) { U.toast('Erfolg freigeschaltet: ' + a.name, 'good'); });
    show('end');
  }

  SCREENS.end = function () {
    var run = App.run;
    var won = run.state === 'victory';
    return el('div', { className: 'end-screen ' + (won ? 'won' : 'lost') }, [
      el('h2', { text: won ? 'Champ!' : 'Der Run endet hier.' }),
      el('p', { className: 'muted', text: won
        ? 'Du hast die Liga bezwungen. Der nächste Aufstieg wartet.'
        : 'Alle Pokémon sind kampfunfähig. Aber der Pokédex bleibt — und der nächste Versuch beginnt stärker.' }),
      el('div', { className: 'stat-grid' }, [
        stat('Regionen', run.region + (won ? 1 : 0)),
        stat('Kämpfe', run.stats.battles),
        stat('Siege', run.stats.wins),
        stat('Fänge', run.stats.catches),
        stat('Relikte', Object.keys(run.relics).length),
        stat('Entwicklungen', run.stats.evolutions),
        stat('Geld verdient', U.money(run.stats.moneyEarned)),
        stat('Runden', run.stats.turns)
      ]),
      el('h3', { className: 'section-label', text: 'Dein Team' }),
      el('div', { className: 'party-strip' }, run.party.map(function (mon) { return U.monCard(mon, {}); })),
      run.box.length ? el('div', {}, [
        el('h3', { className: 'section-label', text: 'In der Box' }),
        el('div', { className: 'party-strip' }, run.box.map(function (mon) { return U.monCard(mon, {}); }))
      ]) : null,
      el('div', { className: 'scene-actions' }, [
        el('button', { className: 'btn big primary', type: 'button', onclick: function () { App.run = null; show('newrun'); } }, 'Neuer Run'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { App.run = null; show('title'); } }, 'Zum Titel')
      ])
    ]);
  };

  /* --- Töne: kurze, synthetische Klänge, keine Dateien -------------------------------- */

  var audio = null;
  function sfx(kind) {
    if (!settings().sound) return;
    try {
      if (!audio) audio = new (root.AudioContext || root.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var now = audio.currentTime;
      var spec = {
        hit: { f: 180, t: 'square', d: 0.09, v: 0.05 },
        heal: { f: 660, t: 'sine', d: 0.16, v: 0.05 },
        faint: { f: 110, t: 'sawtooth', d: 0.35, v: 0.05 },
        mega: { f: 880, t: 'triangle', d: 0.25, v: 0.05 },
        coin: { f: 990, t: 'square', d: 0.08, v: 0.04 },
        select: { f: 440, t: 'sine', d: 0.05, v: 0.03 }
      }[kind];
      if (!spec) return;
      var osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = spec.t;
      osc.frequency.setValueAtTime(spec.f, now);
      if (kind === 'faint') osc.frequency.exponentialRampToValueAtTime(spec.f / 3, now + spec.d);
      if (kind === 'mega') osc.frequency.exponentialRampToValueAtTime(spec.f * 2, now + spec.d);
      gain.gain.setValueAtTime(spec.v, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.d);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + spec.d + 0.02);
    } catch (e) { /* Ton ist Beiwerk */ }
  }

  /* --- Tastatur ------------------------------------------------------------------------ */

  function onKey(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var overlayOpen = $('#overlay').classList.contains('active');
    if (e.key === 'Escape') {
      if (overlayOpen) {
        var boxes = $('#overlay').querySelectorAll('.modal-back');
        var last = boxes[boxes.length - 1];
        if (last && last.close) last.close();
      } else openMenu();
      return;
    }
    if (overlayOpen || App.screen !== 'battle' || !BV || BV.busy) return;
    var moves = App.battle ? App.battle.legalMoves(0) : [];
    if (/^[1-4]$/.test(e.key)) {
      var mv = moves[+e.key - 1];
      if (mv && !mv.disabled) { sfx('select'); submitAction({ type: 'move', index: mv.index }); }
    } else if (e.key.toLowerCase() === 'w') {
      if (App.battle.canSwitch(0)) openSwitchDialog();
    } else if (e.key.toLowerCase() === 'b') {
      openBattleBag();
    } else if (e.key.toLowerCase() === 'a') {
      App.autoPlay = !App.autoPlay;
      U.toast('Auto-Kampf ' + (App.autoPlay ? 'an' : 'aus'));
      renderActions();
      if (App.autoPlay && !BV.busy) awaitInput();
    } else if (e.key.toLowerCase() === 'm') {
      if (App.battle.canMega(App.battle.sides[0].active)) { BV.pendingMega = !BV.pendingMega; renderControls(); }
    }
  }

  /* --- Start ---------------------------------------------------------------------------- */

  function boot() {
    applyTheme();
    doc.addEventListener('keydown', onKey);
    root.addEventListener('beforeunload', function () { autosave(); });
    show('title');
  }

  App.sfx = sfx;
  root.PokelikeApp = App;

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
