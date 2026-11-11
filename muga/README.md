# MUGA Herrenausstatter Köln

Neuentwurf der Seite [www.mmuga.de](https://www.mmuga.de): Herrenausstatter und
Hochzeitsmode in Köln-Merheim. Die Seite übernimmt Sortiment, Preise,
Öffnungszeiten, Versandkosten, Maßtabellen und Rechtstexte des bestehenden
Shops und ergänzt, was dort fehlt: Terminbuchung, Größenberater, Stil-Finder,
Merkliste und eine Verwaltungsansicht für das Geschäft.

## Starten

```
node server.js
```

Danach läuft die Seite unter <http://localhost:4173/>. Es gibt keine
Abhängigkeiten, Node.js ab Version 18 genügt.

| Einstellung | Wirkung |
|---|---|
| `PORT=8080` | anderer Port |
| `MUGA_DATEN=/pfad` | Speicherort für Termine, Bestellungen, Nachrichten (Standard `speicher/`) |
| `MUGA_VERWALTUNG=geheim` | Schlüssel für die Verwaltung. Ohne Angabe wird einer erzeugt und in `speicher/verwaltung-schluessel.txt` abgelegt |
| `MUGA_PROXY=1` | setzen, wenn ein Webserver (nginx, Apache) davorsteht |
| `MUGA_EINBETTEN=1` | erlaubt die Anzeige in fremden Rahmen, nur für Vorschauen |

Die Seite läuft auch **ohne Server**, als reine Dateien auf jedem Webspace oder
per Doppelklick auf `index.html`. Dann bleibt alles im Browser des Kunden, und
Termine, Bestellungen und Nachrichten gehen als vorbereitete E-Mail an das
Geschäft. Die Seite sagt dem Kunden jeweils ehrlich, welcher Fall gilt.

## Was die Seite kann

**Termin buchen** in vier Schritten: Anliegen (Hochzeitsberatung, Anzugberatung,
Anprobe, Abholung), Tag und Uhrzeit, Kontaktdaten, Bestätigung. Freie Zeiten
ergeben sich aus den Öffnungszeiten (Montag Ruhetag, freitags Pause von 12 bis
14 Uhr), den Feiertagen in NRW und den schon vergebenen Terminen. Vergebene
Zeiten sind für alle Besucher gesperrt. Dazu Kalenderdatei für Outlook, Apple
und Google, Absage mit einem Klick und die Übergabe von Artikeln: „Lieber erst
anprobieren?“ auf der Artikelseite nimmt das Modell mit in den Termin.

**Kollektion** mit 576 Artikeln in 18 Kategorien. Filter nach Größe (normal,
untersetzt, schlank), Farbe, Stil und Preis, Sortierung, Suche nach Begriff
oder Modellnummer. Jede Ansicht steht in der Adresse und lässt sich verlinken.

**Artikelseite** mit Galerie und Großansicht, Farb- und Größenwahl, Preis je
Größe, passenden Artikeln und zuletzt angesehenen.

**Warenkorb und Kasse**: Versandkosten nach Land und Bestellwert, Balken bis
zum kostenlosen Versand, Versand oder Abholung, PayPal, Vorkasse oder
Barzahlung bei Abholung, Bestätigung mit Bankdaten. Der Server rechnet jede
Bestellung selbst nach. Preise aus dem Browser zählen nicht.

**Größenberater** für Anzüge (normale, untersetzte, schlanke Größen) und Hemden
samt den Maßtabellen von MUGA. **Stil-Finder**: vier Fragen, dann passende
Modelle. **Merkliste**, die sich mit zum Termin nehmen lässt.

**Verwaltung** unter `verwaltung.html` (nur mit Server): Termine, Bestellungen
und Nachrichten mit Zustand, geschützt durch den Schlüssel.

**Vertrag widerrufen**: Online-Formular auf der Seite zum Widerrufsrecht, vom
Fuß jeder Seite aus erreichbar.

## Gestaltung

Ein ruhiges Atelier: warmes Papierweiß, tiefes Tintenschwarz, das Muga-Rot als
einziger lauter Ton, Messing nur für feine Linien. Drei Motive kehren wieder
und machen die Seite wiedererkennbar:

* **die Naht**, die gestrichelte Messinglinie als Trenner und beim Überfahren
  der Artikel,
* **das Maßband** als Fortschrittsanzeige bei Buchung und Stil-Finder, als
  Schieberegler im Größenberater und als Balken bis zum kostenlosen Versand,
* **der Bogen** als Bildrahmen.

Das Zeichen greift das alte Logo auf: schwarzes Feld, weißes M, rote Spitzen.
Schriften sind Fraunces und Figtree, beide liegen lokal (SIL Open Font License).

## Aufbau

```
index.html, kollektion.html, …   die Seiten
assets/css/                      basis (Farben, Schrift, Formulare), rahmen (Kopf, Fuß),
                                 shop (Karten, Artikel, Kasse), seiten (alles Übrige)
assets/js/config.js              Geschäftsdaten: Öffnungszeiten, Terminarten, Versand, Zahlarten
assets/js/kern.js                Werkzeuge, Warenkorb, Merkliste, Katalog, Formularprüfung
assets/js/rahmen.js              Kopf, Navigation, Suche, Warenkorb-Leiste, Fuß
assets/js/termine.js             Terminlogik und Kalenderdatei
assets/js/seite-*.js             je Seite ein Skript
assets/produkte/                 Hauptbild je Artikel
daten/katalog.js                 Übersicht aller Artikel
daten/produkte/                  Beschreibung und weitere Bilder je Artikel
server.js                        Auslieferung und Speicherung
tests/                           Tests
```

Was sich im Alltag ändert, steht an einer Stelle: `assets/js/config.js`.
Browser und Server lesen dieselbe Datei.

## Tests

```
npm test                 # 18 Tests: Öffnungszeiten, Feiertage, freie Zeiten, Versand, Server
npm run test:browser     # 64 Prüfungen in einem echten Browser, Desktop und Handy
```

Die Oberflächentests brauchen Playwright
(`npm install --no-save playwright && npx playwright install chromium`).
Ohne Playwright überspringen sie sich selbst.

Zusätzlich geprüft: alle Seiten in vier Breiten (1440, 1024, 390, 320 Pixel)
ohne Konsolenfehler und ohne waagerechten Überlauf, alle internen Verweise,
Barrierefreiheit nach WCAG 2.1 AA mit axe-core ohne Befund.

## Woher die Daten kommen

Sortiment, Preise, Größen, Farben, Beschreibungen und Bilder stammen aus dem
bestehenden Shop (Stand 10. November 2026). Das Hauptbild jedes Artikels liegt
lokal, weitere Ansichten lädt die Artikelseite vom Bildserver des Shops. Die
Preise je Größe wurden einzeln aus dem Shop gelesen.

## Vor dem Einsatz zu klären

* **Bestand**: Die Seite kennt den Lagerbestand je Größe und Farbe nicht. Im
  Betrieb gehört hier die Anbindung an das Warenwirtschaftssystem hin.
* **Zahlung**: PayPal ist als Zahlungsart wählbar, aber nicht technisch
  angebunden. Die Bestätigung kündigt eine Zahlungsaufforderung per E-Mail an.
* **E-Mails**: Der Server verschickt keine Bestätigungen. Termine, Bestellungen
  und Widerrufe erscheinen in der Verwaltung. Für den Widerruf verlangt das
  Gesetz eine Eingangsbestätigung auf einem dauerhaften Datenträger, dafür
  braucht es einen Mailversand.
* **Rechtstexte**: AGB und Widerrufsbelehrung sind unverändert übernommen. Die
  Datenschutzerklärung ist neu geschrieben, weil sie beschreiben muss, was
  diese Seite tatsächlich tut. Bitte vom Händlerbund prüfen lassen.
* **Referenzen**: Die Kundenfotos aus dem Gästebuch sind nicht übernommen, weil
  sie Privatpersonen zeigen. Die Startseite verweist auf die Google-Bewertungen.
