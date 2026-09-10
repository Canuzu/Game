/* =============================================================================
 * share.js — Was von einem Run übrig bleibt
 * -----------------------------------------------------------------------------
 * Ein Run endet, und dann? Bisher: nichts. Die Zahlen standen auf dem
 * Endbildschirm und verschwanden mit dem nächsten Tippen. Nichts davon konnte
 * das Spiel verlassen — und was das Spiel nicht verlässt, sieht nie jemand.
 *
 * Hier entstehen deshalb drei Dinge aus einem beendeten Run:
 *
 *   1. Ein Datenobjekt      — alles Wissenswerte an einer Stelle
 *   2. Ein kurzer Text      — Zeilen mit farbigen Kästchen, überall einfügbar
 *   3. Ein Bild             — die Run-Karte, gezeichnet auf eine Leinwand
 *
 * Dazu der Startwert als Adresse: Wer sie öffnet, spielt genau denselben Run.
 * Das ist der billigste Weg, aus einem Ergebnis eine Einladung zu machen.
 *
 * Gliederung:  1) Das Ergebnis   2) Der Text   3) Die Karte   4) Der Startwert
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  if (typeof require === 'function' && !PL.dex) require('./core.js');
  var dex = PL.dex;

  /* ---------- 1) Das Ergebnis ----------------------------------------------- */

  var MODUS_NAME = {
    standard: 'Standard', kurz: 'Kurzrun', endlos: 'Endlos',
    bossrush: 'Boss-Rush', taeglich: 'Tages-Run'
  };

  /**
   * Fasst einen beendeten Run zusammen. Nimmt nur, was auf eine Karte passt —
   * der volle Spielstand bleibt, wo er ist.
   */
  function ergebnis(run, outcome) {
    var mons = PL.mon;
    var gesamt = (PL.Run.MODES[run.mode] || {}).regions || 9;
    var gewonnen = outcome === 'sieg' || run.state === 'victory';
    var erreicht = Math.min(gesamt, run.region + (gewonnen ? 1 : 0));

    return {
      v: 1,
      modus: run.mode,
      modusName: MODUS_NAME[run.mode] || run.mode,
      startwert: run.seed,
      aufstieg: run.ascension || 0,
      nuzlocke: !!run.nuzlocke,
      gewonnen: gewonnen,
      region: erreicht,
      regionen: gesamt,
      datum: new Date().toISOString().slice(0, 10),
      kaempfe: run.stats.battles,
      siege: run.stats.wins,
      faenge: run.stats.catches,
      relikte: Object.keys(run.relics || {}).length,
      entwicklungen: run.stats.evolutions,
      shinies: run.stats.shinies || 0,
      geld: run.stats.moneyEarned,
      runden: run.stats.turns,
      team: (run.party || []).map(function (m) {
        var sp = dex.sp(m.sp);
        return {
          sp: m.sp, name: mons ? mons.name(m) : sp.n, lvl: m.lvl,
          shiny: !!m.shiny, typen: sp.t.slice()
        };
      })
    };
  }

  /* ---------- 2) Der Text ---------------------------------------------------
   * Eine Zeile Kästchen sagt mehr als eine Zahl: Man sieht auf einen Blick,
   * wie weit jemand gekommen ist, ohne die Regeln zu kennen. Genau das macht
   * ein Ergebnis weitergebbar.
   * ------------------------------------------------------------------------ */

  function kaestchen(erg) {
    var out = '', i;
    for (i = 0; i < erg.regionen; i++) {
      if (i < erg.region - 1) out += '🟩';            // durchgespielt
      else if (i === erg.region - 1) out += erg.gewonnen ? '🟩' : '🟨';
      else out += '⬜';
    }
    return out;
  }

  function alsText(erg) {
    var zeilen = [];
    var kopf = 'Pokélike+ · ' + erg.modusName;
    if (erg.aufstieg > 0) kopf += ' · Aufstieg ' + erg.aufstieg;
    if (erg.nuzlocke) kopf += ' · Nuzlocke';
    zeilen.push(kopf);
    zeilen.push(erg.gewonnen
      ? '👑 Liga bezwungen!'
      : 'Region ' + erg.region + ' von ' + erg.regionen);
    zeilen.push(kaestchen(erg));
    if (erg.team.length) {
      zeilen.push(erg.team.slice(0, 3).map(function (m) {
        return (m.shiny ? '✦' : '') + m.name + ' ' + m.lvl;
      }).join(' · ') + (erg.team.length > 3 ? ' +' + (erg.team.length - 3) : ''));
    }
    zeilen.push(erg.kaempfe + ' Kämpfe · ' + erg.faenge + ' Fänge · ' +
      erg.relikte + ' Relikte' + (erg.shinies ? ' · ' + erg.shinies + '× ✦' : ''));
    zeilen.push('Startwert ' + erg.startwert);
    return zeilen.join('\n');
  }

  /* ---------- 3) Die Karte --------------------------------------------------
   * Gezeichnet auf eine Leinwand, damit ein Bild herauskommt, das man
   * verschicken kann. Alles darauf ist gezeichnet oder stammt aus den
   * eingebetteten Sprites — es wird nichts nachgeladen, sonst bliebe die
   * Leinwand »verdorben« und ließe sich nicht mehr auslesen.
   * ------------------------------------------------------------------------ */

  var KARTE = {
    breite: 720,
    grund: '#12151d', tief: '#0b0d13', linie: '#2e3444',
    text: '#e6e9f2', leise: '#98a0b5', gold: '#ffcb3d', gut: '#4fc47a', schlecht: '#e8503a'
  };

  function ladeBild(src) {
    return new Promise(function (fertig) {
      if (!src) { fertig(null); return; }
      var img = new root.Image();
      img.onload = function () { fertig(img); };
      img.onerror = function () { fertig(null); };
      // Nur eingebettete Bilder (data:) sind sicher — alles andere verdürbe
      // die Leinwand, und dann käme kein Bild mehr heraus.
      if (src.slice(0, 5) !== 'data:') { fertig(null); return; }
      img.src = src;
    });
  }

  function rundesRechteck(g, x, y, b, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + b, y, x + b, y + h, r);
    g.arcTo(x + b, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + b, y, r);
    g.closePath();
  }

  /**
   * Zeichnet die Karte und liefert die Leinwand. Die Höhe richtet sich nach
   * dem Team: Wer mit zwei Pokémon endet, bekommt keine leere Fläche darunter.
   */
  function alsBild(erg) {
    var anzahl = Math.min(6, erg.team.length) || 1;
    var reihen = Math.ceil(anzahl / 3);
    var hoehe = 584 + reihen * 166;

    var c = root.document.createElement('canvas');
    c.width = KARTE.breite;
    c.height = hoehe;
    var g = c.getContext('2d');
    var B = KARTE.breite, rand = 48;

    // Grund
    g.fillStyle = KARTE.tief;
    g.fillRect(0, 0, B, hoehe);
    var verlauf = g.createLinearGradient(0, 0, 0, 420);
    verlauf.addColorStop(0, erg.gewonnen ? 'rgba(255,203,61,.18)' : 'rgba(232,80,58,.14)');
    verlauf.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = verlauf;
    g.fillRect(0, 0, B, 420);

    var y = 84;

    // Kopfzeile
    g.textAlign = 'left';
    g.fillStyle = KARTE.gold;
    g.font = '600 26px system-ui, sans-serif';
    g.fillText('POKÉLIKE+', rand, y);
    g.textAlign = 'right';
    g.fillStyle = KARTE.leise;
    g.font = '400 22px system-ui, sans-serif';
    g.fillText(erg.datum, B - rand, y);
    y += 26;

    g.strokeStyle = KARTE.linie;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(rand, y); g.lineTo(B - rand, y); g.stroke();
    y += 76;

    // Das Ergebnis, groß
    g.textAlign = 'left';
    g.fillStyle = erg.gewonnen ? KARTE.gold : KARTE.text;
    g.font = '700 62px system-ui, sans-serif';
    g.fillText(erg.gewonnen ? 'Liga bezwungen' : 'Region ' + erg.region, rand, y);
    y += 44;
    g.fillStyle = KARTE.leise;
    g.font = '400 26px system-ui, sans-serif';
    var unter = erg.modusName + (erg.aufstieg ? ' · Aufstieg ' + erg.aufstieg : '') +
      (erg.nuzlocke ? ' · Nuzlocke' : '') +
      (erg.gewonnen ? '' : ' · von ' + erg.regionen + ' Regionen');
    g.fillText(unter, rand, y);
    y += 56;

    // Der Weg als Kästchenreihe
    var n = erg.regionen, luecke = 10;
    var kb = Math.min(52, Math.floor((B - rand * 2 - luecke * (n - 1)) / n));
    for (var i = 0; i < n; i++) {
      var x = rand + i * (kb + luecke);
      var geschafft = i < erg.region - 1 || (i === erg.region - 1 && erg.gewonnen);
      var aktuell = i === erg.region - 1 && !erg.gewonnen;
      g.fillStyle = geschafft ? KARTE.gut : aktuell ? KARTE.gold : '#232838';
      rundesRechteck(g, x, y, kb, kb, 6);
      g.fill();
      if (aktuell) { g.strokeStyle = KARTE.gold; g.lineWidth = 3; g.stroke(); }
    }
    y += kb + 66;

    // Das Team
    g.fillStyle = KARTE.leise;
    g.font = '600 20px system-ui, sans-serif';
    g.fillText('DEIN TEAM', rand, y);
    y += 24;

    var kartenY = y;
    var spalten = 3, kw = Math.floor((B - rand * 2 - 16 * (spalten - 1)) / spalten), kh = 150;

    return Promise.all(erg.team.slice(0, 6).map(function (m) {
      var sp = dex.sp(m.sp);
      var kette = PL.sprite ? PL.sprite.chain(sp, { shiny: m.shiny }) : [];
      return ladeBild(kette[0]);
    })).then(function (bilder) {
      erg.team.slice(0, 6).forEach(function (m, idx) {
        var sx = rand + (idx % spalten) * (kw + 16);
        var sy = kartenY + Math.floor(idx / spalten) * (kh + 16);
        g.fillStyle = '#1a1e29';
        rundesRechteck(g, sx, sy, kw, kh, 10);
        g.fill();
        g.strokeStyle = KARTE.linie; g.lineWidth = 2; g.stroke();

        var bild = bilder[idx];
        if (bild) {
          var gr = 84;
          var faktor = Math.min(gr / bild.width, gr / bild.height);
          var bw = bild.width * faktor, bh = bild.height * faktor;
          g.imageSmoothingEnabled = false;
          g.drawImage(bild, sx + kw / 2 - bw / 2, sy + 16, bw, bh);
        }
        g.textAlign = 'center';
        g.fillStyle = KARTE.text;
        g.font = '600 20px system-ui, sans-serif';
        var name = (m.shiny ? '✦ ' : '') + m.name;
        if (g.measureText(name).width > kw - 16) {
          while (name.length > 4 && g.measureText(name + '…').width > kw - 16) name = name.slice(0, -1);
          name += '…';
        }
        g.fillText(name, sx + kw / 2, sy + kh - 34);
        g.fillStyle = KARTE.leise;
        g.font = '400 18px system-ui, sans-serif';
        g.fillText('Lv ' + m.lvl, sx + kw / 2, sy + kh - 12);
        g.textAlign = 'left';
      });

      var zy = kartenY + reihen * (kh + 16) + 40;

      // Die Zahlen
      var werte = [
        ['Kämpfe', erg.kaempfe], ['Fänge', erg.faenge],
        ['Relikte', erg.relikte], ['Entwicklungen', erg.entwicklungen]
      ];
      var sw = Math.floor((B - rand * 2) / werte.length);
      werte.forEach(function (w, i2) {
        var wx = rand + i2 * sw;
        g.fillStyle = KARTE.text;
        g.font = '700 34px system-ui, sans-serif';
        g.fillText(String(w[1]), wx, zy);
        g.fillStyle = KARTE.leise;
        g.font = '400 18px system-ui, sans-serif';
        g.fillText(w[0], wx, zy + 24);
      });

      // Fußzeile mit dem Startwert — damit jemand denselben Run spielen kann
      var fy = hoehe - 46;
      g.strokeStyle = KARTE.linie; g.lineWidth = 2;
      g.beginPath(); g.moveTo(rand, fy - 34); g.lineTo(B - rand, fy - 34); g.stroke();
      g.fillStyle = KARTE.leise;
      g.font = '400 20px system-ui, sans-serif';
      g.fillText('Startwert ' + erg.startwert, rand, fy);
      g.textAlign = 'right';
      g.fillText('canuzu.github.io/Game', B - rand, fy);

      return c;
    });
  }

  /* ---------- 4) Der Startwert ----------------------------------------------
   * Ein Run steckt in drei Angaben: Modus, Aufstieg, Startwert. Als Anhängsel
   * an der Adresse wird daraus eine Einladung — wer sie öffnet, bekommt
   * dieselbe Karte, dieselben Gegner, dieselben Angebote.
   * ------------------------------------------------------------------------ */

  function startwertCode(erg) {
    return [erg.modus, erg.aufstieg || 0, erg.startwert >>> 0].join('-') +
      (erg.nuzlocke ? '-n' : '');
  }

  function startwertLink(erg) {
    var basis = 'https://canuzu.github.io/Game/';
    try {
      var l = root.location;
      if (l && /^https?:$/.test(l.protocol)) basis = l.origin + l.pathname;
    } catch (e) { /* dann die feste Adresse */ }
    return basis + '?run=' + startwertCode(erg);
  }

  /** Liest eine Einladung aus der Adresse. Liefert null, wenn keine da ist. */
  function ausAdresse() {
    var such;
    try { such = root.location && root.location.search; } catch (e) { return null; }
    if (!such) return null;
    var treffer = /[?&]run=([^&]+)/.exec(such);
    if (!treffer) return null;
    return ausCode(decodeURIComponent(treffer[1]));
  }

  function ausCode(code) {
    var teile = String(code || '').split('-');
    if (teile.length < 3) return null;
    var modus = teile[0], aufstieg = parseInt(teile[1], 10), startwert = parseInt(teile[2], 10);
    if (!PL.Run.MODES[modus] || !isFinite(aufstieg) || !isFinite(startwert)) return null;
    return {
      modus: modus,
      aufstieg: Math.max(0, Math.min(10, aufstieg)),
      startwert: startwert >>> 0,
      nuzlocke: teile[3] === 'n',
      modusName: MODUS_NAME[modus] || modus
    };
  }

  PL.share = {
    ergebnis: ergebnis,
    alsText: alsText,
    alsBild: alsBild,
    kaestchen: kaestchen,
    startwertCode: startwertCode,
    startwertLink: startwertLink,
    ausAdresse: ausAdresse,
    ausCode: ausCode,
    MODUS_NAME: MODUS_NAME
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.share;
})(typeof globalThis !== 'undefined' ? globalThis : this);
