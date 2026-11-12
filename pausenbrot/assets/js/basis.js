/* Kopf, Fuß, Türschild, Versand von Anfragen. Auf jeder Seite geladen. */
(function () {
  'use strict';
  var PB = window.PB, C = PB.CAFE;

  PB.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (z) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]; });
  };
  PB.$ = function (s, w) { return (w || document).querySelector(s); };
  PB.$$ = function (s, w) { return Array.prototype.slice.call((w || document).querySelectorAll(s)); };
  PB.ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  var lager = (function () { try { localStorage.setItem('pb.t', '1'); localStorage.removeItem('pb.t'); return localStorage; } catch (e) { return null; } })();
  var ersatz = {};
  PB.speicher = {
    lies: function (k, sonst) { try { var r = lager ? lager.getItem('pb.' + k) : ersatz[k]; return r == null ? sonst : JSON.parse(r); } catch (e) { return sonst; } },
    schreib: function (k, w) { var r = JSON.stringify(w); try { if (lager) lager.setItem('pb.' + k, r); else ersatz[k] = r; } catch (e) { ersatz[k] = r; } }
  };

  /* ---------- Kopf -------------------------------------------------------- */

  var SEITEN = [
    ['karte.html', 'Speisekarte'],
    ['index.html#morgens', 'Frühstück'],
    ['catering.html', 'Catering'],
    ['tisch.html', 'Tisch reservieren'],
    ['index.html#besuch', 'Anfahrt']
  ];
  var hier = (location.pathname.split('/').pop() || 'index.html');

  function schildHtml() {
    var s = PB.status();
    return '<span class="schild__punkt' + (s.offen ? ' schild__punkt--offen' : '') + '" aria-hidden="true"></span>' +
      '<span class="schild__wort">' + s.schild + '</span>' +
      '<span class="schild__zeit">' + PB.esc(s.text) + '</span>';
  }
  PB.schildHtml = schildHtml;

  function kopfHtml() {
    var links = SEITEN.map(function (s) {
      var aktiv = s[0] === hier ? ' aria-current="page"' : '';
      return '<a href="' + s[0] + '"' + aktiv + '>' + s[1] + '</a>';
    }).join('');
    return '<a class="sprung" href="#inhalt">Zum Inhalt</a>' +
      '<header class="kopf" id="kopf">' +
        '<div class="kopf__innen">' +
          '<a class="marke" href="index.html" aria-label="Café Pausenbrot, zur Startseite">' +
            '<span class="marke__klein">Café</span><span class="marke__wort">Pausenbrot</span>' +
          '</a>' +
          '<nav class="nav" aria-label="Hauptnavigation">' + links + '</nav>' +
          '<a class="schild" href="index.html#besuch" data-schild>' + schildHtml() + '</a>' +
          '<a class="knopf knopf--klein kopf__bestellen" href="karte.html#zettel">Vorbestellen</a>' +
          '<button class="kopf__menue" type="button" aria-expanded="false" aria-controls="menue" data-menue>' +
            '<span></span><span></span><span class="unsichtbar">Menü</span>' +
          '</button>' +
        '</div>' +
      '</header>' +
      '<dialog class="menue" id="menue" aria-label="Menü">' +
        '<nav>' + SEITEN.map(function (s) { return '<a href="' + s[0] + '">' + s[1] + '</a>'; }).join('') +
          '<a href="karte.html#zettel">Vorbestellen und abholen</a></nav>' +
        '<p class="menue__fuss"><a href="tel:' + C.telefonLink + '">' + C.telefon + '</a><br>' + C.strasse + ', ' + C.plz + ' ' + C.ort + '</p>' +
        '<button class="menue__zu" type="button" data-menue-zu>Schließen</button>' +
      '</dialog>';
  }

  function fussHtml() {
    var z = C.zeiten[1];
    return '<footer class="fuss">' +
      '<div class="huelle fuss__innen">' +
        '<div class="fuss__marke"><span class="marke__klein">Café</span><span class="marke__wort">Pausenbrot</span>' +
          '<p>Frühstück, Mittagstheke und Kaffee in der Kölner Südstadt.</p></div>' +
        '<div><h2>Adresse</h2><address>' + C.strasse + '<br>' + C.plz + ' ' + C.ort + '</address>' +
          '<p><a href="tel:' + C.telefonLink + '">' + C.telefon + '</a></p></div>' +
        '<div><h2>Geöffnet</h2><p>Montag bis Sonntag<br>' + PB.uhrKurz(z[0]) + ' bis ' + PB.uhrKurz(z[1]) + ' Uhr</p>' +
          '<p class="fuss__status" data-status></p></div>' +
        '<div><h2>Online</h2><ul>' +
          '<li><a href="' + C.instagram + '" rel="noopener" target="_blank">Instagram</a></li>' +
          '<li><a href="' + C.google + '" rel="noopener" target="_blank">Google Maps und Bewertungen</a></li>' +
          '<li><a href="' + C.tooGoodToGo + '" rel="noopener" target="_blank">Too Good To Go</a></li>' +
        '</ul></div>' +
      '</div>' +
      '<div class="huelle fuss__unten"><span>© ' + new Date().getFullYear() + ' ' + C.name + '</span>' +
        '<span><a href="impressum.html">Impressum</a> <a href="datenschutz.html">Datenschutz</a></span></div>' +
    '</footer>';
  }

  /* Kopf und Fuß als eigene Elemente, damit sie vor dem ersten Bild stehen */
  function definiere(name, html) {
    if (customElements.get(name)) return;
    customElements.define(name, class extends HTMLElement { connectedCallback() { if (!this.dataset.fertig) { this.dataset.fertig = '1'; this.innerHTML = html(); } } });
  }
  definiere('pb-kopf', kopfHtml);
  definiere('pb-fuss', fussHtml);

  function statusZeile() {
    var s = PB.status();
    return (s.offen ? 'Gerade geöffnet, ' : 'Gerade geschlossen, ') + s.text + '.';
  }
  PB.statusZeile = statusZeile;

  function auffrischen() {
    PB.$$('[data-schild]').forEach(function (e) {
      var alt = e.querySelector('.schild__wort');
      var neu = PB.status().schild;
      if (alt && alt.textContent !== neu) e.innerHTML = schildHtml();
      else if (alt) e.querySelector('.schild__zeit').textContent = PB.status().text;
    });
    PB.$$('[data-status]').forEach(function (e) { e.textContent = statusZeile(); });
    PB.$$('[data-status-kurz]').forEach(function (e) { var s = PB.status(); e.textContent = (s.offen ? 'geöffnet, ' : 'geschlossen, ') + s.text; e.classList.toggle('offen', s.offen); });
  }

  /* ---------- Versand von Anfragen ----------------------------------------
   * Die Seite hat keinen Server. Anfragen gehen als vorbereitete Nachricht
   * per WhatsApp oder SMS an das Handy des Cafés, oder man ruft an. */

  PB.versand = function (ziel, text, art) {
    var wa = 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(text);
    var sms = 'sms:' + C.telefonLink + '?&body=' + encodeURIComponent(text);
    ziel.innerHTML =
      '<div class="versand">' +
        '<p class="versand__kopf">Deine ' + PB.esc(art) + ' ist fertig geschrieben. Schick sie uns:</p>' +
        '<pre class="versand__text" tabindex="0" aria-label="Text der Nachricht">' + PB.esc(text) + '</pre>' +
        '<div class="versand__knoepfe">' +
          '<a class="knopf" href="' + wa + '" target="_blank" rel="noopener">Per WhatsApp senden</a>' +
          '<a class="knopf knopf--linie" href="' + sms + '">Per SMS</a>' +
          '<button class="textknopf" type="button" data-kopieren>Text kopieren</button>' +
        '</div>' +
        '<p class="versand__klein">Fest ist es, sobald wir geantwortet haben. Lieber sprechen? <a href="tel:' + C.telefonLink + '">' + C.telefon + '</a></p>' +
      '</div>';
    ziel.hidden = false;
    var k = ziel.querySelector('[data-kopieren]');
    k.addEventListener('click', function () {
      var fertig = function () { k.textContent = 'Kopiert'; setTimeout(function () { k.textContent = 'Text kopieren'; }, 2200); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(fertig, function () {});
      else {
        var r = document.createRange(); r.selectNodeContents(ziel.querySelector('pre'));
        var s = getSelection(); s.removeAllRanges(); s.addRange(r);
        try { if (document.execCommand('copy')) fertig(); } catch (e) { /* markiert bleibt */ }
      }
    });
    ziel.scrollIntoView({ behavior: PB.ruhig ? 'auto' : 'smooth', block: 'center' });
    var erster = ziel.querySelector('a.knopf');
    if (erster) erster.focus({ preventScroll: true });
  };

  /* Prüft Pflichtfelder und zeigt Fehler direkt am Feld */
  PB.pruefe = function (form) {
    var erstes = null;
    PB.$$('input, select, textarea', form).forEach(function (f) {
      if (f.disabled || f.type === 'hidden') return;
      if (f.type === 'text' || f.type === 'tel' || f.type === 'email' || f.tagName === 'TEXTAREA') f.value = f.value.trim();
      var feld = f.closest('.feld');
      var gut = f.checkValidity();
      if (feld) {
        feld.classList.toggle('feld--fehler', !gut);
        var hinweis = feld.querySelector('.feld__fehler');
        if (!hinweis) { hinweis = document.createElement('p'); hinweis.className = 'feld__fehler'; hinweis.id = 'f-' + (f.id || f.name); feld.appendChild(hinweis); }
        hinweis.textContent = gut ? '' : (f.dataset.fehler || (f.validity.valueMissing ? 'Bitte ausfüllen.' : 'Bitte prüfen.'));
        if (gut) f.removeAttribute('aria-invalid'); else { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', hinweis.id); }
      }
      if (!gut && !erstes) erstes = f;
    });
    if (erstes) { erstes.focus({ preventScroll: true }); erstes.scrollIntoView({ block: 'center', behavior: PB.ruhig ? 'auto' : 'smooth' }); }
    return !erstes;
  };
  document.addEventListener('input', function (e) {
    var f = e.target, feld = f.closest && f.closest('.feld--fehler');
    if (feld && f.checkValidity()) { feld.classList.remove('feld--fehler'); f.removeAttribute('aria-invalid'); var h = feld.querySelector('.feld__fehler'); if (h) h.textContent = ''; }
  });

  /* Tage zur Auswahl: heute, morgen, Wochentage */
  PB.tagName = function (datum) {
    var heute = PB.jetzt().datum;
    if (datum === heute) return 'Heute';
    if (datum === PB.plusTage(heute, 1)) return 'Morgen';
    var t = PB.teile(datum);
    return PB.TAGE[t.wochentag].slice(0, 2) + ', ' + t.tag + '.' + t.monat + '.';
  };

  /* ---------- Karte erst nach Klick laden --------------------------------- */

  function ladeKarte(rahmen) {
    var g = C.geo, dx = 0.006, dy = 0.0032;
    var box = [g.lon - dx, g.lat - dy, g.lon + dx, g.lat + dy].map(function (n) { return n.toFixed(5); }).join('%2C');
    var f = document.createElement('iframe');
    f.title = 'Karte: ' + C.name + ', ' + C.strasse;
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer';
    f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + box + '&layer=mapnik&marker=' + g.lat + '%2C' + g.lon;
    rahmen.textContent = '';
    rahmen.appendChild(f);
  }

  /* ---------- Einblenden beim Rollen -------------------------------------- */

  PB.beobachte = function (wurzel) {
    var teile = PB.$$('.zeigen:not(.da)', wurzel);
    if (PB.ruhig || !('IntersectionObserver' in window)) { teile.forEach(function (t) { t.classList.add('da'); }); return; }
    var auge = new IntersectionObserver(function (t) {
      t.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('da'); auge.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    teile.forEach(function (t) { auge.observe(t); });
  };

  document.addEventListener('DOMContentLoaded', function () {
    auffrischen();
    setInterval(auffrischen, 30000);

    var menue = PB.$('#menue'), knopf = PB.$('[data-menue]');
    if (menue && knopf) {
      knopf.addEventListener('click', function () { menue.showModal(); knopf.setAttribute('aria-expanded', 'true'); });
      menue.addEventListener('close', function () { knopf.setAttribute('aria-expanded', 'false'); });
      menue.addEventListener('click', function (e) { if (e.target === menue || e.target.closest('[data-menue-zu]') || e.target.closest('a')) menue.close(); });
    }

    var kopf = PB.$('#kopf'), wartet = false;
    function rolle() { wartet = false; if (kopf) kopf.classList.toggle('kopf--gerollt', scrollY > 10); }
    addEventListener('scroll', function () { if (!wartet) { wartet = true; requestAnimationFrame(rolle); } }, { passive: true });
    rolle();

    document.addEventListener('click', function (e) {
      var k = e.target.closest && e.target.closest('[data-karte-laden]');
      if (k) ladeKarte(k.closest('[data-landkarte]'));
    });
    PB.$$('[data-link]').forEach(function (a) { if (C[a.dataset.link]) a.href = C[a.dataset.link]; });
    PB.beobachte(document);
  });
})();
