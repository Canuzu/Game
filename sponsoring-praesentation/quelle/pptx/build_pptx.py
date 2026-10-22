"""PowerPoint-Fassung des Sponsoringvorgesprächs (Swiss Life Select).

Texte und Formen sind bearbeitbar, aufwendige Grafiken kommen als Bilder aus der
Web-Präsentation (pptx/render.js). Zwischen allen Folien liegt ein Morph-Übergang:
Objekte mit gleichem Namen (»!!…«) gleiten von Folie zu Folie.

Aufruf (im Ordner quelle/):
    node build.mjs && node pptx/render.js && python3 pptx/build_pptx.py
"""
import copy
import math
import os
from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, 'render')
IMG = os.path.join(HERE, '..', 'assets', 'img')
OUT = os.path.join(HERE, '..', '..', 'Sponsoringvorgespraech.pptx')

RED, RED_DK, BURG = RGBColor(0xD8, 0x20, 0x34), RGBColor(0xA8, 0x17, 0x2B), RGBColor(0x8B, 0x1C, 0x34)
INK, INK2, MUTE, LINE = RGBColor(0x1C, 0x1C, 0x1E), RGBColor(0x3B, 0x3B, 0x3F), RGBColor(0x7A, 0x7A, 0x80), RGBColor(0xD6, 0xD6, 0xDB)
WHITE, PINK, GREEN = RGBColor(0xFF, 0xFF, 0xFF), RGBColor(0xFB, 0xE9, 0xEB), RGBColor(0x2F, 0x8A, 0x4E)
SERIF, SANS = 'Georgia', 'Calibri'


def E(px):
    """Bühnenpixel (1920 × 1080) → EMU."""
    return Emu(int(round(px * 6350)))


def pt(px):
    return Pt(px * 0.5)


prs = Presentation()
prs.slide_width, prs.slide_height = E(1920), E(1080)
BLANK = prs.slide_layouts[6]

# ---------- Hintergrund im Folienmaster ----------
master = prs.slide_master
_, rid = master.part.get_or_add_image_part(os.path.join(R, 'hintergrund.png'))
csld = master._element.find(qn('p:cSld'))
old = csld.find(qn('p:bg'))
if old is not None:
    csld.remove(old)
bg = etree.SubElement(csld, qn('p:bg'))
csld.remove(bg)
csld.insert(0, bg)
bgpr = etree.SubElement(bg, qn('p:bgPr'))
blip = etree.SubElement(etree.SubElement(bgpr, qn('a:blipFill')), qn('a:blip'))
blip.set(qn('r:embed'), rid)
etree.SubElement(blip.getparent(), qn('a:stretch')).append(etree.Element(qn('a:fillRect')))
etree.SubElement(bgpr, qn('a:effectLst'))

# ---------- Hilfsfunktionen ----------
NSMAP = ('xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
         'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
         'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
         'xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"')


def morph(slide, ms=1300):
    xml = (f'<mc:AlternateContent {NSMAP}>'
           '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
           f'<p:transition spd="slow" p14:dur="{ms}"><p159:morph option="byObject"/></p:transition></mc:Choice>'
           '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>')
    el = etree.fromstring(xml)
    sld = slide._element
    ref = sld.find(qn('p:clrMapOvr'))
    ref.addnext(el)


def shadow(shape, blur=46, dist=22, alpha=30, color='000000'):
    sppr = shape._element.spPr
    for e in sppr.findall(qn('a:effectLst')):
        sppr.remove(e)
    eff = etree.SubElement(sppr, qn('a:effectLst'))
    sh = etree.SubElement(eff, qn('a:outerShdw'), blurRad=str(int(E(blur))), dist=str(int(E(dist))), dir='5400000', algn='t', rotWithShape='0')
    c = etree.SubElement(sh, qn('a:srgbClr'), val=color)
    etree.SubElement(c, qn('a:alpha'), val=str(alpha * 1000))


def alpha_fill(shape, rgb, alpha):
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb
    clr = shape._element.spPr.find(qn('a:solidFill'))[0]
    etree.SubElement(clr, qn('a:alpha'), val=str(int(alpha * 1000)))


def box(slide, x, y, w, h, fill=None, line=None, lw=2, shape=MSO_SHAPE.RECTANGLE, radius=None, name=None, dash=None):
    s = slide.shapes.add_shape(shape, E(x), E(y), E(w), E(h))
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = E(lw)
        if dash:
            s.line.dash_style = dash
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = min(0.5, radius / min(w, h))
    if name:
        s.name = name
    s.text_frame.text = ''
    etree.SubElement(s._element.spPr, qn('a:effectLst'))  # kein Theme-Schatten; shadow() ersetzt das bei Bedarf
    st = s._element.find(qn('p:style'))
    if st is not None:
        st.find(qn('a:effectRef')).set('idx', '0')
    return s


def pic(slide, path, x, y, w=None, h=None, name=None, rot=0):
    p = slide.shapes.add_picture(path, E(x), E(y), E(w) if w else None, E(h) if h else None)
    if rot:
        p.rotation = rot
    if name:
        p.name = name
    return p


