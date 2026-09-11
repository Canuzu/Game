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
trägt ab der dritten Begegnung einen Gegenstand. Vor und nach jedem Kampf hat
er etwas zu sagen.

**Legendäre Pokémon** kommen im gewöhnlichen Run nicht mehr vor. Sie gehören
ganz dem **Legendären Run** — einem eigenen Modus, der weiter unten steht.

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

Dasselbe gilt für die **Liga**: die Top Vier treten mit ihren Aufstellungen
aus dem Hauptspiel an — Lorelei mit Jugong und Lapras, Agatha mit ihren zwei
Gengar, Drasna mit Dragalgon und UHaFnir. Galar hat keine Top Vier; dort
treten die Halbfinalgegner des Pokal-Turniers an (Marnie, Bede, Piers), damit
die Region in der Liga nicht fehlt. Die neun **Champions** hatten ihre echten
Sechserteams schon immer.

Die **Trainerfiguren** aller 112 — Arenaleiter, Top Vier und Champions — sind
die echten Bilder aus den Spielen. `tools/build-trainers.py` holt sie aus zwei
offenen Disassemblies (`smogon/sprites`, aus dem auch Pokémon Showdown seine
Trainerbilder baut, und `pret/pokeemerald` für die Rückenansichten), nimmt von
jeder Figur ihren jüngsten Auftritt — Rot aus HeartGold sieht besser aus als
Rot aus Rot —, schneidet den durchsichtigen Rand ab und bettet alles als
Base64 ein. 84 Figuren gibt es so im Original; für Galar, Paldea und ein paar
ältere, die in keiner erreichbaren Quelle stecken, steht die Trainerklasse
ein, die ihnen am nächsten kommt: Nessa bekommt die Schwimmerin, Bea die
Kämpferin, Larry den Büroangestellten, Grusha den Snowboarder. Auch die 21
gewöhnlichen Klassen und vier Figuren für den eigenen Charakter (Rot, Blatt,
Brix, Maike — wählbar unter *Einstellungen*) kommen von dort. Die Bilder
gehören Nintendo/Game Freak und stecken hier wie die Pokémon-Sprites nur für
den privaten Gebrauch drin.

**Jeder Run seine eigene Auswahl** — eine Region hat weit mehr Bewohner, als
ein Run zeigen kann. Statt immer aus demselben Vorrat zu ziehen, würfelt jeder
Run pro Generation seine eigene Auswahl: rund 60 % dessen, was die Region
hergibt. Kanto bleibt Kanto — aber zwei Runs teilen sich nur etwa ein Drittel
ihrer Bewohner, und was im letzten Durchgang an jeder Ecke stand, fehlt im
nächsten ganz. Der Startwert hängt allein an Run und Generation, ein geladener
Spielstand findet dieselben Bewohner also unverändert vor.

Dazu zählt das Spiel mit, wem man schon begegnet ist: Die zweite Begegnung
derselben Art ist unwahrscheinlich, die dritte praktisch ausgeschlossen. Über
zwölf Begegnungsknoten hinweg kommen so 32 verschiedene Arten in 36 Angeboten
zusammen — vorher waren es 26.

**Paradoxformen** — die zwanzig Paradoxformen der neunten Generation tragen in
den Quelldaten alle dieselbe Markierung, sind aber zweierlei. Riesenzahn ist
ein Donphan aus einer anderen Zeit und Eisenhand ein Hariyama aus einer
anderen: gewöhnliche Pokémon, die man in Paldea antrifft und fängt wie jedes
andere — allerdings erst ab etwa Level 53, weil ihre Basiswerte sie vorher
aus dem Begegnungstopf halten. Nur die sechs Paradoxformen **legendärer**
Pokémon — Windewoge, Eisenblatt, Keilflamme, Furienblitz, Eisenfels und
Eisenhaupt, die Gestalten der Johto-Hunde und der Schwerter der Gerechtigkeit —
bleiben Legenden und stehen im Legendären Run.

