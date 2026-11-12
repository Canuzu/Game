/* Startseite: beschriftete Theke, Kaffeetafel, Angebot des Tages */
(function () {
  'use strict';
  var PB = window.PB;

  /* Eine Gruppe der Karte als Kreidetafel */
  PB.tafelHtml = function (gruppe) {
    return '<p class="tafel__kopf">' + PB.esc(gruppe.titel) + '</p>' +
      '<ul class="tafel__liste">' + gruppe.posten.map(function (p) {
        var preis = (p.ab ? 'ab ' : '') + PB.geld(p.preis) + (p.doppelt ? ' / ' + PB.geld(p.doppelt) : '');
        return '<li><span class="name">' + PB.esc(p.name) + '</span><span class="preis">' + preis + '</span></li>';
      }).join('') + '</ul>' +
      (gruppe.notiz ? '<p class="tafel__notiz">' + PB.esc(gruppe.notiz) + (gruppe.id === 'getraenke' ? ', alternative Milch +0,30 €' : '') + '</p>' : '');
  };

  document.addEventListener('DOMContentLoaded', function () {
    /* ---- Theke ---- */
    var theke = document.getElementById('theke');
    if (theke) {
      var offen = null, alleAn = false;
      var zettel = PB.THEKE.map(function (t, i) {
        var knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = 'punkt';
        knopf.style.setProperty('--x', t.x + '%');
        knopf.style.setProperty('--y', t.y + '%');
        knopf.setAttribute('aria-label', t.name);
        knopf.setAttribute('aria-expanded', 'false');
        var z = document.createElement('span');
        z.className = 'zettelchen' + (t.x > 78 ? ' zettelchen--rechts' : (t.x < 22 ? ' zettelchen--links' : ''));
        z.style.setProperty('--x', t.x + '%');
        z.style.setProperty('--y', t.y + '%');
        z.style.setProperty('--dreh', ((i % 3) - 1) * 2.2 + 'deg');
        z.textContent = t.name;
        z.setAttribute('aria-hidden', 'true');
        theke.appendChild(knopf);
        theke.appendChild(z);
        function zeige(an) {
          z.classList.toggle('da', an);
          knopf.setAttribute('aria-expanded', String(an));
        }
        knopf.addEventListener('click', function () {
          if (alleAn) return;
          if (offen && offen !== eintrag) offen.zeige(false);
          var an = !z.classList.contains('da');
          zeige(an);
          offen = an ? eintrag : null;
        });
        knopf.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && !alleAn) { if (offen && offen !== eintrag) offen.zeige(false); zeige(true); offen = eintrag; } });
        knopf.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !alleAn) { zeige(false); offen = null; } });
        var eintrag = { zeige: zeige };
        return eintrag;
      });
      var alle = theke.querySelector('[data-alle]');
      /* Auf großen Bildschirmen ist genug Platz: alle Namen stehen gleich da */
      if (window.matchMedia('(min-width: 881px)').matches) {
        alleAn = true;
        zettel.forEach(function (e) { e.zeige(true); });
        alle.hidden = true;
      }
      alle.addEventListener('click', function () {
        alleAn = !alleAn;
        zettel.forEach(function (e, i) {
          if (!alleAn || PB.ruhig) e.zeige(alleAn);
          else setTimeout(function () { if (alleAn) e.zeige(true); }, i * 70);
        });
        alle.textContent = alleAn ? 'Beschriftung weg' : 'Alles beschriften';
        offen = null;
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && offen && !alleAn) { offen.zeige(false); offen = null; } });
    }

    /* ---- Kaffeetafel ---- */
    var tafel = document.getElementById('kaffeetafel');
    if (tafel) {
      var getraenke = PB.KARTE.filter(function (g) { return g.id === 'getraenke'; })[0];
      tafel.innerHTML = PB.tafelHtml(getraenke);
    }

    /* ---- Angebot des Tages, wenn eins eingetragen ist ---- */
    var angebot = document.getElementById('tagesangebot'), a = PB.CAFE.tagesangebot;
    if (angebot && a && a.text) {
      angebot.textContent = 'Heute an der Tafel: ' + a.text + (a.preis ? ', ' + PB.geld(a.preis) : '');
      angebot.hidden = false;
    }
  });
})();
