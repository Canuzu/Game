# Pokélike+

Ein Pokémon-Roguelike für den Browser: verzweigte Routen, echte rundenbasierte
Kämpfe, Relikte, Meta-Fortschritt — und **alle neun Generationen** mit 1193
Pokémon, 851 Attacken und 311 Fähigkeiten.

**Zum Spielen einfach `pokelike/index.html` im Browser öffnen.** Kein Server,
keine Installation, keine Abhängigkeiten zur Laufzeit. Der Spielstand liegt im
Browser dieses Geräts und wird nirgendwohin übertragen.

Wer lieber eine einzige Datei mitnimmt: `node tools/build-single.mjs` erzeugt
`dist/pokelike.html` — 5,2 MB, Sprites inklusive, läuft komplett offline.

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
| ❓ **Ereignis** | 30 Situationen mit echten Entscheidungen |
| 🧢 **Rivale** | Taucht in jeder zweiten Region auf und wächst mit |
| 🏛️ **Schrein** | Ein Relikt aus drei |
| 🏅 **Arenaleiter** | Typenschwerpunkt, starkes Team, danach volle Heilung |

Die Gegner ziehen mit deinem Team mit: ihr Level folgt deinem Durchschnitt, und
ihre Teamgröße wächst mit deiner. Wer mit einem einzigen Starter losläuft, wird
nicht sofort von sechs Pokémon überrannt — wer sechs sammelt, bekommt volle
Teams zu sehen.

Zwei Regeln arbeiten für dich: Schickt der Gegner mitten im Kampf ein Pokémon
nach — freiwillig oder nach einem K. o. —, gehört die nächste Runde dir,
unabhängig von Initiative und Erstschlagattacken. Und wer ein neues Pokémon
ins Team holt, bekommt es auf Teamhöhe statt hinterher.

**Dein Rivale** nimmt den Starter, der deinen kontert — wählst du Glumanda,
nimmt er Schiggy. Er stellt sich dir in jeder zweiten Region in den Weg, sein
Team wächst von zwei auf sechs Pokémon, sein Starter entwickelt sich mit und
trägt ab der dritten Begegnung einen Mega-Stein. Vor und nach jedem Kampf hat
er etwas zu sagen.

**Der Schrein der Legenden** taucht ab der sechsten Region auf: hinter dem
Siegel wartet ein legendäres Pokémon auf deinem Levelniveau, mit besten
Werten und Fleißpunkten. Du darfst kämpfen und fangen — oder ehrfürchtig
zurücktreten und ein Relikt mitnehmen.

## Was drin ist

**Kämpfe** — rundenbasiert und nah an der Hauptreihe: Schadensformel ab
Generation 5, Volltreffer, Zufallsstreuung, STAB, Typentabelle, Statusprobleme
(Verbrennung, Paralyse, Gift, schweres Gift, Schlaf, Eis), Statusstufen,
Verwirrung, Delegator, Schutzschild, Egelsamen, Wetter, Felder, Tarnsteine und
Stachler, Lichtschild und Reflektor, Prioritäten, Mehrfachtreffer, Rückstoß,
Absorption, Wahl-Gegenstände, Beeren — dazu **221 Fähigkeiten**, **82
Tragegegenstände** und **109 Attacken mit Sonderregeln** (Bodycheck, Fassade,
Abschlag, Konter, Bauchtrommel, Turbodreher, Auflockern …).

Auch die kniffligen Fälle sind dabei:

* **Zwei-Runden-Attacken** — Solarstrahl, Turbotempo, Himmelsfeger und die
  übrigen laden erst auf und schlagen dann ein. In der Sonne (Solarstrahl,
  Solarklinge) oder im Regen (Elektroschuss) entfällt das Laden, ebenso mit
  der Kraftherb.
* **Unangreifbarkeit** — wer fliegt, taucht, sich eingräbt oder verschwindet,
  ist eine Runde lang nicht zu treffen. Nur die richtigen Gegenmittel
  erwischen ihn: Erdbeben den Eingegrabenen (mit doppelter Wucht), Surfer den
  Abgetauchten, Donner und Orkan den Fliegenden.
* **Schutzschilde mit Nachspiel** — Bissige Dornen, Bunker, Brandwehr,
  Königsschild, Blockade und Fadenfalle blocken wie Schutzschild, geben dem
  Angreifer aber etwas mit: Schaden, Gift, Brand oder gesenkte Werte. Und
  Königsschild, Blockade und Fadenfalle halten nur Angriffe auf, keine
  Statusattacken.
