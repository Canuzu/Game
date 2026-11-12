# Café Pausenbrot

Webseite für Café Pausenbrot, Rolandstraße 8, 50677 Köln. Reine Dateien ohne
Abhängigkeiten, läuft auf jedem Webspace und per Doppelklick auf `index.html`.

## Seiten

* **Start** (`index.html`): Öffnungsstatus im Kopf, die Theke
  als Foto mit Beschriftungen zum Antippen, Frühstück, Kaffee, Catering, Too Good
  To Go, Anfahrt.
* **Speisekarte** (`karte.html`): die Kreidetafel mit allen Preisen. Antippen legt das
  Gericht auf den Bestellzettel. Abholtag, Uhrzeit, Name, dann geht die
  Bestellung als fertig geschriebene Nachricht per WhatsApp oder SMS ans Café.
* **Tisch reservieren** (`tisch.html`): Anlass, Personen, Tag, Uhrzeit.
* **Catering** (`catering.html`): Anfrage mit Art, Gästezahl, Datum und
  Wünschen, dazu Bilder früherer Aufträge.
* Impressum und Datenschutz mit markierten Lücken.

## Ändern

Alles, was sich ändert, steht in `assets/js/daten.js`:

* `zeiten`: Öffnungszeiten (zurzeit täglich 8 bis 18 Uhr laut Google)
* `KARTE`: Gerichte und Preise, so wie sie auf der Tafel stehen
* `tagesangebot`: ein Gericht des Tages, das auf Start und Karte erscheint
* `THEKE`: die Beschriftungen auf dem Theken-Foto

## Wie Bestellungen ankommen

Die Seite hat keinen Server. Bestellungen, Tisch- und Catering-Anfragen
landen als vorbereitete Nachricht in WhatsApp oder in der SMS-App des Kunden,
adressiert an 0177 321 61 70. Fest ist eine Bestellung erst, wenn das Café
antwortet. Das steht auch so auf der Seite.

## Tests

```
npm test               # Öffnungsstatus, Abhol- und Tischzeiten, Bestellzettel
node tests/browser.js  # 44 Prüfungen im Browser, Desktop und Handy (braucht Playwright)
```

## Vor dem Einsatz zu klären

* **Impressum und Datenschutz**: Name der Inhaberin oder des Inhabers, E-Mail,
  Steuernummer und Hoster fehlen, sie sind auf den Seiten gelb markiert.
* **WhatsApp**: Die Nummer 0177 321 61 70 muss WhatsApp nutzen, sonst bleibt die SMS.
* **Feiertage und Urlaub**: Google nennt keine Ausnahmen, die Seite kennt deshalb
  keine. Ein Hinweis bittet bei Feiertagen um einen Anruf.
* **Theke**: Die Beschriftungen gelten für das eine Foto. Was an einem Tag in der
  Theke steht, wechselt, die Seite sagt das so.
* **Frühstück**: Preise für Frühstücksplatten stehen nicht auf der Tafel, deshalb
  nennt die Seite keine.
