/* =============================================================================
 * symbole.js — Emoji werden zu gezeichneten Zeichen
 * -----------------------------------------------------------------------------
 * Erzeugt von tools/build-font.mjs. Nicht von Hand ändern.
 *
 * Im Spielcode steht weiter das Emoji — dort liest es sich am besten. Beim
 * Anzeigen wird es gegen das Zeichen aus unserer Schrift getauscht. Getauscht
 * wird nur, was auf den Bildschirm geht: Was das Spiel verschickt oder
 * speichert, behält das echte Emoji.
 * ========================================================================== */
(function (root) {
  'use strict';
  var PL = root.PL || (root.PL = {});

  var TABELLE = {
    "🔴": "",
    "🌟": "",
    "☆": "",
    "🔥": "",
    "💀": "",
    "⚡": "",
    "💚": "",
    "💥": "",
    "🌀": "",
    "✨": "",
    "☰": "",
    "👥": "",
    "🎒": "",
    "🏛": "",
    "💰": "",
    "👑": "",
    "👤": "",
    "🤖": "",
    "⏸": "",
    "📅": "",
    "🎁": "",
    "💾": "",
    "📋": "",
    "📈": "",
    "⚙": "",
    "🌿": "",
    "🎽": "",
    "⚔": "",
    "🛒": "",
    "🧢": "",
    "❓": "",
    "🏅": "",
    "🏆": "",
    "🧪": "",
    "💊": "",
    "📦": "",
    "💿": "",
    "🏃": "",
    "💠": "",
    "🔄": "",
    "🔗": "",
    "🗑": "",
    "✎": "",
    "🔒": "",
    "🔎": "",
    "🧭": "",
    "☁": "",
    "⚠": "",
    "🌐": "",
    "☀": "",
    "🌤": "",
    "💱": "",
    "🪆": "",
    "🥚": "",
    "💎": "",
    "💪": "",
    "🧰": "",
    "🩹": "",
    "🍀": "",
    "🔨": "",
    "📘": "",
    "🎯": "",
    "⏱": "",
    "🕯": "",
    "🍒": "",
    "🤝": "",
    "🗺": "",
    "🎗": "",
    "⛑": "",
    "💍": "",
    "📶": "",
    "🍯": "",
    "🍞": "",
    "💳": "",
    "🏋": "",
    "🔮": "",
    "🚑": "",
    "🍬": "",
    "🧣": "",
    "🎮": "",
    "🖼": "",
    "📤": "",
    "🎲": "",
    "🪦": "",
    "✝": "",
    "🪙": "",
    "♂": "",
    "♀": "",
    "⬆": "",
    "⬇": "",
    "⤵": "",
    "🔵": "",
    "⚪": "",
    "🟣": "",
    "🫱": "",
    "⭐": "",
    "★": "",
    "✦": "",
    "🔁": "",
    "⟳": "",
    "↔": "",
    "📗": "",
    "📙": "",
    "📚": "",
    "🕰": "",
    "⌚": "",
    "🏵": "",
    "🎖": "",
    "🧿": "",
    "🛡": "",
    "🤲": "",
    "🍭": "",
    "🗾": "",
    "🧾": "",
    "⛺": "",
    "🏕": "",
    "🌧": "",
    "⛅": "",
    "📊": "",
    "📉": "",
    "⏹": "",
    "✏": "",
    "📝": "",
    "🔍": "",
    "♻": "",
    "🔃": ""
  };

  // Ein Ausdruck über alle Schlüssel, längste zuerst — damit ein Zeichen mit
  // Variantenwähler nicht halb stehen bleibt.
  var schluessel = Object.keys(TABELLE).sort(function (a, b) { return b.length - a.length; });
  var muster = new RegExp(schluessel.map(function (z) {
    return z.replace(/[.*+?^${}()|[]\]/g, '\$&');
  }).join('|'), 'g');

  /** Tauscht jedes bekannte Emoji gegen das gezeichnete Zeichen. */
  function ersetze(text) {
    if (text === null || text === undefined) return text;
    var s = String(text);
    // Variantenwähler mitnehmen: '🏛️' ist '🏛' plus U+FE0F.
    return s.replace(muster, function (t) { return TABELLE[t]; }).replace(/️/g, '');
  }

  PL.symbole = { tabelle: TABELLE, ersetze: ersetze };
  if (typeof module !== 'undefined' && module.exports) module.exports = PL.symbole;
})(typeof globalThis !== 'undefined' ? globalThis : this);
