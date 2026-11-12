/* Karte: Tafel zum Antippen, Bestellzettel, Abholzeit, Versand per WhatsApp oder SMS */
(function () {
  'use strict';
  var PB = window.PB, esc = PB.esc;

  /* Zettel: [{ id, menge, wahl: { salat, milch, doppelt } }] */
  var zettel = PB.speicher.lies('zettel', []);
  if (!Array.isArray(zettel)) zettel = [];
  zettel = zettel.filter(function (z) { return z && PB.posten(z.id) && z.menge > 0; });

  function sichere() { PB.speicher.schreib('zettel', zettel); }
  function gleich(a, b) { return a.id === b.id && JSON.stringify(a.wahl || {}) === JSON.stringify(b.wahl || {}); }
  function anzahl(id) { return zettel.filter(function (z) { return z.id === id; }).reduce(function (s, z) { return s + z.menge; }, 0); }

  function nimm(id) {
    var neu = { id: id, menge: 1, wahl: {} };
    var da = zettel.filter(function (z) { return gleich(z, neu); })[0];
    if (da) da.menge = Math.min(20, da.menge + 1); else zettel.push(neu);
    sichere();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var spalten = document.getElementById('tafel-spalten');
    var inhalt = document.getElementById('zettel-inhalt');
    var form = document.getElementById('abholform');
    var versand = document.getElementById('versand');
    var leiste = document.getElementById('leiste');

    /* ---- Tafel ---- */
    spalten.innerHTML = PB.KARTE.map(function (g) {
      return '<section id="' + g.id + '" aria-labelledby="t-' + g.id + '">' +
        '<h2 class="tafel__kopf" id="t-' + g.id + '">' + esc(g.titel) + '</h2>' +
        '<ul class="tafel__liste">' + g.posten.map(function (p) {
          var preis = (p.ab ? 'ab ' : '') + PB.geld(p.preis) + (p.doppelt ? ' / ' + PB.geld(p.doppelt) : '');
          return '<li><button class="tafel__knopf" type="button" data-nimm="' + p.id + '">' +
            '<span class="name">' + esc(p.name) + '</span><span class="anzahl" data-anzahl="' + p.id + '"></span>' +
            '<span class="preis">' + preis + '</span><span class="plus" aria-hidden="true">+</span><span class="unsichtbar">, auf den Zettel</span></button></li>';
        }).join('') + '</ul>' +
        (g.notiz ? '<p class="tafel__notiz">' + esc(g.notiz) + (g.id === 'getraenke' ? ', alternative Milch +0,30 €' : '') + '</p>' : '') +
        '</section>';
    }).join('');

    var a = PB.CAFE.tagesangebot, angebot = document.getElementById('angebot');
    if (a && a.text) { angebot.innerHTML = 'Heute: <strong>' + esc(a.text) + '</strong>' + (a.preis ? ' ' + PB.geld(a.preis) : ''); angebot.hidden = false; }

    spalten.addEventListener('click', function (e) {
      var k = e.target.closest('[data-nimm]');
      if (!k) return;
      nimm(k.dataset.nimm);
      k.classList.remove('genommen'); void k.offsetWidth; k.classList.add('genommen');
      setTimeout(function () { k.classList.remove('genommen'); }, 250);
      zeichne();
    });

    /* ---- Zettel ---- */
    function zeichne() {
      var r = PB.rechne(zettel);
      PB.$$('[data-anzahl]').forEach(function (s) { var n = anzahl(s.dataset.anzahl); s.textContent = n ? n + '×' : ''; });

      if (!r.zeilen.length) {
        inhalt.innerHTML = '<p class="zettel__leer">Noch leer. Tipp links auf der Tafel, was du möchtest.</p>';
        form.hidden = true;
        versand.hidden = true;
      } else {
        inhalt.innerHTML = '<div class="zettel__zeilen">' + zettel.map(function (z, i) {
          var p = PB.posten(z.id), w = z.wahl || {};
          var extras = (p.extra || []).map(function (e) {
            return '<label><input type="checkbox" data-extra="' + e + '" data-i="' + i + '"' + (w[e] ? ' checked' : '') + '>' + esc(PB.EXTRAS[e].name) + ' +' + PB.geld(PB.EXTRAS[e].preis) + '</label>';
          }).join('') + (p.doppelt ? '<label><input type="checkbox" data-extra="doppelt" data-i="' + i + '"' + (w.doppelt ? ' checked' : '') + '>doppelt</label>' : '');
          return '<div class="zeile">' +
            '<span class="zeile__name">' + esc(p.name) + (p.ab ? ' <span class="leise klein">(ab)</span>' : '') + '</span>' +
            '<span class="zeile__preis">' + PB.geld(PB.postenPreis(p, w) * z.menge) + '</span>' +
            '<div class="zeile__steuer"><span class="zaehler"><button type="button" data-menge="-1" data-i="' + i + '" aria-label="Eins weniger ' + esc(p.name) + '">−</button>' +
            '<output aria-label="Anzahl">' + z.menge + '</output><button type="button" data-menge="1" data-i="' + i + '" aria-label="Eins mehr ' + esc(p.name) + '"' + (z.menge >= 20 ? ' disabled' : '') + '>+</button></span>' + extras + '</div>' +
          '</div>';
        }).join('') + '</div>' +
        '<div class="zettel__summe"><span>Zusammen<small>' + (r.ab ? 'Bei „ab“-Preisen kann es etwas mehr werden.' : 'Bezahlt wird beim Abholen.') + '</small></span><span>' + PB.geld(r.summe) + '</span></div>';
        form.hidden = false;
      }
      var stueck = r.zeilen.reduce(function (s, z) { return s + z.menge; }, 0);
      document.getElementById('leiste-text').textContent = stueck === 1 ? '1 Sache auf dem Zettel' : stueck + ' Sachen auf dem Zettel';
      document.getElementById('leiste-summe').textContent = PB.geld(r.summe);
      leiste.classList.toggle('da', stueck > 0 && !zettelSichtbar);
    }

    inhalt.addEventListener('click', function (e) {
      var k = e.target.closest('[data-menge]');
      if (!k) return;
      var z = zettel[+k.dataset.i];
      z.menge = Math.max(0, Math.min(20, z.menge + (+k.dataset.menge)));
      var ziel = k.dataset.menge;
      if (!z.menge) zettel.splice(+k.dataset.i, 1);
      sichere();
      zeichne();
      var gleicher = inhalt.querySelector('[data-menge="' + ziel + '"][data-i="' + k.dataset.i + '"]');
      if (gleicher && !gleicher.disabled) gleicher.focus();
    });
    inhalt.addEventListener('change', function (e) {
      var c = e.target.closest('[data-extra]');
      if (!c) return;
      var z = zettel[+c.dataset.i];
      z.wahl = Object.assign({}, z.wahl);
      if (c.checked) z.wahl[c.dataset.extra] = true; else delete z.wahl[c.dataset.extra];
      /* gleiche Zeilen zusammenlegen */
      for (var i = 0; i < zettel.length; i++) {
        if (zettel[i] !== z && gleich(zettel[i], z)) { zettel[i].menge = Math.min(20, zettel[i].menge + z.menge); zettel.splice(zettel.indexOf(z), 1); break; }
      }
      sichere();
      zeichne();
    });

    /* ---- Abholzeit ---- */
    var tage = document.getElementById('tage'), uhrzeit = document.getElementById('uhrzeit');
    var heute = PB.jetzt().datum, liste = [];
    for (var n = 0; n <= PB.CAFE.abholung.tageVoraus && liste.length < 4; n++) {
      var d = PB.plusTage(heute, n);
      if (PB.abholzeiten(d).length) liste.push(d);
    }
    tage.innerHTML = liste.map(function (d, i) {
      return '<label><input type="radio" name="tag" value="' + d + '"' + (i === 0 ? ' checked' : '') + '><span>' + PB.tagName(d) + '</span></label>';
    }).join('');
    function zeiten() {
      var gewaehlt = PB.$('input[name="tag"]:checked', tage);
      var m = gewaehlt ? PB.abholzeiten(gewaehlt.value) : [];
      var vorher = uhrzeit.value;
      uhrzeit.innerHTML = '<option value="">Bitte wählen</option>' + m.map(function (x) {
        return '<option value="' + x + '">' + PB.uhr(x) + ' Uhr</option>';
      }).join('');
      if (vorher && m.indexOf(+vorher) !== -1) uhrzeit.value = vorher;
      else if (m.length) uhrzeit.value = String(m[0]);
    }
    tage.addEventListener('change', zeiten);
    zeiten();
    var gemerkt = PB.speicher.lies('name', '');
    if (gemerkt) form.elements.name.value = gemerkt;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!PB.pruefe(form)) return;
      var r = PB.rechne(zettel);
      if (!r.zeilen.length) return;
      var tag = PB.$('input[name="tag"]:checked', tage).value, um = +uhrzeit.value;
      PB.speicher.schreib('name', form.elements.name.value);
      var zeilen = ['Hallo Pausenbrot, ich möchte etwas abholen:', ''];
      r.zeilen.forEach(function (z) { zeilen.push(z.menge + '× ' + z.name + ' (' + PB.geld(z.gesamt) + ')'); });
      zeilen.push('', 'Zusammen: ' + PB.geld(r.summe) + (r.ab ? ' (mit „ab“-Preisen)' : ''));
      zeilen.push('Abholen: ' + PB.datumLang(tag) + ', ' + PB.uhr(um) + ' Uhr');
      zeilen.push('Name: ' + form.elements.name.value);
      if (form.elements.notiz.value.trim()) zeilen.push('Hinweis: ' + form.elements.notiz.value.trim());
      PB.versand(versand, zeilen.join('\n'), 'Bestellung');
    });

    /* Untere Leiste auf dem Handy, solange der Zettel nicht zu sehen ist */
    var zettelSichtbar = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (t) { zettelSichtbar = t[0].isIntersecting; zeichne(); }, { threshold: 0.05 }).observe(document.getElementById('zettel'));
    }
    zeichne();
  });
})();