* **Aufrufende Attacken** — Metronom greift blind in den ganzen Vorrat,
  Schlafrede spielt im Schlaf eine der eigenen Attacken. Beide zählen den
  Schlaf nicht doppelt herunter und geraten nicht in Endlosschleifen.
* **Auroraschleier** liegt nur bei Schnee oder Hagel, **Wiederbelebung** holt
  ein gefallenes Teammitglied mit halben KP zurück, **Seitenwechsel** schiebt
  Tarnsteine und Schilde auf die andere Feldhälfte.
* **Zustände, die wirklich beißen** — Anziehung, Folterknecht, Heilblockade,
  Albtraum, Klammergriff, Zielschuss, Ladung, Bodycheck und Teerschuss.

**Arenaleiter wie im Original** — alle 72 treten mit ihrer echten Aufstellung
an, in der Reihenfolge, in der sie ihre Pokémon in den Spielen schicken; das
letzte ist das Ass. Rocko bringt Kleinstein und Onix, Misty Sterndu und
Starmie, Giovanni seine fünf. Doppelte wie Kogas zwei Smogmog stehen so da,
wie sie im Spiel vorkommen.

Welcher Leiter einer Region antritt, richtet sich nach dem Fortschritt: die
Listen stehen in Ordensfolge, im ersten Gebiet kommt einer vom Anfang, im
letzten einer vom Ende — mit einem Zufallsschritt, damit sich die Runs
unterscheiden.

Eine Regel macht das erst spielbar: **eine Art, die für das Level des Kampfes
zu weit entwickelt ist, tritt als Vorstufe an.** Misty trifft man in den
Spielen auf Level 21 mit Starmie; hier richtet sich das Level nach dem eigenen
Team, und ein Starmie gegen ein Level-10-Team ist kein Arenaleiter mehr,
sondern eine Wand — gemessen 4 % Siegquote. Als Sterndu sind es 71 %. Die
Spiele machen es selbst so: frühe Arenaleiter führen die jüngere Form
derselben Art. Nach oben wird nie verändert; ab Level 25 steht Starmie wieder
da, wo es hingehört.

Die **Trainerfiguren** der Leiter sind nach ihren Vorlagen gezeichnet: Rockos
braune Stachelfrisur und die orange Weste, Mistys seitlicher Zopf und das
gelbe Top, Giovannis orangefarbener Anzug mit dunklem Umhang. Die
Originalbilder liegen ausschließlich bei Pokémon Showdown und sind ohne Netz
nicht zu haben — deshalb steht in `js/leaders.js` für jeden, was ihn erkennbar
macht, und der Pixel-Zeichner setzt es im Stil des übrigen Spiels um.

**Mega-Entwicklung** — 48 Pokémon haben eine Mega-Form (dazu die Protoformen
von Kyogre und Groudon). Einmal pro Kampf, mit dem passenden Stein; Rayquaza
kommt wie in den Spielen ohne Stein aus und verlangt stattdessen Zenitstürmer.
Der Händler führt immer einen Stein, der zu deinem Team passt — Mega ist damit
ein Ziel, auf das du hinspielen kannst, keine Glückssache. Mit dem Relikt
Mega-Armband sind es zwei Mega-Entwicklungen pro Kampf.

**Manuell oder automatisch** — du wählst jede Attacke selbst, oder du schaltest
den Auto-Kampf ein und die KI übernimmt: Attackenwahl, Wechsel, Gegenstände,
Mega-Entwicklung, auch den Nachrücker nach einem K. o. Der Auto-Kampf spielt
auf Sieg und würfelt nicht: Er rechnet jede Attacke gegen das aktuelle Ziel
durch und nimmt die beste; bei Gleichstand entscheidet die zuverlässigere.

**Wie schwer es zugeht** — Gegner richten sich nach dem eigenen Team, bleiben
aber bewusst ein Stück dahinter: zwei Level, ein Pokémon weniger im Aufgebot
und ein Abschlag auf Werte und Attackensets. Alle drei Zahlen stehen als
`EASE` an einer Stelle in `js/run.js` und lassen sich in einer Minute
nachziehen. Wilde Pokémon sind ausgenommen — sie sind die Erfahrungsquelle,
und schwächere Gegner dort würden das eigene Team langsamer wachsen lassen.