**Der Legendäre Run** — ein eigener Weg neben dem Run, kein Schwierigkeitsgrad.
Neun Generationen, in jeder ihre legendären Pokémon, und hinter jedem von ihnen
genau ein Duell: dein selbst gebautes Team gegen dieses eine Pokémon. Offen
steht er, sobald du Stufe 5 im gewöhnlichen Run gewonnen hast.

Das Team stellst du vorher zusammen — bis zu sechs Arten **derselben
Generation**, und nur solche, die in deinem Pokédex stehen. Gefangene Legendäre
dürfen in ihrer eigenen Generation mitkämpfen. Alle treten auf Stufe 100 an,
vier Attacken wählst du je Pokémon selbst.

Der Gegner steht allein gegen dein ganzes Team und bekommt dafür einen
Bossaufschlag: dreifache KP und 15 % auf alle übrigen Werte, beste
Fleißpunkte, perfekte Werte, höchste KI-Stufe. Der Aufschlag liegt bewusst auf
den KP — das macht den Kampf lang, nicht die einzelnen Treffer unfair.

**Jede Legende hat ihren eigenen Ball.** Der erste Sieg legt ihn bereit;
fangen kannst du sie also erst, wenn du ein zweites Mal antrittst, und der
Ball fängt nur sie. Wiederholte Siege bringen keinen zweiten.

Diese Bälle sind nicht gezeichnet, sondern gerechnet: `tools/build-baelle.mjs`
öffnet jedes der 111 eingebetteten Sprites, sucht im oberen Drittel den
größten zusammenhängenden Klumpen — das ist der Kopf und nicht der Flügel —,
zählt die Farben des Sprites, rechnet den Kopf auf 14 × 10 Punkte herunter,
reduziert ihn auf drei Töne mit Kontur und setzt ihn in die obere Hälfte eines
32 × 32 großen Balls. Herauskommt `data/baelle.js`: 111 winzige PNG, zusammen
rund 117 KB. Der Arktos-Ball ist blau mit Arktos' Kopf, der Ho-Oh-Ball rot mit
seinem — und beide fliegen im Kampf auch wirklich so.

Aus denselben Sprites kommen die neun Umrisse hinter den Generationskarten:
Mewtu für Kanto, Lugia für Johto, Rayquaza für Hoenn, bis Koraidon für Paldea.

Jedes der 111 hat sein **eigenes Stück Musik** — Tonleiter aus dem ersten Typ,
Tempo aus den Basiswerten, der Rest aus der Pokédex-Nummer, sodass dasselbe
Pokémon immer gleich klingt. Dreizehn Titelträger (Mewtu, Lugia, Rayquaza,
Arceus, Zacian und andere) bringen ein von Hand geschriebenes Motiv mit. Und
jedes kämpft an seinem Ort: Kyogre im Meer, Groudon im Vulkan, Arceus zwischen
den Sternen.

**Lebensräume statt Zufallsliste** — jeder Knoten weiß, in welcher Kulisse er
liegt, und die Begegnungen richten sich danach: im Wald Käfer und Pflanzen, in
der Höhle Gestein und Boden, am Wasser Wasser-Pokémon. Es ist eine Gewichtung,
keine Sperre — gelegentlich steht eben doch etwas Unerwartetes im Wald.

Dazu zwei Änderungen an der Auswahl, beide gemessen:

* **Charakterköpfe statt Routenfüller.** Vorher wurde nach der aktuellen
  Basiswertsumme gewürfelt, und in Region 1 waren 94 % der Angebote
  unentwickelte Füller — Rattfratz, Raupy, Hornliu. Jetzt zählt, was am *Ende*
  der Entwicklungsreihe steht: Raupy wird an Smettbo gemessen (395), Abra an
  Simsala (500). Der Anteil echter Füller fiel damit von rund der Hälfte auf
  5–7 %.
* **Kein zweites Mal dasselbe.** Der Run merkt sich, welche Arten schon
  aufgetaucht sind, und wählt sie danach seltener. Wiederholungen innerhalb
  eines Runs: von 11 % auf 4 %, 103 verschiedene Arten bei 108 Angeboten.

