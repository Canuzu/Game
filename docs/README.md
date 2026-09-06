# Pokélike+ als eigene Seite

In diesem Ordner liegt das fertige Spiel als eine einzige Datei
(`index.html`, rund 7 MB — Pokédex, alle Sprites und die Trainerbilder
stecken mit drin).

**Warum dieser Ordner überhaupt existiert:** Als eingebettete Seite in
einem fremden Rahmen wirft mancher Browser den Speicher weg, sobald der
Tab zugeht — der Spielstand ist dann fort. Unter einer eigenen Adresse
passiert das nicht: Dort ist der Speicher ganz normaler
Erstanbieter-Speicher und hält, bis man ihn selbst löscht.

## Einschalten (einmalig, zwei Klicks)

Auf GitHub unter **Settings → Pages**:

* **Source:** `Deploy from a branch`
* **Branch:** `claude/pokemon-roguelike-game-r76nxy` und Ordner `/docs`

Nach ein bis zwei Minuten liegt das Spiel unter

    https://canuzu.github.io/Game/

Diese Adresse darf jeder öffnen, und jeder, der sie öffnet, hat seinen
eigenen Spielstand im eigenen Browser.

## Neu bauen

    cd pokelike
    node tools/build-single.mjs
    cp dist/pokelike.html ../docs/index.html
