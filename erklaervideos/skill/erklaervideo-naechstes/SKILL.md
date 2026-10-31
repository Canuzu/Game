---
name: erklaervideo-naechstes
description: Wenn der Nutzer im Chat zu den Alltags-Erklärvideos (Serie "Alltagsduell", A gegen B Simulation, indigo Look mit Coral und Mint, Maskottchen Duelli) "Poste das nächste", "mach das nächste Video" oder Ähnliches sagt: nächstes fertiges Video auf das TikTok-Konto tiktok-erklaer hochladen und das Formular vorbereiten, bei Bedarf vorher neue Folgen bauen. Nicht für Auto-Content und nicht für Lernen & Mindset.
---

# Alltagsduell: nächstes Erklärvideo bauen und posten

Das Projekt liegt im Repo-Ordner `erklaervideos/` (Engine, Folgen, Themenliste, `videos/publish.json`). Fehlt der Ordner im Container, das Repo des Nutzers klonen. Antworten auf Deutsch, knapp, ohne Gedankenstriche im Fließtext.

## "Poste das nächste"

1. **Konto**: `tiktok_accounts`, Konto `tiktok-erklaer` suchen (connector_id). Status `error`: `tiktok_reconnect`. Fehlt es: `tiktok_connect` mit name `tiktok-erklaer`, Link zeigen.
2. **Nächste Folge**: In `videos/publish.json` die kleinste Folge mit `"posted": false`. Unklar, was online ist: kurz fragen. Gibt es für sie noch kein MP4 in `out/`, zuerst bauen (siehe unten). Gibt es keine Folge mehr, das nächste Thema aus `videos/themen.md` bauen.
3. **Hochladen (nur Hochladen bei Higgsfield, nichts generieren, keine Credits)**: `media_upload` (filename, content_type video/mp4), danach per curl PUT mit Header `Content-Type: video/mp4` und `If-None-Match: *` auf die upload_url, dann `media_confirm` mit type video. Die zurückgegebene URL ist die video_url.
4. **Formular vorbereiten**: `tiktok_prepare_publish` mit media_type VIDEO, mode DIRECT_POST, video_url, connector_id, `title` aus publish.json (maximal 150 Zeichen). Privatsphäre, Kommentare, Duett, Stitch, KI-Kennzeichnung nur vorbelegen, wenn der Nutzer sie genannt hat.
5. **Bestätigung**: Der Nutzer muss das Formular selbst prüfen und absenden: "Formular ist bereit, bitte einmal bestätigen." Zeigt die Oberfläche kein Formular (Claude Code in der Cloud rendert keine MCP-Apps), den Nutzer bitten, in einem normalen Claude-Chat mit Higgsfield-Connector denselben Beitrag vorzubereiten, und ihm video_url und Titel zum Kopieren geben. Hinweisen: Stimme ist synthetisch, deshalb KI-Kennzeichnung setzen. Beste Zeiten: werktags 18 bis 21 Uhr, am Wochenende 10 bis 12 und 18 bis 21 Uhr, höchstens ein Video pro Tag. Nachts (23 bis 6 Uhr) auf schwache Reichweite hinweisen. Kommentare in der ersten Stunde beantworten, einen anpinnen.
6. **Nacharbeit**: `tiktok_publish_status`, wenn der Nutzer fragt oder nach der Bestätigung. Dann `posted` auf true setzen, kurz melden, welche Folge online ist und welche als Nächstes dran ist.

## Neue Folge bauen

Reihenfolge: Thema (`videos/themen.md`) → Fakten absichern (alle Zahlen per Python nachrechnen oder aus einer Quelle belegen, Annahmen im Video zeigen) → `videos/NNN-name/script.json` und `stage.js` → bauen → Vorschau → rendern → `publish.json` ergänzen.

- **Länge: mindestens 60 Sekunden** (Ziel 62 bis 75). Nach `build.py` die Dauer prüfen; kürzer: Beat ergänzen (Annahme, Faustregel, Zusatzfakt) oder `tail` erhöhen.
- **Dynamischer Schnitt** (Pflicht): 15 bis 18 Beats mit kurzen Sätzen, alle 3 bis 4 Sekunden ändert sich etwas im Bild. Die Engine liefert Zoom-Stoß je Satz, Schräglage, Wackeln bei `ding`, Slide-Übergänge zwischen Szenen und 2 bis 3 Wort Untertitel-Häppchen. Dazu je Folge: `kPunch` (große Zahl als harter Schnitt) bei den wichtigsten Zahlen, Sticker ("KLAR: ..."), "LOS GEHT'S!", Zähler mit `ticks`, mindestens eine Szene mit eigener Grafik.
- **Aufbau**: Hook als Frage (erste 3 s), Intuitions-Falle ("Klar, ..."), Setup mit gleichen Bedingungen, "Los geht's", Zähler laufen, Ergebnis, Warum, Faustregel, Annahme/Einschränkung, Kommentarfrage. Zahlen ausschreiben ("zweiunddreißig"). Schlüsselwörter `*a:..*` (Coral), `*b:..*` (Mint), `*..*` (Gelb). Pro Beat `mood` (neutral, think, watch, cheer, wave) für das Maskottchen.
- **Baukasten** (`engine/kit.js`): `SCENES`, `kTitle`, `kCards`, `kCols`, `kRule`, `kChain`, `kCta`, `kPunch`, Tweens `tw`, Zahlenformat `nf`. Vorlage: `videos/002-rabatt/stage.js`. Lange Texte schrumpfen automatisch auf Bildbreite.
- **Bauen**: `pip install edge-tts faster-whisper numpy` (falls neuer Container), `python3 engine/build.py videos/NNN-name`, Vorschau `node engine/render.mjs videos/NNN-name --only 5,15,25,...` (Standbilder ansehen: Überlappungen, abgeschnittene Texte, Elemente links unten, wo das Maskottchen steht), komplett `node engine/render.mjs videos/NNN-name` oder mehrere nacheinander mit `engine/queue.sh 002-rabatt 003-geburtstag`. Ergebnis: `out/NNN-name.mp4` (1080x1920, 30 fps).
- **Technik prüfen**: MP4, 9:16, 3 bis 600 s, mindestens 360 px, 23 bis 60 fps, unter 1 GB. Layoutregeln: Szene oben, Untertitel bei 1500 px, Maskottchen links unten, rechts nichts (TikTok-Buttons), unten 300 px frei.
- **Stimme**: Edge-Neural `de-DE-KillianNeural`, Rate +8 %, lokal und kostenlos. Im Cloud-Container braucht Edge das Proxy-Zertifikat, das ist in `build.py` bereits gesetzt.
- Das fertige Video dem Nutzer mit SendUserFile zeigen.

## Look (nicht ändern ohne Rückfrage)

Indigo Verlauf, Coral (Seite A), Mint (Seite B), Gelb (Highlights), Schrift Inter ExtraBold/Black, weiße Untertitel-Pille mit farbigem Schlüsselwort, Maskottchen Duelli (gelbes Rundlicht mit Coral/Mint-Wangen). Serienname Alltagsduell. Format der Referenzvideos (Wettlauf, Zähler, Dreh) ist Vorbild, aber nichts davon kopieren: eigene Grafik, eigene Themen, eigener Name.

## Regeln

Nichts ohne Bestätigung im Formular veröffentlichen. Bei Higgsfield nur Upload und TikTok-Tools nutzen, keine Generierung. Keine fremden Bilder oder Musik. Zahlen immer belegt oder nachgerechnet.
