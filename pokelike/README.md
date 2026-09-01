# Pokélike+

Ein Pokémon-Roguelike für den Browser: verzweigte Routen, echte rundenbasierte
Kämpfe, Relikte, Meta-Fortschritt — und **alle neun Generationen** mit 1193
Pokémon, 851 Attacken und 311 Fähigkeiten.

**Zum Spielen einfach `pokelike/index.html` im Browser öffnen.** Kein Server,
keine Installation, keine Abhängigkeiten zur Laufzeit. Der Spielstand liegt im
Browser dieses Geräts und wird nirgendwohin übertragen.

---

## Was ein Run ist

Du startest mit einem Startpokémon und arbeitest dich durch neun Regionen — eine
je Generation, von Kanto bis Paldea. Jede Region ist eine verzweigte Route: du
siehst die ganze Karte und entscheidest bei jedem Schritt, welchen Weg du
nimmst. Am Ende jeder Region steht ein Arenaleiter, danach wartet die Liga mit
Top Vier und Champ.

| Knoten | Was passiert |
|---|---|
| 🌿 **Wildes Pokémon** | Kampf mit Fangmöglichkeit |
| 🎽 **Trainerkampf** | Bringt Geld und Erfahrung |
| ⚔️ **Starker Trainer** | Volles Team, doppelte Belohnung |
| 🫱 **Begegnung** | Drei Pokémon zur Auswahl, eines darf mit |
| 🎁 **Fundstück** | Ein Gegenstand aus drei |
| 🛒 **Händler** | Kaufen, verkaufen, TMs |
| 🔥 **Rastplatz** | Heilen, trainieren, entwickeln, Attacken lernen, Team umstellen |
| ❓ **Ereignis** | 18 Situationen mit echten Entscheidungen |
| 🏛️ **Schrein** | Ein Relikt aus drei |
| 🏅 **Arenaleiter** | Typenschwerpunkt, starkes Team, danach volle Heilung |

Die Gegner ziehen mit deinem Team mit: ihr Level folgt deinem Durchschnitt, und
ihre Teamgröße wächst mit deiner. Wer mit einem einzigen Starter losläuft, wird
nicht sofort von sechs Pokémon überrannt — wer sechs sammelt, bekommt volle
Teams zu sehen.

## Was drin ist

**Kämpfe** — rundenbasiert und nah an der Hauptreihe: Schadensformel ab
Generation 5, Volltreffer, Zufallsstreuung, STAB, Typentabelle, Statusprobleme
(Verbrennung, Paralyse, Gift, schweres Gift, Schlaf, Eis), Statusstufen,
Verwirrung, Delegator, Schutzschild, Egelsamen, Wetter, Felder, Tarnsteine und
Stachler, Lichtschild und Reflektor, Prioritäten, Mehrfachtreffer, Rückstoß,
Absorption, Wahl-Gegenstände, Beeren — dazu **201 Fähigkeiten**, **82
Tragegegenstände** und **87 Attacken mit Sonderregeln** (Bodycheck, Fassade,
Abschlag, Konter, Bauchtrommel, Turbodreher, Auflockern …).

**Terakristall und Mega** — jedes Pokémon hat einen Tera-Typ und darf einmal pro
Kampf terakristallisieren. Mega-Steine gibt es im Laden; sie wirken, sobald du
den Mega-Ring als Relikt gefunden hast (91 Mega-Formen).

**Manuell oder automatisch** — du wählst jede Attacke selbst, oder du schaltest
den Auto-Kampf ein und die KI übernimmt: Attackenwahl, Wechsel, Gegenstände,
Terakristall. Auch für den Nachrücker nach einem K. o.

**52 Relikte** — dauerhafte Effekte für den ganzen Run: mehr Erfahrung, bessere
Fangchancen, Fleißpunkte nach jedem Kampf, ein zweiter Terakristall, ein
Notfallband, das ein besiegtes Pokémon zurückholt, Typen-Fokus für jeden der 18
Typen, und mehr.

**Volle Pokémon-Tiefe** — Wesen, Determinationswerte, Fleißpunkte, versteckte
Fähigkeiten, Schillernde (mit Schillerpin achtmal so häufig), Geschlecht,
Freundschaft, Entwicklung über Level, Steine, Freundschaft, Tausch und
Attacken. 251 Gegenstände, darunter alle Entwicklungssteine, Vitamine, Minzen,
Fähigkeits-Kapsel und -Pflaster, Silberkronkorken und Tera-Stücke.

**Modi**