Ob eine Änderung wirkt, misst `node tools/balance.mjs 60`: das Werkzeug spielt
Runs vollautomatisch durch und meldet die Siegquote gegen Ass-Trainer,
Arenaleiter, Top Vier und Champ. Damit ist die Schwierigkeit belegbar statt
geschätzt.

**Typenvorteil auf einen Blick** — jeder Attackenknopf zeigt, was die Attacke
beim aktuellen Gegner ausrichtet (×4, ×2, ×½, ×¼, wirkungslos). Kein Blättern
in Tabellen, keine Rechnerei — die Entscheidung bleibt trotzdem deine.

**Pixelgrafik statt glatter Flächen** — Vorbild ist die Game-Boy-Advance-Ära.
Die 15 Kulissen werden auf einem 240 × 80 Pixel großen Canvas gezeichnet, also
genau so breit wie ein GBA-Bild, und anschließend hart hochskaliert: große,
sichtbare Pixel, Farbverläufe als Bänder mit Dither-Naht, kein einziges
weichgezeichnetes Bild. Route, Wald, Höhle, Bergpfad, Eisfeld, Küste,
Gewässer, Vulkan, Wüste, Stadt, Arena, Liga-Halle, Ruine, Dschungel und
Nachtlager. Beide Pokémon stehen auf gezeichneten Plattformen, darüber ziehen
Blätter, Schneeflocken, Funken oder Sandkörner.

Welche Kulisse erscheint, entscheiden Region und Knotenart: Kanto zeigt Wälder
und Wiesen, Sinnoh Schnee und Berge, Alola Strand und Vulkan; Arenaleiter
kämpfen in der Arena, die Liga in ihrer Halle, Fundstücke liegen in Höhlen.
Die Routenkarte bekommt dieselbe Welt in der Draufsicht: eine nahtlos
kachelnde Bodentextur je Region.

**Musik und Effekte** — sechs Chiptune-Schleifen (Route, Stadt, Höhle, Kampf,
Arenaleiter, Siegesfanfare) werden zur Laufzeit auf vier Kanälen erzeugt:
Melodie, Begleitung, Bass und ein Schlagzeug aus gefiltertem Rauschen. Keine
Audiodatei, kein Download. Welches Stück läuft, entscheidet der Ort.

Die Trainerfiguren werden mit 32 × 48 Pixeln gezeichnet — Silhouette mit
verjüngtem Rumpf statt gestapelter Rechtecke, Schattenseite und Glanzlicht,
vier Frisuren, Röcke, Kappen und Umhänge, und über allem eine dunkle Kontur.
Erst die Kontur macht aus einem Klötzchenhaufen ein Sprite. Der Spieler steht
von hinten mit erhobenem Wurfarm da. Auch die Bälle sind gezeichnet: für jede
Bildzeile wird die Kreisbreite ausgerechnet, die Silhouette ist also wirklich
rund und trotzdem hart gerastert.

Im Kampf haben die Pokémon Vorrang: die Anzeigen mit Namen, Typen und
Lebensbalken sind knapp gesetzt, die Pokémon selbst groß. Damit sie dabei
nicht über ihren Plattformen schweben, wird beim Laden gemessen, wie viel
leerer Rand unter jedem Bild liegt — die Bilder von PokeAPI füllen je nach
Art nur ein Drittel bis vier Fünftel ihrer Fläche — und das Bild um genau
diesen Betrag nach unten geschoben.

Attacken werfen typgefärbte Pixel über die Bühne: Spezialattacken fliegen als
Geschoss zum Ziel und zerplatzen, physische lassen den Angreifer vorstoßen und
schlagen ein, Statusattacken ziehen einen Ring. Volltreffer lassen die Bühne
wackeln. Die Pokémon heben und senken sich im Leerlauf.

**Kampfauftakt** — der Bildschirm schließt sich in Streifen, dahinter stehen
beide Trainer als gezeichnete Pixelfiguren auf ihren Plätzen (19 Klassen mit
eigener Palette, vom Käfersammler bis zum Champ), dann weichen sie zur Seite
und schicken ihr Pokémon ins Feld.

