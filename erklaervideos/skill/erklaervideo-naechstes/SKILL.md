---
name: erklaervideo-naechstes
description: Wenn der Nutzer im Chat zu den Alltags-Erklärvideos (Serie "Alltagsduell", A gegen B Simulation, indigo Look mit Coral und Mint) "Poste das nächste", "mach das nächste Video" oder Ähnliches sagt: nächstes Video selbst bauen (Skript, Stimme, Animation, Schnitt) und auf das TikTok-Konto tiktok-erklaer hochladen. Nicht für Auto-Content und nicht für Lernen & Mindset.
---

# Alltagsduell: nächstes Erklärvideo bauen und posten

Das ganze Projekt liegt im Repo-Ordner `erklaervideos/` (Engine, Folgen, Themenliste). Fehlt der Ordner im Container, das Repo des Nutzers klonen. Antworten auf Deutsch, knapp, ohne gedankenstriche im Fließtext.

## Ablauf

1. **Konto**: `tiktok_accounts` aufrufen, Konto `tiktok-erklaer` suchen (connector_id nehmen). Status `error` heißt `tiktok_reconnect`, fehlt es, `tiktok_connect` mit name `tiktok-erklaer` und den Link zeigen.
2. **Nächste Folge bestimmen**: ältestes fertig gerendertes Video in `erklaervideos/out/`, das noch nicht gepostet wurde. Unklar, was online ist: kurz fragen. Kein fertiges Video: nächstes Thema aus `videos/themen.md` nehmen (Status offen), Nutzer nicht erneut nach Themen fragen, außer er will eins vorgeben.
3. **Fakten absichern**: Alle Zahlen im Video per Python nachrechnen oder aus einer Quelle (WebSearch) belegen. Annahmen im Video einblenden. Nichts erfinden.
4. **Skript** (`videos/NNN-name/script.json`): 150 bis 190 Wörter, 60 bis 80 Sekunden. Aufbau: Hook als Frage in den ersten 3 Sekunden, Intuitions-Falle ("Klar, ..."), Setup mit gleichen Bedingungen, "Los geht's", Zähler laufen, Ergebnis, Dreh/Warum, Faustregel, Kommentarfrage. Zahlen und Einheiten ausschreiben ("zweiunddreißig", "Quadratzentimeter"). Schlüsselwörter mit `*a:...*` (Coral, Seite A), `*b:...*` (Mint, Seite B), `*...*` (Gelb) markieren. Pro Beat ein bis zwei Sätze, `sfx` (pop, whoosh, ding) und `pause` setzen.
5. **Szenen** (`stage.js`): Vorlage `videos/001-pizza/stage.js` kopieren. Bausteine in `engine/base.js` (PILL, scoreCard, pizza, G, TX, pop, ramp). Je Beat eine Szene, Übergänge als Überblendung, Zähler laufen im Rennen hoch. Sauber animieren: Pop mit Overshoot, Easing, nichts springt. Keine KI-Bilder, alles als eigene Vektorgrafik.
6. **Bauen**:
   - Abhängigkeiten (falls neuer Container): `pip install edge-tts faster-whisper numpy`.
   - `python3 engine/build.py videos/NNN-name` (Stimme Edge-Neural `de-DE-KillianNeural`, Wort-Timing, Sounds, Musikbett).
   - Standbilder prüfen: `node engine/render.mjs videos/NNN-name --only 2,10,20,30,40` und die Bilder ansehen (Überlappungen, abgeschnittene Texte, Untertitel-Breite).
   - Komplett rendern: `node engine/render.mjs videos/NNN-name` (ca. 2 Minuten) ergibt `out/NNN-name.mp4`.
7. **Technik prüfen**: MP4, 1080x1920, 30 fps, 3 bis 600 Sekunden, unter 1 GB (`ffprobe`).
8. **Dem Nutzer zeigen**: Video mit SendUserFile schicken.
9. **Hochladen (nur Hochladen bei Higgsfield, nichts generieren, keine Credits)**: `media_upload` (filename, content_type video/mp4), dann per curl `PUT` mit Header `Content-Type: video/mp4` und `If-None-Match: *` auf die upload_url, danach `media_confirm` mit type video. Die zurückgegebene cloudfront-URL ist die video_url.
10. **Beitrag vorbereiten**: `tiktok_prepare_publish` mit media_type VIDEO, mode DIRECT_POST, video_url und connector_id von `tiktok-erklaer`.
    - Titel (maximal 150 Zeichen): Hook-Frage + 3 bis 4 Hashtags (#alltagsduell immer dabei, dazu Themen-Hashtags, kein Hashtag-Spam).
    - Beschreibung: Hook, Suchbegriffe, Kernzahlen, "Alltagsduell Folge N", Kommentarfrage mit Folge-Aufforderung, 8 bis 10 Hashtags.
    - Privatsphäre, Kommentare, Duett, Stitch, KI-Kennzeichnung nur vorbelegen, wenn der Nutzer sie genannt hat.
11. **Bestätigung**: Das Formular muss der Nutzer selbst prüfen und absenden. Klar sagen: "Formular ist bereit, bitte einmal bestätigen." Hinweisen: Die Stimme ist synthetisch, daher KI-Kennzeichnung im Formular setzen. Beste Zeiten: werktags 18 bis 21 Uhr, am Wochenende 10 bis 12 und 18 bis 21 Uhr, höchstens ein Video pro Tag. Nachts (23 bis 6 Uhr) auf schwache Reichweite hinweisen. Kommentare in der ersten Stunde beantworten, einen Kommentar anpinnen.
12. **Nacharbeit**: `tiktok_publish_status` mit publish_id prüfen, wenn der Nutzer fragt oder nach der Bestätigung. Dann kurz melden, welche Folge online ist, und `videos/themen.md` auf FERTIG setzen.

## Look (nicht ändern ohne Rückfrage)

Indigo Verlauf, Coral (Seite A), Mint (Seite B), Gelb (Highlights), Schrift Inter ExtraBold/Black, weiße Untertitel-Pille mit farbigem Schlüsselwort bei 1500 px von oben, Szenen im oberen Teil, unten 300 px frei für die TikTok-Oberfläche. Serienname Alltagsduell. Format der Referenzvideos (Wettlauf, Zähler, Dreh) übernehmen, aber nichts davon kopieren: eigene Grafik, eigene Themen, eigener Name.

## Regeln

Nichts ohne Bestätigung im Formular veröffentlichen. Bei Higgsfield nur Upload und TikTok-Tools nutzen, keine Generierung. Keine fremden Bilder oder Musik. Zahlen immer belegt oder nachgerechnet.
