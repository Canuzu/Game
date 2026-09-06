/* =============================================================================
 * cloud.js — Spielstand außerhalb des Browsers
 * -----------------------------------------------------------------------------
 * Das Spiel steckt als veröffentlichte Seite in einem Rahmen auf einer fremden
 * Adresse. Manche Browser werfen den Speicher solcher eingebetteten Seiten weg,
 * sobald der Tab zugeht — dann ist der Fortschritt fort, obwohl das Spiel ihn
 * ordentlich abgelegt hat. Dagegen hilft nur ein Speicher, der nicht im Browser
 * liegt.
 *
 * Genau den gibt es, wenn die veröffentlichte Seite die Fähigkeit `db` hat.
 * Dort liegt der komplette Stand als ein Dokument unter einem Spielstand-Code,
 * den der Spieler sich notieren kann. Der Code steht auch im Browser, damit
 * niemand ihn tippen muss, solange der Browser mitspielt; und wenn er es nicht
 * tut, holt der Code den Stand auf jedem Gerät zurück.
 *
 * Gibt es die Fähigkeit nicht — als heruntergeladene Datei, lokal geöffnet,
 * oder solange die Seite öffentlich geteilt ist —, dann meldet sich hier
 * niemand, und das Spiel bleibt beim Speicher des Browsers. Alles hier ist
 * Zugabe: Ohne Wolke läuft das Spiel unverändert weiter.
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});

  var CODE_KEY = 'pokelike.plus.code.v1';
  var COLLECTION = 'spielstaende';
  var PUSH_DELAY = 2500;                 // so lange wird gesammelt, bevor gesendet wird

  // Ohne I, O, 0 und 1: Der Code wird abgetippt, und die verwechselt man.
  var ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  var db = null;            // null = noch nicht da, false = gibt es hier nicht
  var ready = null;         // das Versprechen, das den Zustand klärt
  var codes = {};           // je Profil ein Code
  var timer = null;
  var busy = false;
  var pending = false;
  var listeners = [];
  var lastPush = 0;

  /* ---------- 1) Code ------------------------------------------------------- */

  function store() {
    try {
      var s = root.localStorage;
      s.setItem('__probe', '1');
      s.removeItem('__probe');
      return s;
    } catch (e) { return null; }
  }

  function randomCode() {
    var n = 11, out = '', i;
    var bytes = new Uint8Array(n);
    try { root.crypto.getRandomValues(bytes); }
    catch (e) { for (i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256); }
    for (i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out.slice(0, 4) + '-' + out.slice(4, 8) + '-' + out.slice(8);
  }

  /** Tippfehlerfreundlich: Kleinbuchstaben, Leerzeichen und fehlende Striche. */
  function normalize(text) {
    var raw = String(text || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
      .replace(/O/g, '0').replace(/I/g, '1');
    // 0 und 1 kommen im Alphabet nicht vor — was so aussieht, war O und I.
    raw = raw.replace(/0/g, 'O').replace(/1/g, 'I');
    var clean = '';
    for (var i = 0; i < raw.length; i++) {
      if (ALPHABET.indexOf(raw[i]) >= 0) clean += raw[i];
    }
    if (clean.length !== 11) return null;
    return clean.slice(0, 4) + '-' + clean.slice(4, 8) + '-' + clean.slice(8);
  }

  /* Jedes Profil hat seinen eigenen Code — sonst überschriebe der zweite
     Spieler am selben Gerät den Stand des ersten. */
  function profileId() {
    try { return (PL.meta && PL.meta.activeProfileId()) || 'p1'; } catch (e) { return 'p1'; }
  }
  function keyFor() {
    var id = profileId();
    return id === 'p1' ? CODE_KEY : CODE_KEY + '.' + id;
  }

  function getCode() {
    var id = profileId();
    if (codes[id]) return codes[id];
    var s = store();
    codes[id] = (s && s.getItem(keyFor())) || null;
    return codes[id];
  }

  function setCode(value) {
    var id = profileId();
    codes[id] = value || null;
    var s = store();
    if (s) {
      try {
        if (codes[id]) s.setItem(keyFor(), codes[id]);
        else s.removeItem(keyFor());
      } catch (e) { /* dann eben nicht */ }
    }
    return codes[id];
  }

  /* ---------- 2) Verbindung ------------------------------------------------- */

  /**
   * Klärt einmal, ob es hier einen Wolkenspeicher gibt. Das Versprechen löst
   * sich immer auf — mit true oder false, nie mit einem Fehler.
   */
  function connect() {
    if (ready) return ready;
    ready = new Promise(function (resolve) {
      if (!root.claude || typeof root.claude.use !== 'function') { db = false; resolve(false); return; }
      var done = false;
      var finish = function (value) {
        if (done) return;
        done = true;
        db = value || false;
        resolve(!!db);
      };
      // Der Betrachter antwortet spätestens nach zehn Sekunden; wenn nicht,
      // wartet das Spiel nicht länger auf ihn.
      root.setTimeout(function () { finish(false); }, 11000);
      try {
        root.claude.use('db').then(finish, function () { finish(false); });
      } catch (e) { finish(false); }
    });
    return ready;
  }

  function available() { return !!db; }

  function doc() {
    if (!db || !getCode()) return null;
    return db.doc(COLLECTION + '/' + getCode());
  }

  /* ---------- 3) Holen und Schreiben ---------------------------------------- */

  /**
   * Holt den Stand aus der Wolke. Liefert { ok, text, blob } — eingespielt
   * wird erst durch den Aufrufer, damit die Oberfläche fragen kann.
   */
  function pull(withCode) {
    return connect().then(function (ok) {
      if (!ok) return { ok: false, text: 'Hier gibt es keinen Wolkenspeicher.' };
      var target = withCode ? normalize(withCode) : getCode();
      if (!target) return { ok: false, text: 'Kein Spielstand-Code vorhanden.' };
      return db.doc(COLLECTION + '/' + target).get().then(function (snap) {
        if (!snap || !snap.exists) {
          return { ok: false, text: 'Zu diesem Code liegt kein Spielstand bereit.' };
        }
        var data = snap.data() || {};
        if (!data.blob) return { ok: false, text: 'Der Spielstand in der Wolke ist unlesbar.' };
        return { ok: true, blob: data.blob, saved: data.saved || 0, code: target };
      }, function (err) {
        return { ok: false, text: 'Die Wolke antwortet nicht (' + (err && err.code) + ').' };
      });
    });
  }

  /** Schreibt den aktuellen Stand. Legt beim ersten Mal einen Code an. */
  function push() {
    return connect().then(function (ok) {
      if (!ok || !PL.meta) return false;
      if (!getCode()) setCode(randomCode());
      var body = {
        v: 1,
        saved: Date.now(),
        blob: PL.meta.exportSave()
      };
      busy = true;
      notify();
      return db.doc(COLLECTION + '/' + getCode()).set(body).then(function () {
        busy = false;
        lastPush = Date.now();
        notify();
        return true;
      }, function () {
        busy = false;
        notify();
        return false;
      });
    });
  }

  /**
   * Merkt vor, dass sich etwas geändert hat. Gesammelt wird ein paar Sekunden,
   * damit nicht jeder Schritt eine eigene Runde durchs Netz dreht.
   */
  function touch() {
    if (db === false) return;
    pending = true;
    if (timer) root.clearTimeout(timer);
    timer = root.setTimeout(function () {
      timer = null;
      pending = false;
      push();
    }, PUSH_DELAY);
  }

  /** Alles Vorgemerkte sofort schreiben — beim Verlassen der Seite. */
  function flush() {
    if (!pending && !timer) return Promise.resolve(false);
    if (timer) { root.clearTimeout(timer); timer = null; }
    pending = false;
    return push();
  }

  /* ---------- 4) Zustand für die Oberfläche --------------------------------- */

  function onChange(fn) { listeners.push(fn); }
  function notify() { listeners.forEach(function (fn) { try { fn(state()); } catch (e) { /* egal */ } }); }

  function state() {
    return {
      available: available(),
      unknown: db === null,
      code: getCode(),
      busy: busy,
      pendingWrite: pending || !!timer,
      lastPush: lastPush
    };
  }

  PL.cloud = {
    connect: connect,
    available: available,
    state: state,
    onChange: onChange,
    code: getCode,
    setCode: setCode,
    newCode: function () { return setCode(randomCode()); },
    normalize: normalize,
    pull: pull,
    push: push,
    touch: touch,
    flush: flush,
    COLLECTION: COLLECTION
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PL.cloud;
})(typeof globalThis !== 'undefined' ? globalThis : this);
