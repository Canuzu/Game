/* =============================================================================
 * fahrplan.js — der Hochzeits-Fahrplan
 * -----------------------------------------------------------------------------
 * Aus dem Hochzeitstag wird ein Plan: wann Beratung, Anprobe, Feinschliff und
 * Abholung sinnvoll sind. Jeder Schritt liegt auf einem geöffneten Tag und führt
 * direkt in die Terminbuchung. Die Abstände stehen in config.js (fahrplan).
 * Das Datum merkt sich nur der Browser des Kunden.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, Z = M.zeit, C = M.config;

  function offen(datum) { return Z.abschnitte(datum).length > 0; }
  function tagLang(datum) { var t = Z.teile(datum); return t.tag + '. ' + Z.MONATE[t.monat - 1] + ' ' + t.jahr; }

  var F = M.fahrplan = {

    /* Gemerkter Hochzeitstag, solange er nicht vorbei ist */
    gemerkt: function () {
      var d = M.speicher.lies('hochzeit', null);
      return typeof d === 'string' && Z.teile(d) && d >= Z.jetzt().datum ? d : null;
    },
    merke: function (datum) { M.speicher.schreib('hochzeit', datum); },
    vergiss: function () { M.speicher.weg('hochzeit'); },

    tageBis: function (datum, heute) {
      var h = Z.teile(heute || Z.jetzt().datum), d = Z.teile(datum);
      return Math.round((Date.UTC(d.jahr, d.monat - 1, d.tag) - Date.UTC(h.jahr, h.monat - 1, h.tag)) / 86400000);
    },

    /* Berechnet die Schritte. heute ist nur für Tests gedacht. */
    plane: function (hochzeit, heute) {
      heute = heute || Z.jetzt().datum;
      var morgen = Z.plusTage(heute, 1), letzter = Z.plusTage(hochzeit, -1);
      var horizont = Z.plusTage(heute, C.termin.wochenVoraus * 7);
      var frueh = morgen, schritte = [];

      C.fahrplan.forEach(function (s) {
        var ideal = Z.plusTage(hochzeit, -s.wochen * 7), eilig = ideal < morgen;
        var tag = ideal < frueh ? frueh : ideal, gefunden = null, n, z;
        /* auf einen geöffneten Tag legen: erst kurz zurück, sonst nach vorn */
        for (n = 0; n < 7 && !gefunden; n++) { z = Z.plusTage(tag, -n); if (z >= frueh && z <= letzter && offen(z)) gefunden = z; }
        for (n = 1; n < 14 && !gefunden; n++) { z = Z.plusTage(tag, n); if (z <= letzter && offen(z)) gefunden = z; }
        if (!gefunden) return;
        frueh = gefunden;
        var vorher = schritte[schritte.length - 1];
        if (vorher && vorher.datum === gefunden) {
          /* Ist die Zeit knapp, fallen Schritte auf denselben Tag und werden ein Termin */
          vorher.namen.push(s.name);
          vorher.eilig = vorher.eilig || eilig;
          return;
        }
        schritte.push({
          id: s.id, art: s.art, namen: [s.name], text: s.text, wochen: s.wochen, datum: gefunden, eilig: eilig,
          buchbar: gefunden <= horizont,
          buchbarAb: gefunden <= horizont ? null : Z.plusTage(gefunden, -C.termin.wochenVoraus * 7)
        });
      });

      schritte.forEach(function (s) {
        s.name = s.namen.length > 1 ? s.namen.slice(0, -1).join(', ') + ' und ' + s.namen[s.namen.length - 1] : s.namen[0];
        if (s.namen.length > 1) s.text = 'Die Zeit ist knapp, deshalb legen wir diese Schritte zusammen: ein Termin, in dem wir Stil, Größe und Zubehör klären.';
      });

      return { hochzeit: hochzeit, tage: F.tageBis(hochzeit, heute), schritte: schritte, knapp: schritte.some(function (s) { return s.eilig; }) };
    },

    /* Kalenderdatei mit einem ganztägigen Eintrag je Schritt */
    ics: function (plan) {
      function fest(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
      function tag(datum) { return datum.replace(/-/g, ''); }
      function falte(zeile) {
        var aus = [];
        while (zeile.length > 60) { aus.push(zeile.slice(0, 60)); zeile = ' ' + zeile.slice(60); }
        aus.push(zeile);
        return aus.join('\r\n');
      }
      var stempel = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
      var zeilen = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MUGA Herrenausstatter//Hochzeits-Fahrplan//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
      plan.schritte.forEach(function (s) {
        zeilen.push(
          'BEGIN:VEVENT',
          'UID:fahrplan-' + s.id + '-' + plan.hochzeit + '@mmuga.de',
          'DTSTAMP:' + stempel,
          'DTSTART;VALUE=DATE:' + tag(s.datum),
          'DTEND;VALUE=DATE:' + tag(Z.plusTage(s.datum, 1)),
          'SUMMARY:' + fest('Hochzeitsanzug: ' + s.name + ' bei MUGA'),
          'LOCATION:' + fest(C.firma + ', ' + C.strasse + ', ' + C.plz + ' ' + C.ort),
          'DESCRIPTION:' + fest(s.text + '\nTermin buchen: online oder telefonisch unter ' + C.telefon + '.\nHochzeit am ' + Z.datumKurz(plan.hochzeit) + '.'),
          'TRANSP:TRANSPARENT',
          'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + fest('Hochzeitsanzug: ' + s.name + ' bei MUGA'), 'TRIGGER:PT9H', 'END:VALARM',
          'END:VEVENT'
        );
      });
      zeilen.push('END:VCALENDAR');
      return zeilen.map(falte).join('\r\n') + '\r\n';
    }
  };

  /* ---------- Darstellung auf der Startseite --------------------------------- */

  function pfeil() { return M.symbol('pfeil'); }

  function zeichne(feld, plan) {
    var esc = M.esc, halte = '';

    plan.schritte.forEach(function (s, i) {
      var wann = s.eilig ? 'So bald wie möglich' : (s.wochen === 1 ? '1 Woche vorher' : s.wochen + ' Wochen vorher');
      var ziel = 'termin.html?art=' + s.art + '&datum=' + s.datum + '&anlass=' + plan.hochzeit;
      halte += '<li class="halt" style="--n:' + i + '">' +
        '<span class="halt__knopf" aria-hidden="true"></span>' +
        '<p class="halt__wann">' + wann + '</p>' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<p class="halt__datum">' + (s.eilig ? 'ab ' : 'um den ') + tagLang(s.datum) + '</p>' +
        '<p class="halt__text">' + esc(s.text) + '</p>' +
        (s.buchbar
          ? '<a class="faden" href="' + ziel + '">Termin wählen ' + pfeil() + '</a>'
          : '<p class="klein leise">Online buchbar ab ' + Z.datumKurz(s.buchbarAb) + '</p>') +
        '</li>';
    });
    halte += '<li class="halt halt--ziel" style="--n:' + plan.schritte.length + '">' +
      '<span class="halt__knopf" aria-hidden="true"></span>' +
      '<p class="halt__wann">Der große Tag</p>' +
      '<h3>Ihre Hochzeit</h3>' +
      '<p class="halt__datum">' + Z.datumLang(plan.hochzeit) + '</p>' +
      '<p class="halt__text">Der Anzug sitzt. Sie müssen nur noch Ja sagen.</p>' +
      '</li>';

    var tageText = plan.tage === 1 ? 'Tag bis zu Ihrer Hochzeit' : 'Tage bis zu Ihrer Hochzeit';
    var hinweis = !plan.schritte.length
      ? 'Bis zu Ihrer Hochzeit bleibt kaum Zeit. Rufen Sie uns bitte gleich an, wir finden eine Lösung: <a href="tel:' + C.telefonLink + '">' + C.telefon + '</a>.'
      : (plan.knapp
        ? 'Die Zeit ist knapp, aber es geht. Am schnellsten klären wir alles am Telefon: <a href="tel:' + C.telefonLink + '">' + C.telefon + '</a>.'
        : 'Die Abstände sind Richtwerte aus der Praxis. Wenn es schneller gehen muss, rufen Sie uns an: <a href="tel:' + C.telefonLink + '">' + C.telefon + '</a>.');

    feld.innerHTML =
      '<div class="fahrplan__zaehler">' +
        '<span class="fahrplan__tage" data-tage>' + plan.tage + '</span>' +
        '<p>' + tageText + ' am <strong>' + Z.datumLang(plan.hochzeit) + '</strong></p>' +
      '</div>' +
      '<ol class="fahrplan__weg" style="--halte:' + (plan.schritte.length + 1) + '">' + halte + '</ol>' +
      '<div class="knopfreihe fahrplan__knoepfe">' +
        (plan.schritte.length ? '<button class="knopf knopf--dunkel" type="button" data-fahrplan-ics>' + M.symbol('kalender') + 'Fahrplan in den Kalender</button>' : '') +
        '<button class="faden" type="button" data-fahrplan-weg>Datum vergessen</button>' +
      '</div>' +
      '<p class="klein leise mitte fahrplan__hinweis">' + hinweis + '</p>';
    feld.hidden = false;
  }

  function belebe(feld, plan) {
    var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var weg = feld.querySelector('.fahrplan__weg'), zahl = feld.querySelector('[data-tage]');
    function los() {
      feld.classList.add('da');
      weg.style.setProperty('--weg', 1);
      if (ruhig) return;
      var start = null, dauer = 1400;
      (function schritt(jetzt) {
        if (start === null) start = jetzt;
        var f = Math.min(1, (jetzt - start) / dauer);
        zahl.textContent = Math.round(plan.tage * (1 - Math.pow(1 - f, 3)));
        if (f < 1) requestAnimationFrame(schritt);
      })(performance.now());
    }
    feld.classList.remove('da');
    weg.style.setProperty('--weg', 0);
    if (!('IntersectionObserver' in window)) { los(); return; }
    var auge = new IntersectionObserver(function (t) {
      if (t[0].isIntersecting) { auge.disconnect(); los(); }
    }, { threshold: 0.15 });
    auge.observe(feld);
  }

  M.bereit(function () {
    var form = document.getElementById('fahrplan-form'), feld = document.getElementById('fahrplan-ergebnis');
    if (!form || !feld) return;
    var eingabe = form.elements.hochzeitstag, heute = Z.jetzt().datum, plan = null;
    eingabe.min = Z.plusTage(heute, 1);
    eingabe.max = Z.plusTage(heute, 365 * 3);
    eingabe.dataset.fehler = 'Bitte wählen Sie einen Tag, der in der Zukunft liegt.';

    function zeige(datum, rollen) {
      plan = F.plane(datum);
      zeichne(feld, plan);
      belebe(feld, plan);
      if (rollen) feld.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!M.pruefe(form)) return;
      var datum = eingabe.value;
      if (!Z.teile(datum)) return;
      F.merke(datum);
      zeige(datum, true);
    });

    feld.addEventListener('click', function (e) {
      if (e.target.closest('[data-fahrplan-ics]') && plan) {
        var blob = new Blob([F.ics(plan)], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url;
        a.download = 'Hochzeits-Fahrplan-MUGA.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        M.sag('Der Fahrplan liegt als Kalenderdatei in Ihren Downloads.');
      }
      if (e.target.closest('[data-fahrplan-weg]')) {
        F.vergiss();
        plan = null;
        feld.hidden = true;
        feld.textContent = '';
        eingabe.value = '';
        eingabe.focus();
      }
    });

    var gemerkt = F.gemerkt();
    if (gemerkt && gemerkt >= eingabe.min) {
      eingabe.value = gemerkt;
      zeige(gemerkt, false);
    }
  });
})();
