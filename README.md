# Schach

Ein vollständiges Schachspiel für den Browser: gegen den Computer in vier
Schwierigkeitsstufen oder zu zweit an einem Gerät.

**Zum Spielen einfach `index.html` im Browser öffnen.** Kein Server, keine
Installation, keine Abhängigkeiten — auch nicht zur Laufzeit. Alles läuft
lokal, es werden keine Daten übertragen.

---

## Was drin ist

**Spielmodi**

* **Gegen den Computer** — vier Stufen, die sich spürbar unterscheiden:

  | Stufe | Stärke | Spielweise |
  |---|---|---|
  | Anfänger | ~600 | Rechnet zwei Halbzüge, ohne Ruhesuche — übersieht Abtausche und verschenkt Figuren |
  | Gelegenheitsspieler | ~1000 | Sieht einfache Taktik, patzt aber regelmäßig |
  | Klubspieler | ~1600 | Solide, bestraft grobe Fehler zuverlässig |
  | Meister | ~2000+ | Rechnet bis Tiefe 9–12 und spielt kompromisslos |

* **Zu zweit** — abwechselnd am selben Gerät, mit Drehen des Bretts.

**Regelwerk** — vollständig: Rochade, en passant, Umwandlung mit Auswahldialog,
Schachmatt, Patt, 50-Züge-Regel, dreifache Stellungswiederholung und
ungenügendes Material. Beim Zeitüberschreiten wird geprüft, ob der Gegner
überhaupt noch mattsetzen kann — sonst ist die Partie remis, wie es die Regeln
vorsehen.

**Bedienung** — Figuren ziehen oder anklicken, erlaubte Züge werden markiert,
der letzte Zug bleibt hervorgehoben, ein Schach färbt das Königsfeld rot.

**Weitere Funktionen**

* Zugliste in Standardnotation, anklickbar zum Zurückspulen
* Züge zurücknehmen (gegen den Computer zwei Halbzüge auf einmal)
* Schachuhr: 1 min, 3+2, 5 min, 10 min, 15+10 oder ohne
* Bewertungsleiste, geschlagene Figuren und Materialvorteil
* Zughinweis auf Knopfdruck
* Eröffnungsbuch mit 46 Varianten — die erkannte Eröffnung steht im Kopf
* Klänge und Animationen (abschaltbar), vier Brett-Designs
* PGN exportieren und herunterladen, FEN kopieren und laden
* Laufende Partie wird automatisch gespeichert und beim nächsten Öffnen
  zum Fortsetzen angeboten
* Läuft auf Handy, Tablet und Rechner

**Tastatur**

| Taste | Wirkung |
|---|---|
| `←` `→` | Einen Zug zurück / vor |
| `Pos1` `Ende` | Zum Anfang / ans Ende der Partie |
| `F` | Brett drehen |
| `U` | Zug zurücknehmen |
| `H` | Hinweis |
| `N` | Neue Partie |
| `Esc` | Dialog schließen, Auswahl aufheben |

---

## Aufbau

```
index.html          Grundgerüst
css/style.css       Gestaltung, vier Brett-Designs, mobile Ansicht
js/engine.js        Regelwerk: Zuggenerierung, FEN, Notation, Partiestatus
js/evaluate.js      Stellungsbewertung
js/ai.js            Suche und Schwierigkeitsstufen
js/book.js          Eröffnungsbuch
js/pieces.js        Figuren als SVG
js/sound.js         Klänge (zur Laufzeit erzeugt, keine Audiodateien)
js/app.js           Spielsteuerung und Oberfläche
tests/              Testsuiten (Node, ohne Abhängigkeiten)
```

Die Dateien werden als klassische `<script>`-Elemente geladen, nicht als
ES-Module. Das ist Absicht: Module unterliegen im Browser der
Cross-Origin-Prüfung und ließen sich über `file://` gar nicht laden — das Spiel
wäre dann nur über einen Webserver startbar.

### Wie die Engine arbeitet

