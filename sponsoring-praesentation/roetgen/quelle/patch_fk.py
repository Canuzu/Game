import sys, base64, glob, os, json
hp, fkjs, webdir, out = sys.argv[1:5]
s = open(hp, encoding='utf-8').read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep("""  { t: 'Finanzkommissar', sub: 'Der Finanz-Check für eure Mitglieder', c: '#7C3AED', i: 'search' },""",
    """  { t: 'Finanzkommissar', sub: 'Netzwerk von Beamten für Beamte', c: '#0B9BD6', i: 'shield', html: 'fk1, fk2' },""")
rep("""  a.pages = [...a.liveNr.map((nr) => ({ live: nr - 1, n: LIVE.slides[nr - 1].steps, title: LIVE.slides[nr - 1].title })), ...a.slides.map((id) => ({ img: id, n: 1 }))];""",
    """  a.htmlIds = String(a.html || '').split(/[^\\w]+/).filter((id) => CUSTOM_PAGES[id]);
  a.pages = [...a.liveNr.map((nr) => ({ live: nr - 1, n: LIVE.slides[nr - 1].steps, title: LIVE.slides[nr - 1].title })),
    ...a.htmlIds.map((id) => ({ html: id, n: 1, title: CUSTOM_PAGES[id].title })), ...a.slides.map((id) => ({ img: id, n: 1 }))];""")
rep("""const W2 = 450, H2 = 190, P = { x: 580, y: 168, w: 1280, h: 838 };""",
    """const W2 = 450, H2 = 190, P = { x: 190, y: 37, w: 1540, h: 1006 }; // Reiter-Fenster (Karte tritt zurück)""")
rep("""    if (pg.img) return""", """    if (pg.html) return `<div class="ps-slide ps-html">${CUSTOM_PAGES[pg.html].html()}</div>`;
    if (pg.img) return""")
rep("""const LW = 1166, LH = 656, LX = P.x + 28 + (1224 - LW) / 2, LY = P.y + 112 + 26;""",
    """const LW = 1500, LH = 844, LX = P.x + 20, LY = P.y + 112 + 20;""")

imgs = {}
for f in sorted(glob.glob(os.path.join(webdir, '*.webp'))):
    imgs[os.path.basename(f)[:-5]] = 'data:image/webp;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
pre = 'const FK_IMG = ' + json.dumps(imgs) + ';\n' + open(fkjs, encoding='utf-8').read() + '\n'
open(out, 'w', encoding='utf-8').write(pre + s)
print('ok', len(pre))
