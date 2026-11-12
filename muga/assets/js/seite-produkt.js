/* =============================================================================
 * seite-produkt.js — Artikelseite: Galerie, Varianten, Warenkorb, Anprobe
 * -----------------------------------------------------------------------------
 * Name, Preis, Farben und Größen kommen sofort aus dem Katalog. Beschreibung
 * und weitere Bilder werden je Artikel nachgeladen. Das Hauptbild liegt lokal,
 * die übrigen Ansichten kommen vom Bildserver des Shops; fällt er aus, bleibt
 * das lokale Bild stehen.
 * ========================================================================== */
(function () {
  'use strict';

  var M = window.MUGA, esc = M.esc, sym = M.symbol;
  var id = M.param('p') || '';

  M.bereit(function () {
    M.katalog.lade().then(function (k) {
      var p = k.nach[id];
      if (!p) return fehlt();
      zeichne(k, p);
    }).catch(fehlt);
  });

  function fehlt() {
    document.getElementById('produkt').innerHTML =
      '<div class="kein-treffer" style="grid-column:1/-1">' + sym('suche') +
      '<h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem)">Diesen Artikel haben wir nicht gefunden.</h1>' +
      '<p class="leise">Vielleicht ist er ausverkauft oder die Adresse hat sich geändert.</p>' +
      '<div class="knopfreihe" style="justify-content:center"><a class="knopf knopf--dunkel" href="kollektion.html">Zur Kollektion</a><a class="faden" href="termin.html">Termin buchen ' + sym('pfeil') + '</a></div></div>';
    document.title = 'Artikel nicht gefunden · MUGA Herrenausstatter Köln';
  }

  /* Anzüge lassen sich im Atelier an der Schneiderpuppe weiterkombinieren.
   * Schnitt, Farbe und Muster des Artikels werden dorthin mitgegeben. */
  function atelierVerweis(p) {
    var anzug = ['hochzeitsanzuege', 'anzuege-uni', 'anzuege-gemustert'].some(function (id) { return p.k.indexOf(id) !== -1; });
    if (!anzug) return '';
    var t = p.t || [];
    var schnitt = ['gehrock', 'cutaway', 'smoking', 'stehkragen'].filter(function (s) { return t.indexOf(s) !== -1; })[0] || 'anzug';
    var stoff = { schwarz: 'schwarz', blau: 'dunkelblau', grau: 'grau', braun: 'braun', beige: 'creme', rot: 'bordeaux', gruen: 'gruen' }[M.familienVon(p)[0]] || 'dunkelblau';
    var muster = t.indexOf('gestreift') !== -1 ? 'nadelstreifen' : (t.indexOf('kariert') !== -1 ? 'karo' : (t.indexOf('jacquard') !== -1 ? 'jacquard' : 'uni'));
    var rest = schnitt === 'smoking' ? '&h=fliege&hf=schwarz&t=weiss'
      : (schnitt === 'anzug' ? '&h=krawatte&hf=bordeaux&t=weiss' : '&h=plastron&hf=champagner&t=champagner');
    var ziel = 'atelier.html?s=' + schnitt + '&f=' + stoff + '&m=' + muster + '&w=' + (t.indexOf('mit-weste') !== -1 ? 'ton' : 'ohne') + '&wm=0' + rest;
    return '<a class="kauf__anprobe kauf__anprobe--atelier" href="' + esc(ziel) + '">' +
      sym('funke') + '<span><strong>Im Atelier kombinieren</strong><span>Weste, Halsschmuck und Einstecktuch an der Schneiderpuppe ausprobieren.</span></span>' + sym('pfeil') +
      '</a>';
  }

  function bildAdresse(k, pfad, groesse) {
    var punkt = pfad.lastIndexOf('.');
    return k.bildbasis + encodeURI(pfad.slice(0, punkt)) + (groesse ? '_' + groesse : '') + pfad.slice(punkt);
  }

  function zeichne(k, p) {
    var kat = k.kat[p.k[0]], lokal = M.katalog.bild(p);
    var farben = p.f || [], groessen = p.g || [];
    var reihen = M.groessenReihen(groessen, M.istKonfektion(p));
    var eineFarbe = farben.length === 1 ? farben[0] : '';

    /* ---- Brotkrumen, Titel ---- */
    var kruemel = '<li><a href="index.html">Start</a></li><li><a href="kollektion.html">Kollektion</a></li>';
    if (kat) {
      if (kat.eltern) kruemel += '<li><a href="kollektion.html?k=' + kat.eltern + '">' + esc(k.kat[kat.eltern].name) + '</a></li>';
      kruemel += '<li><a href="kollektion.html?k=' + kat.id + '">' + esc(kat.name) + '</a></li>';
    }
    document.getElementById('kruemel').innerHTML = kruemel + '<li aria-current="page">' + esc(p.n) + '</li>';
    document.title = p.n + ' · MUGA Herrenausstatter Köln';
    var beschreibung = document.querySelector('meta[name="description"]');
    if (beschreibung) beschreibung.setAttribute('content', p.n + (p.nr ? ', Modell ' + p.nr : '') + '. ' + (p.ab ? 'Ab ' : '') + M.geld(p.p) + '. Aus eigener Herstellung von MUGA in Köln.');

    /* ---- Aufbau ---- */
    var b = p.b || [4, 3];
    var html = '<div class="galerie">' +
        '<button class="galerie__gross" type="button" id="gross" aria-label="Bild vergrößern">' +
          '<img id="gross-bild" src="' + lokal + '" alt="' + esc(p.n) + '" width="' + b[0] + '" height="' + b[1] + '" fetchpriority="high">' +
          '<span class="galerie__lupe">' + sym('lupeplus') + '</span>' +
        '</button>' +
        '<div class="galerie__daumen" id="daumen" hidden></div>' +
      '</div>' +
      '<form class="kauf" id="kauf" novalidate>' +
        '<p class="kauf__art">' + esc(p.a || (kat ? kat.einzahl : '')) + (p.nr ? ' · Modell ' + esc(p.nr) : '') + '</p>' +
        '<h1>' + esc(p.n) + '</h1>' +
        '<div><div class="kauf__preis" id="preis" aria-live="polite"></div>' +
          '<p class="kauf__steuer">Inkl. MwSt., zzgl. <a href="service.html#versand">Versand</a>. In Deutschland ab 50,01&nbsp;€ versandkostenfrei.</p></div>' +
        '<ul class="kauf__kurz" id="kurz"></ul>';

    if (farben.length > 1) {
      html += '<fieldset class="variante" id="wahl-farbe"><legend><span>Farbe</span><output id="farbe-text">Bitte wählen</output></legend><div class="chips">' +
        farben.map(function (f, i) {
          var ton = M.farbton(f);
          return '<label class="chip chip--farbe"><input type="radio" name="farbe" value="' + esc(f) + '"><span>' + (ton ? '<i style="--ton:' + ton + '"></i>' : '') + esc(f) + '</span></label>';
        }).join('') + '</div></fieldset>';
    } else if (eineFarbe) {
      html += '<p class="variante__einzel"><strong>Farbe:</strong> ' + esc(eineFarbe) + '</p>';
    }

    if (groessen.length) {
      html += '<fieldset class="variante" id="wahl-groesse"><legend><span>Größe</span><a href="masse.html">Größe finden</a></legend>' +
        reihen.map(function (r) {
          return '<div class="groessen-reihe">' + (r.titel ? '<p class="groessen-reihe__titel">' + r.titel + '</p>' : '') + '<div class="chips">' +
            r.werte.map(function (g) { return '<label class="chip"><input type="radio" name="groesse" value="' + esc(g) + '"><span>' + esc(g) + '</span></label>'; }).join('') +
          '</div></div>';
        }).join('') + '</fieldset>';
    }

    html += '<div id="zusatzwahl"></div>' +
        '<p class="variante__fehler" id="wahl-fehler" role="alert" hidden></p>' +
        '<div class="kauf__knoepfe">' +
          '<button class="knopf" type="submit">' + sym('korb') + 'In den Warenkorb</button>' +
          '<button class="kauf__herz" type="button" data-merken="' + esc(p.id) + '" aria-pressed="' + M.merk.hat(p.id) + '" aria-label="' + esc(p.n) + (M.merk.hat(p.id) ? ' von der Merkliste entfernen' : ' merken') + '">' + sym('herz') + '</button>' +
        '</div>' +
        '<a class="kauf__anprobe" href="termin.html?art=anprobe&amp;artikel=' + encodeURIComponent(p.id) + '">' +
          sym('kalender') + '<span><strong>Lieber erst anprobieren?</strong><span>Wir legen das Modell in Ihrer Größe im Kölner Geschäft bereit.</span></span>' + sym('pfeil') +
        '</a>' +
        atelierVerweis(p) +
        '<ul class="kauf__vorteile">' +
          '<li>' + sym('fabrik') + 'Direkt vom Hersteller, 1A-Qualität</li>' +
          '<li>' + sym('lkw') + 'Versand unverzüglich nach Zahlungseingang</li>' +
          '<li>' + sym('zurueckgabe') + 'Ein Monat Widerrufsrecht</li>' +
        '</ul>' +
        '<div class="kauf__klappen" id="klappen">' +
          '<details class="klappe"><summary>Lieferung &amp; Rückgabe</summary><div class="klappe__inhalt"><ul>' +
            '<li>Innerhalb Deutschlands (ohne Inseln) ab 50,01&nbsp;€ versandkostenfrei, darunter 3,90&nbsp;€ bis 5,90&nbsp;€.</li>' +
            '<li>Abholung im Kölner Geschäft möglich, dort auch Barzahlung.</li>' +
            '<li>Zahlung per PayPal oder Vorkasse (Banküberweisung).</li>' +
            '<li>Ein Monat Widerrufsrecht. Einzelheiten in der <a href="widerruf.html">Widerrufsbelehrung</a>.</li>' +
          '</ul></div></details>' +
        '</div>' +
      '</form>';
    document.getElementById('produkt').innerHTML = html;

    var form = document.getElementById('kauf');

    /* ---- Preis je Auswahl ---- */
    function auswahl() {
      var f = form.querySelector('input[name="farbe"]:checked'), g = form.querySelector('input[name="groesse"]:checked');
      return { farbe: f ? f.value : eineFarbe, groesse: g ? g.value : '' };
    }
    function zeigePreis() {
      var a = auswahl(), genau = !p.ab || !!a.groesse || !groessen.length;
      var preis = M.preisFuer(p, a.groesse, a.farbe);
      document.getElementById('preis').innerHTML = '<span class="preis">' + (genau ? '' : '<span class="preis__ab">ab</span> ') +
        '<span class="preis__wert">' + M.geld(preis) + '</span></span>' +
        (!genau && p.pg ? '<span class="klein leise">Der Preis richtet sich nach der Größe.</span>' : '') +
        (p.pu && !genau ? '<span class="klein leise">Für große Größen kann ein Aufpreis gelten. Wir bestätigen den Preis vor dem Versand.</span>' : '');
      var text = document.getElementById('farbe-text');
      if (text) text.textContent = a.farbe || 'Bitte wählen';
      var leistenpreis = document.getElementById('kaufleiste-preis');
      if (leistenpreis) leistenpreis.textContent = (genau ? '' : 'ab ') + M.geld(preis);
    }

    /* ---- Kaufleiste: auf dem Handy bleibt der Kauf erreichbar, solange der Knopf nicht zu sehen ist ---- */
    var leiste = document.getElementById('kaufleiste');
    if (!leiste) {
      leiste = document.createElement('div');
      leiste.id = 'kaufleiste';
      leiste.className = 'kaufleiste';
      leiste.setAttribute('role', 'region');
      leiste.setAttribute('aria-label', 'Artikel in den Warenkorb legen');
      document.body.appendChild(leiste);
    }
    leiste.innerHTML = '<div class="kaufleiste__text"><span class="kaufleiste__name">' + esc(p.n) + '</span><span class="kaufleiste__preis" id="kaufleiste-preis"></span></div>' +
      '<button class="knopf knopf--klein" type="button" id="kaufleiste-knopf">' + sym('korb') + 'In den Warenkorb</button>';
    document.getElementById('kaufleiste-knopf').addEventListener('click', function () {
      if (form.requestSubmit) form.requestSubmit(); else form.querySelector('button[type="submit"]').click();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (t) {
        var sichtbar = t[0].isIntersecting;
        leiste.classList.toggle('da', !sichtbar);
        document.body.classList.toggle('mit-kaufleiste', !sichtbar);
      }, { rootMargin: '-60px 0px 0px 0px' }).observe(form.querySelector('.kauf__knoepfe'));
    }
    zeigePreis();
    form.addEventListener('change', function () {
      zeigePreis();
      var fehler = document.getElementById('wahl-fehler');
      if (!fehler.hidden) pruefe(true);
    });

    /* ---- In den Warenkorb ---- */
    function pruefe(still) {
      var a = auswahl(), fehlt = [], erstes = null;
      var wf = document.getElementById('wahl-farbe'), wg = document.getElementById('wahl-groesse');
      if (wf) { var ohneFarbe = !a.farbe; wf.classList.toggle('fehlt', ohneFarbe); if (ohneFarbe) { fehlt.push('eine Farbe'); erstes = erstes || wf; } }
      if (wg) { var ohneGroesse = !a.groesse; wg.classList.toggle('fehlt', ohneGroesse); if (ohneGroesse) { fehlt.push('eine Größe'); erstes = erstes || wg; } }
      var zusatz = [];
      M.$$('#zusatzwahl select').forEach(function (s) {
        var huelle = s.closest('.feld');
        huelle.classList.toggle('fehler', !s.value);
        if (!s.value) { fehlt.push('eine Angabe bei „' + s.dataset.name + '“'); erstes = erstes || huelle; } else zusatz.push(s.value);
      });
      var fehler = document.getElementById('wahl-fehler');
      fehler.hidden = !fehlt.length;
      fehler.textContent = fehlt.length ? 'Bitte wählen Sie ' + fehlt.join(' und ') + '.' : '';
      if (fehlt.length && !still && erstes) {
        var feld = erstes.querySelector('input, select');
        if (feld) feld.focus({ preventScroll: true });
        erstes.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return fehlt.length ? null : { farbe: a.farbe, groesse: a.groesse, zusatz: zusatz.join(' · ') };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var wahl = pruefe(false);
      if (!wahl) return;
      M.korb.hinzu({
        id: p.id, nr: p.nr, name: p.n, preis: M.preisFuer(p, wahl.groesse, wahl.farbe),
        groesse: wahl.groesse, farbe: wahl.farbe, zusatz: wahl.zusatz, menge: 1
      });
      M.zeigeKorb();
    });

    /* ---- Großansicht ---- */
    var bilder = [{ klein: lokal, mittel: lokal, gross: lokal }], aktiv = 0;
    var grossBild = document.getElementById('gross-bild'), rahmen = document.getElementById('gross');
    var dialog = document.getElementById('grossbild'), dBild = document.getElementById('grossbild-bild');

    function zeige(i) {
      aktiv = (i + bilder.length) % bilder.length;
      var ziel = bilder[aktiv];
      if (grossBild.getAttribute('src') !== ziel.mittel) {
        rahmen.classList.add('laedt');
        var probe = new Image();
        probe.onload = function () { if (bilder[aktiv] === ziel) { grossBild.src = ziel.mittel; rahmen.classList.remove('laedt'); } };
        probe.onerror = function () { rahmen.classList.remove('laedt'); };
        probe.src = ziel.mittel;
      }
      M.$$('#daumen button').forEach(function (kn, n) { kn.setAttribute('aria-current', n === aktiv); });
    }
    function zeigeGross() {
      var ziel = bilder[aktiv];
      dBild.alt = p.n + ', Ansicht ' + (aktiv + 1);
      dBild.src = ziel.mittel;
      if (ziel.gross !== ziel.mittel) {
        var probe = new Image();
        probe.onload = function () { if (bilder[aktiv] === ziel && dialog.open) dBild.src = ziel.gross; };
        probe.src = ziel.gross;
      }
      document.getElementById('grossbild-zahl').textContent = (aktiv + 1) + ' / ' + bilder.length;
      document.getElementById('grossbild-name').textContent = p.n;
      M.$$('.grossbild__pfeil', dialog).forEach(function (kn) { kn.hidden = bilder.length < 2; });
    }
    rahmen.addEventListener('click', function () { M.oeffne(dialog); zeigeGross(); });

    /* ---- Stofflupe: Mit dem Zeiger über das Bild fahren, das Gewebe erscheint vergrößert ---- */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var lupe = document.createElement('span'), lupeQuelle = '';
      lupe.className = 'stofflupe';
      lupe.setAttribute('aria-hidden', 'true');
      rahmen.appendChild(lupe);
      rahmen.addEventListener('pointermove', function (e) {
        var r = grossBild.getBoundingClientRect(), stil = getComputedStyle(grossBild);
        var rand = parseFloat(stil.paddingLeft) || 0, nb = grossBild.naturalWidth, nh = grossBild.naturalHeight;
        if (!nb || !nh) return;
        /* sichtbare Bildfläche: Das Bild ist in seinen Rahmen eingepasst */
        var fb = r.width - 2 * rand, fh = r.height - 2 * rand, m = Math.min(fb / nb, fh / nh), b = nb * m, h = nh * m;
        var x = (e.clientX - (r.left + rand + (fb - b) / 2)) / b, y = (e.clientY - (r.top + rand + (fh - h) / 2)) / h;
        if (x < 0 || x > 1 || y < 0 || y > 1) { lupe.classList.remove('an'); return; }
        var ziel = bilder[aktiv].gross, jetzt = grossBild.currentSrc || grossBild.src;
        if (lupeQuelle !== ziel + jetzt) {
          lupeQuelle = ziel + jetzt;
          /* erst das Bild, das schon da ist, darüber die große Fassung, sobald sie geladen ist */
          lupe.style.backgroundImage = 'url("' + ziel.replace(/"/g, '%22') + '"), url("' + jetzt.replace(/"/g, '%22') + '")';
        }
        var fach = 2.6, d = lupe.offsetWidth, a = rahmen.getBoundingClientRect();
        lupe.style.backgroundSize = (b * fach).toFixed(0) + 'px ' + (h * fach).toFixed(0) + 'px';
        lupe.style.backgroundPosition = (d / 2 - x * b * fach).toFixed(1) + 'px ' + (d / 2 - y * h * fach).toFixed(1) + 'px';
        lupe.style.transform = 'translate(' + (e.clientX - a.left - d / 2).toFixed(1) + 'px,' + (e.clientY - a.top - d / 2).toFixed(1) + 'px)';
        lupe.classList.add('an');
      });
      rahmen.addEventListener('pointerleave', function () { lupe.classList.remove('an'); });
    }
    dialog.addEventListener('click', function (e) {
      var blatt = e.target.closest('[data-blatt]');
      if (blatt) { zeige(aktiv + (+blatt.dataset.blatt)); zeigeGross(); }
    });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { zeige(aktiv - 1); zeigeGross(); }
      if (e.key === 'ArrowRight') { zeige(aktiv + 1); zeigeGross(); }
    });
    var wischStart = null;
    dialog.addEventListener('touchstart', function (e) { wischStart = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', function (e) {
      if (wischStart === null) return;
      var weg = e.changedTouches[0].clientX - wischStart;
      wischStart = null;
      if (Math.abs(weg) > 50 && bilder.length > 1) { zeige(aktiv + (weg < 0 ? 1 : -1)); zeigeGross(); }
    });

    /* ---- Einzelheiten nachladen ---- */
    M.katalog.detail(p.id).then(function (d) {
      /* Kurztext */
      document.getElementById('kurz').innerHTML = (d.kurz || []).map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('');

      /* Weitere Auswahl (z. B. Modellnummer, Knöpfe) */
      if (d.optionen && d.optionen.length) {
        document.getElementById('zusatzwahl').innerHTML = d.optionen.map(function (o, i) {
          return '<div class="feld"><label for="zusatz-' + i + '">' + esc(o.name) + '</label>' +
            '<select class="auswahl" id="zusatz-' + i + '" data-name="' + esc(o.name) + '"><option value="">Bitte wählen</option>' +
            o.werte.map(function (w) { return '<option value="' + esc(o.name + ': ' + w) + '">' + esc(w) + '</option>'; }).join('') +
            '</select></div>';
        }).join('');
      }

      /* Beschreibung */
      var klappen = (d.abschnitte || []).map(function (a, i) {
        return '<details class="klappe"' + (i === 0 ? ' open' : '') + '><summary>' + esc(a.titel) + '</summary><div class="klappe__inhalt"><ul>' +
          a.punkte.map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('') + '</ul>' +
          (a.titel === 'Größe & Maße' || a.titel === 'Passform' ? '<p style="margin-top:.8rem"><a href="masse.html">Zum Größenberater</a></p>' : '') +
          '</div></details>';
      }).join('');
      document.getElementById('klappen').insertAdjacentHTML('afterbegin', klappen);

      /* Galerie */
      var pfade = d.bilder || [];
      if (pfade.length) {
        bilder = pfade.map(function (pfad, i) {
          return { klein: bildAdresse(k, pfad, 's'), mittel: bildAdresse(k, pfad, 'ml'), gross: bildAdresse(k, pfad, '') };
        });
        var daumen = document.getElementById('daumen');
        if (bilder.length > 1) {
          daumen.innerHTML = bilder.map(function (bild, i) {
            return '<button type="button" data-bild="' + i + '" aria-label="Ansicht ' + (i + 1) + ' zeigen"' + (i === 0 ? ' aria-current="true"' : '') + '><img src="' + esc(bild.klein) + '" alt="" loading="lazy" width="104" height="104"></button>';
          }).join('');
          daumen.hidden = false;
          daumen.addEventListener('click', function (e) {
            var kn = e.target.closest('[data-bild]');
            if (kn) zeige(+kn.dataset.bild);
          });
          /* Ansichten, die der Bildserver nicht liefert, verschwinden aus der Leiste */
          M.$$('img', daumen).forEach(function (img) {
            img.addEventListener('error', function () {
              var kn = img.closest('button');
              kn.hidden = true;
              if (!M.$$('button:not([hidden])', daumen).length) daumen.hidden = true;
            });
          });
        }
        /* Schärfere Fassung des Hauptbilds nachziehen */
        var scharf = new Image();
        scharf.onload = function () { if (aktiv === 0) grossBild.src = bilder[0].mittel; };
        scharf.onerror = function () { bilder[0] = { klein: lokal, mittel: lokal, gross: lokal }; };
        scharf.src = bilder[0].mittel;
      }

      /* Passt dazu */
      var dazu = (d.rel || []).map(function (r) { return k.nach[r]; }).filter(Boolean);
      if (dazu.length < 4) {
        k.produkte.forEach(function (x) {
          if (dazu.length < 8 && x.id !== p.id && x.k[0] === p.k[0] && dazu.indexOf(x) === -1) dazu.push(x);
        });
      }
      zeigeDazu(k, dazu.slice(0, 10));
    }).catch(function () {
      var dazu = k.produkte.filter(function (x) { return x.id !== p.id && x.k[0] === p.k[0]; }).slice(0, 8);
      zeigeDazu(k, dazu);
    });

    /* ---- Zuletzt angesehen ---- */
    var gesehen = M.gesehen.liste().filter(function (x) { return x !== p.id; }).map(function (x) { return k.nach[x]; }).filter(Boolean).slice(0, 4);
    if (gesehen.length) {
      document.getElementById('gesehen-raster').innerHTML = gesehen.map(function (x) { return M.karte(x, k); }).join('');
      document.getElementById('gesehen').hidden = false;
    }
    M.gesehen.merke(p.id);

    /* ---- Angaben für Suchmaschinen ---- */
    var daten = document.createElement('script');
    daten.type = 'application/ld+json';
    daten.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.n, sku: p.nr || p.id,
      brand: { '@type': 'Brand', name: 'MUGA' }, image: new URL(lokal, location.href).href,
      offers: { '@type': p.ab ? 'AggregateOffer' : 'Offer', priceCurrency: 'EUR', price: p.p, lowPrice: p.ab ? p.p : undefined, availability: 'https://schema.org/InStock' }
    });
    document.head.appendChild(daten);
  }

  function zeigeDazu(k, liste) {
    if (!liste.length) return;
    var bahn = document.getElementById('dazu-bahn');
    bahn.innerHTML = liste.map(function (x) { return M.karte(x, k); }).join('');
    document.getElementById('dazu').hidden = false;
    M.laufreihe(bahn, M.$$('#dazu [data-reihe]'));
  }
})();