Das Brett wird als **0x88-Array** geführt: 128 Felder, von denen 64 gültig
sind. Ob ein Feld noch auf dem Brett liegt, beantwortet dann eine einzige
Und-Verknüpfung (`index & 0x88`), was die Zuggenerierung deutlich beschleunigt.

Die Suche ist ein **Negamax mit Alpha-Beta-Schnitten**, ergänzt um:

* iterative Vertiefung — nach jedem Zeitlimit liegt ein gültiger Zug vor
* Transpositionstabelle mit Zobrist-Hash (2^20 Einträge)
* Ruhesuche, damit die Engine nicht mitten im Abtausch stehenbleibt
* Zugsortierung über Hashzug, MVV-LVA, Killerzüge und History-Heuristik
* Nullzug-Vorwärtsschnitt und Late Move Reductions
* Schachverlängerung

Die Bewertung ist **getapert**: Mittelspiel- und Endspielwert werden getrennt
geführt und nach verbliebenem Material interpoliert. Dadurch zieht der König
im Endspiel von selbst zur Brettmitte.

Die Suche läuft im Haupt-Thread, gibt aber zwischen den Wurzelzügen die
Kontrolle an den Browser zurück, damit die Oberfläche bedienbar bleibt. Ein Web
Worker wäre dafür der übliche Weg — der lässt sich über `file://` allerdings
nicht laden, und das Spiel soll per Doppelklick startbar bleiben.

Gegen die Uhr passt die KI ihr Zeitbudget an die Restzeit an, damit sie in
einer Blitzpartie nicht an der eigenen Bedenkzeit scheitert.

---

## Einzeldatei-Fassung

Wer das Spiel als eine einzige Datei braucht — zum Verschicken, auf einen
USB-Stick legen oder irgendwo einbetten:

```bash
node tools/build-single.mjs              # dist/schach.html, rund 160 KB
node tools/build-single.mjs --fragment   # ohne Seitenrahmen, zum Einbetten
```

Stylesheet und Skripte werden dabei direkt ins HTML eingefügt. `dist/` ist
bewusst nicht eingecheckt — die Datei entsteht vollständig aus den Quellen.

---

## Tests

```bash
npm test           # beides
npm run test:perft # Zuggenerierung
npm run test:taktik # Spielstärke
```

**`tests/perft.mjs`** zählt alle Zugfolgen bis zu einer festen Tiefe und
vergleicht sie mit den bekannten Referenzwerten der Schachprogrammierung —
sechs Stellungen, 16,5 Millionen Knoten. Das deckt Rochaderechte, en passant,
Umwandlung und Fesselungen zuverlässig ab: Weicht auch nur ein Zug ab, stimmt
die Summe nicht mehr.

**`tests/tactics.mjs`** prüft die Spielstärke zweistufig. Die Mattaufgaben
werden von einem **unabhängigen Brute-Force-Löser** verifiziert, der die wahre
Mattdistanz bestimmt — der Test verlässt sich also nicht auf handnotierte
Lösungen, sondern belegt, dass der gewählte Zug das Matt wirklich erzwingt.
Danach spielen die Stufen gegeneinander; nebenbei wird geprüft, dass
Zurücknehmen über eine ganze Partie exakt zur Grundstellung zurückführt.

---

## Bekannte Grenzen

* Figuren lassen sich nur mit Maus oder Finger bewegen, nicht per Tastatur.
  Die Tastatur steuert Navigation und Befehle.
* Die Anzeige geschlagener Figuren rechnet Umwandlungen nicht mit ein — nach
  einer Umwandlung stimmt dort die Bauernzahl nicht mehr genau.
* Die gespeicherte Partie hält die Uhrstände nur als Gesamtwert fest; ein
  Zurücknehmen nach dem Fortsetzen stellt die Zeit vor dem Zug nicht wieder her.

## Lizenz

MIT. Die Figuren sind eigens gezeichnete SVG-Pfade, die Klänge werden zur
Laufzeit synthetisiert — es sind keine fremden Grafiken oder Audiodateien
enthalten.
