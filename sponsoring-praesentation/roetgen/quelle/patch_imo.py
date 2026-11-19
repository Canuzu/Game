import sys
hp, out = sys.argv[1:3]
s = open(hp, encoding='utf-8').read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep("""  { t: 'Immobilien', sub: 'Eigenheim, Finanzierung & Kapitalanlage', c: '#0891B2', i: 'house' },""",
    """  { t: 'Immobilien', sub: 'Eigenheim, Finanzierung & Kapitalanlage', c: '#0891B2', i: 'house', html: 'imo1, imo2, hw' },""")
rep("""...a.htmlIds.map((id) => ({ html: id, n: 1, title: CUSTOM_PAGES[id].title }))""",
    """...a.htmlIds.map((id) => ({ html: id, n: CUSTOM_PAGES[id].n || 1, title: CUSTOM_PAGES[id].title }))""")
# Klick-Schritte innerhalb eingebauter Folien
rep("""  function showPanel(k, j, anim, sub = 0) {""", """  function pageStep(k, j, sub, anim) { // Klick-Schritt innerhalb einer eingebauten Folie
    const pg = A[k] && A[k].pages[j]; if (!pg || !pg.html || !CUSTOM_PAGES[pg.html].step) return;
    const cps = $$('.ps-slide .cp', pp), cp = cps[cps.length - 1]; if (cp) CUSTOM_PAGES[pg.html].step(cp, sub, anim);
  }
  function showPanel(k, j, anim, sub = 0) {""")
rep("""    if (pg.live != null) { liveGo(pg.live, sub, anim); liveShow(true, anim ? 520 : 0); } else liveShow(false);
    if (!anim) { pp.classList.add('show'); return; }""", """    if (pg.live != null) { liveGo(pg.live, sub, anim); liveShow(true, anim ? 520 : 0); } else liveShow(false);
    pageStep(k, j, sub, false);
    if (!anim) { pp.classList.add('show'); return; }""")
rep("""    const nu = st.lastElementChild;""", """    const nu = st.lastElementChild; pageStep(k, j, sub, false);""")
rep("""liveGo(A[st.open].pages[st.slide].live, st.sub, true); return; }""",
    """const pg = A[st.open].pages[st.slide]; if (pg.html) pageStep(st.open, st.slide, st.sub, true); else liveGo(pg.live, st.sub, true); return; }""")
# Beraterfotos direkt auf der Karte austauschen
rep("""    return `<div class="bc-p bc-p${n}"><div class="bc-ph">${photo}</div><b class="bc-n">""",
    """    return `<div class="bc-p bc-p${n}"><label class="bc-ph" data-b="${n}" title="Eigenes Foto: klicken oder Bild hierher ziehen">${photo}<input type="file" accept="image/*"><i class="bc-cam">${CAM}<span>Foto ändern</span></i></label>${custom['berater' + n] ? `<button type="button" class="bc-del" data-b="${n}" title="Foto entfernen">×</button>` : ''}<b class="bc-n">""")
rep("""    logoSVG($('.bc-logo', cardBox), { white: 'all', vb: 'full' });
  }""", """    logoSVG($('.bc-logo', cardBox), { white: 'all', vb: 'full' });
    $$('.bc-ph', cardBox).forEach((l) => {
      const n = l.dataset.b;
      $('input', l).addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; e.target.blur(); if (f) setPhoto(n, f); });
      l.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); l.classList.add('drop'); });
      l.addEventListener('dragleave', () => l.classList.remove('drop'));
      l.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); l.classList.remove('drop'); const f = [...e.dataTransfer.files].find((x) => /^image\\//.test(x.type)); if (f) setPhoto(n, f); });
    });
    $$('.bc-del', cardBox).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); setPhoto(b.dataset.b, null); }));
  }
  async function setPhoto(n, f) { // eigenes Beraterfoto speichern (bleibt im Browser erhalten) oder entfernen
    const k = 'berater' + n;
    if (f) await idb.put(k, f);
    else if (typeof FILE !== 'undefined' && FILE && FILE.images && FILE.images[k]) await idb.put(k, null); else await idb.del(k);
    if (custom[k]) URL.revokeObjectURL(custom[k]);
    if (f) custom[k] = URL.createObjectURL(f); else delete custom[k];
    build();
  }""")
rep("""const SILHOUETTE =""", """const CAM = '<svg viewBox="0 0 24 24"><path d="M3 8a2 2 0 0 1 2-2h2.2l1.4-2h6.8l1.4 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/></svg>';
const SILHOUETTE =""")
open(out, 'w', encoding='utf-8').write(s)
print('ok')