**Bedienung** — unter der Bühne steht das Kampfprotokoll in einem Textfenster,
darunter die vier Attacken als Kacheln mit Typ, Kategorie, AP und Wirksamkeit
gegen das aktuelle Ziel. Die Zeile darunter (Wechseln, Beutel, Ball, Fliehen,
Mega, Auto) bleibt immer stehen — auch während das Protokoll abläuft, damit
sich der Auto-Kampf jederzeit abschalten lässt. Rahmen, Balken und Knöpfe sind
flächig und hart umrandet: keine runden Ecken, keine weichen Schatten.

**52 Relikte** — dauerhafte Effekte für den ganzen Run: mehr Erfahrung, bessere
Fangchancen, Fleißpunkte nach jedem Kampf, eine zweite Mega-Entwicklung, ein
Notfallband, das ein besiegtes Pokémon zurückholt, Typen-Fokus für jeden der 18
Typen, und mehr.

**Volle Pokémon-Tiefe** — Wesen, Determinationswerte, Fleißpunkte, versteckte
Fähigkeiten, Schillernde (mit Schillerpin achtmal so häufig), Geschlecht,
Freundschaft, Entwicklung über Level, Steine, Freundschaft, Tausch und
Attacken. 251 Gegenstände, darunter alle Entwicklungssteine, Vitamine, Minzen,
Fähigkeits-Kapsel und -Pflaster, Silberkronkorken und alle 50 Mega-Steine.

**Modi**

| Modus | Beschreibung |
|---|---|
| Standard | Neun Regionen, danach die Liga |
| Kurzrun | Vier Regionen, dann direkt zur Liga |
| Endlos | Die Regionen wiederholen sich und werden härter — jede volle Runde bringt einen Segen zur Wahl |
| Boss-Rush | Fast nur Arenaleiter |
| Tages-Run | Fester Startwert aus dem Datum — heute für alle gleich |

Dazu **Nuzlocke** als Zusatzregel — besiegte Pokémon verlassen das Team für
immer, und pro Region darfst du nur ein einziges Pokémon aufnehmen. Wer fällt,
kommt auf den **Friedhof**: Grabstein, Level, Region und der Gegner, an dem es
gescheitert ist.

Im **Endlosmodus** wird nach jeder vollen Runde durch alle neun Regionen ein
Segen ausgeschüttet — drei zur Wahl aus sieben: volle Heilung, ein Relikt,
fünf Level mehr Obergrenze, Fleißpunkte fürs ganze Team, ein legendärer
Begleiter, 10 000 ₽ oder eine Feldapotheke.

**Elf Aufstiegsstufen** schalten sich nacheinander frei und stapeln sich:

| Stufe | Erschwernis |
|---|---|
| 1 | Gegner starten zwei Level höher |
| 2 | Läden verlangen 25 % mehr |
| 3 | Arenaleiter und Top Vier führen ein Pokémon mehr |
| 4 | Rastplätze heilen nur noch zur Hälfte |
| 5 | Fangchancen sinken deutlich |
| 6 | Gegner tragen häufiger Gegenstände |
| 7 | 20 % weniger Erfahrung |
| 8 | Kein Vollheilen nach Arenaleitern |
| 9 | Gegner mega-entwickeln, sobald sie können |
| 10 | Alles zusammen und noch zwei Level obendrauf |

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
| `M` | Mega-Entwicklung vormerken |

| `Esc` | Menü bzw. Dialog schließen |

### Auf dem Handy

Das Spiel ist für das Telefon eigens eingerichtet, nicht nur geschrumpft:

* **Der Kampf passt auf einen Bildschirm** — Bühne, Protokoll, vier
  Attackenkacheln und die Aktionszeile, ohne Scrollen. Wer zum Angreifen erst
  scrollen muss, spielt schlechter.
* **Nichts ragt über den Rand.** Das ist wichtiger, als es klingt: sobald ein
  einziges Element zu breit ist, zoomt der mobile Browser die *ganze* Seite
  heraus — dann ist alles zu klein, nicht nur das Überstehende. Eine Prüfung
  im Browser-Test misst das auf jedem Bildschirm nach.
* **Tippziele ab 44 Pixel**, Attackenkacheln ab 56. Der übrige Platz geht an
  die Kacheln, auf einem großen Telefon werden sie also größer.
* **Dialoge steigen von unten auf** und haben ihre Knöpfe unten über die
  volle Breite — in Daumenreichweite.