Die Regionen bleiben dabei streng bei sich: in Kanto begegnet dir Kanto.

**Formen sehen aus wie Formen** — Alola-Raichu surft auf seinem Schweif,
Galar-Smogmog hat Schornsteine, ein mega-entwickeltes Glurak wird schwarzblau
und Gigadynamax-Relaxo trägt einen Berg auf dem Bauch. PokeAPI führt
Regionalformen, Mega- und Gigadynamax-Formen unter eigenen Nummern ab 10001;
die stehen als `pid` im Pokédex, und die Bilder liegen mit im Paket. Vorher
zeigte jede Form das Bild ihrer Grundform.

**Verwandlung: Mega oder Gigadynamax** — es gibt keine Megasteine und keinen
Megaring. Wer seine letzte Entwicklung erreicht hat und eine Mega-Form besitzt,
kann sich mega-entwickeln — 87 Pokémon mit zusammen 93 Formen, die neuen aus
Legends Z-A eingeschlossen (Impergator, Meganie, Dragoran, Flambirex, Quajutsu,
Raichu-Mega-X und -Y und dreißig weitere), dazu die Protoformen von Kyogre und
Groudon. Draußen bleibt nur, was Showdown als erfundenes Fan-Pokémon führt.
Eine Ausnahme macht die Regel sichtbar: Floette hat eine Mega-Form, ist aber
noch nicht ausgewachsen — für ihn bleibt sie damit unerreichbar.

Wer eine Gigadynamax-Form hat, kann gigadynamaximieren — 33 Pokémon, dafür
ohne Bedingung: auch Pikachu, Mauzi und Evoli können es.

Wer beides kann, muss sich entscheiden, und die Entscheidung gilt für den
ganzen Run: einmal mega-entwickelt heißt nie gigadynamaximiert und umgekehrt.
Hin und her geht nicht.

Die beiden Formen fühlen sich verschieden an. **Mega** hält den ganzen Kampf,
ändert Typen, Fähigkeit und alle Werte. **Gigadynamax** hält drei Runden, gibt
die Hälfte mehr Lebenspunkte und 30 % mehr Angriffskraft; danach schrumpft das
Pokémon auf denselben Bruchteil seiner gewohnten Lebenspunkte zurück. Beides
zusammen einmal pro Kampf und Seite — mit dem Relikt Mega-Armband zweimal.
Normales Dynamax gibt es nicht, nur Gigadynamax.

**Der Auto-Kampf** — du wählst jede Attacke selbst, oder du schaltest ihn ein
und die KI übernimmt den ganzen Kampf. Sie würfelt nicht: Sie rechnet jede
Attacke gegen das aktuelle Ziel durch und nimmt die beste; bei Gleichstand
entscheidet die zuverlässigere. Dabei tut sie alles, was auch von Hand ginge:

- **Wechseln**, wenn die Paarung schlecht steht — aber nie, wenn dieser Zug
  den Kampf entscheidet. Wer ohnehin im nächsten Zug fällt, wechselt leichter:
  verlieren kann er dabei nichts mehr.
- **Heilen**, bevor der nächste Treffer sitzt, und zwar mit dem kleinsten
  Trank, der die Lücke füllt — ein Top-Trank für 20 fehlende KP wäre Verschwendung.
- **Status kurieren**, wenn er wirklich schadet: Schlaf und Frost immer, Gift
  bei langem Kampf, Paralyse beim Schnellen, Verbrennung beim Körperlichen.
- **Beleben**, wenn nur noch ein Pokémon steht und gerade nichts droht — der
  Beleber ist dann die Reserve, die den Kampf rettet.
- **Fangen**, wenn es sich lohnt: Der Automat rechnet aus, was ein wildes
  Pokémon dem Team brächte (Platz im Team, fehlende Typen, Aussicht auf
  Stärke, schillernd, neu für den Pokédex). Lohnt es sich, schwächt er es
  gezielt auf etwa ein Fünftel der KP statt es zu besiegen, legt es wenn
  möglich schlafen und wirft dann — mit dem billigsten Ball, der reicht. Der
  Meisterball bleibt liegen, solange es nicht um etwas Besonderes geht.
