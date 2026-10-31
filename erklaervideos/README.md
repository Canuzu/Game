# Alltagsduell: Erklärvideos für TikTok

Komplette Pipeline lokal: Skript, Stimme (Edge-Neural), Animation (SVG in Chromium), Untertitel, Sounds, Schnitt (ffmpeg).
Higgsfield wird nur zum Hochladen und für die TikTok-Veröffentlichung genutzt.

    python3 engine/build.py videos/001-pizza              # Stimme, Timing, Sounds, spec.json
    node engine/render.mjs videos/001-pizza --only 5,20   # Standbilder zur Kontrolle
    node engine/render.mjs videos/001-pizza               # komplettes Video nach out/

Neue Folge: `videos/NNN-name/` mit `script.json` und `stage.js` (Vorlage 001-pizza). Themen: `videos/themen.md`.
Skill für "Poste das nächste": `skill/erklaervideo-naechstes/SKILL.md`.
