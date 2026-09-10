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
    screenArg: null,
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
    // Erst der Pokédex, dann der Run: Wer im Team oder in der Box liegt, steht
    // eingetragen — gleich, ob gefangen, entwickelt, geschenkt oder geschlüpft.
    if (App.run) meta.noteParty(App.run);
    if (App.run && App.run.state !== 'gameover' && App.run.state !== 'victory') meta.saveRun(App.run);
    // Der Browser vergisst eingebettete Seiten gern; die Wolke tut das nicht.
    if (PL.cloud) PL.cloud.touch();
  }

  /* ---------- Der Reise-Automat -------------------------------------------------
   * Ein Schalter, der den ganzen Run übernimmt: er sucht den Weg, betritt die
   * Knoten, entscheidet in den Szenen und schaltet im Kampf den Auto-Kampf an.
   * Was zu tun ist, weiß autopilot.js; hier wird nur gedrückt — und zwar genau
   * die Knöpfe, die auch von Hand gedrückt würden.
   *
   * AUTO.act setzt jede Ansicht selbst: "Wenn der Automat läuft, tu das hier."
   * Ist nichts gesetzt, wartet der Automat einfach weiter.
   * -------------------------------------------------------------------------- */

  var AUTO = { on: false, timer: null, act: null, wasBattleAuto: false, idle: 0, pause: 0 };

  function autoPilot() { return PL.autopilot; }

  function setAuto(on) {
    if (AUTO.on === on) return;
    AUTO.on = on;
    if (on) {
      AUTO.wasBattleAuto = App.autoPlay;
      App.autoPlay = true;                    // im Kampf übernimmt ai.js
    } else {
      App.autoPlay = AUTO.wasBattleAuto;
      if (AUTO.timer) { root.clearTimeout(AUTO.timer); AUTO.timer = null; }
    }
    AUTO.idle = 0;
    renderAutoButton();
    if (App.screen === 'battle' && BV) { renderControls(); if (on && !BV.busy) awaitInput(); }
    U.toast(on ? 'Reise-Automat an — lehn dich zurück.' : 'Reise-Automat aus.');
    if (on) scheduleAuto(240);
  }

  function scheduleAuto(ms) {
    if (!AUTO.on) return;
    if (AUTO.timer) root.clearTimeout(AUTO.timer);
    if (ms === undefined) {
      ms = Math.max(260, delayMs()) + AUTO.pause;
      AUTO.pause = 0;                    // gilt nur für den nächsten Schritt
    }
    AUTO.timer = root.setTimeout(autoStep, ms);
  }

  /** Ein offener Dialog wird zuerst weggeräumt: Hauptknopf, sonst der letzte. */
  function autoCloseModal() {
    var backs = doc.querySelectorAll('#overlay .modal-back');
    if (!backs.length) return false;
    var box = backs[backs.length - 1];
    var btn = box.querySelector('.modal-actions .btn.primary') ||
      box.querySelector('.modal-actions .btn');
    if (btn) btn.click();
    else if (box.close) box.close();
    return true;
  }

  function autoStep() {
    AUTO.timer = null;
    if (!AUTO.on) return;
    if (!App.run || App.run.state === 'gameover' || App.run.state === 'victory') {
      if (App.screen === 'end' || !App.run) { setAuto(false); return; }
    }
    if (App.transitioning || (BV && BV.busy)) { scheduleAuto(300); return; }
    if (autoCloseModal()) { scheduleAuto(); return; }

    if (App.screen === 'battle') { scheduleAuto(400); return; }   // der Kampf läuft
    if (App.screen === 'map') { autoMapStep(); return; }
    if (AUTO.act) {
      var act = AUTO.act;
      AUTO.act = null;
      // Bleibt der Automat irgendwo hängen, gibt er das Steuer zurück,
      // statt still stehenzubleiben.
      try { act(); } catch (err) {
        U.toast('Der Reise-Automat kommt hier nicht weiter — übernimm bitte.', 'bad');
        setAuto(false);
        return;
      }
      scheduleAuto();
      return;
    }

    // Nichts zu tun — zurück zur Karte, wenn ein Run läuft.
    if (++AUTO.idle > 12) { AUTO.idle = 0; if (App.run) show('map'); return; }
    scheduleAuto(400);
  }

  function autoMapStep() {
    var run = App.run;
    if (!run) { setAuto(false); return; }
    var next = autoPilot().bestNode(run);
    if (!next) {
      // Reihe zu Ende: die Karte selbst schiebt weiter, sobald der Knoten fertig ist.
      scheduleAuto(500);
      return;
    }
    AUTO.idle = 0;
    enterNode(next.row, next.col);
  }

  /** Der kleine Knopf in der Ecke — immer sichtbar, immer umschaltbar. */
  function renderAutoButton() {
    var btn = $('#autopilot');
    if (!btn) {
      btn = el('button', {
        id: 'autopilot', className: 'autopilot-btn', type: 'button',
        onclick: function () { setAuto(!AUTO.on); }
      });
      doc.body.appendChild(btn);
    }
    var hidden = !App.run || App.screen === 'title' || App.screen === 'newrun' || App.screen === 'end';
    btn.hidden = hidden;
    btn.className = 'autopilot-btn' + (AUTO.on ? ' on' : '');
    btn.title = AUTO.on
      ? 'Reise-Automat läuft — hier ausschalten und wieder selbst spielen'
      : 'Reise-Automat: sucht den Weg, kämpft, kauft und entscheidet von allein';
    clear(btn);
    btn.appendChild(el('span', { className: 'autopilot-icon', text: AUTO.on ? '⏸' : '🤖' }));
    btn.appendChild(el('span', { className: 'autopilot-label', text: AUTO.on ? 'Automat läuft' : 'Automat' }));
  }

  var SCREENS = {};

  function show(name, arg) {
    App.screen = name;
    App.screenArg = arg || null;
    AUTO.act = null;                    // eine neue Ansicht, eine neue Aufgabe
    var host = $('#screen');
    clear(host);
    doc.body.setAttribute('data-screen', name);
    updateMusic(name);
    var view = SCREENS[name];
    if (!view) { host.appendChild(el('p', { text: 'Unbekannter Bildschirm: ' + name })); return; }
    host.appendChild(view(arg));
    renderHeader();
    renderAutoButton();
    host.scrollTop = 0;
    scheduleAuto();
  }
  App.show = show;

  /** Wählt das Stück, das zum gerade gezeigten Bildschirm passt. */
  function updateMusic(screen) {
    if (!PL.audio) return;
    if (!settings().music) { PL.audio.stop(); return; }
    var run = App.run, bt = App.battle;
    if (screen === 'battle' && bt) {
      PL.audio.play(PL.audio.trackFor(
        bt.legendary ? 'legend' : bt.aiLevel >= 3 ? 'boss' : 'battle', bt.biome));
      return;
    }
    // Jede Region hat ihr eigenes Stück; in der Liga spielt keines von ihnen.
    var region = (run && run.leagueStage < 0) ? run.currentRegion() : null;
    PL.audio.setRegion(region ? region.gen : 0);
    var biome = 'wiese';
    if (run && PL.scenery && run.leagueStage < 0) {
      var list = PL.scenery.regionBiomes[region.id];
      biome = (list && list[0]) || 'wiese';
    } else if (run && run.leagueStage >= 0) biome = 'liga';
    if (screen === 'scene' && run && run.scene && run.scene.kind === 'shop') biome = 'stadt';
    PL.audio.play(PL.audio.trackFor('map', biome));
  }

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
      // Im Legendären Run zählt nicht die Region, sondern wie viele Legenden
      // schon gefallen sind. Das ist der einzige Fortschritt, den es dort gibt.
      mid.appendChild(run.mode === 'legenden'
        ? el('span', { className: 'chip chip-region', title: 'Besiegte Legenden',
            text: '🌟 ' + run.legendenBesiegt() + '/' + PL.Run.legendenGesamt() })
        : el('span', { className: 'chip chip-region', text: '👑 ' + (run.leagueStage >= 0 ? 'Finale' : 'Region ' + (run.region + 1) + '/' + (run.mode === 'endlos' ? '∞' : run.totalRegions())) }));
      mid.appendChild(el('span', { className: 'chip chip-money', text: '💰 ' + U.money(run.money) }));
      mid.appendChild(el('span', { className: 'chip chip-cap', title: 'Höchstes erreichbares Level' }, [
        el('span', { text: '⬆\u00a0' }),
        el('span', { className: 'cap-word', text: 'Lv ' }),
        el('span', { text: String(run.levelCap) })
      ]));
      if (run.ascension) mid.appendChild(el('span', { className: 'chip warn',
        text: (run.mode === 'legenden' ? '🌟 ' : '🔥 ') + meta.stufenName(run.ascension) }));
      if (run.nuzlocke) mid.appendChild(el('span', { className: 'chip warn', text: '💀 Nuzlocke' }));
    }

    var right = el('div', { className: 'topbar-right' });
    var mark = saveMark();
    if (mark) right.appendChild(mark);
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

  /** Ein Knopf, der aus dem Beutel heraus so viel heilt wie möglich. */
  function quickHealButton() {
    var run = App.run;
    var btn = el('button', {
      className: 'btn small heal', type: 'button',
      disabled: !run.needsHealing(),
      title: 'Belebt, heilt und kuriert mit den Gegenständen im Beutel — vom kleinsten passenden zuerst.',
      onclick: function () {
        var used = run.quickHeal();
        if (!used.length) {
          U.toast('Nichts im Beutel, was hier helfen würde.', 'bad');
          return;
        }
        sfx('heal');
        U.toast('Verbraucht: ' + used.join(', '));
        autosave();
        show(App.screen === 'team' ? 'team' : 'map');
      }
    }, '🧪 Schnellheilung');
    return btn;
  }

  /** Der Nuzlocke-Friedhof: wer gefallen ist, warum und wo. */
  function openGraveyard() {
    var run = App.run;
    var list = (run.graveyard || []).slice().reverse();
    var content = list.length
      ? el('div', { className: 'grave-grid' }, list.map(function (g) {
        return el('div', { className: 'grave' }, [
          el('div', { className: 'grave-stone' }, [
            el('span', { className: 'grave-cross', text: '✝' }),
            U.sprite(dex.species[g.sp], { shiny: g.shiny, className: 'grave-sprite' })
          ]),
          el('strong', { text: g.name + (g.shiny ? ' ✦' : '') }),
          el('span', { className: 'muted', text: 'Lv ' + g.lvl + ' · ' + g.region }),
          el('span', { className: 'grave-cause', text: g.by
            ? 'gefallen gegen ' + g.by + (g.against ? ' (' + g.against + ')' : '')
            : 'gefallen im Kampf' })
        ]);
      }))
      : el('p', { text: 'Noch niemand. So soll es bleiben.' });
    U.modal({
      title: '🪦 Friedhof', wide: true,
      content: el('div', {}, [
        el('p', { className: 'muted', text: 'Im Nuzlocke bleibt ein besiegtes Pokémon fort. Hier stehen sie alle.' }),
        content
      ]),
      actions: [{ label: 'Schließen', primary: true }]
    });
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

  /**
   * Der Tages-Run bekommt einen eigenen Platz auf dem Titel: Er ist der eine
   * Modus, bei dem alle dasselbe spielen, und der einzige mit einem Ergebnis,
   * das sich vergleichen lässt.
   */
  function tagesBanner() {
    var stand = meta.tagesStand();
    var gespielt = !!stand.eigen;
    var unterzeile = gespielt
      ? (stand.eigen.gewonnen ? 'Heute: Liga bezwungen 👑' : 'Heute: Region ' + stand.eigen.region + ' von 6')
      : 'Für alle derselbe Startwert · noch nicht gespielt';
    return el('button', {
      className: 'tages-banner' + (gespielt ? ' fertig' : ''), type: 'button',
      onclick: function () { show('daily'); }
    }, [
      el('span', { className: 'tages-icon', text: '📅' }),
      el('span', {}, [
        el('strong', { text: 'Tages-Run' }),
        el('span', { className: 'muted small block', text: unterzeile })
      ]),
      el('span', { className: 'tages-pfeil', text: '›' })
    ]);
  }

  /**
   * Hat jemand einen Run geschickt? Dann steht die Einladung ganz oben auf
   * dem Titelbildschirm — mit einem Knopf, der genau dieselbe Welt startet.
   * Das Startpokémon wählt trotzdem jeder selbst; alles andere hängt am
   * Startwert und ist deshalb für beide gleich.
   */
  function einladungsBanner() {
    var ein = App.einladung;
    if (!ein) return null;
    return el('div', { className: 'einladung' }, [
      el('div', {}, [
        el('strong', { text: '🔗 Ein Run wurde dir geschickt' }),
        el('div', { className: 'muted small', text:
          ein.modusName + (ein.aufstieg ? ' · ' + meta.stufenName(ein.aufstieg) : '') +
          (ein.nuzlocke ? ' · Nuzlocke' : '') + ' · Startwert ' + ein.startwert })
      ]),
      el('div', { className: 'setting-actions' }, [
        el('button', { className: 'btn primary', type: 'button', onclick: function () {
          if (meta.hasRun()) {
            U.confirm('Der laufende Run wird dabei gelöscht. Trotzdem den geschickten Run spielen?',
              function () { show('newrun', { einladung: ein }); }, { danger: true });
          } else show('newrun', { einladung: ein });
        } }, 'Diesen Run spielen'),
        el('button', { className: 'btn', type: 'button', onclick: function () {
          App.einladung = null;
          show('title');
        } }, 'Danke, nein')
      ])
    ]);
  }

  /** Wie viele Wochenaufträge noch offen sind — als Zahl am Knopf. */
  function offeneAuftraege() {
    try {
      return meta.wochenStand().auftraege.filter(function (a) { return !a.geschafft; }).length;
    } catch (e) { return 0; }
  }

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
      profileBar(),
      einladungsBanner(),
      tagesBanner(),
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
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('saves'); } }, '💾 Spielstände'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('dex'); } }, '📖 Pokédex'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('sammlung'); } },
          '🎁 Sammlung' + (offeneAuftraege() ? ' (' + offeneAuftraege() + ')' : '')),
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('stats'); } }, '📊 Statistik'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { show('settings'); } }, '⚙ Einstellungen')
      ]),
      el('div', { className: 'title-stats' }, [
        stat('Runs', m.runs), stat('Siege', m.wins),
        stat('Pokédex', d.caught + ' / ' + d.total),
        stat('Schillernde', d.shinies),
        stat('Beste Region', m.bestRegion + 1)
      ]),
      saveNote()
    ]);
    return wrap;
  };

  /**
   * Ein kleines Zeichen in der Kopfzeile, das sagt, wo der Stand liegt:
   * Wolke, Browser, oder gar nirgends. Anklicken führt zu den Spielständen.
   */
  function saveMark() {
    var cloud = PL.cloud ? PL.cloud.state() : null;
    var text, cls, title;
    if (cloud && cloud.available) {
      text = '☁';
      cls = 'chip cloud';
      title = 'Der Spielstand liegt in der Wolke — Code ' + (cloud.code || 'wird angelegt');
    } else if (!meta.available()) {
      text = '⚠';
      cls = 'chip cloud off';
      title = 'Dieser Browser lässt kein Speichern zu — der Fortschritt geht beim Schließen verloren';
    } else {
      return null;
    }
    return el('button', {
      className: cls, type: 'button', title: title,
      style: { cursor: 'pointer' },
      onclick: function () { show('saves'); }
    }, text);
  }

  /* ---------- Wolkenspeicher ----------------------------------------------------
   * Der Browser wirft den Speicher eingebetteter Seiten manchmal weg. Wo die
   * veröffentlichte Seite einen eigenen Speicher hat, liegt der Stand deshalb
   * zusätzlich dort — unter einem Spielstand-Code, der ihn auf jedem Gerät
   * zurückholt.
   * -------------------------------------------------------------------------- */

  /**
   * Fragt beim Start, ob es einen Wolkenspeicher gibt. Liegt dort ein neuerer
   * Stand als im Browser, wird er angeboten — ungefragt überschrieben wird
   * nichts, außer der Browser hat ohnehin nichts zu bieten.
   */
  function startCloud() {
    if (!PL.cloud) return;
    PL.cloud.connect().then(function (ok) {
      if (!ok) { renderHeader(); return; }
      if (!PL.cloud.code()) {
        // Neuer Spieler an diesem Gerät: Der erste Stand legt den Code an.
        if (meta.hasRun() || meta.load().runs > 0) PL.cloud.touch();
        renderHeader();
        return;
      }
      PL.cloud.pull().then(function (res) {
        if (!res.ok) { renderHeader(); return; }
        var leer = !meta.hasRun() && meta.load().runs === 0 &&
          Object.keys(meta.load().caught).length === 0;
        if (leer) {
          applyCloudSave(res.blob, true);
          return;
        }
        // Beides da: Der Spieler entscheidet, welcher Stand gilt.
        var wann = res.saved ? new Date(res.saved).toLocaleString('de-DE') : 'unbekannt';
        U.modal({
          title: 'Spielstand aus der Wolke',
          content: el('div', {}, [
            el('p', { text: 'In der Wolke liegt ein Stand von ' + wann + '. ' +
              'Im Browser liegt ebenfalls einer.' }),
            el('p', { className: 'muted small', text: 'Code: ' + res.code })
          ]),
          actions: [
            { label: 'Wolke laden', primary: true, onClick: function () { applyCloudSave(res.blob, true); } },
            { label: 'Browser behalten', onClick: function () { PL.cloud.push(); } }
          ]
        });
      });
    });
  }

  function applyCloudSave(blob, announce) {
    var res = meta.importSave(blob);
    if (!res.ok) { U.toast(res.text, 'bad'); return false; }
    App.run = null;
    App.battle = null;
    applyTheme();
    if (announce) U.toast('Spielstand aus der Wolke geholt.', 'good');
    show('title');
    return true;
  }

  /** Der Abschnitt im Spielstände-Bildschirm. */
  function cloudSection(redraw) {
    if (!PL.cloud) return null;
    var st = PL.cloud.state();
    var host = el('div', { className: 'cloud-box' });

    if (st.unknown) {
      host.appendChild(el('p', { className: 'muted', text: 'Wolkenspeicher wird geprüft …' }));
      PL.cloud.connect().then(function () { redraw(); });
      return host;
    }

    if (!st.available) {
      host.appendChild(embedded() ? el('p', {}, [
        el('strong', { text: '☁ Kein Wolkenspeicher hier. ' }),
        'Das Spiel läuft in einem Rahmen auf fremder Adresse, und manche Browser ' +
        'werfen den Speicher solcher Seiten weg, sobald der Tab zugeht — wenn dir ' +
        'dein Fortschritt verloren geht, liegt es daran. Öffne das Spiel unter ' +
        'seiner eigenen Adresse, dann hält der Speicher wie bei jeder normalen ' +
        'Seite; oder sichere den Stand hier unten als Text.'
      ]) : el('p', {}, [
        el('strong', { text: '💾 Alles im Browser dieses Geräts. ' }),
        'Das Spiel läuft unter seiner eigenen Adresse — der Speicher hält hier ' +
        'wie bei jeder normalen Seite: geschlossene Tabs, Neustarts und ' +
        'Browser-Updates überstehen ihn. Nur ein geleerter Browserspeicher oder ' +
        'ein Gerätewechsel nicht; dafür gibt es unten die Sicherung.'
      ]));
      return host;
    }

    var codeLine = el('div', { className: 'cloud-code' }, [
      el('span', { className: 'muted', text: 'Dein Spielstand-Code:' }),
      el('code', { text: st.code || '—' }),
      st.code ? el('button', {
        className: 'btn small', type: 'button',
        onclick: function () {
          try { root.navigator.clipboard.writeText(st.code); U.toast('Code kopiert.'); }
          catch (e) { U.toast('Code: ' + st.code); }
        }
      }, '📋') : null
    ]);

    host.appendChild(el('p', {}, [
      el('strong', { text: '☁ Wolkenspeicher aktiv. ' }),
      'Dein Fortschritt liegt außerhalb des Browsers und übersteht geschlossene ' +
      'Tabs, geleerte Speicher und Gerätewechsel. Notier dir den Code — mit ihm ' +
      'holst du deinen Stand überall zurück.'
    ]));
    host.appendChild(codeLine);
    host.appendChild(el('div', { className: 'scene-actions' }, [
      el('button', {
        className: 'btn small', type: 'button',
        onclick: function () {
          PL.cloud.push().then(function (ok) {
            U.toast(ok ? 'In die Wolke gesichert.' : 'Das ging schief.', ok ? 'good' : 'bad');
            redraw();
          });
        }
      }, '☁ Jetzt sichern'),
      el('button', {
        className: 'btn small', type: 'button',
        onclick: function () {
          U.prompt('Spielstand-Code eingeben:', '', function (text) {
            if (!text) return;
            var norm = PL.cloud.normalize(text);
            if (!norm) { U.toast('Das sieht nicht nach einem Code aus.', 'bad'); return; }
            PL.cloud.pull(norm).then(function (res) {
              if (!res.ok) { U.toast(res.text, 'bad'); return; }
              U.confirm('Dieser Stand ersetzt alles, was hier gerade liegt. Weiter?', function () {
                PL.cloud.setCode(norm);
                applyCloudSave(res.blob, true);
              }, { danger: true });
            });
          }, { title: 'Stand von woanders holen', maxlength: 20 });
        }
      }, '⤵ Code eingeben')
    ]));
    return host;
  }

  /* ---------- Profile und Speicherplätze ---------------------------------------
   * Speichern wie in einem richtigen Spiel: Jeder am Gerät hat sein eigenes
   * Profil mit eigenem Pokédex, eigenen Erfolgen und eigenen Plätzen, und in
   * jedem Profil liegen drei Plätze plus der Platz, auf den das Spiel von
   * selbst schreibt.
   * -------------------------------------------------------------------------- */

  /** Die Zeile unter dem Titel: Wer spielt gerade? */
  function profileBar() {
    var p = meta.activeProfile();
    return el('div', { className: 'profile-bar' }, [
      el('span', { className: 'profile-who' }, ['👤 ', el('strong', { text: p ? p.name : 'Spieler 1' })]),
      el('button', {
        className: 'btn small', type: 'button',
        title: 'Profil wechseln, anlegen oder umbenennen',
        onclick: openProfiles
      }, 'Profil wechseln')
    ]);
  }

  function openProfiles() {
    var box = U.modal({
      title: 'Wer spielt?',
      wide: true,
      content: profileList(function () { box.close(); openProfiles(); }),
      actions: [{ label: 'Schließen' }]
    });
  }

  function profileList(redraw) {
    var activeId = meta.activeProfileId();
    var rows = meta.profiles().map(function (p) {
      var mine = p.id === activeId;
      return el('div', { className: 'profile-row' + (mine ? ' active' : '') }, [
        el('button', {
          className: 'profile-pick', type: 'button',
          onclick: function () {
            if (!mine) {
              meta.switchProfile(p.id);
              App.run = null;
              App.battle = null;
              applyTheme();
              U.toast('Profil: ' + p.name);
            }
            show('title');
          }
        }, [
          el('strong', { text: p.name }),
          el('span', { className: 'muted small', text: mine ? 'gerade aktiv' : 'wechseln' })
        ]),
        el('button', {
          className: 'btn small', type: 'button', title: 'Umbenennen',
          onclick: function () {
            U.prompt('Neuer Name für dieses Profil:', p.name, function (name) {
              if (name) { meta.renameProfile(p.id, name); redraw(); }
            });
          }
        }, '✎'),
        meta.profiles().length > 1 ? el('button', {
          className: 'btn small danger', type: 'button', title: 'Profil löschen',
          onclick: function () {
            U.confirm('»' + p.name + '« mit allem Fortschritt und allen Plätzen löschen?', function () {
              meta.deleteProfile(p.id);
              if (p.id === activeId) { App.run = null; App.battle = null; }
              redraw();
            }, { danger: true });
          }
        }, '🗑') : null
      ]);
    });
    rows.push(el('button', {
      className: 'btn', type: 'button',
      onclick: function () {
        U.prompt('Name für das neue Profil:', '', function (name) {
          meta.createProfile(name);
          App.run = null;
          App.battle = null;
          applyTheme();
          show('title');
        });
      }
    }, '＋ Neues Profil'));
    return el('div', { className: 'profile-list' }, rows);
  }

  /** Ein Platz als Karte: Was steht da, und was kann man damit machen? */
  function slotCard(slot, redraw) {
    var info = slot.info;
    var head = el('div', { className: 'slot-head' }, [
      el('strong', { text: slot.auto ? '⟳ Letzter Stand' : 'Platz ' + slot.n }),
      info && info.name ? el('span', { className: 'slot-name', text: info.name }) : null
    ]);

    var body;
    if (slot.empty) {
      body = el('p', { className: 'muted', text: 'Leer.' });
    } else if (slot.outdated) {
      body = el('p', { className: 'bad', text: 'Aus einer älteren Fassung — lässt sich nicht mehr laden.' });
    } else {
      body = el('div', { className: 'slot-body' }, [
        el('div', { className: 'slot-line' }, [
          el('span', { text: info.regionName + ' · Weg ' + info.row }),
          el('span', { className: 'muted', text: 'Ø Level ' + info.level }),
          el('span', { className: 'muted', text: U.money(info.money) })
        ]),
        el('div', { className: 'slot-team' }, info.team.map(function (m) {
          var sp = dex.sp(m.sp);
          return el('img', {
            className: 'slot-mon' + (m.hp <= 0 ? ' out' : ''), alt: T.species(sp),
            title: T.species(sp) + ' Lv ' + m.lvl,
            src: PL.sprite.chain(sp, { shiny: m.shiny })[0]
          });
        })),
        el('div', { className: 'slot-line muted small' }, [
          el('span', { text: info.mode + (info.nuzlocke ? ' · Nuzlocke' : '') +
            (info.ascension ? ' · ' + meta.stufenName(info.ascension) : '') }),
          el('span', { text: info.saved ? new Date(info.saved).toLocaleString('de-DE') : 'läuft gerade' })
        ])
      ]);
    }

    var buttons = [];
    if (!slot.auto) {
      buttons.push(el('button', {
        className: 'btn small', type: 'button', disabled: !App.run,
        title: App.run ? 'Den laufenden Run hier ablegen' : 'Es läuft gerade kein Run',
        onclick: function () {
          var write = function () {
            meta.saveSlot(slot.n, App.run, App.run.currentRegion ? App.run.currentRegion().name : '');
            U.toast('Auf Platz ' + slot.n + ' gespeichert.', 'good');
            redraw();
          };
          if (slot.empty) write();
          else U.confirm('Platz ' + slot.n + ' überschreiben?', write);
        }
      }, '💾 Speichern'));
    }
    buttons.push(el('button', {
      className: 'btn small primary', type: 'button', disabled: slot.empty || slot.outdated,
      onclick: function () {
        var load = function () {
          var run = slot.auto ? meta.loadRun() : meta.loadSlot(slot.n);
          if (!run) { U.toast('Dieser Platz lässt sich nicht laden.', 'bad'); return; }
          App.run = run;
          App.battle = null;
          meta.saveRun(run);
          U.toast('Weiter geht’s!', 'good');
          show('map');
        };
        if (App.run) U.confirm('Der laufende Run wird dabei ersetzt. Trotzdem laden?', load, { danger: true });
        else load();
      }
    }, '▶ Laden'));
    if (!slot.auto) {
      buttons.push(el('button', {
        className: 'btn small danger', type: 'button', disabled: slot.empty,
        onclick: function () {
          U.confirm('Platz ' + slot.n + ' löschen?', function () {
            meta.deleteSlot(slot.n);
            redraw();
          }, { danger: true });
        }
      }, '🗑'));
    }

    return el('div', { className: 'slot-card' + (slot.empty ? ' empty' : '') }, [
      head, body, el('div', { className: 'slot-actions' }, buttons)
    ]);
  }

  SCREENS.saves = function () {
    var host = el('div', { className: 'saves-screen' });

    function draw() {
      clear(host);
      var p = meta.activeProfile();
      host.appendChild(el('div', { className: 'team-head' }, [
        el('h2', { text: 'Spielstände' }),
        el('button', {
          className: 'btn', type: 'button',
          onclick: function () { show(App.run ? 'map' : 'title'); }
        }, 'Zurück')
      ]));
      host.appendChild(el('p', { className: 'muted' }, [
        'Profil ', el('strong', { text: p ? p.name : 'Spieler 1' }),
        ' — jedes Profil hat seinen eigenen Pokédex, seine eigenen Erfolge und seine eigenen Plätze. ',
        el('button', { className: 'btn small', type: 'button', onclick: openProfiles }, 'Profil wechseln')
      ]));
      host.appendChild(el('div', { className: 'slot-grid' },
        meta.slots().map(function (slot) { return slotCard(slot, draw); })));
      host.appendChild(el('p', { className: 'section-label', text: 'Wo dein Stand liegt' }));
      var cloud = cloudSection(draw);
      if (cloud) host.appendChild(cloud);
      host.appendChild(el('p', { className: 'section-label', text: 'Auf ein anderes Gerät mitnehmen' }));
      host.appendChild(el('div', { className: 'scene-actions' }, [
        el('button', { className: 'btn', type: 'button', onclick: openSaveExport }, '⬇ Sichern'),
        el('button', { className: 'btn', type: 'button', onclick: openSaveImport }, '⬆ Einspielen')
      ]));
      if (!meta.available()) {
        host.appendChild(el('p', { className: 'warn-note',
          text: 'Dieser Browser erlaubt kein Speichern — hier lässt sich nichts ablegen.' }));
      }
    }

    draw();
    return host;
  };

  /**
   * Läuft das Spiel in einem Rahmen auf fremder Adresse? Nur dann ist der
   * Browserspeicher gefährdet — als eigene Seite hält er wie überall sonst.
   */
  function embedded() {
    try { return root.top !== root.self; } catch (e) { return true; }
  }

  /** Ein Satz darüber, wie sicher der Fortschritt gerade liegt. */
  function saveNote() {
    if (!meta.available()) {
      return el('p', { className: 'warn-note', text: 'Hinweis: Dieser Browser erlaubt kein ' +
        'Speichern — der Fortschritt geht beim Schließen verloren.' });
    }
    var cloud = PL.cloud ? PL.cloud.state() : null;
    if (cloud && cloud.available) return null;              // Wolke trägt, nichts zu sagen
    if (cloud && cloud.unknown) return null;                // wird noch geprüft
    if (!embedded()) return null;                           // eigene Seite, alles normal
    return el('p', { className: 'muted small' }, [
      'Dein Fortschritt liegt im Speicher dieses Browsers. Sollte er beim nächsten ' +
      'Öffnen fehlen, wirft dein Browser den Speicher eingebetteter Seiten weg — ',
      el('button', {
        className: 'btn small', type: 'button',
        onclick: function () { show('saves'); }
      }, 'dann hier sichern'),
      '.'
    ]);
  }

  function stat(label, value) {
    return el('div', { className: 'stat-tile' }, [
      el('strong', { text: String(value) }), el('span', { text: label })
    ]);
  }

  SCREENS.newrun = function (arg) {
    var chosen = { mode: 'standard', ascension: 0, nuzlocke: false, starter: null };
    var maxAsc = meta.maxAscension();

    // Ein geschickter Run bringt Modus, Aufstieg und Startwert mit. Nur beim
    // Aufstieg gilt weiter die eigene Freischaltung — sonst könnte ein Link
    // Stufen öffnen, die man sich nicht erspielt hat.
    var einladung = arg && arg.einladung;
    if (einladung) {
      chosen.mode = einladung.modus;
      chosen.ascension = Math.min(einladung.aufstieg, maxAsc);
      chosen.nuzlocke = einladung.nuzlocke;
      chosen.seed = einladung.startwert;
      App.einladung = null;
    }
    if (arg && arg.tagesRun) chosen.mode = 'taeglich';

    var modeBox = el('div', { className: 'choice-row' });
    Object.keys(PL.Run.MODES).forEach(function (key) {
      var mode = PL.Run.MODES[key];
      // Der Legendäre Run ist kein Modus zum Anklicken, sondern die letzte
      // Stufe. Er steht weiter unten.
      if (mode.versteckt) return;
      var btn = el('button', {
        className: 'choice' + (key === chosen.mode ? ' selected' : ''), type: 'button',
        'data-modus': key,
        onclick: function () {
          if (PL.Run.STUFEN[chosen.ascension].legenden) return;   // die Stufe bestimmt den Weg
          chosen.mode = key;
          Array.prototype.forEach.call(modeBox.children, function (c) { c.classList.remove('selected'); });
          btn.classList.add('selected');
          if (key === 'taeglich') U.toast('Tages-Run: fester Startwert vom ' + meta.heute());
        }
      }, [el('strong', { text: mode.name }), el('span', { text: mode.desc })]);
      modeBox.appendChild(btn);
    });

    // Fünf Stufen mit Namen statt elf Zahlen: Was eine Stufe ändert, steht
    // dran, bevor man sie wählt. Die sechste ist keine Stufe mehr, sondern
    // ein eigener Weg — sie schaltet den Modus gleich mit um.
    var stufenListe = el('div', { className: 'stufen-liste' });
    var stufenKnoepfe = [];

    function waehleStufe(i) {
      chosen.ascension = i;
      var legenden = !!PL.Run.STUFEN[i].legenden;
      if (legenden) chosen.mode = 'legenden';
      else if (chosen.mode === 'legenden') chosen.mode = 'standard';
      stufenKnoepfe.forEach(function (b, k) { b.classList.toggle('selected', k === i); });
      Array.prototype.forEach.call(modeBox.children, function (c) {
        c.classList.toggle('selected', !legenden && c.getAttribute('data-modus') === chosen.mode);
      });
      modeBox.classList.toggle('stillgelegt', legenden);
      modusNotiz.hidden = !legenden;
    }

    var modusNotiz = el('p', { className: 'muted small', hidden: true, text:
      'Der Legendäre Run bringt seinen eigenen Weg mit — die Moduswahl darüber ruht so lange.' });

    PL.Run.STUFEN.forEach(function (stufe, i) {
      var offen = i <= maxAsc;
      var btn = el('button', {
        className: 'stufe' + (stufe.legenden ? ' legendaer' : '') + (offen ? '' : ' locked') +
          (i === chosen.ascension ? ' selected' : ''),
        type: 'button', disabled: !offen,
        title: offen ? '' : 'Gewinne einen Run auf Stufe ' + i + ', um sie freizuschalten.',
        onclick: function () { waehleStufe(i); }
      }, [
        el('span', { className: 'stufe-kopf' }, [
          el('strong', { text: 'Stufe ' + (i + 1) + ' — ' + stufe.name }),
          offen ? null : el('span', { className: 'lock', text: '🔒' })
        ]),
        el('span', { className: 'stufe-kurz', text: stufe.kurz }),
        el('ul', { className: 'stufe-punkte' }, stufe.punkte.map(function (t) {
          return el('li', { text: t });
        }))
      ]);
      stufenKnoepfe.push(btn);
      stufenListe.appendChild(btn);
    });
    waehleStufe(Math.min(chosen.ascension, maxAsc));

    var nuzBtn = el('button', {
      className: 'toggle' + (chosen.nuzlocke ? ' on' : ''), type: 'button',
      onclick: function () {
        chosen.nuzlocke = !chosen.nuzlocke;
        nuzBtn.classList.toggle('on', chosen.nuzlocke);
        nuzBtn.querySelector('.toggle-state').textContent = chosen.nuzlocke ? 'an' : 'aus';
      }
    }, [
      el('strong', { text: 'Nuzlocke' }),
      el('span', { text: 'Besiegte Pokémon verlassen das Team für immer.' }),
      el('span', { className: 'toggle-state', text: chosen.nuzlocke ? 'an' : 'aus' })
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
        el('p', { className: 'muted', text:
          'Stufe 1 ist das Spiel, wie es gedacht ist. Jede weitere Stufe schaltet mehrere Regeln auf einmal an — ' +
          'und die nächste schaltest du frei, indem du auf der davor gewinnst.' }),
        stufenListe,
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
    // Ein geschickter Run bringt seinen Startwert mit; der Tages-Run holt sich
    // seinen aus dem Datum und schlägt alles andere.
    var seed = chosen.seed;
    if (chosen.mode === 'taeglich') seed = meta.tagesStartwert();
    // Was die Sammlung und die Wochenaufträge eingebracht haben, kommt hier
    // in den Beutel. Der Tages-Run bekommt bewusst nichts.
    var vorteil = meta.startVorteil(chosen.mode);
    App.run = new PL.Run({
      mode: chosen.mode, ascension: chosen.ascension, nuzlocke: chosen.nuzlocke,
      starter: chosen.starter, seed: seed, vorteil: vorteil
    });
    App.run.party.forEach(function (m) { meta.noteCaught(m); });
    meta.save();
    autosave();
    zeigeVorteil(vorteil);
    // Ein erspieltes Relikt darf man sich aussuchen, bevor es losgeht.
    if (App.run.startRelikte > 0) {
      App.run.startRelikte--;
      openScene(App.run.makeRelicChoice(App.run.rng, 3,
        'Aus deiner Sammlung: Ein Relikt darfst du dir aussuchen, bevor der Weg beginnt.'));
      return;
    }
    show('map');
  }

  /** Sagt in einem Satz, was der Run an Sammlungslohn mitbekommen hat. */
  function zeigeVorteil(vorteil) {
    if (!vorteil) return;
    var teile = [];
    if (vorteil.geld) teile.push(U.money(vorteil.geld));
    if (vorteil.baelle) teile.push(vorteil.baelle + ' Bälle');
    if (vorteil.traenke) teile.push(vorteil.traenke + ' Tränke');
    if (vorteil.beleber) teile.push(vorteil.beleber + ' Beleber');
    if (!teile.length) return;
    U.toast('Aus deiner Sammlung: ' + teile.join(', '), 'good');
  }

  function continueRun() {
    var run = meta.loadRun();
    if (!run) {
      U.toast('Kein fortsetzbarer Run gefunden — ein Stand aus einer älteren Fassung wurde verworfen. ' +
        'Pokédex und Erfolge bleiben erhalten.', 'bad');
      show('title');
      return;
    }
    App.run = run;
    meta.noteParty(run);
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
          run.bossHint
            ? el('span', { className: 'hint', text: '🔎 ' + run.bossHint[0] + ' setzt auf ' + T.type(run.bossHint[1]) })
            : (run.leagueStage < 0 ? el('span', { text: 'Nur ein Weg führt zum Arenaleiter.' }) : null)
        ])
      ]),
      stage,
      el('div', { className: 'party-head' }, [
        el('h3', { className: 'section-label', text: 'Dein Team' }),
        quickHealButton(),
        run.nuzlocke && run.graveyard && run.graveyard.length
          ? el('button', { className: 'btn small', type: 'button', onclick: openGraveyard },
              '🪦 Friedhof (' + run.graveyard.length + ')')
          : null
      ]),
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
    if (App.transitioning) return;          // während des Wischers nichts annehmen
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
    // Vor dem Weitergehen räumt der Automat auf: Sonderbonbons, Vitamine,
    // Tragegegenstände, und wer aus der Box besser ist, kommt ins Team.
    if (AUTO.on) {
      autoPilot().careForTeam(run).forEach(function (line) { U.toast(line); });
      var swap = autoPilot().manageParty(run);
      if (swap) U.toast(swap);
    }
    run.closeScene();
    if (run.state === 'victory' || run.state === 'gameover') { finishRun(); return; }
    // Nach einer vollen Runde im Endlosmodus wartet ein Segen.
    if (run.pendingBlessing) {
      var blessing = run.pendingBlessing;
      run.setScene(blessing);
      show('scene', { type: 'blessing', scene: blessing });
      return;
    }
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
    bt.sides[1].team.forEach(function (m) { meta.noteSeen(m.sp); });
    meta.save();
    if (bt.banter) bt.log.splice(1, 0, { k: 'banter', s: '»' + bt.banter.before + '«' });
    if (PL.audio) PL.audio.play(PL.audio.trackFor(
      bt.legendary ? 'legend' : bt.aiLevel >= 3 || bt.rival ? 'boss' : 'battle', bt.biome));
    sfx('encounter');
    if (PL.fx) {
      App.transitioning = true;
      PL.fx.wipe(function () { show('battle'); }, function () { App.transitioning = false; });
    } else show('battle');
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
      pendingMega: null,
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

    // Zu Beginn stehen die Trainer auf den Plätzen; sie weichen erst, wenn
    // das Protokoll das erste Pokémon aussendet.
    BV.intro = bt.turn === 0 && PL.scenery;
    if (BV.intro) {
      placeTrainer(0, 'Spieler', true, null, settings().figur || 'rot');
      if (bt.trainer) placeTrainer(1, bt.trainer.cls, false, bt.trainer.look, bt.trainer.leader);
      else renderSide(1);
    } else {
      renderSide(0);
      renderSide(1);
    }
    renderField();
    playLog(bt.log.slice(), function () { awaitInput(); });
    return wrap;
  };

  /** Stellt eine Trainerfigur auf einen Standplatz. */
  function placeTrainer(sideId, cls, back, look, who) {
    var slot = BV.slots[sideId];
    if (!slot) return;
    var old = slot.querySelector('.mon-art, .trainer-art');
    if (old) slot.removeChild(old);
    // Namentlich bekannte Gegner sollen immer gleich aussehen — deshalb geht
    // ihr Name in den Startwert und nicht die Kulisse.
    var name = who || (App.battle.trainer && App.battle.trainer.leader) || '';
    var seed = PL.util.hashSeed(name || ((cls || '') + sideId + (App.battle.biome || '')));
    slot.appendChild(el('div', { className: 'trainer-art' },
      el('img', {
        className: 'trainer-sprite', alt: '',
        src: PL.scenery.trainer(cls, seed, back, look || null, name)
      })));
  }

  /** Lässt eine Trainerfigur zur Seite gehen, bevor das Pokémon erscheint. */
  function dismissTrainer(sideId, done) {
    var slot = BV.slots[sideId];
    var art = slot && slot.querySelector('.trainer-art');
    if (!art || !art.animate || (PL.fx && PL.fx.reduced())) { if (art) art.remove(); done(); return; }
    var dir = sideId === 0 ? -1 : 1;
    var anim = art.animate([
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(' + dir * 90 + 'px)', opacity: 0 }
    ], { duration: 260, easing: 'ease-in' });
    anim.onfinish = function () { art.remove(); done(); };
  }

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

    // Ein verwandeltes Pokémon sieht auch so aus: Mega- und Gigadynamax-Form
    // bringen ihre eigene Bildnummer mit (siehe tools/build-data.mjs).
    var formPid = (act.mega && act.megaForm && act.megaForm.pid) ||
      (act.gmax && act.gmaxForm && act.gmaxForm.pid) || 0;

    var art = el('div', { className: 'mon-art' }, [
      U.sprite(mon, { back: isMine, eager: true, ground: true, pid: formPid,
        className: 'battle-sprite' + (mon.hp <= 0 ? ' fainted' : '') }),
      mon.shiny ? el('span', { className: 'shiny-mark', text: '✦' }) : null,
      act.vol.substitute ? el('span', { className: 'sub-mark', title: 'Delegator', text: '🪆' }) : null
    ]);
    slot.appendChild(art);

    var bar = U.hpBar(mon.hp, max);
    frameHost.appendChild(el('div', { className: 'mon-frame' }, [
      el('div', { className: 'frame-head' }, [
        el('strong', { text: act.megaName || act.gmaxName || mons.name(mon) }),
        U.genderMark(mon.gender),
        el('span', { className: 'lvl', text: 'Lv ' + mon.lvl }),
        act.mega ? el('span', { className: 'mega-mark', title: 'Mega-entwickelt', text: '◈' }) : null,
        act.gmax ? el('span', {
          className: 'mega-mark gmax',
          title: 'Gigadynamaximiert — noch ' + act.gmaxTurns + (act.gmaxTurns === 1 ? ' Runde' : ' Runden'),
          text: '◈' + act.gmaxTurns
        }) : null
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
    field: 'l-field', side: 'l-field', mega: 'l-mega', caught: 'l-caught', banter: 'l-banter',
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
      var extra = applyLogVisual(e, entries, i) || 0;
      var wait = Math.max(speed, speed === 0 ? 0 : extra);
      if (!e.s) wait = Math.min(speed, 90);
      if (e.k === 'turn') wait = Math.min(speed, 140);
      if (e.k === 'faint' || e.k === 'caught' || e.k === 'end') wait = speed * 1.6;
      if (speed === 0) { step(); return; }
      root.setTimeout(step, wait);
    }
    step();
  }

  /**
   * Momente laufen in ihrem eigenen, festen Tempo — unabhängig davon, wie
   * schnell das Protokoll sonst abgespielt wird. Bei »Sofort« entfallen sie.
   */
  function momentsOn() { return settings().speed !== 'sofort' && PL.moments && !PL.moments.reduced(); }

  function applyLogVisual(e, entries, next) {
    // Der Ballwurf: das Ergebnis steht schon in den nächsten Zeilen.
    if (e.k === 'ball' && momentsOn() && BV.stage && BV.art1) {
      var verdict = null, j;
      for (j = next; j < (entries || []).length && j < next + 4; j++) {
        if (entries[j].k === 'caught' || entries[j].k === 'ballfail') { verdict = entries[j]; break; }
      }
      return PL.moments.ball({
        stage: BV.stage, target: BV.art1, item: e.item,
        caught: !!(verdict && verdict.k === 'caught'),
        shakes: verdict && verdict.k === 'caught' ? 3 : (verdict ? verdict.shakes : 1)
      });
    }

    // Attackeneffekt: fliegt vom Angreifer zum Ziel, je nach Kategorie.
    if (e.k === 'move' && PL.fx && BV.art0 !== undefined) {
      var mv = dex.move(e.move);
      var self = mv && mv.tg === 'self';
      var from = BV['art' + e.side], to = BV['art' + (1 - e.side)];
      if (from) {
        var dur = PL.fx.move({
          stage: BV.stage, fromArt: from, toArt: self ? from : to,
          type: e.type, category: e.cat, self: self
        });
        if (from) flash(from, 'attack');
        return dur;
      }
    }
    if (e.k === 'crit' && PL.fx && BV.stage) PL.fx.shake(BV.stage);
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
      if (BV.slots && BV.slots[e.side] && BV.slots[e.side].querySelector('.trainer-art')) {
        dismissTrainer(e.side, function () { renderSide(e.side); });
        return 300;
      }
      renderSide(e.side);
    } else if (e.k === 'mega') {
      renderSide(e.side);
      if (BV['art' + e.side]) flash(BV['art' + e.side], 'shine');
      sfx('mega');
    } else if (e.k === 'unmega') {
      renderSide(e.side);
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

  /**
   * Was der Auto-Kampf über die Welt außerhalb des Kampfes wissen muss:
   * den Beutel, das Team — und ob dieses Pokémon im Pokédex noch fehlt.
   */
  function autoOpts(bt) {
    var foe = bt.sides[1].active;
    var dexNew = false;
    if (foe && bt.wild) {
      try { dexNew = !meta.load().caught[foe.species.i]; } catch (e) { dexNew = false; }
    }
    return { run: App.run || null, dexNew: dexNew };
  }

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
          var a = PL.ai.chooseAction(bt, 0, 4, autoOpts(bt));
          // Gegenstände und Bälle gehen aus dem Beutel ab wie von Hand geworfen.
          if ((a.type === 'item' || a.type === 'ball') && App.run) App.run.removeItem(a.item, 1);
          BV.pendingMega = null;
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
        el('span', { className: 'move-btn-name', text: T.move(m) }),
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

  /** "Glurak-Mega-X" → "Mega-X", "Gigadynamax-Glurak" → "Glurak". */
  function shortForm(form) {
    var n = T.form(form);
    return /^Gigadynamax-|^Gigantamax /.test(n) ? n.replace(/^Gigadynamax-|^Gigantamax /, '') : n.replace(/^[^-]+-/, '');
  }

  /** Ein Knopf, der eine Verwandlung für diese Runde vormerkt. */
  function transformBtn(kind, label, hint, busy) {
    return actionBtn(label, !busy, function () {
      BV.pendingMega = BV.pendingMega === kind ? null : kind;
      renderActions();
      U.toast(BV.pendingMega ? hint : 'Verwandlung abgewählt.');
    }, 'mega' + (BV.pendingMega === kind ? ' on' : ''));
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
    // Verwandlung: Mega und Gigadynamax stehen nebeneinander, solange das
    // Pokémon sich noch nicht entschieden hat. Danach bleibt nur die Wahl.
    var me = bt.sides[0].active;
    if (bt.canMega(me)) {
      var mForm = bt.megaFormFor(me);
      var primal = /Primal/.test(mForm.n);
      BV.actionRow.appendChild(transformBtn('mega',
        (primal ? '☀ Proto ' : '◈ Mega ') + shortForm(mForm),
        primal ? 'Protoform vorgemerkt — wähle deine Attacke.'
               : 'Mega-Entwicklung vorgemerkt — wähle deine Attacke.',
        busy));
    }
    if (bt.canGmax(me)) {
      BV.actionRow.appendChild(transformBtn('gmax', '◈ Giga ' + shortForm(bt.gmaxFormFor(me)),
        'Gigadynamax vorgemerkt — drei Runden groß, dann zurück.', busy));
    }
    // Der Auto-Schalter ist immer bedienbar, auch mitten im Ablauf.
    BV.actionRow.appendChild(el('button', {
      className: 'action-btn auto' + (App.autoPlay ? ' on' : ''),
      type: 'button',
      title: 'Der Computer übernimmt die Kämpfe und spielt auf Sieg',
      onclick: function () {
        App.autoPlay = !App.autoPlay;
        // Wer im Kampf das Steuer zurücknimmt, will auch den Rest selbst machen.
        if (!App.autoPlay && AUTO.on) setAuto(false);
        renderActions();
        if (App.autoPlay && !BV.busy) awaitInput();
      }
    }, App.autoPlay ? '⚡ Auto AN' : '⚡ Auto'));
  }

  function submitAction(action) {
    var bt = App.battle;
    if (!bt || BV.busy || bt.ended) return;
    if (BV.pendingMega && action.type === 'move') action[BV.pendingMega] = true;
    BV.pendingMega = null;
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
    // Wer im Kampf über sein Level hinausgewachsen ist, hat eine neue Art —
    // und die gehört in den Pokédex, schillernd wie das Pokémon selbst.
    result.evolutions.forEach(function (evo) { meta.noteOwned(evo.mon); });
    meta.noteParty(run);
    run.party.forEach(function (m) { if (m.hp === 1) meta.award('notafraid'); });
    bt.sides[0].team.forEach(function (m) { void m; });
    if (bt.sides[0].megaUsed) meta.award('mega');
    if (bt.sides[0].team.some(function (m) { return m.form === 'gmax'; })) meta.award('gigadynamax');
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
    if (PL.audio && (bt.outcome === 'win' || bt.outcome === 'caught')) PL.audio.jingle();
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
      case 'blessing': return sceneBlessing(arg.scene);
      default: return el('p', { text: '…' });
    }
  };

  /** Der Knopf für das Relikt "Zweite Chance". */
  function rerollButton() {
    var run = App.run;
    if (!run.canReroll()) return null;
    return el('button', {
      className: 'btn', type: 'button',
      title: 'Einmal je Knoten: die Auswahl neu würfeln.',
      onclick: function () {
        var fresh = run.reroll();
        if (fresh) { sfx('select'); openScene(fresh); }
      }
    }, '🔁 Neu würfeln');
  }

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
    if (res.exp && res.exp.length) lines.push(expBlock(res.exp));
    res.levelUps.forEach(function (up) {
      lines.push(levelUpBlock(up));
    });
    res.evolutions.forEach(function (evo) {
      lines.push(evolutionBlock(evo));
    });
    res.faintedOut.forEach(function (name) {
      lines.push(el('p', { className: 'bad', text: name + ' ist für immer gegangen (Nuzlocke).' }));
    });
    if (bt.banter) {
      lines.unshift(el('p', { className: 'banter', text: '»' +
        (bt.outcome === 'win' ? bt.banter.win : bt.banter.loss) + '«' }));
    }
    if (!lines.length) lines.push(el('p', { text: bt.outcome === 'fled' ? 'Entkommen.' : 'Weiter geht’s.' }));

    var pending = [];
    res.levelUps.forEach(function (up) {
      (up.learned || []).forEach(function (l) { pending.push({ mon: up.mon, move: l.move }); });
    });

    var reward = (bt.outcome === 'win') ? run.battleRewards(bt) : null;
    var body = [el('div', { className: 'aftermath' }, lines), partyStrip()];

    function proceed() {
      processMoveLearning(pending, function () {
        if (res.tutor) {
          openTutor(function () { if (reward) openScene(reward); else backToMap(); });
          return;
        }
        if (reward) openScene(reward);
        else backToMap();
      });
    }
    AUTO.act = proceed;
    // Entwicklungen und Levelaufstiege dürfen zu Ende laufen, bevor der
    // Automat weiterdrückt.
    if (res.evolutions.length || res.levelUps.length) AUTO.pause = 1400;

    var actions = [el('button', {
      className: 'btn big primary', type: 'button', onclick: proceed
    }, reward ? 'Belohnung ansehen' : 'Weiter')];

    return sceneFrame(bt.outcome === 'caught' ? 'Gefangen!' : 'Kampf gewonnen', null, body, actions);
  }

  /**
   * Was das Team an Erfahrung mitgenommen hat — jedes Mitglied, auch das,
   * das nicht gekämpft hat. Vorher stand hier nichts: Man sah nur, wer
   * aufgestiegen ist, und musste sich den Rest zusammenreimen.
   */
  function expBlock(liste) {
    return el('div', { className: 'exp-block' }, [
      el('h4', { text: 'Erfahrung' }),
      el('div', { className: 'exp-rows' }, liste.map(function (e) {
        return el('div', { className: 'exp-row' + (e.capped ? ' capped' : '') }, [
          U.sprite(e.mon, { className: 'tiny' }),
          el('span', { className: 'exp-name', text: mons.name(e.mon) }),
          el('span', { className: 'exp-amount', text: e.capped
            ? 'an der Levelgrenze'
            : '+' + e.amount + ' EP' })
        ]);
      }))
    ]);
  }

  /**
   * Levelaufstieg: Sprite, Text und die Werte-Tafel mit den Zugewinnen.
   * Ohne Vorher-Werte (alte Spielstände) bleibt es beim Satz.
   */
  function levelUpBlock(up) {
    var text = mons.name(up.mon) + ' steigt auf Level ' + up.mon.lvl + '!';
    if (!up.before || !up.after || !PL.moments) return el('p', { text: text });
    var panel = PL.moments.levelPanel({ before: up.before, after: up.after, title: text });
    return el('div', { className: 'level-up-block' }, [
      U.sprite(up.mon, { className: 'level-sprite' }),
      panel.node
    ]);
  }

  /**
   * Entwicklung: die alte Gestalt blinkt in die neue hinüber. Der Moment
   * läuft in festem Tempo und wird bei »Sofort« übersprungen.
   */
  function evolutionBlock(evo) {
    var text = 'Was? ' + evo.from + ' entwickelt sich zu ' + evo.to + '!';
    var caption = el('p', { className: 'good', text: text });
    if (!evo.fromSp || !PL.moments || !dex.sp(evo.fromSp)) return caption;

    var host = el('div', { className: 'evo-host' });
    var before = U.sprite({ sp: evo.fromSp, shiny: evo.mon.shiny, ivs: evo.mon.ivs },
      { className: 'evo-sprite' });
    var afterImg = U.sprite(evo.mon, { className: 'evo-sprite' });
    var block = el('div', { className: 'evo-scene' }, [host, caption]);

    if (!momentsOn()) {
      host.appendChild(afterImg);
      return block;
    }
    caption.style.opacity = '0';
    root.setTimeout(function () {
      PL.moments.evolve({ host: host, before: before, after: afterImg }, function () {
        caption.style.opacity = '';
        sfx('mega');
      });
    }, 0);
    return block;
  }

  /** Fragt nacheinander ab, ob neu gelernte Attacken übernommen werden. */
  function processMoveLearning(queue, done) {
    if (!queue.length) { done(); return; }
    var item = queue.shift();
    var mon = item.mon, move = dex.move(item.move);
    if (mon.moves.some(function (s) { return s.m === item.move; })) { processMoveLearning(queue, done); return; }
    if (mon.moves.length < 4) {
      mon.moves.push({ m: item.move, pp: move.pp, ppUp: 0, used: 0 });
      U.toast(mons.name(mon) + ' lernt ' + T.move(move) + '!');
      processMoveLearning(queue, done);
      return;
    }
    // Der Automat entscheidet selbst, ob die neue Attacke besser ist als die
    // schwächste im Repertoire — und tauscht dann still.
    if (AUTO.on) {
      var slot = autoPilot().learnSlot(mon, item.move);
      if (slot >= 0) {
        mon.moves[slot] = { m: item.move, pp: move.pp, ppUp: 0, used: 0 };
        U.toast(mons.name(mon) + ' lernt ' + T.move(move) + '!');
      }
      processMoveLearning(queue, done);
      return;
    }

    var box = U.modal({
      title: mons.name(mon) + ' will ' + T.move(move) + ' lernen',
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
              U.toast(mons.name(mon) + ' lernt ' + T.move(move) + '!');
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

  /** Der Segen nach einer vollen Runde im Endlosmodus. */
  function sceneBlessing(scene) {
    var run = App.run;
    function take(b) {
      var out = run.takeBlessing(b.id, run.rng);
      run.pendingBlessing = null;
      if (out && out.relicChoice) {
        var s2 = run.makeRelicChoice(run.rng, out.relicChoice, out.text);
        run.setScene(s2);
        openScene(s2);
        return;
      }
      U.toast(typeof out === 'string' ? out : b.name + ' erhalten.');
      autosave();
      show('map');
    }
    AUTO.act = function () {
      var i = autoPilot().pickBlessing(run, scene);
      take(scene.offers[i >= 0 ? i : 0]);
    };
    var grid = el('div', { className: 'relic-grid' }, scene.offers.map(function (b) {
      return el('button', { className: 'relic-card r-episch', type: 'button',
        onclick: function () { take(b); } }, [
        el('span', { className: 'relic-icon', text: b.icon }),
        el('strong', { text: b.name }),
        el('span', { className: 'relic-rarity', text: 'Segen' }),
        el('span', { className: 'muted', text: b.desc })
      ]);
    }));
    return sceneFrame('Runde ' + (scene.loop || 1) + ' geschafft',
      'Neun Regionen liegen hinter dir. Die Welt bedankt sich — such dir etwas aus.',
      [grid], []);
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
        el('span', { className: 'muted', text: T.ability(mon.ab) }),
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

    AUTO.act = function () {
      var i = autoPilot().pickCatch(run, scene);
      if (i >= 0) takeMon(scene.offers[i]);
      else backToMap();
    };

    return sceneFrame('Begegnung', scene.text, [grid, partyStrip()], [
      rerollButton(),
      el('button', { className: 'btn', type: 'button', onclick: backToMap },
        scene.locked ? 'Weitergehen' : 'Keines nehmen')
    ]);
  }

  function sceneItem(scene) {
    var run = App.run;
    function take(item) {
      run.addItem(item.id, 1);
      var extra = run.luckyDouble();
      if (extra) run.addItem(item.id, 1);
      U.toast(item.name + (extra ? ' — der Glückswürfel legt einen zweiten dazu!' : ' eingesteckt.'));
      backToMap();
    }
    var list = el('div', { className: 'list' }, scene.offers.map(function (item) {
      return U.itemRow(item, { onClick: function () { take(item); } });
    }));
    AUTO.act = function () {
      var i = autoPilot().pickItem(run, scene);
      if (i >= 0) take(scene.offers[i]); else backToMap();
    };
    return sceneFrame('Fundstück', scene.text, [list], [
      rerollButton(),
      el('button', { className: 'btn', type: 'button', onclick: backToMap }, 'Nichts nehmen')
    ]);
  }

  function sceneRelic(scene) {
    var run = App.run;
    function take(r) {
      run.takeRelic(r.id);
      U.toast('Relikt erhalten: ' + r.name);
      if (Object.keys(run.relics).length >= 10) meta.award('relic10');
      backToMap();
    }
    AUTO.act = function () {
      var i = autoPilot().pickRelic(run, scene);
      if (i >= 0) take(scene.offers[i]); else backToMap();
    };
    var grid = el('div', { className: 'relic-grid' }, scene.offers.map(function (r) {
      return el('button', { className: 'relic-card r-' + r.rarity, type: 'button',
        onclick: function () { take(r); } }, [
        el('span', { className: 'relic-icon', text: r.icon || '🏛️' }),
        el('strong', { text: r.name }),
        el('span', { className: 'relic-rarity', text: r.rarity }),
        el('span', { className: 'muted', text: r.desc })
      ]);
    }));
    return sceneFrame('Relikt wählen', scene.text, [grid], [
      rerollButton(),
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

    AUTO.act = function () {
      var plan = autoPilot().shopPlan(run, scene);
      plan.forEach(function (i) { if (run.buy(scene.stock[i])) sfx('coin'); });
      if (plan.length) { draw(); renderHeader(); U.toast(plan.length + ' Sachen gekauft.'); }
      backToMap();
    };

    var sellBtn = el('button', { className: 'btn', type: 'button', onclick: function () { openSellDialog(draw); } }, '💱 Verkaufen');

    return sceneFrame('Händler', scene.text, [
      el('p', { className: 'muted', text: 'Dein Geld: ' + U.money(run.money) }),
      listHost
    ], [
      rerollButton(),
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
      if (out.evFocus) { openEVFocus(out.evFocus, function () { backToMap(); }); return; }
      U.modal({
        title: scene.title,
        content: el('p', { text: out.text || 'Nichts passiert.' }),
        actions: [{ label: 'Weiter', primary: true, onClick: backToMap }]
      });
    }

    AUTO.act = function () {
      var i = autoPilot().pickEvent(run, scene);
      if (i >= 0) resolveEvent(i); else backToMap();
    };

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

    AUTO.act = function () {
      var what = autoPilot().pickRest(run);
      if (what === 'evolve') {
        var ready = autoPilot().readyEvolutions(run);
        if (!ready.length) { U.toast(run.doRest('heal')); backToMap(); return; }
        ready.forEach(function (r) {
          if (r.evo.item && run.bag[PL.util.toID(r.evo.item)]) run.removeItem(PL.util.toID(r.evo.item), 1);
          var from = mons.name(r.mon);
          mons.evolve(r.mon, r.evo.to, run.rng);
          run.stats.evolutions++;
          meta.noteOwned(r.mon);
          U.toast(from + ' entwickelt sich zu ' + mons.name(r.mon) + '!');
        });
        meta.save();
        backToMap();
        return;
      }
      doRest(what);
    };

    return sceneFrame('Rastplatz', 'Ein Feuer, ein bisschen Ruhe. Was tust du?', body, []);
  }

  /* --- Ereignishelfer -------------------------------------------------------------- */

  function openTutor(done) {
    var run = App.run;

    /** Die Auswahl, die der Lehrer einem Pokémon vorlegt. */
    function offersFor(mon) {
      var sp = dex.sp(mon.sp);
      var pool = dex.movepool(sp).filter(function (mi) {
        var m = dex.move(mi);
        return m && !m.np && !mon.moves.some(function (s) { return s.m === mi; }) &&
          mon.lvl >= mons.tmMinLevel(m) * 0.8;
      });
      run.rng.shuffle(pool);
      return pool.slice(0, 5);
    }

    if (AUTO.on) {
      var choice = autoPilot().tutorPick(run, offersFor);
      if (!choice) { done(); return; }
      processMoveLearning([{ mon: choice.mon, move: choice.move }], done);
      return;
    }

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

    function swap(mon, i, quiet) {
      var level = Math.min(run.levelCap, mon.lvl + 3);
      var pool = PL.world.encounterPool({ level: level, anyGen: true });
      var sp = PL.world.pickEncounter(run.rng, pool, level, { rare: true });
      var fresh = PL.world.buildMon(run.rng, sp, level, { quality: 0.9, ivFloor: 14 });
      run.party[i] = fresh;
      meta.noteCaught(fresh);
      meta.save();
      if (quiet) { U.toast(mons.name(mon) + ' geht — ' + mons.name(fresh) + ' kommt.'); return; }
      U.modal({
        title: 'Getauscht!',
        content: el('div', { className: 'trade-result' }, [
          el('p', { text: mons.name(mon) + ' geht — ' + mons.name(fresh) + ' kommt.' }),
          U.monCard(fresh, {})
        ]),
        actions: [{ label: 'Weiter', primary: true, onClick: done }]
      });
    }

    // Der Automat gibt her, wer am wenigsten verspricht.
    if (AUTO.on) {
      var worst = 0, worstScore = Infinity;
      run.party.forEach(function (m, i) {
        var sc = PL.ai.potential(dex.sp(m.sp)) + m.lvl * 2;
        if (sc < worstScore) { worstScore = sc; worst = i; }
      });
      swap(run.party[worst], worst, true);
      done();
      return;
    }

    var box = U.modal({
      title: 'Wen gibst du her?',
      wide: true,
      content: el('div', { className: 'switch-grid' }, run.party.map(function (mon, i) {
        return U.monCard(mon, {
          onClick: function () { box.close(); swap(mon, i); }
        });
      })),
      actions: [{ label: 'Doch nicht', onClick: done }]
    });
  }

  /** Fleißpunkte gezielt auf ein Pokémon verteilen. */
  function openEVFocus(amount, done) {
    var run = App.run;

    function give(mon) {
      var st = mons.stats(mon), best = 1, k;
      for (k = 1; k < 6; k++) if (st[k] > st[best]) best = k;
      var got = mons.addEVs(mon, PL.STATS[best], amount);
      U.toast(mons.name(mon) + ': ' + T.stat(PL.STATS[best]) + ' +' + got + ' FP.');
    }

    // Der Automat füttert den, der am meisten daraus macht.
    if (AUTO.on && run.party.length) {
      var best = run.party[0], bestScore = -Infinity;
      run.party.forEach(function (m) {
        var sc = PL.ai.potential(dex.sp(m.sp)) + m.lvl * 3;
        if (sc > bestScore) { bestScore = sc; best = m; }
      });
      give(best);
      done();
      return;
    }

    var box = U.modal({
      title: 'Wer bekommt die volle Ladung?',
      wide: true,
      content: el('div', { className: 'switch-grid' }, run.party.map(function (mon) {
        return U.monCard(mon, {
          onClick: function () { box.close(); give(mon); done(); }
        });
      })),
      actions: [{ label: 'Abbrechen', onClick: done }]
    });
  }

  /**
   * Entwicklungen zur Auswahl. Ohne `nur` gilt es fürs ganze Team (so ruft es
   * der Rastplatz), mit `nur` für ein einzelnes Pokémon (so ruft es der
   * Team-Bildschirm). Ein Stein wird hier direkt aus dem Beutel genommen —
   * dafür muss niemand mehr einen Rastplatz suchen.
   */
  function openEvolveDialog(done, nur) {
    var run = App.run;

    // Der Automat entwickelt alles, was bereit ist — Entwicklungen sind
    // schlicht besser, es gibt nichts abzuwägen.
    if (AUTO.on) {
      var ready = autoPilot().readyEvolutions(run);
      ready.forEach(function (r) {
        if (r.evo.item && run.bag[PL.util.toID(r.evo.item)]) run.removeItem(PL.util.toID(r.evo.item), 1);
        var from = mons.name(r.mon);
        mons.evolve(r.mon, r.evo.to, run.rng);
        run.stats.evolutions++;
        meta.noteOwned(r.mon);
        U.toast(from + ' entwickelt sich zu ' + mons.name(r.mon) + '!');
      });
      meta.save();
      if (done) done();
      return;
    }

    var rows = [];
    (nur ? [nur] : run.party).forEach(function (mon) {
      var list = mons.evolutions(mon, { items: run.bag });
      list.forEach(function (evo) {
        var stein = evo.how === 'useItem';
        var vorrat = stein ? (run.bag[PL.util.toID(evo.item)] || 0) : 0;
        rows.push(el('button', {
          className: 'option' + (evo.ready ? '' : ' disabled'), type: 'button', disabled: !evo.ready,
          onclick: function () {
            if (stein) run.removeItem(PL.util.toID(evo.item), 1);
            var from = mons.name(mon);
            mons.evolve(mon, evo.to, run.rng);
            run.stats.evolutions++;
            meta.noteOwned(mon);
            meta.save();
            autosave();
            U.toast(from + ' entwickelt sich zu ' + mons.name(mon) + '!');
            if (done) done();
          }
        }, [
          el('strong', { text: (nur ? '' : mons.name(mon) + ' → ') + T.species(evo.to) }),
          el('span', { className: 'muted', text: stein
            ? (evo.ready ? evo.text + ' benutzen (' + vorrat + ' im Beutel)' : evo.text + ' fehlt')
            : (evo.ready ? 'Bereit — ' + evo.text : 'Ab ' + evo.text) })
        ]));
      });
    });
    if (!rows.length) {
      rows.push(el('p', { text: nur
        ? mons.name(nur) + ' ist am Ende seiner Entwicklung angekommen.'
        : 'Im Moment kann sich niemand entwickeln.' }));
    }
    U.modal({
      title: nur ? 'Entwicklung: ' + mons.name(nur) : 'Entwicklungen',
      wide: true,
      content: el('div', { className: 'option-list' }, rows),
      actions: [{ label: 'Schließen', onClick: done }]
    });
  }

  /** Steht bei diesem Pokémon gerade eine Entwicklung an? */
  function evolveHint(mon) {
    var list = mons.evolutions(mon, { items: App.run.bag });
    if (!list.length) return { label: '💠 Entwickeln', bereit: false, moeglich: false };
    var bereit = list.some(function (e) { return e.ready; });
    return { label: bereit ? '✨ Entwickeln!' : '💠 Entwickeln', bereit: bereit, moeglich: true };
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
        var card = U.monCard(mon, {
          selected: i === sel.index,
          onClick: function () { sel.index = i; drawList(); drawDetail(); }
        });
        // Kein natives draggable-Attribut: das würde den Browser eine eigene
        // Ziehoperation starten lassen und unsere Zeiger-Ereignisse abbrechen.
        card.classList.add('draggable');
        makeDraggable(card, i, drawList, drawDetail, sel);
        listHost.appendChild(card);
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
        (function () {
          var hint = evolveHint(mon);
          return el('button', {
            className: 'btn' + (hint.bereit ? ' primary' : ''), type: 'button',
            disabled: !hint.moeglich,
            title: hint.moeglich ? '' : 'Diese Art entwickelt sich nicht weiter',
            onclick: function () { openEvolveDialog(function () { drawList(); drawDetail(); }, mon); }
          }, hint.label);
        })(),
        sel.index > 0 ? el('button', {
          className: 'btn', type: 'button', title: 'Alternative zum Ziehen',
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
        el('div', {}, [
          el('div', { className: 'party-head' }, [
            el('p', { className: 'muted small', text: 'Reihenfolge per Ziehen ändern — das erste Pokémon startet den Kampf.' }),
            quickHealButton()
          ]),
          listHost,
          el('h3', { className: 'section-label', text: 'Box' }), boxHost]),
        detail
      ])
    ]);
  };

  /**
   * Team umsortieren durch Ziehen. Zeigeereignisse statt HTML5-Drag, damit es
   * auf dem Handy genauso funktioniert; die Karte hängt am Finger, und eine
   * Linie zeigt, wo sie landet.
   */
  function makeDraggable(card, index, drawList, drawDetail, sel) {
    card.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      var run = App.run;
      if (run.party.length < 2) return;
      var startY = e.clientY, moved = false;
      var host = card.parentNode;
      var rect = card.getBoundingClientRect();
      var to = index;

      // Die Zeiger-Ereignisse hängen am Fenster: sobald die Karte unter dem
      // Finger wegrutscht, bekäme sie selbst keine mehr.
      function onMove(ev) {
        var dy = ev.clientY - startY;
        if (!moved && Math.abs(dy) < 6) return;
        if (!moved) { moved = true; card.classList.add('dragging'); }
        if (ev.cancelable) ev.preventDefault();
        card.style.transform = 'translateY(' + dy + 'px)';
        var mid = rect.top + rect.height / 2 + dy;
        var kids = host.children, k, best = 0;
        for (k = 0; k < kids.length; k++) {
          if (kids[k] === card) continue;
          var r = kids[k].getBoundingClientRect();
          if (mid > r.top + r.height / 2) best = Math.max(best, k);
        }
        to = best;
        for (k = 0; k < kids.length; k++) kids[k].classList.toggle('drop-here', k === to && kids[k] !== card);
      }

      function onUp() {
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerup', onUp);
        root.removeEventListener('pointercancel', onUp);
        card.style.transform = '';
        card.classList.remove('dragging');
        Array.prototype.forEach.call(host.children, function (n) { n.classList.remove('drop-here'); });
        if (!moved) return;
        // Nach dem Ziehen darf der Klick die Karte nicht zusätzlich auswählen.
        card.addEventListener('click', function stop(ev2) {
          ev2.stopPropagation();
          ev2.preventDefault();
          card.removeEventListener('click', stop, true);
        }, true);
        if (index !== to) {
          var mon = App.run.party.splice(index, 1)[0];
          App.run.party.splice(to, 0, mon);
          sel.index = to;
          autosave();
          sfx('select');
          drawList();
          drawDetail();
        }
      }

      root.addEventListener('pointermove', onMove);
      root.addEventListener('pointerup', onUp);
      root.addEventListener('pointercancel', onUp);
    });
  }

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
      actions.push({ label: 'Speichern', onClick: function () { autosave(); show('saves'); } });
      actions.push({ label: 'Zum Titel', onClick: function () { autosave(); App.battle = null; show('title'); } });
    }
    actions.push({ label: 'Pokédex', onClick: function () { show('dex'); } });
    actions.push({ label: 'Sammlung', onClick: function () { show('sammlung'); } });
    actions.push({ label: 'Erfolge', onClick: function () { show('achievements'); } });
    actions.push({ label: 'Statistik', onClick: function () { show('stats'); } });
    actions.push({ label: 'Einstellungen', onClick: function () { show('settings'); } });
    if (!run || App.screen === 'title') actions.push({ label: 'Schließen' });
    U.modal({
      title: 'Menü',
      content: el('div', { className: 'menu-hint' }, [
        el('p', { className: 'muted', text: 'Tasten: 1–4 Attacken · W Wechseln · B Beutel · M Verwandeln · A Auto-Kampf · ⇧A Reise-Automat · Esc Menü' })
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

  /**
   * Die Entwicklungskette einer Art — woher sie kommt und wohin sie führt.
   * Gerade weil die Bedingungen hier andere sind als in den Spielen (kein
   * Tausch, keine Uhrzeit), ist das die Stelle, an der man nachschaut.
   */
  function dexEvoChain(sp) {
    function glied(art, bedingung) {
      return el('div', { className: 'evo-step' }, [
        bedingung ? el('span', { className: 'evo-arrow', text: bedingung }) : null,
        el('div', { className: 'evo-mon' }, [
          U.sprite(art, { className: 'tiny' }),
          el('span', { text: T.species(art) })
        ])
      ]);
    }
    // Zuerst hinauf zur Grundform, dann die ganze Linie wieder hinunter.
    var wurzel = sp, schutz = 0;
    while (wurzel.pv !== undefined && dex.sp(wurzel.pv) && schutz++ < 6) wurzel = dex.sp(wurzel.pv);

    var reihen = [glied(wurzel, null)], hier = wurzel;
    schutz = 0;
    while (hier && hier.ev && hier.ev.length && schutz++ < 6) {
      var naechste = hier.ev.map(function (i) { return dex.sp(i); }).filter(Boolean);
      var vorher = hier;
      naechste.forEach(function (zu) { reihen.push(glied(zu, bedingungText(vorher, zu))); });
      // Nur eine Fortsetzung lässt sich weiterverfolgen; bei einer Gabelung —
      // Evoli — stehen die Wege nebeneinander, und hier ist Schluss.
      hier = naechste.length === 1 ? naechste[0] : null;
    }
    if (reihen.length < 2) return null;
    return el('div', { className: 'dex-evo' }, [
      el('h4', { text: 'Entwicklung' }),
      el('div', { className: 'evo-chain' }, reihen)
    ]);
  }

  /** Was verlangt der Schritt von einer Art zur nächsten? */
  function bedingungText(von, zu) {
    var liste = mons.evolutions({ sp: von.i, lvl: 1, moves: [], item: null }, {});
    var treffer = liste.filter(function (e) { return e.to.i === zu.i; })[0];
    if (!treffer) return '→';
    return treffer.how === 'useItem' ? '→ ' + treffer.text : '→ Lv ' + treffer.level;
  }

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
        // Eine Körpergröße führen die Daten nicht — sie stand hier als
        // »undefined m«, seit es diesen Bildschirm gibt.
        el('p', { className: 'muted', text: 'Generation ' + sp.g + ' · ' + sp.wt + ' kg' }),
        artRekordZeile(sp),
        el('p', { className: 'muted', text: 'Fähigkeiten: ' +
          mons.abilityOptions(sp).map(function (a) { return T.ability(a); }).join(', ') }),
        el('div', { className: 'stat-block' }, PL.STATS.map(function (key, i) {
          return el('div', { className: 'stat-row' }, [
            el('span', { className: 'stat-name', text: T.statShort(key) }),
            el('span', { className: 'stat-value', text: sp.bs[i] }),
            el('div', { className: 'stat-bar' }, el('i', { style: { width: Math.min(100, sp.bs[i] / 2.55) + '%' } }))
          ]);
        })),
        el('p', { text: 'Basiswertsumme ' + sp.bst + (m.caught[sp.i] ? ' · ' + m.caught[sp.i] + '× gefangen' : '') }),
        dexEvoChain(sp)
      ])
    ]);
    U.modal({ title: T.species(sp), wide: true, content: content, actions: [{ label: 'Schließen', primary: true }] });
  }

  SCREENS.stats = function () {
    var m = meta.load();
    var t = m.totals;
    var rows = [
      ['Runs gestartet', m.runs], ['Runs gewonnen', m.wins],
      ['Beste Region', m.bestRegion + 1], ['Höchste Stufe', meta.stufenName(Math.max(0, m.bestAscension))],
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
          el('span', { text: meta.stufenName(h.ascension) + (h.nuzlocke ? ' · Nuzlocke' : '') }),
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

  /* ---------- Sammlung: Marken, Wochenaufträge, Vorrat -------------------------
   * Der Pokédex lief bisher voll und blieb folgenlos. Hier hängt an ihm
   * etwas: Marken, die dauerhaft etwas einbringen, und drei Aufträge, die
   * jede Woche wechseln. Was sie einbringen, liegt danach im Vorrat und geht
   * beim nächsten Run mit — außer beim Tages-Run, wo alle gleich anfangen.
   * -------------------------------------------------------------------------- */

  /** Ein Balken mit Zahl daneben — für Marken wie für Aufträge. */
  function fortschritt(stand, ziel) {
    var anteil = Math.max(0, Math.min(1, ziel ? stand / ziel : 0));
    return el('div', { className: 'fortschritt' }, [
      el('div', { className: 'fortschritt-bahn' }, [
        el('div', { className: 'fortschritt-fuell', style: { width: (anteil * 100).toFixed(1) + '%' } })
      ]),
      el('span', { className: 'fortschritt-zahl', text: Math.min(stand, ziel) + ' / ' + ziel })
    ]);
  }

  SCREENS.sammlung = function () {
    var marken = meta.meilensteine();
    var woche = meta.wochenStand();
    var lohn = meta.sammelLohn();
    var v = meta.vorrat();
    var offen = marken.filter(function (m) { return !m.geschafft; });
    var geholt = marken.length - offen.length;

    function markenKarte(m) {
      return el('div', { className: 'marke' + (m.geschafft ? ' fertig' : '') }, [
        el('div', { className: 'marke-kopf' }, [
          el('strong', { text: m.name }),
          el('span', { className: 'marke-haken', text: m.geschafft ? '✓' : '' })
        ]),
        el('span', { className: 'muted small', text: m.bed }),
        m.geschafft ? null : fortschritt(m.stand, m.ziel),
        el('span', { className: 'marke-lohn', text: '🎁 ' + m.lohnText })
      ]);
    }

    var vorratZeilen = [];
    [['geld', 'Startgeld'], ['baelle', 'Bälle'], ['traenke', 'Tränke'],
     ['beleber', 'Beleber'], ['relikte', 'Relikte']].forEach(function (paar) {
      if (v[paar[0]]) vorratZeilen.push(paar[1] + ': ' + v[paar[0]]);
    });

    return el('div', { className: 'sammlung-screen' }, [
      el('div', { className: 'team-head' }, [
        el('h2', { text: 'Sammlung' }),
        el('button', { className: 'btn', type: 'button',
          onclick: function () { show(App.run ? 'map' : 'title'); } }, 'Zurück')
      ]),

      /* --- Was gerade gilt --- */
      el('div', { className: 'sammlung-karte' }, [
        el('h3', { text: '🎁 Dein Startvorteil' }),
        el('p', { className: 'muted small', text:
          'Gilt in jedem Run — nur nicht im Tages-Run, wo alle gleich anfangen.' }),
        el('div', { className: 'vorteil-liste' }, [
          lohn.geld ? el('span', { className: 'chip', text: '💰 +' + U.money(lohn.geld) }) : null,
          lohn.baelle ? el('span', { className: 'chip', text: '⚪ +' + lohn.baelle + ' Bälle' }) : null,
          lohn.traenke ? el('span', { className: 'chip', text: '🧪 +' + lohn.traenke + ' Tränke' }) : null,
          lohn.beleber ? el('span', { className: 'chip', text: '💊 +' + lohn.beleber + ' Beleber' }) : null,
          lohn.relikte ? el('span', { className: 'chip', text: '🏛️ +' + lohn.relikte + ' Relikt zur Wahl' }) : null,
          lohn.shiny > 1 ? el('span', { className: 'chip', text: '✨ Schillernde ×' + lohn.shiny }) : null,
          (!lohn.geld && !lohn.baelle && !lohn.traenke && !lohn.beleber && !lohn.relikte && lohn.shiny <= 1)
            ? el('span', { className: 'muted', text: 'Noch keine Marke geholt — fang 25 Arten, dann geht es los.' })
            : null
        ]),
        vorratZeilen.length ? el('p', { className: 'muted small', text:
          'Im Vorrat für den nächsten Run: ' + vorratZeilen.join(' · ') }) : null
      ]),

      /* --- Die Wochenaufträge --- */
      el('div', { className: 'sammlung-karte' }, [
        el('h3', { text: '📋 Aufträge dieser Woche' }),
        el('p', { className: 'muted small', text:
          'Kalenderwoche ' + woche.woche + ' · für alle dieselben · zählt über alle Runs der Woche' }),
        el('div', { className: 'auftrag-liste' }, woche.auftraege.map(function (a) {
          return el('div', { className: 'auftrag' + (a.geschafft ? ' fertig' : '') }, [
            el('div', { className: 'marke-kopf' }, [
              el('strong', { text: a.text }),
              el('span', { className: 'marke-haken', text: a.geschafft ? '✓' : '' })
            ]),
            a.geschafft ? null : fortschritt(a.stand, a.ziel),
            el('span', { className: 'marke-lohn', text: '🎁 ' + a.lohnText })
          ]);
        }))
      ]),

      /* --- Die Marken --- */
      el('h3', { className: 'section-label', text:
        'Marken der Sammlung · ' + geholt + ' von ' + marken.length }),
      el('div', { className: 'marken-gitter' }, marken.map(markenKarte))
    ]);
  };

  /**
   * Der eigene Bestwert einer Art. Wer zum fünften Mal mit demselben Pokémon
   * antritt, soll sehen, dass es dasselbe ist — und was es bisher geschafft
   * hat. Arten, die noch nie im Team waren, bekommen keine leere Zeile.
   */
  function artRekordZeile(sp) {
    var r = meta.artRekord(sp.i);
    if (!r) return null;
    var teile = [];
    if (r.lvl) teile.push('höchstes Level ' + r.lvl);
    if (r.kaempfe) teile.push(r.kaempfe + ' Kämpfe');
    if (r.runs) teile.push(r.runs + (r.runs === 1 ? ' Run' : ' Runs'));
    return el('p', { className: 'art-rekord', text: '🏅 Dein Bestwert: ' + teile.join(' · ') });
  }

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
      row('Sprache der Pokémon-Namen', 'Gilt auch für Attacken und Fähigkeiten.', picker(
        [{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'Englisch' }], s.lang,
        function (v) { meta.setSetting('lang', v); applyTheme(); })),
      row('Deine Figur', 'So siehst du im Kampf von hinten aus.', picker(
        [{ value: 'rot', label: 'Rot' }, { value: 'blatt', label: 'Blatt' },
         { value: 'brix', label: 'Brix' }, { value: 'maike', label: 'Maike' }], s.figur || 'rot',
        function (v) { meta.setSetting('figur', v); })),
      row('Kampftempo', 'Wie schnell das Protokoll durchläuft.', picker(
        [{ value: 'langsam', label: 'Langsam' }, { value: 'normal', label: 'Normal' },
         { value: 'schnell', label: 'Schnell' }, { value: 'sofort', label: 'Sofort' }], s.speed,
        function (v) { meta.setSetting('speed', v); })),
      row('Töne', 'Kurze Klänge bei Treffern und Aktionen.', picker(
        [{ value: true, label: 'An' }, { value: false, label: 'Aus' }], s.sound,
        function (v) { meta.setSetting('sound', v); })),
      row('Musik', 'Chiptune-Schleifen, im Spiel erzeugt — je nach Ort eine andere.', picker(
        [{ value: true, label: 'An' }, { value: false, label: 'Aus' }], s.music,
        function (v) {
          meta.setSetting('music', v);
          if (PL.audio) { PL.audio.setEnabled(v); if (v) updateMusic(App.screen); }
        })),
      row('Lautstärke', 'Gilt für Musik und Klänge.', volumeSlider(s)),
      el('div', { className: 'save-zone' }, [
        el('h3', { text: 'Spielstand' }),
        el('p', { className: 'muted', text: 'Alles liegt nur in diesem Browser. Sichere den Stand als Text, ' +
          'wenn du ihn behalten oder auf ein anderes Gerät bringen willst.' }),
        el('div', { className: 'setting-actions' }, [
          el('button', { className: 'btn', type: 'button', onclick: openSaveExport }, '⬇ Spielstand sichern'),
          el('button', { className: 'btn', type: 'button', onclick: openSaveImport }, '⬆ Spielstand einspielen')
        ])
      ]),
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
      versionZone(),
      el('p', { className: 'muted small', text: 'Gespeichert wird ausschließlich im Browser dieses Geräts. Es werden keine Daten übertragen; die Pokémon-Bilder kommen von Pokémon Showdown und PokeAPI.' })
    ]);
  };

  /**
   * Der Lautstärkeregler. Gestellt wird sofort, gespeichert erst, wenn der
   * Finger loslässt — sonst schriebe jedes Pixel einen Spielstand. Beim
   * Loslassen kommt ein kurzer Ton, damit man hört, was man eingestellt hat.
   */
  function volumeSlider(s) {
    var wert = s.volume === undefined ? 0.5 : s.volume;
    var zahl = el('span', { className: 'slider-value', text: Math.round(wert * 100) + ' %' });
    var regler = el('input', {
      type: 'range', min: '0', max: '100', step: '5',
      className: 'slider', value: String(Math.round(wert * 100)),
      'aria-label': 'Lautstärke'
    });
    function stellen() {
      var v = Number(regler.value) / 100;
      zahl.textContent = Math.round(v * 100) + ' %';
      if (PL.audio) PL.audio.setVolume(v);
      return v;
    }
    function merken() {
      var v = stellen();
      meta.setSetting('volume', v);
      if (v > 0) sfx('select');
    }
    regler.addEventListener('input', stellen);
    regler.addEventListener('change', merken);
    return el('div', { className: 'slider-row' }, [regler, zahl]);
  }

  /**
   * Welche Fassung läuft hier — und liegt eine neuere bereit? Wichtig für die
   * Seite auf dem Startbildschirm: Die lädt der Browser gern aus seinem
   * Zwischenspeicher, und dann spielt man wochenlang eine alte Fassung, ohne
   * es zu merken.
   */
  function versionZone() {
    if (!PL.update) return null;
    var stand = el('p', { className: 'muted small', text: PL.update.isDev()
      ? 'Entwicklungsfassung — hier wird nichts geprüft.'
      : 'Fassung ' + PL.update.build });
    var knopf = el('button', { className: 'btn', type: 'button', onclick: function () {
      knopf.disabled = true;
      knopf.textContent = 'Wird geprüft …';
      PL.update.check({ reload: false }).then(function (res) {
        knopf.disabled = false;
        knopf.textContent = '🔄 Nach Aktualisierung sehen';
        if (res.state === 'aktuell') { U.toast('Das ist die neueste Fassung.', 'good'); return; }
        if (res.state === 'unbekannt' || res.state === 'entwicklung') {
          U.toast('Von hier aus lässt sich das nicht prüfen.', 'bad');
          return;
        }
        stand.textContent = 'Fassung ' + PL.update.build + ' — bereit liegt ' + res.latest;
        U.confirm('Eine neuere Fassung liegt bereit. Jetzt neu laden? Dein Spielstand bleibt erhalten.',
          function () {
            root.location.replace(root.location.pathname + '?v=' + encodeURIComponent(res.latest));
          }, { yes: 'Neu laden' });
      });
    } }, '🔄 Nach Aktualisierung sehen');
    return el('div', { className: 'save-zone' }, [
      el('h3', { text: 'Fassung' }),
      stand,
      PL.update.isDev() ? null : el('div', { className: 'setting-actions' }, [knopf]),
      PL.update.isDev() ? null : el('p', { className: 'muted small', text:
        'Bleibt hier trotz Neuladen eine alte Fassung stehen, hilft auf dem iPhone: das Symbol vom ' +
        'Startbildschirm löschen, die Seite in Safari öffnen und von dort neu ablegen. Der Spielstand ' +
        'liegt im Browser und übersteht das.' })
    ]);
  }

  /* --- Spielstand sichern und einspielen ------------------------------------- */

  /**
   * Eine echte Datei anbieten kann nur die veröffentlichte Seite, und auch die
   * nur, wenn ihr das erlaubt wurde. Überall sonst — als heruntergeladene
   * Einzeldatei, lokal, in einer öffentlich geteilten Fassung — gibt es diesen
   * Weg nicht; dann bleibt der Text zum Kopieren, und der Knopf erscheint
   * gar nicht erst.
   */
  var downloads = null;                 // null = noch unbekannt, false = geht nicht

  function probeDownloads() {
    if (!root.claude || typeof root.claude.use !== 'function') { downloads = false; return; }
    try {
      root.claude.use('downloads').then(function (dl) { downloads = dl || false; },
        function () { downloads = false; });
    } catch (e) { downloads = false; }
  }

  function saveToFile(text, filename) {
    if (!downloads) return Promise.resolve(false);
    return downloads.save({ filename: filename, data: text })
      .then(function () { return true; }, function () { return false; });
  }

  function openSaveExport() {
    var text = meta.exportSave();
    var area = el('textarea', { className: 'save-area', readonly: true, rows: 8, spellcheck: 'false' });
    area.value = text;
    var box = U.modal({
      title: 'Spielstand sichern',
      wide: true,
      content: el('div', {}, [
        el('p', { className: 'muted', text: 'Der ganze Fortschritt als Text — Pokédex, Erfolge, Statistik und der ' +
          'laufende Run. Kopiere ihn und lege ihn irgendwo ab, wo du ihn wiederfindest.' }),
        area,
        el('p', { className: 'muted small', text: 'Größe: ' + (text.length / 1024).toFixed(1) + ' KB' })
      ]),
      actions: [
        downloads ? { label: '💾 Als Datei', close: false, onClick: function () {
          var name = 'pokelike-' + (meta.activeProfile() || {}).name + '-' +
            new Date().toISOString().slice(0, 10) + '.json';
          saveToFile(text, name.replace(/[^A-Za-z0-9._-]+/g, '-')).then(function (ok) {
            if (!ok) U.toast('Nicht gesichert.', 'bad');
            else U.toast('Als Datei gesichert.', 'good');
          });
        } } : null,
        { label: '📋 Kopieren', primary: true, close: false, onClick: function () {
          area.focus();
          area.select();
          var done = false;
          try {
            if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
              root.navigator.clipboard.writeText(text);
              done = true;
            }
          } catch (e) { done = false; }
          U.toast(done ? 'In die Zwischenablage kopiert.' : 'Markiert — jetzt mit Strg+C bzw. Cmd+C kopieren.');
        } },
        { label: 'Schließen' }
      ]
    });
    root.setTimeout(function () { area.focus(); area.select(); }, 50);
    return box;
  }

  function openSaveImport() {
    var area = el('textarea', { className: 'save-area', rows: 8, spellcheck: 'false',
      placeholder: 'Gesicherten Spielstand hier einfügen …' });
    // Eine gesicherte Datei lässt sich auch direkt auswählen.
    var file = el('input', { type: 'file', accept: '.json,application/json', className: 'file-pick' });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new root.FileReader();
      reader.onload = function () { area.value = String(reader.result || ''); };
      reader.readAsText(f);
    });
    U.modal({
      title: 'Spielstand einspielen',
      wide: true,
      content: el('div', {}, [
        el('p', { className: 'warn-note', text: 'Achtung: Der eingespielte Stand ersetzt deinen aktuellen ' +
          'Fortschritt vollständig. Sichere ihn vorher, falls du ihn behalten willst.' }),
        el('p', { className: 'muted small', text: 'Datei auswählen oder den Text unten einfügen:' }),
        file,
        area
      ]),
      actions: [
        { label: 'Einspielen', primary: true, danger: true, onClick: function () {
          var res = meta.importSave(area.value);
          U.toast(res.text, res.ok ? 'good' : 'bad');
          if (res.ok) {
            App.run = null;
            App.battle = null;
            applyTheme();
            if (PL.audio) {
              PL.audio.setVolume(settings().volume === undefined ? 0.5 : settings().volume);
              PL.audio.setEnabled(!!settings().music);
            }
            show('title');
          }
        } },
        { label: 'Abbrechen' }
      ]
    });
  }

  /* ---------- 8) Ende, Töne, Start ---------------------------------------------------- */

  function finishRun() {
    var run = App.run;
    setAuto(false);                    // der Run ist vorbei, der Automat auch
    var outcome = run.state === 'victory' ? 'sieg' : 'niederlage';
    meta.noteParty(run);
    // Der Tages-Run zählt nur einmal — und nur, wenn er zum heutigen
    // Startwert gehört. Ein fortgesetzter Run von gestern zählt nicht.
    if (run.mode === 'taeglich' && PL.share &&
        run.seed === meta.tagesStartwert() && !meta.tagGespielt()) {
      meta.setzeTagesErgebnis(PL.share.ergebnis(run, outcome));
    }
    var fresh = meta.recordRun(run, outcome);
    meta.merkeArten(run);

    // Was dieser Run für die Woche und für die Sammlung gebracht hat. Der
    // Tages-Run zählt hier mit — er ist ein Run wie jeder andere, nur dass
    // er selbst keinen Startvorteil bekommt.
    var neueArten = Object.keys(run.met || {}).length;
    App.wochenLohn = meta.zaehleWoche({
      siege: run.stats.wins,
      faenge: run.stats.catches,
      arten: neueArten,
      entwicklungen: run.stats.evolutions,
      regionen: run.region,
      runs: 1,
      bosse: run.bossesBeaten || 0,
      legenden: run.mode === 'legenden' ? run.legendenBesiegt() : (run.legendUsed ? 1 : 0)
    });
    App.neueMarken = meta.pruefeMeilensteine();

    meta.clearRun();
    fresh.forEach(function (a) { U.toast('Erfolg freigeschaltet: ' + a.name, 'good'); });
    App.neueMarken.forEach(function (ms) { U.toast('Sammelmarke: ' + ms.name + ' — ' + ms.lohnText, 'good'); });
    App.wochenLohn.forEach(function (a) { U.toast('Wochenauftrag geschafft: ' + a.text, 'good'); });
    show('end');
  }

  SCREENS.end = function () {
    var run = App.run;
    var won = run.state === 'victory';
    return el('div', { className: 'end-screen ' + (won ? 'won' : 'lost') }, [
      el('h2', { text: won ? 'Champ!' : 'Der Run endet hier.' }),
      el('p', { className: 'muted', text: won
        ? 'Du hast die Liga bezwungen. Die nächste Stufe wartet.'
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
      ausbeuteBereich(),
      PL.share ? teilenBereich(PL.share.ergebnis(run, won ? 'sieg' : 'niederlage')) : null,
      el('div', { className: 'scene-actions' }, [
        el('button', { className: 'btn big primary', type: 'button', onclick: function () { App.run = null; show('newrun'); } }, 'Neuer Run'),
        el('button', { className: 'btn big', type: 'button', onclick: function () { App.run = null; show('title'); } }, 'Zum Titel')
      ])
    ]);
  };

  /**
   * Was dieser Run für die Sammlung gebracht hat. Steht nur da, wenn wirklich
   * etwas dazugekommen ist — eine leere Überschrift hilft niemandem.
   */
  function ausbeuteBereich() {
    var marken = App.neueMarken || [], auftraege = App.wochenLohn || [];
    if (!marken.length && !auftraege.length) return null;
    return el('div', { className: 'sammlung-karte' }, [
      el('h3', { text: '🎁 Dazugekommen' }),
      el('div', { className: 'auftrag-liste' }, marken.map(function (ms) {
        return el('div', { className: 'auftrag fertig' }, [
          el('strong', { text: 'Sammelmarke: ' + ms.name }),
          el('span', { className: 'marke-lohn', text: ms.lohnText })
        ]);
      }).concat(auftraege.map(function (a) {
        return el('div', { className: 'auftrag fertig' }, [
          el('strong', { text: 'Wochenauftrag: ' + a.text }),
          el('span', { className: 'marke-lohn', text: a.lohnText })
        ]);
      }))),
      el('p', { className: 'muted small', text:
        'Liegt im Vorrat und geht beim nächsten Run mit.' })
    ]);
  }

  /* ---------- Der Tages-Run ---------------------------------------------------
   * Ein Startwert für alle, ein Versuch, ein Ergebnis. Woran man sich misst,
   * rechnet das Spiel selbst aus: Der Automat spielt denselben Tag durch und
   * setzt damit die Messlatte. Das braucht keinen Server, gilt für jeden
   * gleich — und funktioniert auch in zehn Jahren noch.
   * -------------------------------------------------------------------------- */

  var latteLaeuft = false;

  /**
   * Lässt den Automaten den heutigen Startwert durchspielen. Gerechnet wird in
   * Scheiben: ein paar Knoten, dann darf die Oberfläche atmen. Ein ganzer Run
   * dauert Bruchteile einer Sekunde, aber auf einem müden Telefon soll nichts
   * einfrieren.
   */
  function berechneMesslatte(fertig) {
    if (latteLaeuft) return;
    latteLaeuft = true;
    var treiber = autoPilot().durchlauf({
      seed: meta.tagesStartwert(), mode: 'taeglich', starter: 'charmander'
    });
    function scheibe() {
      var n = 0;
      while (n++ < 8 && treiber.schritt()) { /* mehrere Knoten je Runde */ }
      if (treiber.fertig()) {
        var run = treiber.run;
        var gewonnen = run.state === 'victory';
        var latte = {
          region: Math.min(6, run.region + (gewonnen ? 1 : 0)),
          gewonnen: gewonnen,
          kaempfe: run.stats.battles,
          faenge: run.stats.catches
        };
        meta.setzeMesslatte(latte);
        latteLaeuft = false;
        fertig(latte);
        return;
      }
      root.setTimeout(scheibe, 0);
    }
    root.setTimeout(scheibe, 30);
  }

  function tagesUeberschrift(datum) {
    var d = new Date(datum + 'T12:00:00Z');
    var monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return d.getUTCDate() + '. ' + monate[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  /** Eine Zeile Kästchen wie im Ergebnistext — hier als Bausteine. */
  function kaestchenReihe(region, gesamt, gewonnen) {
    var out = [];
    for (var i = 0; i < gesamt; i++) {
      var geschafft = i < region - 1 || (i === region - 1 && gewonnen);
      var aktuell = i === region - 1 && !gewonnen;
      out.push(el('i', { className: 'kaestchen' + (geschafft ? ' voll' : aktuell ? ' halb' : '') }));
    }
    return el('div', { className: 'kaestchen-reihe' }, out);
  }

  SCREENS.daily = function () {
    var stand = meta.tagesStand();
    var wrap = el('div', { className: 'daily-screen' });

    wrap.appendChild(el('div', { className: 'team-head' }, [
      el('h2', { text: 'Tages-Run' }),
      el('button', { className: 'btn', type: 'button',
        onclick: function () { show('title'); } }, 'Zurück')
    ]));
    wrap.appendChild(el('p', { className: 'muted', text:
      tagesUeberschrift(stand.datum) + ' · für alle derselbe Startwert · ein Versuch' }));

    /* --- Die Messlatte --- */
    var latteHost = el('div', { className: 'daily-karte' });
    wrap.appendChild(latteHost);

    function zeigeLatte(latte) {
      clear(latteHost);
      latteHost.appendChild(el('h3', { text: '🤖 Die Messlatte' }));
      if (!latte) {
        latteHost.appendChild(el('p', { className: 'muted', text:
          'Der Automat spielt den heutigen Startwert gerade durch …' }));
        return;
      }
      latteHost.appendChild(el('p', { className: 'daily-gross', text: latte.gewonnen
        ? 'Der Automat hat die Liga bezwungen.'
        : 'Der Automat kam bis Region ' + latte.region + '.' }));
      latteHost.appendChild(kaestchenReihe(latte.region, 6, latte.gewonnen));
      latteHost.appendChild(el('p', { className: 'muted small', text:
        latte.kaempfe + ' Kämpfe · ' + latte.faenge + ' Fänge' }));
    }

    zeigeLatte(stand.latte);
    if (!stand.latte) {
      berechneMesslatte(function (latte) {
        if (App.screen === 'daily') zeigeLatte(latte);
      });
    }

    /* --- Das eigene Ergebnis --- */
    var eigenHost = el('div', { className: 'daily-karte' });
    wrap.appendChild(eigenHost);
    eigenHost.appendChild(el('h3', { text: '🎮 Dein Ergebnis' }));

    if (stand.eigen) {
      var e = stand.eigen;
      var latte = stand.latte;
      eigenHost.appendChild(el('p', { className: 'daily-gross', text: e.gewonnen
        ? 'Liga bezwungen!' : 'Region ' + e.region + ' von 6' }));
      eigenHost.appendChild(kaestchenReihe(e.region, 6, e.gewonnen));
      if (latte) {
        var besser = (e.gewonnen && !latte.gewonnen) ||
          (!e.gewonnen && !latte.gewonnen && e.region > latte.region);
        var gleich = (e.gewonnen && latte.gewonnen) || e.region === latte.region;
        eigenHost.appendChild(el('p', {
          className: besser ? 'daily-urteil gut' : gleich ? 'daily-urteil' : 'daily-urteil schlecht',
          text: besser ? '🏆 Du hast den Automaten geschlagen!'
            : gleich ? 'Gleichauf mit dem Automaten.'
            : 'Der Automat kam weiter. Morgen wieder.'
        }));
      }
      var text = PL.share.tagesText(e, stand.latte);
      eigenHost.appendChild(el('pre', { className: 'teilen-text', text: text }));
      eigenHost.appendChild(el('div', { className: 'setting-actions' }, [
        el('button', { className: 'btn primary', type: 'button',
          onclick: function () { kopiere(text, 'Ergebnis kopiert.'); } }, '📋 Ergebnis teilen')
      ]));
    } else {
      eigenHost.appendChild(el('p', { className: 'muted', text:
        'Heute noch nicht gespielt. Ein Versuch — das Ergebnis zählt, so wie es ausgeht.' }));
      eigenHost.appendChild(el('div', { className: 'setting-actions' }, [
        el('button', { className: 'btn big primary', type: 'button', onclick: function () {
          function los() { show('newrun', { tagesRun: true }); }
          if (meta.hasRun()) {
            U.confirm('Der laufende Run wird dabei gelöscht. Trotzdem den Tages-Run starten?',
              los, { danger: true });
          } else los();
        } }, '▶ Tages-Run starten')
      ]));
    }

    /* --- Vergleichen --- */
    var vglHost = el('div', { className: 'daily-karte' });
    wrap.appendChild(vglHost);
    vglHost.appendChild(el('h3', { text: '👥 Mit Freunden vergleichen' }));
    vglHost.appendChild(el('p', { className: 'muted small', text:
      'Füge den Code eines anderen ein — dann stehen beide Ergebnisse nebeneinander.' }));
    var feld = el('input', { type: 'text', className: 'code-feld', placeholder: 'TR-…',
      spellcheck: 'false', autocapitalize: 'characters' });
    var ausgabe = el('div', { className: 'vergleich' });
    vglHost.appendChild(el('div', { className: 'setting-actions' }, [
      feld,
      el('button', { className: 'btn', type: 'button', onclick: function () {
        var fremd = PL.share.ausTagesCode(feld.value);
        clear(ausgabe);
        if (!fremd) {
          ausgabe.appendChild(el('p', { className: 'bad', text:
            'Der Code stimmt nicht. Achte darauf, ihn vollständig einzufügen.' }));
          return;
        }
        if (fremd.datum !== stand.datum) {
          ausgabe.appendChild(el('p', { className: 'muted', text:
            'Das ist der Tages-Run vom ' + tagesUeberschrift(fremd.datum) + ' — nicht von heute.' }));
        }
        ausgabe.appendChild(vergleichsTafel(stand.eigen, fremd));
      } }, 'Vergleichen')
    ]));
    vglHost.appendChild(ausgabe);

    return wrap;
  };

  /** Zwei Ergebnisse nebeneinander. Ohne eigenes steht nur das fremde da. */
  function vergleichsTafel(eigen, fremd) {
    function spalte(titel, e, hervor) {
      if (!e) {
        return el('div', { className: 'vgl-spalte' }, [
          el('strong', { text: titel }),
          el('p', { className: 'muted small', text: 'Heute noch nicht gespielt.' })
        ]);
      }
      return el('div', { className: 'vgl-spalte' + (hervor ? ' gewinner' : '') }, [
        el('strong', { text: titel }),
        el('div', { className: 'daily-gross', text: e.gewonnen ? '👑 Sieg' : 'Region ' + e.region }),
        kaestchenReihe(e.region, 6, e.gewonnen),
        el('div', { className: 'muted small', text: e.kaempfe + ' Kämpfe · ' + e.faenge + ' Fänge' })
      ]);
    }
    var wert = function (e) { return e ? (e.gewonnen ? 100 : e.region) : -1; };
    var a = wert(eigen), b = wert(fremd);
    return el('div', { className: 'vgl-tafel' }, [
      spalte('Du', eigen, a > b),
      spalte('Der andere', fremd, b > a)
    ]);
  }

  /* ---------- Teilen ----------------------------------------------------------
   * Ein Run endete bisher im Nichts: Die Zahlen standen da und verschwanden.
   * Jetzt bleibt etwas übrig, das man verschicken kann — eine Karte als Bild,
   * ein paar Zeilen Text, und die Adresse, unter der jemand genau denselben
   * Run spielen kann.
   * -------------------------------------------------------------------------- */

  /** Text in die Zwischenablage. Der zweite Weg ist für Browser ohne den ersten. */
  function kopiere(text, meldung) {
    function gelungen() { U.toast(meldung || 'Kopiert.', 'good'); }
    try {
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(text).then(gelungen, altenWeg);
        return;
      }
    } catch (e) { /* dann der alte Weg */ }
    altenWeg();

    function altenWeg() {
      try {
        var feld = doc.createElement('textarea');
        feld.value = text;
        feld.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        doc.body.appendChild(feld);
        feld.select();
        var ok = doc.execCommand && doc.execCommand('copy');
        feld.remove();
        if (ok) gelungen();
        else U.toast('Kopieren ging nicht — der Text steht im Fenster zum Markieren.', 'bad');
      } catch (e2) {
        U.toast('Kopieren ging nicht.', 'bad');
      }
    }
  }

  /**
   * Zeigt die Run-Karte. Auf dem Handy geht sie direkt ins Teilen-Menü; wo das
   * nicht geht, steht sie als Bild da — lange darauf tippen genügt zum Sichern.
   */
  function openRunKarte(erg) {
    var host = el('div', { className: 'karte-host' },
      el('p', { className: 'muted', text: 'Die Karte wird gezeichnet …' }));
    var box = U.modal({
      title: 'Deine Run-Karte',
      wide: true,
      content: host,
      actions: [{ label: 'Schließen', primary: true }]
    });

    PL.share.alsBild(erg).then(function (leinwand) {
      clear(host);
      var bild = el('img', { className: 'run-karte', alt: 'Run-Karte' });
      try { bild.src = leinwand.toDataURL('image/png'); }
      catch (e) {
        clear(host);
        host.appendChild(el('p', { className: 'muted', text:
          'Das Bild lässt sich hier nicht erzeugen. Der Text darunter geht aber immer.' }));
        return;
      }
      host.appendChild(bild);
      host.appendChild(el('p', { className: 'muted small', text:
        'Lange auf das Bild tippen, um es zu sichern — oder den Knopf unten.' }));

      var reihe = el('div', { className: 'setting-actions' });
      reihe.appendChild(el('button', {
        className: 'btn primary', type: 'button', onclick: function () { teileBild(leinwand, erg); }
      }, '📤 Karte teilen'));
      host.appendChild(reihe);
    }, function () {
      clear(host);
      host.appendChild(el('p', { className: 'muted', text: 'Die Karte ließ sich nicht zeichnen.' }));
    });
    void box;
  }

  /** Gibt die Karte an das Teilen-Menü des Geräts weiter, wenn es eines gibt. */
  function teileBild(leinwand, erg) {
    var name = 'pokelike-' + erg.datum + '.png';
    function fallback() {
      try {
        var w = root.open('', '_blank');
        if (w) { w.document.write('<img src="' + leinwand.toDataURL('image/png') + '" alt="">'); return; }
      } catch (e) { /* dann bleibt das Bild im Fenster */ }
      U.toast('Lange auf das Bild tippen, um es zu sichern.');
    }
    if (!leinwand.toBlob || !root.navigator || !root.navigator.share) { fallback(); return; }
    leinwand.toBlob(function (blob) {
      if (!blob) { fallback(); return; }
      try {
        var datei = new root.File([blob], name, { type: 'image/png' });
        if (root.navigator.canShare && !root.navigator.canShare({ files: [datei] })) { fallback(); return; }
        root.navigator.share({ files: [datei], text: PL.share.alsText(erg) })
          .catch(function () { /* abgebrochen ist kein Fehler */ });
      } catch (e) { fallback(); }
    }, 'image/png');
  }

  /** Der Teilen-Block unter dem Endbildschirm. */
  function teilenBereich(erg) {
    var vorschau = el('pre', { className: 'teilen-text', text: PL.share.alsText(erg) });
    return el('div', { className: 'teilen-zone' }, [
      el('h3', { text: 'Zeig, wie weit du gekommen bist' }),
      vorschau,
      el('div', { className: 'setting-actions' }, [
        el('button', { className: 'btn primary', type: 'button',
          onclick: function () { openRunKarte(erg); } }, '🖼 Run-Karte'),
        el('button', { className: 'btn', type: 'button',
          onclick: function () { kopiere(PL.share.alsText(erg), 'Ergebnis kopiert.'); } }, '📋 Text kopieren'),
        el('button', { className: 'btn', type: 'button',
          onclick: function () { kopiere(PL.share.startwertLink(erg), 'Einladung kopiert.'); } },
          '🔗 »Spiel meinen Run«')
      ]),
      el('p', { className: 'muted small', text:
        'Der Link öffnet dieselbe Welt: dieselbe Karte, dieselben Gegner, dieselben Angebote. ' +
        'Das Startpokémon darf sich jeder selbst aussuchen.' })
    ]);
  }

  /* --- Töne: kurze, synthetische Klänge, keine Dateien -------------------------------- */

  var audio = null;
  /** Ein einzelner kurzer Ton — die Momente bedienen sich daran. */
  function tone(freq, len) {
    if (!settings().sound) return;
    try {
      if (!audio) audio = new (root.AudioContext || root.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var now = audio.currentTime, d = len || 0.06;
      var osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + d);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + d + 0.02);
    } catch (e) { /* Ton ist Beiwerk */ }
  }

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
        encounter: { f: 220, t: 'square', d: 0.3, v: 0.06 },
        select: { f: 440, t: 'sine', d: 0.05, v: 0.03 }
      }[kind];
      if (!spec) return;
      // Der Regler in den Einstellungen gilt für Musik und Klänge — also auch
      // hier, und nicht nur für die Musik.
      var laut = settings().volume === undefined ? 0.5 : settings().volume;
      if (laut <= 0) return;
      var osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = spec.t;
      osc.frequency.setValueAtTime(spec.f, now);
      if (kind === 'faint') osc.frequency.exponentialRampToValueAtTime(spec.f / 3, now + spec.d);
      if (kind === 'mega') osc.frequency.exponentialRampToValueAtTime(spec.f * 2, now + spec.d);
      if (kind === 'encounter') osc.frequency.exponentialRampToValueAtTime(spec.f * 3, now + spec.d);
      gain.gain.setValueAtTime(spec.v * (laut / 0.5), now);
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
    // Der Reise-Automat lässt sich von jedem Bildschirm aus umschalten.
    if (e.key.toLowerCase() === 'a' && e.shiftKey && App.run &&
        App.screen !== 'title' && App.screen !== 'newrun') {
      setAuto(!AUTO.on);
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
      if (!App.autoPlay && AUTO.on) setAuto(false);
      U.toast('Auto-Kampf ' + (App.autoPlay ? 'an' : 'aus'));
      renderActions();
      if (App.autoPlay && !BV.busy) awaitInput();
    } else if (e.key.toLowerCase() === 'm') {
      var mine = App.battle.sides[0].active;
      var kind = App.battle.canMega(mine) ? 'mega' : (App.battle.canGmax(mine) ? 'gmax' : null);
      if (kind) { BV.pendingMega = BV.pendingMega === kind ? null : kind; renderControls(); }
    }
  }

  /* --- Start ---------------------------------------------------------------------------- */

  function boot() {
    applyTheme();
    if (PL.moments) PL.moments.sound = tone;
    if (PL.audio) {
      PL.audio.setVolume(settings().volume === undefined ? 0.5 : settings().volume);
      PL.audio.setEnabled(!!settings().music);
    }
    probeDownloads();
    // Kam jemand über eine Einladung? Dann steht sie gleich auf dem Titel.
    if (PL.share) App.einladung = PL.share.ausAdresse();
    doc.addEventListener('keydown', onKey);
    root.addEventListener('beforeunload', function () {
      autosave();
      if (PL.cloud) PL.cloud.flush();
    });
    // Der Browser darf erst nach einem Klick um dauerhaften Speicher gebeten
    // werden — also beim ersten Klick, egal wo.
    doc.addEventListener('click', function once() {
      doc.removeEventListener('click', once);
      if (meta.durable) meta.durable();
    }, true);
    show('title');
    renderAutoButton();
    startCloud();
    // Auf dem Startbildschirm eines Telefons hält der Browser die Seite gern
    // fest. Beim Start sieht das Spiel deshalb selbst nach, ob es veraltet ist.
    if (PL.update) {
      PL.update.check().then(function (res) {
        if (res.state === 'neu') U.toast('Neue Fassung — das Spiel lädt sich neu.');
        if (res.state === 'haengt') {
          U.toast('Es liegt eine neuere Fassung bereit, dein Browser hält aber an der alten fest. ' +
            'Unter Einstellungen steht, was hilft.', 'bad');
        }
      });
    }
  }

  App.sfx = sfx;
  root.PokelikeApp = App;

  // Gestartet wird sofort. Die Skripte stehen hinter der Oberfläche im
  // Dokument, die Elemente sind also da — und die eingebetteten Sprites stehen
  // dahinter: fünf Megabyte, auf die niemand warten muss, bis das Titelbild
  // steht. Sie melden sich später von selbst an; wer vorher gezeichnet wird,
  // holt sein Bild so lange aus dem Netz.
  boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