- **Fliehen**, wenn ein wilder Kampf sonst den Run kostet: letztes Pokémon,
  wenig KP, nichts mehr im Beutel.

**Der Reise-Automat** — unten rechts sitzt ein kleiner Knopf (Umschalt+A), der
alles Übrige übernimmt und jederzeit wieder ausgeht. Er sucht sich den Weg,
betritt die Knoten, kämpft, kauft ein und entscheidet in jeder Szene:

- **Den Weg** sucht er nicht Schritt für Schritt, sondern rückwärts über die
  ganze Karte: Der Wert eines Knotens ist sein eigener plus der beste Weg, der
  von ihm weggeht. Gewählt wird also nicht der nächste hübsche Knoten, sondern
  der Anfang des besten Wegs. Was dabei zählt, hängt vom Zustand ab — ein
  Rastplatz ist mit vollem Team fast wertlos und mit halbem das Wichtigste auf
  der Karte.
- **In den Szenen** nimmt er das stärkste Angebot (mit Bonus für Typen, die dem
  Team fehlen), das Relikt mit der größten Wirkung, das Fundstück, das gerade
  fehlt, und im Laden das, was pro Geld am meisten bringt.
- **Bei Ereignissen** trägt jede Antwort in `js/world.js` ein Gewicht für den
  Automaten — manche als feste Zahl, manche als kleine Funktion, die den Run
  anschaut: baden lohnt sich nur, wenn das Team angeschlagen ist, die
  Straßenwette nur mit Geld in der Tasche.
- **Am Rastplatz** heilt er, entwickelt, wer bereit ist, oder trainiert. Wenn
  es nicht wirklich brennt, wird trainiert: Heilen kann auch der Beutel,
  Erfahrung gibt es nur hier und im Kampf.
- **Nach jedem Knoten packt er den Beutel aus.** Das war lange der größte
  Fehler des Automaten — er sammelte und benutzte nie. Jetzt verteilt er
  Sonderbonbons auf das schwächste Mitglied, füttert Vitamine dem, der am
  meisten daraus macht, gibt den Silberkronkorken dem Besten, bringt TMs
  bei, wenn die neue Attacke wirklich besser ist als die schwächste, rüstet
  Tragegegenstände aus (das beste Stück an das stärkste Pokémon) und holt
  aus der Box, wer deutlich besser ist als das schwächste Teammitglied.

Was das ausmacht, ist gemessen und nicht geschätzt — `node tools/balance.mjs`
spielt genau diesen Automaten, gemessen wird also, was der Spieler bekommt,
wenn er den Knopf drückt:

| | vorher | jetzt |
|---|---|---|
| Gewinnquote der harten Kämpfe | 87,4 % | **94,2 %** |
| Ø erreichte Region | 4,4 | **7,1** |
| durchgespielte Runs (von 30) | 0 | **8** |
| Kampf gegen den Champ | — | **89 %** |

Den Ausschlag gaben drei Dinge: der ausgepackte Beutel (TMs und
Tragegegenstände sind dauerhafte Stärke, die vorher im Rucksack verrottete),
das Heilen nach Rechnung statt nach Gefühl (ein Trank lohnt, wenn er den
nächsten Treffer überlebbar macht — und nie, wenn der eigene Zug den Kampf
ohnehin entscheidet), und der Bogen um die Ass-Trainer, an denen vorher jeder
zweite Run starb.

**Wie schwer es zugeht** — der Grundlauf ist freundlich eingestellt: Gegner
bleiben sechs Level hinter dem eigenen Team, bieten zwei Pokémon weniger auf
und tragen schwächere Werte; nach jedem gewonnenen Kampf erholt sich das Team
um ein Drittel. Härter wird es über die fünf **Stufen** am Schieberegler, und die schaltet
man frei, indem man Runs gewinnt — man wählt also nur aus, was man sich
vorher erspielt hat.

