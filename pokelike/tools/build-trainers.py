#!/usr/bin/env python3
"""
build-trainers.py — holt die echten Trainerbilder aus den Spielen

Erzeugt data/trainers.js: die Bilder aller 72 Arenaleiter, 31 Top-Vier-Mitglieder
und 9 Champs, dazu die 20 gewöhnlichen Trainerklassen und vier Rückenansichten
für die eigene Figur — alle als Base64-PNG eingebettet, damit die Einzeldatei
auch ohne Netz läuft.

    python3 tools/build-trainers.py

Quellen (beide werden flach und ohne Blobs geklont, dann nur der Bilderordner
ausgecheckt):

  smogon/sprites     src/_uncategorized/{,non}canonical/trainers/<gen>/<spiel>/
                     Die Trainerbilder von Pokémon Showdown, direkt aus den
                     Spielen. Genommen wird jeweils der jüngste Auftritt einer
                     Figur — Rot aus HeartGold sieht besser aus als Rot aus Rot.
  pret/pokeemerald   graphics/trainers/back_pics/
                     Rückenansichten für die eigene Figur. Das sind Bildstreifen
                     mit mehreren Posen; genommen wird die erste.

Warum Python und nicht Node wie die übrigen Werkzeuge: hier muss zugeschnitten
und der durchsichtige Rand abgeschnitten werden, und dafür gibt es in dieser
Umgebung nur Pillow. Das Skript läuft selten — beim Spielen wird nur die
fertige data/trainers.js gebraucht.

Die Bilder gehören Nintendo/Game Freak; sie stecken hier wie die Pokémon-Sprites
nur für den privaten, nicht kommerziellen Gebrauch drin.
"""
import base64
import io
import json
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, '.trainer-quellen')
SM = os.path.join(WORK, 'sprites')
PE = os.path.join(WORK, 'pokeemerald')

# Jüngster Auftritt zuerst: die späteren Spiele zeichnen größer und bunter.
ORDER = [
    'gen7/sun-moon', 'gen6/omegaruby-alphasapphire', 'gen6/x-y',
    'gen5/black2-white2', 'gen5/black-white',
    'gen4/heartgold-soulsilver', 'gen4/platinum', 'gen4/diamond-pearl',
    'gen3/emerald', 'gen3/firered-leafgreen', 'gen3/ruby-sapphire',
    'gen2/crystal', 'gen2/gold-silver', 'gen1/yellow', 'gen1/red-blue',
]

# Galar und Paldea gibt es in keiner Quelle, die von hier erreichbar ist, und
# ein paar ältere Figuren fehlen auch. Für sie steht die Trainerklasse ein, die
# ihnen am nächsten kommt — ein echtes Spielbild statt einer Zufallsfigur.
STAND_IN = {
    'Lt. Surge': 'gen4/heartgold-soulsilver/Lt._Surge',
    'Tate & Liza': 'gen5/black2-white2/Tate',
    'Grant': 'gen7/sun-moon/Young_Athlete',
    # Galar
    'Milo': 'gen4/diamond-pearl/Rancher',
    'Nessa': 'gen5/black-white/Swimmer~F',
    'Kabu': 'gen5/black-white/Striker',
    'Bea': 'gen5/black-white/Battle_Girl',
    'Allister': 'gen4/diamond-pearl/Ninja_Boy',
    'Opal': 'gen4/diamond-pearl/Lady',
    'Melony': 'gen4/diamond-pearl/Skier~F',
    'Piers': 'gen5/black-white/Musician',
    'Marnie': 'gen4/diamond-pearl/Idol',
    'Bede': 'gen5/black-white/Rich_Boy',
    'Raihan': 'gen5/black-white/Ace_Trainer',
    'Leon': 'gen5/black-white/Veteran',
    # Paldea
    'Katy': 'gen5/black-white/Baker',
    'Brassius': 'gen5/black-white/Artist',
    'Iono': 'gen5/black-white/Dancer',
    'Kofu': 'gen5/black-white/Fisherman',
    'Larry': 'gen7/sun-moon/Office_Worker',
    'Ryme': 'gen4/heartgold-soulsilver/Medium',
    'Tulip': 'gen5/black-white/Psychic~F',
    'Grusha': 'gen4/heartgold-soulsilver/Boarder',
    'Rika': 'gen5/black-white/Ace_Trainer~F',
    'Poppy': 'gen5/black-white/Preschooler~F',
    'Hassel': 'gen5/black-white/Gentleman',
    'Geeta': 'gen5/black-white/Veteran~F',
    # Kalos-Champ
    'Diantha': 'gen5/black-white/Socialite',
}