* **Höhen rechnen in dvh**, nicht in vh: auf dem Handy wächst und schrumpft
  die Adressleiste, und vh rechnet mit der größeren Variante — der untere
  Rand läge sonst darunter. Dazu `env(safe-area-inset-*)` für Geräte mit
  Aussparung.
* In der Kopfzeile stehen die beiden Zahlen, die man ständig braucht: Geld
  und Levelgrenze. Region und Route stehen ohnehin groß über der Karte.
* **Quer gehalten** rücken die Attacken in eine Reihe zu viert und die Bühne
  wird flacher.

Alles ist auch mit Maus oder Finger bedienbar; auf schmalen Bildschirmen legt
sich das Layout um. Auf Karte und Teambildschirm sitzt eine **Schnellheilung**:
ein Klick belebt, heilt und kuriert mit dem, was im Beutel liegt — immer vom
kleinsten passenden Gegenstand an. Die **Teamreihenfolge** änderst du, indem du
die Karten mit Maus oder Finger übereinander ziehst.

## Einstellungen

Hell/dunkel, Kampftempo (langsam bis sofort), Töne und Musik getrennt an/aus,
Lautstärke in drei Stufen und die Sprache der Pokémon-Namen (deutsch oder
englisch). Attacken- und Fähigkeitsnamen bleiben
englisch — so heißen sie in Wettbewerb und Datenbanken überall.

### Spielstand sichern

Alles liegt im Browser dieses Geräts — wird der Speicher geleert, ist der
Fortschritt weg. Unter *Einstellungen → Spielstand* liegen deshalb zwei
Knöpfe:

* **Spielstand sichern** legt den kompletten Stand (Pokédex, Erfolge,
  Statistik, Einstellungen und den laufenden Run) als Text vor, den du
  kopieren und irgendwo ablegen kannst.
* **Spielstand einspielen** nimmt so einen Text wieder entgegen und ersetzt
  damit den aktuellen Fortschritt.

Der Text trägt eine Formatkennung und eine Versionsnummer. Stammt ein
laufender Run aus einer älteren Fassung des Spiels, wird nur er ausgelassen —
Pokédex und Erfolge kommen trotzdem mit.

### Momente

Drei Augenblicke laufen als kleine Einlage ab: der **geworfene Ball** samt
Wackeln und Klicken, die **Entwicklung** mit Blinken und Blitz und die
**Werte-Tafel** beim Levelaufstieg. Sie laufen bewusst in eigenem, festem
Tempo — sie werden bei »langsam« nicht länger und dauern nie mehr als eine
knappe Sekunde. Wer das Kampftempo auf **Sofort** stellt, bekommt sie gar
nicht erst zu sehen; `prefers-reduced-motion` schaltet sie ebenfalls ab.

---

## Für Entwickler

```
pokelike/
  index.html          Einstiegspunkt — reicht zum Spielen
  data/dex.js         erzeugte Pokémon-Daten (0,9 MB, alle neun Generationen)
  js/core.js          Zufall, Pokédex-Zugriff, Übersetzungen, Sprites
  js/scenery.js       15 Pixelkulissen, Plattformen, Bodenkacheln, Trainer
  js/audio.js         Chiptune-Sequencer mit sechs Stücken
  js/fx.js            Attackeneffekte, Bildschirmwischer, Wackeln
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
  data/sprites.js     eingebettete Sprites (3,9 MB) für die Einzeldatei
  tools/build-data.mjs    erzeugt data/dex.js
  tools/build-sprites.mjs erzeugt data/sprites.js
  tools/build-single.mjs  bündelt alles zu dist/pokelike.html
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
npm test             # 100 Prüfungen: Werteformel, Typentabelle, Schadensrechnung,
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

Für die Sprites gibt es zwei Wege. `index.html` lädt zur Laufzeit die
animierten Bilder von [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/)
und fällt auf [PokeAPI](https://github.com/PokeAPI/sprites) zurück — das sieht
am besten aus, braucht aber Internet. Daneben liegen in `data/sprites.js` alle
1025 Sprites (vorne, hinten, schillernd) als Base64 eingebettet; die
Einzeldatei-Fassung nutzt diese und läuft damit vollständig offline. Erzeugt
werden sie mit `node tools/build-sprites.mjs`.

Pokémon und alle zugehörigen Namen sind Marken von Nintendo, Game Freak und The
Pokémon Company. Dies ist ein privates, nicht kommerzielles Fan-Projekt ohne
jede Verbindung zu den Rechteinhabern.
