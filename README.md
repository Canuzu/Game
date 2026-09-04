# Schach

Ein vollständiges Schachspiel für den Browser: gegen den Computer in vier
Schwierigkeitsstufen oder zu zweit an einem Gerät — mit Partieanalyse, heller
und dunkler Ansicht und vollständiger Tastaturbedienung.

### 👉 [Hier spielen: canuzu.github.io/Game](https://canuzu.github.io/Game/)

Der Link funktioniert ohne Konto und ohne Anmeldung und lässt sich beliebig
weitergeben. Wer das Spiel lieber offline hat, lädt sich
[die Einzeldatei](https://canuzu.github.io/Game/schach-einzeldatei.html)
herunter — darin steckt alles, sie läuft per Doppelklick.

**Aus dem Projektordner heraus** genügt ebenfalls ein Doppelklick auf
`index.html`. Kein Server, keine Installation, keine Abhängigkeiten — auch
nicht zur Laufzeit. Alles läuft lokal, es werden keine Daten übertragen.

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

**Partieanalyse** — nach der Partie rechnet die Engine jede Stellung noch
einmal durch und vergleicht sie mit dem, was tatsächlich gespielt wurde. Jeder
Zug bekommt sein Zeichen in der Zugliste (`??` Patzer, `?` Fehler, `?!`
Ungenauigkeit, `!` bester Zug), ein Klick darauf zeigt die bessere Fortsetzung.
Oben steht die Genauigkeit beider Seiten in Prozent.

Bewertet wird nicht der Verlust in Bauernwerten, sondern der Verlust an
**Gewinnaussicht**: Hundert Centipawns wiegen im ausgeglichenen Mittelspiel
weit schwerer als in einer ohnehin gewonnenen Stellung. Eröffnungszüge, die im
Buch stehen, werden gar nicht erst bewertet — Theorie schlägt eine Kurzsuche.

**Helle und dunkle Ansicht** — folgt standardmäßig der Einstellung des Geräts,
lässt sich aber im Kopf der Seite jederzeit umschalten. Die Brettfarben bleiben
dabei unverändert: ein Nussbaumbrett sieht bei Tageslicht schließlich auch
nicht anders aus.

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
* Vollständig mit der Tastatur bedienbar, mit Ansagen für Vorlesewerkzeuge
* Läuft auf Handy, Tablet und Rechner

**Tastatur**

Mit `Tab` springt der Fokus auf das Brett. Dort schieben die Pfeiltasten eine
Markierung über die Felder, Leertaste oder Eingabetaste wählt eine Figur aus
und zieht sie. Solange das Brett den Fokus hat, blättern die Pfeiltasten nicht
durch den Verlauf — sonst ließe sich beides nicht gleichzeitig bedienen.

| Taste | Am Brett | Sonst |
|---|---|---|
| `←` `↑` `→` `↓` | Markierung bewegen | Einen Zug zurück / vor |
| `Leertaste` `Enter` | Auswählen und ziehen | — |
| `Pos1` `Ende` | — | Zum Anfang / ans Ende der Partie |
| `F` | Brett drehen | Brett drehen |
| `U` | Zug zurücknehmen | Zug zurücknehmen |
| `H` | Hinweis | Hinweis |
| `A` | Analyse starten | Analyse starten |
| `N` | Neue Partie | Neue Partie |
| `Esc` | Auswahl aufheben | Dialog schließen |

---

## Aufbau

```
index.html          Grundgerüst
css/style.css       Gestaltung, helle/dunkle Ansicht, Brett-Designs, Handy
js/engine.js        Regelwerk: Zuggenerierung, FEN, Notation, Partiestatus
js/evaluate.js      Stellungsbewertung
js/ai.js            Suche, Schwierigkeitsstufen, Analysebewertung
js/book.js          Eröffnungsbuch
js/pieces.js        Figuren als SVG
js/sound.js         Klänge (zur Laufzeit erzeugt, keine Audiodateien)
js/app.js           Spielsteuerung und Oberfläche
tools/build-single.mjs  Erzeugt eine Einzeldatei-Fassung
tests/              Testsuiten
```

Die Dateien werden als klassische `<script>`-Elemente geladen, nicht als
ES-Module. Das ist Absicht: Module unterliegen im Browser der
Cross-Origin-Prüfung und ließen sich über `file://` gar nicht laden — das Spiel
wäre dann nur über einen Webserver startbar.

### Wie die beiden Ansichten zusammenspielen

Beide Farbpaletten stehen genau einmal im Stylesheet (`--d-*` dunkel, `--l-*`
hell); darunter wird nur noch zugewiesen, welche gerade gilt. Dunkel ist der
Grundzustand, hell greift in drei Fällen: das System bevorzugt hell, eine
umgebende Seite setzt `data-theme="light"`, oder im Spiel wurde „Hell" gewählt.

Die eigene Einstellung gewinnt immer. Das erledigt ein `:not([data-app-theme])`
an den beiden helleren Regeln: steht die Einstellung auf „Dunkel", greifen sie
nicht, und es bleiben die Grundwerte stehen. Ein eigener Dunkel-Block wird
dadurch überflüssig.

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

## Veröffentlichung

Jeder Push auf den Hauptzweig löst `.github/workflows/seite.yml` aus: erst
laufen die Tests, dann wird die Seite gebaut und auf den Zweig `gh-pages`
geschoben, von dem GitHub Pages ausliefert. Schlägt ein Test fehl, wird nichts
ausgeliefert — die erreichbare Seite bleibt dann auf dem letzten
funktionierenden Stand.

Der Zweig `gh-pages` wird vom Workflow erzeugt und sollte nicht von Hand
bearbeitet werden.

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
npm test             # Engine: Zuggenerierung und Spielstärke
npm run test:browser # Oberfläche in einem echten Browser
npm run test:alle    # alles zusammen
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

**`tests/browser.mjs`** bedient das Spiel in einem echten Browser so, wie ein
Mensch es täte: klicken, ziehen, tippen. Damit ist abgedeckt, was sich in Node
nicht prüfen lässt — Rochade und Umwandlung über die Oberfläche, die
Tastaturbedienung, dass in beiden Ansichten Schrift und Grund unterscheidbar
bleiben, dass die Analyse einen eingestellten Dameneinsteller findet, und dass
nach einer durchgespielten Partie kein Figurenrest im Fenster hängen bleibt.

Dieser Test braucht Playwright und überspringt sich selbst, wenn es fehlt — am
Spiel selbst ändert sich nichts, das bleibt abhängigkeitsfrei:

```bash
npm install --no-save playwright && npx playwright install chromium
# Ist schon ein Chromium vorhanden, spart das den Download:
CHROMIUM_PFAD=/pfad/zu/chrome npm run test:browser
```

---

## Bekannte Grenzen

* Die Analyse rechnet mit knappem Zeitbudget (rund 0,4 Sekunden je Stellung,
  im Schnitt fünf bis sieben Halbzüge tief). Sie ist ein guter Wegweiser, aber
  kein Schiedsrichter — bei tiefer Taktik kann sie danebenliegen. Die Tiefe,
  mit der sie gearbeitet hat, steht deshalb in der Zusammenfassung.
* Die Bewertungen werden nicht mitgespeichert. Nach dem Neuladen einer Partie
  muss die Analyse erneut laufen.
* Die gespeicherte Partie hält die Uhrstände nur als Gesamtwert fest; ein
  Zurücknehmen nach dem Fortsetzen stellt die Zeit vor dem Zug nicht wieder her.

## Lizenz

MIT. Die Figuren sind eigens gezeichnete SVG-Pfade, die Klänge werden zur
Laufzeit synthetisiert — es sind keine fremden Grafiken oder Audiodateien
enthalten.