Gemessen mit `node tools/balance.mjs 40`: Siegquote gegen die harten Kämpfe
94,8 % (Ass-Trainer 91 %, Arenaleiter 99 %, Top Vier 95 %, Champ 50 %),
durchschnittlich erreichte Region 7,8 von 9, 11 von 40 Runs gewonnen.

Vor Arenaleiter, Top Vier und Champ erholt sich das Team immer vollständig —
in den Spielen steht vor jeder Arena ein Center. Das war der gemessene Grund
fürs Scheitern: nicht die Stärke des Leiters, sondern dass man mit leerem
Beutel bei ihm ankam.

Gegner richten sich nach dem eigenen Team, bleiben
aber bewusst ein Stück dahinter: mehrere Level, ein Pokémon weniger im Aufgebot
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

Die Trainerfiguren sind die echten Bilder aus den Spielen (siehe oben); der
gezeichnete Pixel-Zeichner in `js/scenery.js` bleibt als Rückfall für den
Fall, dass `data/trainers.js` fehlt. Auch die Bälle sind gezeichnet: für jede
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
beide Trainer auf ihren Plätzen — der Gegner mit seinem echten Bild aus den
Spielen, du mit der Rückenansicht deiner Figur —, dann weichen sie zur Seite
und schicken ihr Pokémon ins Feld.

**Bedienung** — unter der Bühne steht das Kampfprotokoll in einem Textfenster,
darunter die vier Attacken als Kacheln mit Typ, Kategorie, AP und Wirksamkeit
gegen das aktuelle Ziel. Die Zeile darunter (Wechseln, Beutel, Ball, Fliehen,
Verwandeln, Auto) bleibt immer stehen — auch während das Protokoll abläuft, damit
sich der Auto-Kampf jederzeit abschalten lässt. Rahmen, Balken und Knöpfe sind
flächig und hart umrandet: keine runden Ecken, keine weichen Schatten.

**52 Relikte** — dauerhafte Effekte für den ganzen Run: mehr Erfahrung, bessere
Fangchancen, Fleißpunkte nach jedem Kampf, eine zweite Verwandlung, ein
Notfallband, das ein besiegtes Pokémon zurückholt, Typen-Fokus für jeden der 18
Typen, und mehr.

**Volle Pokémon-Tiefe** — Wesen, Determinationswerte, Fleißpunkte, versteckte
Fähigkeiten, Schillernde (mit Schillerpin achtmal so häufig), Geschlecht,
Freundschaft, Entwicklung über Level, Steine, Freundschaft, Tausch und
Attacken. 158 Gegenstände, darunter alle Entwicklungssteine, Vitamine, Minzen,
Fähigkeits-Kapsel und -Pflaster und Silberkronkorken.

**Modi**

| Modus | Beschreibung |
|---|---|
| Standard | Neun Regionen, danach die Liga |
| Endlos | Die Regionen wiederholen sich und werden härter — jede volle Runde bringt einen Segen zur Wahl |
| Tages-Run | Fester Startwert aus dem Datum — heute für alle gleich |
| Legendärer Run | Eigener Weg: ein Duell gegen ein einzelnes legendäres Pokémon |

Dazu **Nuzlocke** als Zusatzregel — besiegte Pokémon verlassen das Team für
immer, und pro Region darfst du nur ein einziges Pokémon aufnehmen. Wer fällt,
kommt auf den **Friedhof**: Grabstein, Level, Region und der Gegner, an dem es
gescheitert ist.

Im **Endlosmodus** wird nach jeder vollen Runde durch alle neun Regionen ein
Segen ausgeschüttet — drei zur Wahl aus sieben: volle Heilung, ein Relikt,
fünf Level mehr Obergrenze, Fleißpunkte fürs ganze Team, ein legendärer
Begleiter, 10 000 ₽ oder eine Feldapotheke.

**Fünf Stufen** schalten sich nacheinander frei und stapeln sich — jede erbt
alles von den Stufen darunter:

