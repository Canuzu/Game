# Die Webseite

Was in diesem Ordner liegt, liefert GitHub Pages aus:

```
index.html          Pokélike+ — eine einzige Datei (~7 MB, alles eingebettet)
                    → https://canuzu.github.io/Game/
schach/             Schach, unter eigener Adresse und ohne Verbindung dorthin
                    → https://canuzu.github.io/Game/schach/
pokelike/           nur eine Weiterleitung auf die Startadresse, damit ein
                    kurzzeitig verteilter Link nicht ins Leere geht
.nojekyll           damit GitHub die Dateien nicht durch Jekyll schickt
```

Die beiden Spiele sind bewusst getrennt: Wer die Startadresse öffnet,
landet sofort im Pokémon-Spiel, ohne vorher etwas auswählen zu müssen.
Es gibt keine Startseite und keine Links zwischen den beiden.

**Warum dieser Ordner überhaupt existiert:** Als eingebettete Seite in
einem fremden Rahmen wirft mancher Browser den Speicher weg, sobald der
Tab zugeht — der Spielstand ist dann fort. Unter einer eigenen Adresse
passiert das nicht: Dort ist der Speicher ganz normaler
Erstanbieter-Speicher und hält, bis man ihn selbst löscht.

## Eingestellt ist

**Settings → Pages:** Source `Deploy from a branch`, Branch
`claude/pokemon-roguelike-game-r76nxy`, Ordner `/docs`.

## Neu bauen

Pokélike+:

    cd pokelike
    node tools/build-single.mjs
    cp dist/pokelike.html ../docs/index.html

Schach: Der Zweig `gh-pages` wird vom Workflow des Schach-Zweigs weiter
gefüllt, ausgeliefert wird er aber nicht mehr — GitHub Pages kann nur
eine Quelle bedienen. Der Stand hier ist deshalb eine Kopie:

    git fetch origin gh-pages
    rm -rf docs/schach && mkdir -p docs/schach
    git archive origin/gh-pages | tar -x -C docs/schach
    rm -f docs/schach/.nojekyll

Wer das nicht von Hand machen will: Der Workflow `.github/workflows/seite.yml`
im Schach-Zweig müsste statt eines erzwungenen Pushes auf `gh-pages`
künftig in `docs/schach/` dieses Zweigs schreiben. Dann hält sich beides
von selbst aktuell.
