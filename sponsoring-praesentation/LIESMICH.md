# Sponsoringvorgespräch · Swiss Life Select

Präsentation für Sponsoring-Vorgespräche mit Vereinen, Chören und anderen Gruppen.

| Datei | Wofür |
|---|---|
| **`Sponsoringvorgespraech.html`** | Die Hauptfassung mit allen Animationen. Eine einzige Datei, läuft offline per Doppelklick in Chrome, Edge oder Safari. |
| **`Sponsoringvorgespraech.pptx`** | PowerPoint-Fassung zum Bearbeiten und als Ausweichlösung. 28 Folien mit Morph-Übergängen und Sprechernotizen. |

## Präsentieren (HTML)

1. `Sponsoringvorgespraech.html` doppelklicken und **„Präsentation starten“** drücken. Sie geht dann in den Vollbildmodus.
2. Weiter geht es mit dem Presenter-Klicker, mit `→` oder der Leertaste. Zurück mit `←`.
3. Vorher **`E`** drücken und Vereinsname, Vereinsart (Sport / Chor / anderer Verein), Berater und Kontakt eintragen. Die Texte und Bilder passen sich dann automatisch an. Beim Chor heißt es zum Beispiel „Proberaum“ statt „Vereinsheim“, und es werden Chorbilder gezeigt.

| Taste | Funktion |
|---|---|
| `→` `Leertaste` `Bild↓` | weiter (auch Presenter-Klicker) |
| `←` `Bild↑` | zurück |
| `F` | Vollbild |
| `O` | Übersicht aller Folien (anklicken springt hin) |
| `R` | Referentenansicht mit Notizen, Timer und Vorschau (zweites Fenster) |
| `E` | Einstellungen inkl. **eigene Fotos austauschen** |
| `L` | Leistungsmodus an/aus – schaltet Dauer-Effekte ab (bei schwacher Hardware automatisch) |
| `B` / `W` | Bildschirm schwarz / weiß |
| Zahl + `Enter` | zu Folie springen |
| `?` | Hilfe |

**Tipp für flüssige Animationen:** in Chrome oder Edge präsentieren (nicht in einer Vorschau oder einem eingebetteten Viewer) und in den Browser-Einstellungen die Hardwarebeschleunigung eingeschaltet lassen. Laptops sollten am Netzteil hängen, im Akkubetrieb drosseln viele Geräte die Grafik.

Die Antworten auf der Folie „Und jetzt ihr?“ kann man direkt in die Felder tippen. Sie werden pro Verein im Browser gespeichert.

**Schnelllink:** `Sponsoringvorgespraech.html?verein=SV%20Beispiel&art=chor&berater=Max%20Mustermann`

## Bilder

Die Fotos sind **KI-generierte Symbolbilder**. Sie zeigen keine echten Personen. Über `E` → „Bilder austauschen“ lassen sich jederzeit echte Fotos einsetzen, zum Beispiel von eigenen Trikotübergaben.

## Quellen bearbeiten (`quelle/`)

```
node build.mjs                 # Einzeldatei neu bauen (aus index.html, deck.css, deck.js, assets/)
node pptx/render.js            # Grafiken für die PowerPoint rendern (braucht Playwright + Chromium)
python3 pptx/build_pptx.py     # PowerPoint bauen (braucht python-pptx)
```

Kartendaten: [svg-maps/germany](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0) und Natural Earth (gemeinfrei). Schriften: Source Serif 4 und Source Sans 3 (SIL Open Font License).
