import re, sys
src, out, hookf, cssf = sys.argv[1:5]
s = open(src, encoding='utf-8').read()
hook = open(hookf, encoding='utf-8').read(); css = open(cssf, encoding='utf-8').read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:80], s.count(a))
    s = s.replace(a, b)
# 1) Folien nach der Beraterkarte entfernen (bleiben unsichtbar im Code, damit nichts bricht)
for sid in ['referenz', 'agenda', 'optionen', 'unterschied', 'partner', 'bestselect', 'optimierung', 'empfehlung', 'kontakt', 'danke']:
    m = re.search(r'<section class="slide (s-[a-z]+)" id="%s"' % sid, s)
    assert m, sid
    s = s[:m.start()] + '<section class="slide-off %s" id="%s"' % (m.group(1), sid) + s[m.end():]
# 2) Folie 2: Kopf und Kommentar
rep('<!-- 2 · Das Finanz-Upgrade: Spielerkarte + sechs Bereiche -->', '<!-- 2 · Beraterkarte Swiss Life Select + vier Reiter mit Folien -->')
rep('id="profil" data-title="Das Finanz-Upgrade" data-chapter="0" data-steps="19">', 'id="profil" data-title="Euer Team von Swiss Life Select" data-chapter="0" data-steps="10">')
rep('<div class="kicker">Beispiel aus der Praxis · Vorher → Nachher</div>\n        <h2 class="hl">Das Finanz-Upgrade</h2>', '<div class="kicker">Sponsoring · Swiss Life Select</div>\n        <h2 class="hl">Euer Team von Swiss Life Select</h2>')
# 3) CSS
i = s.index('</style>'); s = s[:i] + css + s[i:]
# 4) Hook ersetzen
a = s.index('const AREA_DEFAULTS = [')
a = s.rfind('/* ====', 0, a)
b = s.index('/* ===== 23-slides-d.js ===== */')
s = s[:a] + hook + '\n' + s[b:]
# 5) Standardwerte
rep("  sound: false, lite: false, chOn: {}, hidden: [], layout: 3,\n};",
    "  pfKicker: 'Sponsoring · Swiss Life Select', pfTitel: 'Euer Team von Swiss Life Select', bcFuss: 'Finanzkanzlei für Swiss Life Select',\n"
    "  b1Name: '', b1Rolle: 'Finanzberater', b1Info: '', b2Name: '', b2Rolle: 'Finanzberater', b2Info: '', bereiche: null,\n"
    "  sound: false, lite: false, chOn: {}, hidden: [], layout: 3,\n};")
# 6) Einstellungen
a = s.index('    <h4>Beispielperson (Karte)</h4>'); b = s.index('    <h4>Inhalte</h4>')
s = s[:a] + '''    <h4>Beraterkarte</h4>
    <label>Zeile über der Überschrift<input data-set="pfKicker" placeholder="z. B. Sponsoring · Swiss Life Select"></label>
    <label>Überschrift<input data-set="pfTitel" placeholder="z. B. Euer Team von Swiss Life Select"></label>
    <div class="set-person">
      <div class="set-row"><label>Berater 1 – Name<input data-set="b1Name" placeholder="leer = Platzhalter"></label><label>Rolle<input data-set="b1Rolle" placeholder="z. B. Finanzberater"></label></div>
      <label>Zusatz (max. 3 Zeilen)<textarea data-set="b1Info" rows="2" placeholder="z. B. Spezialist für Immobilien"></textarea></label>
    </div>
    <div class="set-person">
      <div class="set-row"><label>Berater 2 – Name<input data-set="b2Name" placeholder="leer = Platzhalter"></label><label>Rolle<input data-set="b2Rolle" placeholder="z. B. Finanzberater"></label></div>
      <label>Zusatz (max. 3 Zeilen)<textarea data-set="b2Info" rows="2"></textarea></label>
    </div>
    <label>Zeile unten auf der Karte<input data-set="bcFuss" placeholder="z. B. Finanzkanzlei für Swiss Life Select in Köln"></label>
    <p class="set-note">Fotos der Berater: unten unter „Bilder austauschen“ → „Foto Berater 1 / 2“.</p>
    <h4>Die vier Reiter</h4>
    <p class="set-note">Jeder Reiter klappt beim Präsentieren auf und zeigt seine Folien nacheinander – ein Klick pro Folie, danach klappt er wieder zu. Folien als Bild einfügen (PNG/JPG, auch per Ziehen &amp; Ablegen), Reihenfolge mit ‹ ›.</p>
    <div class="set-areas"></div>
    <div class="set-actions"><button type="button" data-act="reset-profil">Reiter auf Standard zurücksetzen</button></div>

''' + s[b:]
# 7) Bildliste
a = s.index('const IMG_LABELS = {'); b = s.index('};', a) + 2
s = s[:a] + "const IMG_LABELS = {\n  berater1: 'Foto Berater 1', berater2: 'Foto Berater 2', 'held-fussball': 'Titelbild (Sport)', 'held-chor': 'Titelbild (Chor)',\n};" + s[b:]
# 8) Referenten-Notiz
a = s.index("  profil: 'Das Finanz-Upgrade"); b = s.index("\n", a)
s = s[:a] + "  profil: 'Beim Betreten: Walkout – Swiss Life Select × euer Verein, dann erscheint die Beraterkarte.\\nVier Reiter: Swiss Life Select, Immobilien, Finanzkommissar, 11TeamSports. Klick öffnet den nächsten Reiter, jeder weitere Klick zeigt die nächste Folie, danach klappt er zu.\\nNach dem letzten Reiter: Finale.'," + s[b:]
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s))