| Stufe | Name | Was dazukommt |
|---|---|---|
| 1 | Reise | Das Spiel, wie es gedacht ist |
| 2 | Herausforderung | Gegner zwei Level höher, Läden 25 % teurer |
| 3 | Prüfung | Arenaleiter mit einem Pokémon mehr, geringere Fangchancen, 20 % weniger Erfahrung |
| 4 | Härte | Rastplätze heilen halb, Gegner tragen öfter Gegenstände, kein Vollheilen nach Arenaleitern |
| 5 | Meisterschaft | Gegner verwandeln sich, und noch zwei Level obendrauf |

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

### Speichern

Gespeichert wird wie in einem richtigen Spiel — über *Spielstände* auf dem
Titelbildschirm oder *Menü → Speichern*.

**Profile.** Wer sich ein Gerät teilt, teilt nicht seinen Fortschritt: Jedes
Profil hat seinen eigenen Pokédex, seine eigenen Erfolge, seine eigenen
Einstellungen und seine eigenen Plätze. Profile lassen sich anlegen,
umbenennen und löschen; gewechselt wird auf dem Titelbildschirm. Wer den Link
weitergibt, gibt nichts von seinem Stand mit — der liegt im Browser des
jeweiligen Geräts, nicht in der Seite.

**Drei Plätze und ein Mitschrieb.** Auf die drei Plätze speicherst du selbst;
daneben schreibt das Spiel nach jedem Knoten auf einen vierten, damit ein
geschlossenes Fenster nichts kostet. Jeder Platz zeigt, was auf ihm liegt:
Region und Weg, das Team mit Bildern, Durchschnittslevel, Geld, Modus und
Zeitpunkt. Speichern, Laden und Löschen sitzen direkt daneben.

**Wo der Stand liegt — und warum das wichtig ist.** Eingebettet in einer
fremden Seite behandeln manche Browser den Speicher als Wegwerfware: Schreiben
geht, aber beim nächsten Öffnen ist alles fort. Das Spiel merkt selbst, ob es
eingebettet läuft, und sagt es dann auch. Unter einer **eigenen Adresse**
passiert das nicht — dort ist es gewöhnlicher Erstanbieter-Speicher und hält
wie bei jedem normalen Spiel. Genau dafür liegt die fertige Einzeldatei als
`docs/pokelike/index.html` im Zweig und wird von GitHub Pages unter
<https://canuzu.github.io/Game/> ausgeliefert — eine öffentliche Adresse, die
jeder öffnen darf und auf der jeder seinen eigenen, haltbaren Stand hat.
`js/cloud.js` legt den Stand zusätzlich außerhalb des Browsers ab, wo die
veröffentlichte Seite die Fähigkeit `db` hat — als Zugabe, nicht als
Voraussetzung.

**Mitnehmen.** Unter *Spielstände → Auf ein anderes Gerät mitnehmen* liegt der
komplette Stand als Datei (in der veröffentlichten Fassung als echter
Download, sonst als Text zum Kopieren) und lässt sich dort wieder einlesen —
per Dateiauswahl oder Einfügen. Der Stand trägt eine Formatkennung und eine
Versionsnummer. Stammt ein laufender Run aus einer älteren Fassung des Spiels,
wird nur er ausgelassen — Pokédex und Erfolge kommen trotzdem mit.

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
  js/autopilot.js     Entscheidungen des Reise-Automaten außerhalb des Kampfes
  js/meta.js          Speicherstand, Profile, Plätze, Sammlung, Erfolge
  js/cloud.js         Spielstand außerhalb des Browsers, wo es ihn gibt
  js/ui.js            Bausteine der Oberfläche
  js/app.js           Bildschirme und Spielsteuerung
  data/sprites.js     eingebettete Pokémon-Sprites (4,9 MB) für die Einzeldatei
  data/trainers.js    eingebettete Trainerbilder aus den Spielen (0,35 MB)
  tools/build-data.mjs    erzeugt data/dex.js
  tools/build-sprites.mjs erzeugt data/sprites.js
  tools/build-trainers.py erzeugt data/trainers.js
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