def text(slide, x, y, w, h, lines, size, font=SANS, color=INK, bold=False, italic=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, name=None, spacing=None, line_spacing=None):
    """lines: str oder Liste von Zeilen; jede Zeile str oder Liste von (Text, {Optionen}).
    Optionen: size, font, color, bold, italic, link."""
    tb = slide.shapes.add_textbox(E(x), E(y), E(w), E(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if isinstance(lines, str):
        lines = [lines]
    for i, ln in enumerate(lines):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = align
        if line_spacing:
            para.line_spacing = line_spacing
        runs = [(ln, {})] if isinstance(ln, str) else ln
        for t, o in runs:
            r = para.add_run()
            r.text = t
            f = r.font
            f.name = o.get('font', font)
            f.size = pt(o.get('size', size))
            f.bold = o.get('bold', bold)
            f.italic = o.get('italic', italic)
            f.color.rgb = o.get('color', color)
            if spacing:
                r._r.get_or_add_rPr().set('spc', str(spacing))
            if o.get('link'):
                r.hyperlink.address = o['link']
    if name:
        tb.name = name
    return tb


def notes(slide, t):
    slide.notes_slide.notes_text_frame.text = t


LOGO = os.path.join(R, 'logo.png')


def corner_logo(slide, tab=False):
    if tab:
        b = box(slide, 1742, 930, 178, 150, fill=WHITE, name='Logo-Hintergrund')
        shadow(b, 40, 0, 18)
    pic(slide, LOGO, 1746 if not tab else 1767, 942 if not tab else 948, 128, name='!!logo')


WM = {  # [x, y, Skalierung, Drehung] wie in der Web-Fassung
    'agenda': (-1112, 458, 4.4, 0), 'swisslife': (1030, -634, 4, 0), 'premium': (-620, 566, 4, -6),
    'vergleich': (1072, -446, 3.6, 4), 'finanzierung': (-670, 416, 4, 6), 'bestselect': (-720, 466, 4, -4),
    'hub': (-722, 584, 3.4, 8), 'verein': (1026, -495, 3.8, -4), 'konzept': (-762, 458, 4.4, 4),
    'ausstattung': (1072, -526, 3.6, 6), 'tester': (-720, 466, 4, -6), 'besuch': (1168, -456, 3.4, 4),
    'kommunikation': (1072, 174, 3.6, -8), 'schritte': (-678, 524, 3.6, 4),
}


def watermark(slide, key):
    x, y, s, r = WM[key]
    pic(slide, os.path.join(R, 'band-wasserzeichen.png'), x + 124 * s, y + 42 * s, 212 * s, 210 * s, name='!!band', rot=r)


def kicker(slide, t, color=RED, x=150, y=120):
    box(slide, x, y + 8, 46, 2.5, fill=color, name='!!kline')
    text(slide, x + 62, y, 1200, 30, t.upper(), 19, bold=True, color=color, spacing=400, name='!!kicker')


def title(slide, t, size=80, x=150, y=160, w=1640, h=110, color=INK, name='!!titel', align=PP_ALIGN.LEFT):
    return text(slide, x, y, w, h, t, size, font=SERIF, color=color, name=name, align=align)


def new(key=None, ms=1300):
    s = prs.slides.add_slide(BLANK)
    morph(s, ms)
    if key:
        watermark(s, key)
    return s


def icon(slide, name, color, x, y, size, shape_name=None):
    return pic(slide, os.path.join(R, f'icon-{name}-{color}.png'), x, y, size, size, name=shape_name)


# ======================================================================
# 1 · Titel
# ======================================================================
s = new()
pic(s, LOGO, 675.7, 80.2, 568.7, name='!!logo')
box(s, 900, 640, 120, 3, fill=RED, name='!!kline')
title(s, 'Willkommen zum Sponsoringvorgespräch!', 72, 0, 668, 1920, 100, align=PP_ALIGN.CENTER)
notes(s, 'Begrüßung und kurze Vorstellung. Ziel des Termins: Sponsoring vorstellen, euren Verein kennenlernen, nächste Schritte vereinbaren.')

# ======================================================================
# 2 · Agenda
# ======================================================================
s = new('agenda')
kicker(s, 'Agenda')
title(s, 'Sponsoringvorgespräch')
items = [('I', 'Wir stellen uns vor', 'Swiss Life · Swiss Life Select · Best-Select-System'),
         ('II', 'Wie sieht eure Vereinsstruktur aus?', 'Mitglieder, Mannschaften, Bedarf'),
         ('III', 'Unser Sponsoringkonzept', '1.000 € Ausstattung · mindestens 4 Tester · Übergabe'),
         ('IV', 'Wie geht es weiter?', 'In 5 Schritten zum Sponsoring')]
for i, (n, t, sub) in enumerate(items):
    y = 304 + i * 133
    box(s, 150, y, 920, 1.5, fill=LINE)
    text(s, 150, y + 34, 110, 70, n, 58, font=SERIF, color=RED)
    text(s, 276, y + 26, 790, 50, t, 40, color=INK)
    text(s, 276, y + 80, 790, 34, sub, 23, color=MUTE)
box(s, 150, 304 + 4 * 133, 920, 1.5, fill=LINE)
pic(s, os.path.join(R, 'agenda-fotos.png'), 1080, 80, 800, 940, name='Fotos')
corner_logo(s)
notes(s, 'Ablauf in vier Teilen: erst wir, dann ihr, dann unser Konzept, dann die nächsten Schritte.')

# ======================================================================
# 3/4 · Swiss Life
# ======================================================================
TILES = [(150, 370, 418, 168, RGBColor(0xD2, 0xB0, 0x7B), '1857', '', 'gegründet'),
         (584, 370, 418, 168, RGBColor(0xDD, 0x7E, 0x87), '10 Mrd. ', 'CHF', 'Eigenkapital der Swiss Life-Gruppe'),
         (150, 554, 418, 168, BURG, '250 Mrd. ', 'CHF', 'verwaltetes Vermögen'),
         (584, 554, 418, 168, RGBColor(0xC4, 0x53, 0x2E), '4 Mio.', '', 'Kundinnen und Kunden weltweit')]
for k, karte in enumerate(['europa-grau', 'europa-rot']):
    s = new('swisslife')
    kicker(s, 'I · Wir stellen uns vor')
    title(s, 'Das Unternehmen Swiss Life', 74)
    text(s, 150, 262, 900, 50, 'Finanzkraft und Erfahrung', 36, font=SERIF, italic=True, color=MUTE, name='!!sub')
    for j, (x, y, w, h, c, big, unit, lab) in enumerate(TILES):
        b = box(s, x, y, w, h, fill=c, name=f'!!kachel{j}')
        shadow(b, 40, 18, 22)
        text(s, x, y + 30, w, 70, [[(big, {}), (unit, {'size': 35})]], 62, font=SERIF, color=WHITE, align=PP_ALIGN.CENTER, name=f'!!kz{j}')
        text(s, x + 20, y + 106, w - 40, 40, lab, 24, color=WHITE, align=PP_ALIGN.CENTER, name=f'!!kl{j}')
    b = box(s, 150, 738, 852, 150, fill=RGBColor(0x67, 0x68, 0x6C), name='!!kachel4')
    shadow(b, 40, 18, 22)
    text(s, 150, 770, 852, 34, 'gehört zu den', 24, color=WHITE, align=PP_ALIGN.CENTER, name='!!kl4a')
    text(s, 150, 808, 852, 50, 'größten Immobilienbesitzern der Schweiz', 36, bold=True, color=WHITE, align=PP_ALIGN.CENTER, name='!!kl4b')
    pic(s, os.path.join(R, karte + '.png'), 990, 100, 910, 850, name='!!karte')
    corner_logo(s)
    notes(s, ['Finanzkraft und Erfahrung der Swiss Life-Gruppe: gegründet 1857, Hauptsitz Zürich, 10 Mrd. CHF Eigenkapital, '
              '250 Mrd. CHF verwaltetes Vermögen, 4 Mio. Kundinnen und Kunden, einer der größten Immobilienbesitzer der Schweiz.',
              'Swiss Life in Europa: Schweiz, Deutschland, Frankreich, Österreich, Luxemburg, Liechtenstein, Tschechien, Slowakei und Großbritannien.'][k])

# ======================================================================
# 5 · Premiummarke
# ======================================================================
s = new('premium')
kicker(s, 'I · Wir stellen uns vor')
title(s, 'Eine Premiummarke')
text(s, 150, 280, 800, 50, 'Swiss Life Select', 36, bold=True, name='!!sub')
for x, n, lab, w in [(150, '35+', 'Jahre Erfahrung', 220), (380, '1,6 Mio.', 'Kunden', 420), (810, '300+', 'Standorte', 260)]:
    text(s, x, 410, w, 110, n, 100, font=SERIF, color=RED)
    text(s, x, 524, w, 40, lab, 26, color=INK2)
for i, t in enumerate(['Persönliche Best-Select-Beratung', 'Partner in allen Finanzfragen']):
    y = 620 + i * 70
    box(s, 150, y, 46, 46, fill=RED, shape=MSO_SHAPE.OVAL)
    icon(s, 'check', 'weiss', 156, y + 6, 34)
    text(s, 214, y + 2, 700, 46, t, 33, color=INK)
pic(s, os.path.join(R, 'deutschland.png'), 1150, 80, 690, 920, name='!!karte')
corner_logo(s)
notes(s, 'Swiss Life Select in Deutschland: über 35 Jahre Erfahrung, 1,6 Millionen Kunden, über 300 Standorte. Persönliche Best-Select-Beratung, Partner in allen Finanzfragen.')

# ======================================================================
# 6–8 · Institute / Vergleichsportale → Swiss Life Select
# ======================================================================
import json
ITEMS = {'A1': ('pin', 'persönliche Beratung'), 'A2': ('advisor', 'Service & dauerhafte Betreuung'), 'A3': ('x', 'begrenzte Produktpalette'),
         'B1': ('doc', 'große Produktpalette mit hohem Digitalisierungsgrad'), 'B2': ('x', 'kein Service & dauerhafte Betreuung'),
         'B3': ('x', 'keine persönliche Beratung')}
START = {'A1': (220, 600), 'A2': (220, 690), 'A3': (220, 780), 'B1': (1180, 600), 'B2': (1180, 690), 'B3': (1180, 780)}
FINAL = {'A1': (155, 748), 'A2': (700, 748), 'B1': (1245, 748)}
ORDER = ['A1', 'A2', 'B1']  # jede Stärke trägt einen Bogen des Bandes (oben → unten)
BOEGEN = json.load(open(os.path.join(R, 'boegen.json')))
LBX, LBY, LK = 770, 322, 380 / 436


def vw_row(slide, k, pos, final=False):
    ic, t = ITEMS[k]
    x, y = pos
    con = k in ('A3', 'B2', 'B3')
    bg = box(slide, x, y, 520, 78, fill=WHITE if final else (RGBColor(0xFD, 0xF0, 0xF2) if con else RGBColor(0xF5, 0xF5, 0xF7)),
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=16, name=f'!!rb{k}')
    if final:
        shadow(bg, 50, 26, 30, '8B1C34')
    box(slide, x + 14, y + 14, 50, 50, fill=RED if (con or final) else PINK, shape=MSO_SHAPE.OVAL, name=f'!!rc{k}')
    icon(slide, ic, 'weiss' if (con or final) else 'rot', x + 24, y + 24, 30, f'!!ri{k}')
    text(slide, x + 82, y, 420, 78, t, 25, bold=True, color=RED_DK if con else INK, anchor=MSO_ANCHOR.MIDDLE, name=f'!!rt{k}')


def bogen(slide, n, final):
    vx, vy, vw, vh = BOEGEN[n]
    w, h = vw * LK, vh * LK
    fx, fy = LBX + (vx - 12) * LK, LBY + (vy - 40) * LK
    if final:
        pic(slide, os.path.join(R, f'bogen-{n + 1}.png'), fx, fy, w, h, name=f'!!bogen{n}')
    else:  # klein und verdreht hinter dem Symbol der zugehörigen Stärke
        rx, ry = START[ORDER[n]]
        f = 0.12
        pic(slide, os.path.join(R, f'bogen-{n + 1}.png'), rx + 39 - w * f / 2, ry + 39 - h * f / 2, w * f, h * f, name=f'!!bogen{n}', rot=240)


for stage in range(3):
    s = new('vergleich', 1800 if stage == 2 else 1000)
    kicker(s, 'I · Wir stellen uns vor')
    if stage < 2:
        title(s, 'Institute oder Vergleichsportale?', 70)
        for nm, cx, t, sub in [('a', 160, 'Institute', 'BANKEN · VERSICHERER · BAUSPARKASSEN'), ('b', 1120, 'Vergleichsportale', 'ONLINE-VERGLEICHSRECHNER')]:
            card = box(s, cx, 288, 640, 642, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=26, name=f'!!karte{nm}')
            alpha_fill(card, WHITE, 80)
            shadow(card, 80, 40, 22)
            pic(s, os.path.join(R, f'illu-{nm}-{"rot" if stage == 0 else "grau"}.png'), cx + 170, 310, 300, 170, name=f'!!illu{nm}')
            text(s, cx, 494, 640, 46, t, 36, bold=True, align=PP_ALIGN.CENTER, name=f'!!kt{nm}')
            text(s, cx, 544, 640, 26, sub, 16, bold=True, color=MUTE, align=PP_ALIGN.CENTER, spacing=200, name=f'!!ks{nm}')
        o = box(s, 905, 554, 110, 110, fill=WHITE, shape=MSO_SHAPE.OVAL, name='!!oder')
        shadow(o, 40, 20, 30)
        text(s, 905, 554, 110, 110, 'oder', 34, font=SERIF, italic=True, color=RED, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name='!!odert')
        for n in range(3):
            bogen(s, n, False)
        for k in ITEMS:
            if k in ('A3', 'B2', 'B3') and stage == 0:
                continue
            vw_row(s, k, START[k])
    else:
        title(s, 'Swiss Life Select – das Beste aus beiden Welten', 70)
        pic(s, os.path.join(R, 'glow.png'), 740, 165, 440, 500, name='Lichtschein')
        for n in range(3):
            bogen(s, n, True)
        pic(s, os.path.join(R, 'schriftzug.png'), LBX, LBY + (252 - 40) * LK, 436 * LK, 166 * LK, name='Schriftzug')
        for k in ORDER:
            vw_row(s, k, FINAL[k], final=True)
    corner_logo(s)
    notes(s, ['Frage in die Runde: Wo holt ihr euch heute Finanzrat? Institute (Banken, Versicherer) beraten persönlich, Vergleichsportale bieten große Auswahl.',
              'Die Kehrseite: Institute haben eine begrenzte Produktpalette, Vergleichsportale keine persönliche Beratung und keine dauerhafte Betreuung.',
              'Swiss Life Select verbindet das Beste aus beiden Welten: Aus den drei Stärken – persönliche Beratung, Service und dauerhafte Betreuung, große Produktpalette mit hohem Digitalisierungsgrad – setzt sich unser Logo zusammen.'][stage])

# ======================================================================
# 9 · Finanzierungen
# ======================================================================
s = new('finanzierung')
kicker(s, 'I · Wir stellen uns vor')
title(s, 'Finanzierungen', w=640)
text(s, 150, 290, 600, 180, 'Wir vergleichen für euch die Angebote führender Banken und Förderinstitute – und finden die Finanzierung, die wirklich passt.', 30, color=INK2, line_spacing=1.2)
pill = box(s, 150, 470, 290, 62, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=31, name='Video')
shadow(pill, 30, 10, 22)
box(s, 166, 484, 34, 34, fill=RED, shape=MSO_SHAPE.OVAL)
text(s, 214, 484, 220, 34, [[('Erklärvideo ansehen', {'link': 'https://www.youtube.com/watch?v=1AS6czWoVOU'})]], 22, bold=True, anchor=MSO_ANCHOR.MIDDLE)
BANKS = [('NRW.BANK', '1B4F9C', 300, 10, 1.0), ('ING', 'FF6200', 740, 60, 1.35), ('Commerzbank', 'FFC20E', 20, 150, 1.2),
         ('Deutsche Bank', '0018A8', 520, 210, 1.15), ('Sparkasse', 'FF0000', 140, 330, 1.45), ('Hanseatic Bank', 'E30613', 640, 380, 1.0),
         ('Volksbanken Raiffeisenbanken', '0066B3', 40, 500, 0.95), ('Santander', 'EC0000', 600, 540, 1.25), ('Postbank', 'FFCC00', 230, 650, 1.3),
         ('DSL Bank', 'A4123F', 700, 700, 1.05), ('PSD Bank', '00843D', 20, 790, 1.05), ('KfW', '005A8C', 430, 800, 1.3)]
for n, c, x, y, sc in BANKS:
    fs = 30 * sc
    w = 24 + 30 + 18 + len(n) * fs * 0.53 + 32
    h = fs + 44
    X, Y = 800 + x, 90 + y
    card = box(s, X, Y, w, h, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=18, name=f'Bank {n}')
    shadow(card, 50, 24, 25)
    box(s, X + 24, Y + h / 2 - 15, 30, 30, fill=RGBColor.from_string(c), shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=8)
    text(s, X + 72, Y, w - 72, h, n, fs, bold=True, color=RGBColor(0x1F, 0x24, 0x30), anchor=MSO_ANCHOR.MIDDLE)
corner_logo(s)
notes(s, 'Finanzierungen: Wir vergleichen die Angebote vieler Banken und Förderinstitute (z. B. KfW, NRW.BANK). Optional Erklärvideo.')

# ======================================================================
# 10 · Best-Select-System
# ======================================================================
s = new('bestselect')
kicker(s, 'I · Wir stellen uns vor')
title(s, 'Best-Select-System', w=760)
text(s, 150, 290, 640, 200, [[('Ein Ansprechpartner – rund 90 Produktpartner.', {'bold': True, 'color': INK})],
                             'Aus Versicherungen, Banken, Bausparkassen und Investmenthäusern wählen wir für euch die beste Lösung aus.'],
     30, color=INK2, line_spacing=1.2)
pill = box(s, 150, 510, 290, 62, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=31, name='Video')
shadow(pill, 30, 10, 22)
box(s, 166, 524, 34, 34, fill=RED, shape=MSO_SHAPE.OVAL)
text(s, 214, 524, 220, 34, [[('Erklärvideo ansehen', {'link': 'https://www.youtube.com/watch?v=1AS6czWoVOU'})]], 22, bold=True, anchor=MSO_ANCHOR.MIDDLE)
pic(s, os.path.join(R, 'kugel.png'), 900, 60, 960, 960, name='!!grafik')
corner_logo(s)
notes(s, 'Best-Select-System: rund 90 Produktpartner, ein Ansprechpartner. Wir wählen für euch die beste Lösung aus.')

# ======================================================================
# 11 · Alles aus einer Hand
# ======================================================================
s = new('hub')
kicker(s, 'I · Wir stellen uns vor')
title(s, 'Alles aus einer Hand', 64)
pic(s, os.path.join(R, 'hub.png'), 150, 190, 1620, 860, name='!!grafik')
corner_logo(s)
notes(s, 'Alles aus einer Hand: Finanzen & Versicherung, Sponsoring, Expats-Beratung, Kooperation mit dbb beamtenbund und tarifunion, Immobilien Einkommen, Finanzierungen über Interhyp, Firmenberatung, Investment.')

# ======================================================================
# 12 · Und jetzt ihr?
# ======================================================================
s = new('verein')
kicker(s, 'II · Eure Vereinsstruktur')
title(s, 'Und jetzt ihr? Wie ist euer Verein aufgestellt?', 66)
QS = [('I', 'Wie viele Mitglieder?', ''), ('II', 'Wie viele Mannschaften?', ''), ('III', 'Wie ist der Altersdurchschnitt?', ''),
      ('IV', 'Wer waren eure bisherigen Sponsoringpartner?', ''), ('V', 'Was braucht ihr gerade am meisten?', '(Taschen, Trikots, Trainingsanzüge …)'),
      ('VI', 'Wer war bislang Sponsor? Gibt es jemanden aus unserer Branche?', '(Mannschaft/Verein)')]
for i, (n, q, sub) in enumerate(QS):
    x = 150 if i < 3 else 978
    y = 318 + (i % 3) * 196
    card = box(s, x, y, 792, 176, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=16, name=f'Frage {n}')
    shadow(card, 40, 16, 16)
    text(s, x + 32, y + 26, 80, 60, n, 46, font=SERIF, color=RED)
    text(s, x + 122, y + 26, 640, 80, q, 31, bold=True)
    if sub:
        text(s, x + 122, y + (100 if len(q) > 40 else 66), 640, 34, sub, 23, color=MUTE)
    box(s, x + 122, y + 150, 640, 1.5, fill=RGBColor(0xCF, 0xCF, 0xD4))
text(s, 150, 974, 620, 30, 'DIESE VEREINE UNTERSTÜTZEN WIR BEREITS', 18, bold=True, color=MUTE, spacing=200)
x = 760
for n in ['VfL Berghausen-Gimborn', 'The Wizards · 1. BBC Düren', 'SV Linde 1957', 'SpVg Porz 1919', 'Sportfreunde Hörn']:
    w = len(n) * 11.5 + 60
    p = box(s, x, 962, w, 50, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=25)
    text(s, x, 962, w, 50, n, 20, bold=True, color=INK2, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    x += w + 12
    if x > 1500:
        break
corner_logo(s)
notes(s, 'Jetzt seid ihr dran: Fragen nacheinander stellen und Antworten notieren.')

# ======================================================================
# 13 · Unser Sponsoringkonzept
# ======================================================================
s = new('konzept')
kicker(s, 'III · Unser Sponsoringkonzept')
title(s, ['Unser', 'Sponsoringkonzept'], 80, h=200, w=820)
FEAT = [('euro', '1.000 € Ausstattung', 'für euren Verein – über 11teamsports'),
        ('people', 'Mindestens 4 Tester', 'aus euren Reihen lernen unsere Beratung kennen'),
        ('hand', 'Persönliche Übergabe', 'bei euch vor Ort – mit Foto für eure Kanäle')]
for i, (ic, b, t) in enumerate(FEAT):
    y = 400 + i * 118
    c = box(s, 150, y, 84, 84, fill=RED, shape=MSO_SHAPE.OVAL)
    shadow(c, 30, 14, 30, 'D82034')
    icon(s, ic, 'weiss', 170, y + 20, 44)
    text(s, 260, y + 6, 640, 40, b, 32, bold=True)
    text(s, 260, y + 46, 640, 36, t, 25, color=MUTE)
pic(s, os.path.join(R, 'anzeige.png'), 990, 70, 900, 940, name='!!grafik')
notes(s, 'Unser Sponsoringkonzept: 1.000 € Ausstattung über 11teamsports, Gegenleistung: mindestens 4 Tester, persönliche Übergabe vor Ort.')
corner_logo(s)

# ======================================================================
# 14 · 1.000 € über 11teamsports
# ======================================================================
s = new('ausstattung')
kicker(s, 'III · Unser Sponsoringkonzept')
text(s, 142, 150, 760, 230, [[('1.000', {}), (' €', {'size': 120})]], 210, font=SERIF, color=RED, name='!!titel')
text(s, 1000, 250, 760, 120, [[('Ausstattung über ', {}), ('11teamsports', {'bold': True, 'color': INK}), (' – ihr sucht aus, wir bestellen.', {})]], 38, color=INK2)
for i in range(3):
    pic(s, os.path.join(R, f'produkt-{i + 1}.png'), 120 + i * 557, 410, 567, 570, name=f'Produkt {i + 1}')
text(s, 150, 1000, 1200, 40, '… natürlich mit eurem Vereinslogo – und unserem.', 30, font=SERIF, italic=True, color=MUTE)
corner_logo(s)
notes(s, '1.000 € über 11teamsports: Der Verein sucht aus (Trikots, Taschen, Trainingsanzüge …). Wir bestellen und bringen die Ware vorbei.')

# ======================================================================
# 15–17 · (Mindestens) 4 Tester
# ======================================================================
for stage in range(3):
    s = new('tester')
    kicker(s, 'III · Unser Sponsoringkonzept')
    title(s, '(Mindestens) 4 Tester', 66, w=840)
    text(s, 150, 290, 680, 90, 'Mindestens vier Mitglieder lernen unsere Beratung kennen – ganz unverbindlich.', 28, color=INK2, line_spacing=1.2, name='!!lead')
    for j in range(4):
        box(s, 150 + j * 94, 404, 78, 78, fill=RED, shape=MSO_SHAPE.OVAL, name=f'!!tester{j}')
        icon(s, 'advisor', 'weiss', 164 + j * 94, 418, 50, f'!!testi{j}')
    text(s, 540, 414, 200, 60, '4/4 ✓', 44, font=SERIF, color=RED, name='!!count')
    for j, (ic, lab, val, w) in enumerate([('calendar', 'ALTER', '18–35 Jahre', 264), ('brief', 'BERUF', 'sollten Vollzeit arbeiten', 408)]):
        x = 150 + j * 282
        c = box(s, x, 524, w, 98, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=16, name=f'!!krit{j}')
        shadow(c, 40, 16, 18)
        icon(s, ic, 'rot', x + 22, 549, 48, f'!!kriti{j}')
        text(s, x + 88, 542, w - 96, 24, lab, 15, bold=True, color=MUTE, spacing=300, name=f'!!kritl{j}')
        text(s, x + 88, 566, w - 96, 40, val, 28, bold=True, name=f'!!kritv{j}')
    if stage == 0:
        p = pic(s, os.path.join(IMG, 'berater-buero.jpg'), 900, 140, 900, 672, name='!!rechts', rot=1.5)
        p.line.color.rgb = WHITE
        p.line.width = E(10)
        shadow(p, 60, 30, 35)
    else:
        pic(s, os.path.join(R, 'tester-app.png' if stage == 1 else 'tester-vorteil.png'), 860, 80, 1000, 880, name='!!rechts')
    if stage == 2:
        b = box(s, 520, 905, 880, 110, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=55, line=RGBColor(0xC6, 0xE0, 0xCE), lw=2, name='Niemand')
        shadow(b, 50, 22, 30, '2F8A4E')
        box(s, 546, 929, 62, 62, fill=GREEN, shape=MSO_SHAPE.OVAL)
        icon(s, 'check', 'weiss', 558, 941, 38)
        text(s, 630, 905, 760, 110, 'Niemand muss Kunde werden!', 44, font=SERIF, bold=True, italic=True, color=GREEN, anchor=MSO_ANCHOR.MIDDLE)
    corner_logo(s)
    notes(s, ['Mindestens 4 Tester: Alter 18–35, sollten Vollzeit arbeiten.',
              'So sieht die Analyse aus (Beispiel Altersvorsorge): Versorgungsziel, Versorgungslücke und unser Lösungsvorschlag.',
              'Beispielhafter Vorteil: im Schnitt 5.000 € in fünf Jahren. Und ganz wichtig: Niemand muss Kunde werden!'][stage])

# ======================================================================
# 18 · Besuch im Vereinsheim
# ======================================================================
s = new('besuch')
kicker(s, 'III · Unser Sponsoringkonzept')
title(s, 'Wir kommen mit den Artikeln bei euch im Vereinsheim vorbei und stellen uns allen vor …', 60, h=150)
pic(s, os.path.join(R, 'collage.png'), 100, 340, 1760, 660, name='!!grafik')
corner_logo(s)
notes(s, 'Übergabe vor Ort: Wir kommen mit den Artikeln ins Vereinsheim und stellen uns allen vor – mit Fotos für eure Kanäle.')

# ======================================================================
# 19 · Kanzlei
# ======================================================================
s = new()
pic(s, os.path.join(IMG, 'koeln-ausblick.jpg'), -5, 0, 1930, 1080, name='!!grafik')
shade = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, E(1920), E(1080))
shade.line.fill.background()
shade.name = 'Verlauf'
sppr = shade._element.spPr
for e in sppr.findall(qn('a:solidFill')):
    sppr.remove(e)
grad = etree.fromstring(
    '<a:gradFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" rotWithShape="1"><a:gsLst>'
    '<a:gs pos="0"><a:srgbClr val="080C16"><a:alpha val="74000"/></a:srgbClr></a:gs>'
    '<a:gs pos="34000"><a:srgbClr val="080C16"><a:alpha val="36000"/></a:srgbClr></a:gs>'
    '<a:gs pos="60000"><a:srgbClr val="080C16"><a:alpha val="0"/></a:srgbClr></a:gs>'
    '<a:gs pos="100000"><a:srgbClr val="080C16"><a:alpha val="30000"/></a:srgbClr></a:gs>'
    '</a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>')
sppr.find(qn('a:prstGeom')).addnext(grad)
kicker(s, 'III · Unser Sponsoringkonzept', color=WHITE)
title(s, 'Oder ihr besucht uns in unserer Kanzlei über Köln …', 84, w=1400, h=200, color=WHITE)
card = box(s, 150, 930, 520, 90, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=18, line=RGBColor(0xFF, 0xFF, 0xFF), lw=1.2, name='Adresse')
alpha_fill(card, WHITE, 16)
icon(s, 'pin', 'weiss', 172, 951, 48)
text(s, 236, 944, 420, 36, 'Finanzkanzlei für Swiss Life Select', 28, bold=True, color=WHITE)
text(s, 236, 982, 420, 30, 'Köln', 22, color=WHITE)
corner_logo(s, tab=True)
notes(s, 'Alternativ: Termin in unserer Kanzlei über Köln.')

# ======================================================================
# 20 · Kommunikation
# ======================================================================
s = new('kommunikation')
kicker(s, 'III · Unser Sponsoringkonzept')
title(s, 'Kommunikation transparent für alle', 72)
text(s, 150, 254, 1500, 50, 'Eine gemeinsame WhatsApp-Gruppe – alle sind jederzeit auf dem gleichen Stand.', 32, font=SERIF, italic=True, color=MUTE)
pic(s, os.path.join(R, 'telefone.png'), 360, 300, 1200, 780, name='!!grafik')
corner_logo(s)
notes(s, 'Eine gemeinsame WhatsApp-Gruppe: Bestellstatus, Termine, Übergabe – alles transparent für alle.')

# ======================================================================
# 21–26 · Fünf Schritte
# ======================================================================
C, RAD = (960, 628), 282
ANG = [-90, -18, 54, 126, 198]
STEPS = [('thumb', 'Ihr stimmt euch ab.\nPasst alles?', 'r'), ('hand', 'Wir kommen zum Training oder Spiel vorbei.', 'r'),
         ('people', 'Mindestens 4 Tester testen uns.', 'r'), ('bag', 'Wir bestellen eure Ware.', 'l'),
         ('present', 'Wir kommen vorbei und stellen uns der gesamten Mannschaft vor.', 'l')]
s = new('schritte')
text(s, 0, 482, 1920, 120, 'Weitere Vorgehensweise in 5 Schritten', 88, font=SERIF, align=PP_ALIGN.CENTER, name='!!titel')
corner_logo(s)
notes(s, 'Die nächsten Schritte – jeder Klick zeigt einen weiteren.')
for active in range(5):
    s = new('schritte', 1000)
    kicker(s, 'IV · Wie geht es weiter?')
    text(s, 150, 160, 1640, 110, 'Weitere Vorgehensweise in 5 Schritten', 72, font=SERIF, name='!!titel')
    base = box(s, C[0] - RAD, C[1] - RAD, 2 * RAD, 2 * RAD, line=RGBColor(0xD3, 0xD3, 0xD8), lw=3, shape=MSO_SHAPE.OVAL, name='!!kreis')
    base.line.dash_style = MSO_LINE_DASH_STYLE.ROUND_DOT
    end = ANG[active] % 360
    if active > 0:
        arc = box(s, C[0] - RAD, C[1] - RAD, 2 * RAD, 2 * RAD, line=RED, lw=5, shape=MSO_SHAPE.ARC, name='!!bogen')
        arc.adjustments[0] = 270 * 0.6
        arc.adjustments[1] = end * 0.6
    a = math.radians(ANG[active])
    box(s, C[0] + math.cos(a) * RAD - 11, C[1] + math.sin(a) * RAD - 11, 22, 22, fill=RED, shape=MSO_SHAPE.OVAL, name='!!komet')
    for i, (ic, t, side) in enumerate(STEPS):
        a = math.radians(ANG[i])
        x, y = C[0] + math.cos(a) * RAD, C[1] + math.sin(a) * RAD
        cur, done = i == active, i < active
        k = 1.14 if cur else 1
        sz = 150 * k
        n = box(s, x - sz / 2, y - sz / 2, sz, sz, fill=RED if cur else (PINK if done else WHITE), shape=MSO_SHAPE.ROUNDED_RECTANGLE,
                radius=28, line=None if cur else RGBColor(0xF3, 0xC4, 0xCA), lw=2, name=f'!!knoten{i}')
        shadow(n, 50 if cur else 40, 24 if cur else 16, 40 if cur else 22, 'D82034' if cur else '000000')
        icon(s, ic, 'weiss' if cur else 'rot', x - 35 * k, y - 35 * k, 70 * k, f'!!symbol{i}')
        bx, by = x + sz / 2 - 34, y - sz / 2 - 12
        box(s, bx, by, 46, 46, fill=WHITE, line=RED, lw=2, shape=MSO_SHAPE.OVAL, name=f'!!nr{i}')
        text(s, bx, by, 46, 46, str(i + 1), 22, bold=True, color=RED, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name=f'!!nrt{i}')
        col = INK if cur else (INK2 if done else RGBColor(0xA6, 0xA6, 0xAB))
        lines = ([[('SCHRITT ' + str(i + 1), {'size': 17, 'bold': True, 'color': RED})]] if cur else []) + t.split('\n')
        lx = x + 110 if side == 'r' else x - 110 - 430
        ly = (y - 50 if i == 0 else y - 34) - (30 if cur else 0)
        text(s, lx, ly, 430, 140, lines, 33, bold=True, color=col, align=PP_ALIGN.LEFT if side == 'r' else PP_ALIGN.RIGHT, name=f'!!label{i}')
    corner_logo(s)
    notes(s, f'Schritt {active + 1}: ' + STEPS[active][1].replace('\n', ' '))

# ======================================================================
# 27/28 · Finale
# ======================================================================
for stage in range(2):
    s = new()
    pic(s, LOGO, 817.8, 122, 284.3, name='!!logo')
    text(s, 160, 450, 1600, 230, 'Sollen wir eure Bewerbung berücksichtigen?', 92, font=SERIF, align=PP_ALIGN.CENTER, name='!!titel')
    if stage == 1:
        text(s, 0, 718, 1920, 80, 'Wir freuen uns auf euch!', 58, font=SERIF, italic=True, bold=True, color=RED, align=PP_ALIGN.CENTER)
        pic(s, os.path.join(R, 'konfetti.png'), 0, 0, 1920, 1080, name='Konfetti')
    notes(s, ['Abschlussfrage stellen – und bewusst eine Pause lassen.', 'Wir freuen uns auf euch!'][stage])

prs.save(OUT)
print('gespeichert:', os.path.relpath(OUT), f'{os.path.getsize(OUT) / 1048576:.1f} MB,', len(prs.slides), 'Folien')
