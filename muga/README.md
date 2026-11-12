# MUGA Herrenausstatter Köln

Neuentwurf der Seite [www.mmuga.de](https://www.mmuga.de): Herrenausstatter und
Hochzeitsmode in Köln-Merheim. Die Seite übernimmt Sortiment, Preise,
Öffnungszeiten, Versandkosten, Maßtabellen und Rechtstexte des bestehenden
Shops und ergänzt, was dort fehlt: Terminbuchung, Größenberater, Stil-Finder,
Merkliste und eine Verwaltungsansicht für das Geschäft. Dazu kommt, was die
Seite unverwechselbar macht: der rote Faden, die Schneiderpuppe, das Atelier
und der Hochzeits-Fahrplan.

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

**Das Atelier** (`atelier.html`): Der Kunde stellt seinen Anzug an einer
Schneiderpuppe zusammen: Schnitt (Anzug, Gehrock, Cutaway, Smoking,
Stehkragen), Stoff, Muster, Weste, Halsschmuck, Einstecktuch. Die Puppe ist
keine Bildersammlung, sondern wird berechnet, jeder Wechsel geht fließend in
den nächsten über. Darunter stehen die Modelle aus dem Katalog, die dem
Entwurf am nächsten kommen. Der Entwurf lässt sich als Bild sichern, als
Verweis teilen und mit einem Klick in die Terminbuchung mitnehmen. Von jeder
Anzug-Artikelseite führt ein Verweis mit Schnitt, Farbe und Muster hierher.

**Hochzeits-Fahrplan** auf der Startseite: Aus dem Hochzeitstag wird ein Plan,
wann Beratung, Anprobe, Feinschliff und Abholung sinnvoll sind. Jeder Schritt
liegt auf einem geöffneten Tag und führt direkt in die Buchung, dazu gibt es
eine Kalenderdatei. Bei knapper Zeit legt der Plan Schritte zusammen. Das
Datum merkt sich nur der Browser des Kunden.

**Stilkunde** auf der Startseite: Beim Rollen wechselt die Schneiderpuppe vom
Anzug über Gehrock, Cutaway und Smoking zum Stehkragen, mit Hinweisen wie auf
einer Schnittzeichnung.

**Termin buchen** in vier Schritten: Anliegen (Hochzeitsberatung, Anzugberatung,
Anprobe, Abholung), Tag und Uhrzeit, Kontaktdaten, Bestätigung. Freie Zeiten
ergeben sich aus den Öffnungszeiten (Montag Ruhetag, freitags Pause von 12 bis
14 Uhr), den Feiertagen in NRW und den schon vergebenen Terminen. Vergebene
Zeiten sind für alle Besucher gesperrt. Dazu Kalenderdatei für Outlook, Apple
und Google, Absage mit einem Klick und die Übergabe von Artikeln: „Lieber erst
anprobieren?“ auf der Artikelseite nimmt das Modell mit in den Termin. Wer
aus dem Fahrplan oder dem Atelier kommt, bringt Hochzeitstag, Wunschtag und
Entwurf mit und steht gleich bei der Uhrzeit.

**Kollektion** mit 576 Artikeln in 18 Kategorien. Filter nach Größe (normal,
untersetzt, schlank), Farbe, Stil und Preis, Sortierung, Suche nach Begriff
oder Modellnummer. Jede Ansicht steht in der Adresse und lässt sich verlinken.

**Artikelseite** mit Galerie und Großansicht, Stofflupe unter dem Mauszeiger,
Farb- und Größenwahl, Preis je Größe, passenden Artikeln und zuletzt
angesehenen. Auf dem Handy bleibt der Kauf über eine Leiste am unteren Rand
erreichbar.

**Warenkorb und Kasse**: Versandkosten nach Land und Bestellwert, Balken bis
zum kostenlosen Versand, Versand oder Abholung, PayPal, Vorkasse oder
Barzahlung bei Abholung, Bestätigung mit Bankdaten. Der Server rechnet jede
Bestellung selbst nach. Preise aus dem Browser zählen nicht.

**Größenberater** für Anzüge (normale, untersetzte, schlanke Größen) und Hemden
samt den Maßtabellen von MUGA. Dazu der **Passform-Check**: fünf Stellen an der
Schneiderpuppe, an denen man erkennt, ob ein Sakko sitzt. **Stil-Finder**: vier Fragen, dann passende
Modelle. **Merkliste**, die sich mit zum Termin nehmen lässt.

**Verwaltung** unter `verwaltung.html` (nur mit Server): Termine, Bestellungen
und Nachrichten mit Zustand, geschützt durch den Schlüssel.

**Vertrag widerrufen**: Online-Formular auf der Seite zum Widerrufsrecht, vom
Fuß jeder Seite aus erreichbar.

## Gestaltung

Ein ruhiges Atelier: warmes Papierweiß, tiefes Tintenschwarz, das Muga-Rot als
einziger lauter Ton, Messing nur für feine Linien. Die Startseite beginnt als
Bühne: Beim ersten Besuch hebt sich ein Vorhang, dahinter fließt dunkler Satin
(auf der Grafikkarte gerechnet), und die Figuren treten aus beleuchteten Bögen
heraus.

Das Erkennungszeichen ist **der rote Faden**. Er unterstreicht die Überschrift,
zieht sich beim Rollen mit einer Nadel an der Spitze durch alle Abschnitte der
Startseite und näht am Ende den Knopf an, über den der Termin gebucht wird. Auf
den übrigen Seiten unterstreicht er das betonte Wort der Überschrift, und bei
jeder Bestätigung stickt er den Haken auf einen Knopf.

Dazu kehren drei Motive wieder:

* **die Naht**, die gestrichelte Messinglinie als Trenner und beim Überfahren
  der Artikel,
* **das Maßband** als Fortschrittsanzeige bei Buchung und Stil-Finder, als
  Schieberegler im Größenberater und als Balken bis zum kostenlosen Versand,
* **der Bogen** als Bildrahmen.

Das Zeichen greift das alte Logo auf: schwarzes Feld, weißes M, rote Spitzen.
Schriften sind Fraunces und Figtree, beide liegen lokal (SIL Open Font License).

Zwischen den Seiten blendet der Browser weich über, das Bild einer Produktkarte
wächst in die Artikelseite hinein, und beim Filtern gleiten die Karten an ihren
neuen Platz (in Browsern, die das können, sonst wie gewohnt).

Jede Bewegung hat eine ruhige Fassung: Wer im Betriebssystem „Bewegung
reduzieren“ eingestellt hat, sieht keinen Vorhang, einen stehenden Stoff, den
fertig vernähten Faden und Reiter statt der angehefteten Stilkunde.

## Aufbau

```
index.html, kollektion.html, …   die Seiten
assets/css/                      basis (Farben, Schrift, Formulare), rahmen (Kopf, Fuß),
                                 shop (Karten, Artikel, Kasse), seiten (alles Übrige),
                                 erlebnis (Bühne, Faden, Stilkunde, Atelier, Fahrplan)
assets/js/config.js              Geschäftsdaten: Öffnungszeiten, Terminarten, Versand, Zahlarten,
                                 Abstände im Hochzeits-Fahrplan
assets/js/kern.js                Werkzeuge, Warenkorb, Merkliste, Katalog, Formularprüfung
assets/js/rahmen.js              Kopf, Navigation, Suche, Warenkorb-Leiste, Fuß, Seitenübergänge
assets/js/termine.js             Terminlogik und Kalenderdatei
assets/js/anzug.js               die Schneiderpuppe: Schnitte als Zahlen, daraus die Zeichnung
assets/js/faden.js               der rote Faden der Startseite
assets/js/stoff.js               der fließende Satin der Bühne
assets/js/fahrplan.js            der Hochzeits-Fahrplan
assets/js/seite-*.js             je Seite ein Skript
assets/produkte/                 Hauptbild je Artikel
daten/katalog.js                 Übersicht aller Artikel
daten/produkte/                  Beschreibung und weitere Bilder je Artikel
server.js                        Auslieferung und Speicherung
tests/                           Tests
```

Was sich im Alltag ändert, steht an einer Stelle: `assets/js/config.js`.
Browser und Server lesen dieselbe Datei.

Ein neuer Schnitt für die Schneiderpuppe ist eine Zeile in `anzug.js`
(`SCHNITT`): Saumlänge, Knopfhöhe, Form des Revers. Zwischen zwei Schnitten
blendet die Puppe zwischen diesen Zahlen über, deshalb braucht es keine
gezeichneten Zwischenbilder.

## Tests

```
npm test                 # 26 Tests: Öffnungszeiten, Feiertage, freie Zeiten, Versand, Fahrplan, Server
npm run test:browser     # 88 Prüfungen in einem echten Browser, Desktop und Handy
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
* **Abstände im Hochzeits-Fahrplan**: Zwölf, sechs, drei und eine Woche vor der
  Hochzeit sind übliche Richtwerte, keine Angaben des Geschäfts. Sie stehen in
  `assets/js/config.js` unter `fahrplan` und lassen sich dort anpassen.
* **Atelier**: Die Schneiderpuppe zeigt eine Skizze, kein Foto. Farben und
  Muster sind Näherungen. Die Seite sagt das dem Kunden und zeigt deshalb immer
  die echten Modelle aus dem Katalog dazu.