# Die zwanzig gewöhnlichen Trainerklassen aus world.js
CLASSES = {
    'Käfersammler': 'gen4/diamond-pearl/Bug_Catcher',
    'Angler': 'gen5/black-white/Fisherman',
    'Schwimmerin': 'gen5/black-white/Swimmer~F',
    'Wanderer': 'gen5/black-white/Hiker',
    'Ruinenmaniac': 'gen4/diamond-pearl/Ruin_Maniac',
    'Schülerin': 'gen5/black-white/School_Kid~F',
    'Rowdy': 'gen5/black-white/Roughneck',
    'Vogelfänger': 'gen4/diamond-pearl/Bird_Keeper',
    'Ninjajunge': 'gen4/diamond-pearl/Ninja_Boy',
    'Psycho': 'gen5/black-white/Psychic',
    'Gentleman': 'gen5/black-white/Gentleman',
    'Zwillinge': 'gen5/black-white/Twins',
    'Feuerwehrmann': 'gen4/heartgold-soulsilver/Firebreather',
    'Skaterin': 'gen5/black-white/Cyclist~F',
    'Wanderforscher': 'gen5/black-white/Backpacker',
    'Team-Rüpel': 'gen5/black-white/Plasma_Grunt',
    'Drachenzähmer': 'gen4/diamond-pearl/Dragon_Tamer',
    'Ass-Trainerin': 'gen5/black-white/Ace_Trainer~F',
    'Ass-Trainer': 'gen5/black-white/Ace_Trainer',
    'Veteranin': 'gen5/black-white/Veteran~F',
    # Der Rivale bekommt ein eigenes Gesicht.
    'Rivale': 'gen5/black-white/Hilbert',
}

# Rückenansichten: vier Figuren zur Wahl.
BACKS = {
    'rot': 'red', 'blatt': 'leaf', 'brix': 'brendan', 'maike': 'may',
}