| Modus | Beschreibung |
|---|---|
| Standard | Neun Regionen, danach die Liga |
| Kurzrun | Vier Regionen, dann direkt zur Liga |
| Endlos | Die Regionen wiederholen sich und werden härter |
| Boss-Rush | Fast nur Arenaleiter |
| Tages-Run | Fester Startwert aus dem Datum — heute für alle gleich |

Dazu **Nuzlocke** als Zusatzregel (besiegte Pokémon verlassen das Team für
immer) und **elf Aufstiegsstufen**, die sich nacheinander freischalten.

**Meta-Fortschritt** — der Pokédex sammelt über alle Runs hinweg, was du gesehen
und gefangen hast (inklusive Schillernder). 40 Startpokémon schalten sich nach
und nach frei, dazu 24 Erfolge, eine Dauerstatistik und die letzten 50 Runs mit
Team-Übersicht.

## Bedienung

| Taste | Wirkung |
|---|---|
| `1`–`4` | Attacke wählen |
| `W` | Pokémon wechseln |
| `B` | Beutel öffnen |
| `A` | Auto-Kampf an/aus |
| `T` | Terakristall vormerken |
| `Esc` | Menü bzw. Dialog schließen |

Alles ist auch mit Maus oder Finger bedienbar; auf schmalen Bildschirmen legt
sich das Layout um.

## Einstellungen

Hell/dunkel, Kampftempo (langsam bis sofort), Töne an/aus und die Sprache der
Pokémon-Namen (deutsch oder englisch). Attacken- und Fähigkeitsnamen bleiben
englisch — so heißen sie in Wettbewerb und Datenbanken überall.

---

## Für Entwickler

```
pokelike/
  index.html          Einstiegspunkt — reicht zum Spielen
  data/dex.js         erzeugte Pokémon-Daten (0,9 MB, alle neun Generationen)
  js/core.js          Zufall, Pokédex-Zugriff, Übersetzungen, Sprites
  js/pokemon.js       Werte, Attackenwahl, Erfahrung, Entwicklung, Fangen
  js/effects.js       Fähigkeiten, Tragegegenstände, Attacken-Sonderregeln
  js/battle.js        Kampf-Engine
  js/ai.js            Kampfentscheidungen für Gegner und Auto-Kampf
  js/items.js         Gegenstände und Relikte
  js/world.js         Regionen, Trainer, Begegnungen, Ereignisse
  js/run.js           Karte, Knoten, Belohnungen, Fortschritt
  js/meta.js          Speicherstand, Sammlung, Erfolge
  js/ui.js            Bausteine der Oberfläche
  js/app.js           Bildschirme und Spielsteuerung
  tools/build-data.mjs  erzeugt data/dex.js
  tests/              Prüfungen
```

Die Dateien sind gewöhnliche Skripte ohne Modulsystem, damit `index.html` auch
direkt aus dem Dateisystem läuft (ES-Module scheitern dort an der
Sicherheitsprüfung des Browsers). Jede Datei hängt nur von den vorherigen ab;
die Reihenfolge steht in `index.html`.

**Daten neu erzeugen** (nur nötig, wenn sich die Quelldaten ändern):

```sh
cd pokelike
npm install          # @pkmn/dex und pokemon, nur zum Bauen
npm run build:data
```

**Tests**

```sh
npm test             # 59 Prüfungen: Werteformel, Typentabelle, Schadensrechnung,
                     # 150 Kämpfe, sechs komplette Runs, Speicherformat
npm install --no-save playwright && npx playwright install chromium
npm run test:browser # spielt im echten Chromium einen Run an
```

## Datenquellen und rechtlicher Hinweis

Werte, Typen, Attacken, Fähigkeiten und Lernsets stammen aus
[@pkmn/dex](https://github.com/pkmn/ps) (Daten des Pokémon-Showdown-Projekts,
MIT-Lizenz), die deutschen Pokémon-Namen aus dem npm-Paket
[`pokemon`](https://www.npmjs.com/package/pokemon). Beide werden beim Bauen
einmalig ausgelesen; im Spiel selbst steckt nur die erzeugte Datei `data/dex.js`.

Die Sprites lädt die Seite zur Laufzeit von
[Pokémon Showdown](https://play.pokemonshowdown.com/sprites/) und
[PokeAPI](https://github.com/PokeAPI/sprites) — sie liegen nicht im Repository.
Ohne Internet läuft das Spiel weiterhin, dann mit gezeichneten Platzhaltern.

Pokémon und alle zugehörigen Namen sind Marken von Nintendo, Game Freak und The
Pokémon Company. Dies ist ein privates, nicht kommerzielles Fan-Projekt ohne
jede Verbindung zu den Rechteinhabern.