def run(cmd, cwd=None):
    subprocess.run(cmd, cwd=cwd, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def fetch():
    """Beide Quellen flach holen — nur die Bilderordner, nicht die ganze Historie."""
    os.makedirs(WORK, exist_ok=True)
    if not os.path.isdir(os.path.join(SM, '.git')):
        print('Hole smogon/sprites …')
        run(['git', 'clone', '--depth', '1', '--filter=blob:none', '--no-checkout',
             'https://github.com/smogon/sprites.git', SM])
        run(['git', 'sparse-checkout', 'init', '--cone'], cwd=SM)
        run(['git', 'sparse-checkout', 'set',
             'src/_uncategorized/canonical/trainers',
             'src/_uncategorized/noncanonical/trainers'], cwd=SM)
        run(['git', 'checkout'], cwd=SM)
    if not os.path.isdir(os.path.join(PE, '.git')):
        print('Hole pret/pokeemerald …')
        run(['git', 'clone', '--depth', '1', '--filter=blob:none', '--no-checkout',
             'https://github.com/pret/pokeemerald.git', PE])
        run(['git', 'sparse-checkout', 'init', '--cone'], cwd=PE)
        run(['git', 'sparse-checkout', 'set', 'graphics/trainers'], cwd=PE)
        run(['git', 'checkout'], cwd=PE)


def sprite_path(rel):
    """Ein Pfad wie 'gen5/black-white/Elesa' in einen echten Dateipfad auflösen."""
    for kind in ('canonical', 'noncanonical'):
        p = os.path.join(SM, 'src', '_uncategorized', kind, 'trainers', rel + '.png')
        if os.path.exists(p):
            return p
    return None


def newest(name):
    """Das jüngste Bild einer Figur — oder None."""
    key = name.replace(' ', '_').replace('.', '')
    for gen in ORDER:
        p = sprite_path(gen + '/' + key)
        if p:
            return p
    return None


def encode(img):
    """Durchsichtigen Rand abschneiden und als knappes PNG ausgeben."""
    img = img.convert('RGBA')
    box = img.getbbox()
    if box:
        img = img.crop(box)
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return base64.b64encode(buf.getvalue()).decode('ascii'), img.width, img.height


def leader_names():
    """Die Namen holt sich das Skript aus dem Spiel selbst — eine Quelle genügt."""
    out = subprocess.run(
        ['node', '-e',
         "require('./js/leaders.js');"
         "const L=PL.leaders;"
         "console.log(JSON.stringify(Object.keys(L.all)"
         ".concat(Object.keys(L.elite)).concat(Object.keys(L.champions))));"],
        cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip())


def main():
    fetch()
    names = leader_names()
    front, sizes, missing, source = {}, {}, [], {}

    for name in names:
        path = None
        if name in STAND_IN:
            path = sprite_path(STAND_IN[name])
            source[name] = 'Ersatz: ' + STAND_IN[name]
        if not path:
            path = newest(name)
            if path:
                source[name] = 'echt'
        if not path:
            missing.append(name)
            continue
        data, w, h = encode(Image.open(path))
        front[name] = data
        sizes[name] = [w, h]

    for label, rel in CLASSES.items():
        path = sprite_path(rel)
        if not path:
            missing.append(label)
            continue
        data, w, h = encode(Image.open(path))
        front[label] = data
        sizes[label] = [w, h]

    # Rückenansichten: Bildstreifen mit mehreren Posen, genommen wird die erste.
    back, backSizes = {}, {}
    for label, file in BACKS.items():
        p = os.path.join(PE, 'graphics', 'trainers', 'back_pics', file + '.png')
        if not os.path.exists(p):
            missing.append('Rücken: ' + label)
            continue
        img = Image.open(p)
        frame = img.crop((0, 0, img.width, img.width))     # quadratisch = eine Pose
        data, w, h = encode(frame)
        back[label] = data
        backSizes[label] = [w, h]

    payload = {'v': 1, 'f': front, 'fs': sizes, 'b': back, 'bs': backSizes}
    js = ('/* Automatisch erzeugt von tools/build-trainers.py — nicht von Hand ändern.\n'
          '   Trainerbilder aus den Spielen (smogon/sprites, pret/pokeemerald),\n'
          '   eingebettet als Base64. Rechte bei Nintendo/Game Freak; hier nur\n'
          '   privat und nicht kommerziell. */\n'
          '(function (root) {\n'
          "  'use strict';\n"
          '  root.PL_TRAINERS = ' + json.dumps(payload, ensure_ascii=False) + ';\n'
          '})(typeof globalThis !== \'undefined\' ? globalThis : this);\n')
    out = os.path.join(ROOT, 'data', 'trainers.js')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(js)

    echt = sum(1 for n in names if source.get(n) == 'echt')
    print('Figuren:      %d von %d (%d echt, %d Ersatzklasse)'
          % (len(front) - len(CLASSES), len(names), echt, len(names) - echt - len(missing)))
    print('Klassen:      %d' % len(CLASSES))
    print('Rücken:       %d' % len(back))
    if missing:
        print('FEHLT:        ' + ', '.join(missing))
    print('Geschrieben:  data/trainers.js (%.2f MB)' % (len(js) / 1048576))


if __name__ == '__main__':
    sys.exit(main())
