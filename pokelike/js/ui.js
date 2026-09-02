/* =============================================================================
 * ui.js — Bausteine für die Oberfläche
 * -----------------------------------------------------------------------------
 * Kleine, wiederverwendbare Teile: Elemente bauen, Sprites laden, Typenchips,
 * KP-Balken, Pokémon-Karten, Dialoge und Hinweise. Kein Spielwissen — nur
 * Darstellung.
 * ========================================================================== */
(function (root) {
  'use strict';

  var PL = root.PL || (root.PL = {});
  var dex = PL.dex, mons = PL.mon, T = PL.t;
  var doc = root.document;

  /* ---------- Elemente -------------------------------------------------------- */

  function el(tag, props, kids) {
    var node = doc.createElement(tag), k;
    if (typeof props === 'string') { props = { className: props }; }
    for (k in props || {}) {
      if (k === 'text') node.textContent = props[k];
      else if (k === 'html') node.innerHTML = props[k];
      else if (k === 'className') node.className = props[k];
      else if (k === 'style' && typeof props[k] === 'object') Object.assign(node.style, props[k]);
      else if (k.slice(0, 2) === 'on' && typeof props[k] === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), props[k]);
      } else if (props[k] !== null && props[k] !== undefined && props[k] !== false) {
        node.setAttribute(k, props[k] === true ? '' : props[k]);
      }
    }
    append(node, kids);
    return node;
  }

  function append(node, kids) {
    if (kids === null || kids === undefined || kids === false) return node;
    if (Array.isArray(kids)) { kids.forEach(function (c) { append(node, c); }); return node; }
    node.appendChild(typeof kids === 'string' || typeof kids === 'number'
      ? doc.createTextNode(String(kids)) : kids);
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }

  /* ---------- Sprites ---------------------------------------------------------
   * Die Bilder liegen bei Showdown und PokeAPI. Schlägt eine Adresse fehl,
   * rückt automatisch die nächste nach; ganz am Ende steht eine gezeichnete
   * Kugel, damit nie ein kaputtes Bild stehen bleibt.
   * -------------------------------------------------------------------------- */

  var TYPE_COLOR = {
    Normal: '#9fa19f', Fire: '#e8613c', Water: '#4a90d9', Electric: '#e2c73f', Grass: '#5cb85c',
    Ice: '#6fd3e0', Fighting: '#c0392b', Poison: '#9b59b6', Ground: '#cba54a', Flying: '#8ba7e8',
    Psychic: '#e8558f', Bug: '#8cb020', Rock: '#b09040', Ghost: '#6a5acd', Dragon: '#6f52e0',
    Dark: '#5a4a44', Steel: '#8a9aa8', Fairy: '#e79ad0'
  };

  function placeholder(sp) {
    var c = TYPE_COLOR[sp && sp.t ? sp.t[0] : 'Normal'] || '#888';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<circle cx="32" cy="32" r="26" fill="' + c + '" opacity="0.35"/>' +
      '<circle cx="32" cy="32" r="26" fill="none" stroke="' + c + '" stroke-width="3"/>' +
      '<path d="M6 32h52" stroke="' + c + '" stroke-width="3"/>' +
      '<circle cx="32" cy="32" r="8" fill="#fff" stroke="' + c + '" stroke-width="3"/></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function sprite(monOrSpecies, opts) {
    opts = opts || {};
    var mon = monOrSpecies && monOrSpecies.sp !== undefined ? monOrSpecies : null;
    var sp = mon ? dex.sp(mon.sp) : monOrSpecies;
    var chain = PL.sprite.chain(sp, { shiny: opts.shiny || (mon && mon.shiny), back: opts.back });
    chain = chain.concat([placeholder(sp)]);
    var i = 0;
    var img = el('img', {
      className: 'sprite ' + (opts.className || ''),
      src: chain[0], alt: T.species(sp), loading: opts.eager ? 'eager' : 'lazy', draggable: 'false'
    });
    img.addEventListener('error', function () {
      i++;
      if (i < chain.length) img.src = chain[i];
    });
    return img;
  }

  /* ---------- Chips und Balken -------------------------------------------------- */

  function typeChip(type, small) {
    return el('span', {
      className: 'type-chip' + (small ? ' small' : ''),
      style: { background: TYPE_COLOR[type] || '#777' },
      text: T.type(type), title: type
    });
  }

  function hpBar(cur, max, opts) {
    opts = opts || {};
    var frac = max > 0 ? Math.max(0, cur / max) : 0;
    var tone = frac > 0.5 ? 'good' : frac > 0.2 ? 'warn' : 'bad';
    var fill = el('i', { className: 'hp-fill ' + tone, style: { width: (frac * 100).toFixed(1) + '%' } });
    var bar = el('div', { className: 'hp-bar' + (opts.thin ? ' thin' : '') }, fill);
    bar.setFraction = function (c, m) {
      var f = m > 0 ? Math.max(0, c / m) : 0;
      fill.style.width = (f * 100).toFixed(1) + '%';
      fill.className = 'hp-fill ' + (f > 0.5 ? 'good' : f > 0.2 ? 'warn' : 'bad');
    };
    return bar;
  }

  function expBar(mon) {
    var frac = mons.expProgress(mon);
    return el('div', { className: 'exp-bar' }, el('i', { style: { width: (frac * 100).toFixed(1) + '%' } }));
  }

  function statusChip(status) {
    if (!status) return null;
    return el('span', { className: 'status-chip st-' + status, text: T.statusShort(status), title: T.status(status) });
  }

  function genderMark(g) {
    if (g === 'M') return el('span', { className: 'gender male', text: '♂' });
    if (g === 'F') return el('span', { className: 'gender female', text: '♀' });
    return null;
  }

  /* ---------- Pokémon-Karten ----------------------------------------------------- */

  /**
   * Kompakte Karte für Team-Leisten und Auswahllisten.
   * opts: { onClick, selected, showStats, faintable, badge }
   */
  function monCard(mon, opts) {
    opts = opts || {};
    var sp = dex.sp(mon.sp), max = mons.maxHP(mon);
    var card = el('button', {
      className: 'mon-card' + (opts.selected ? ' selected' : '') + (mon.hp <= 0 ? ' fainted' : '') +
        (opts.className ? ' ' + opts.className : ''),
      type: 'button',
      onclick: opts.onClick || null,
      disabled: opts.disabled || false
    }, [
      el('div', { className: 'mon-card-art' }, [
        sprite(mon, { className: 'mon-card-sprite' }),
        mon.shiny ? el('span', { className: 'shiny-mark', text: '✦', title: 'Schillernd' }) : null,
        opts.badge ? el('span', { className: 'card-badge', text: opts.badge }) : null
      ]),
      el('div', { className: 'mon-card-body' }, [
        el('div', { className: 'mon-card-head' }, [
          el('strong', { text: mons.name(mon) }),
          genderMark(mon.gender),
          el('span', { className: 'lvl', text: 'Lv ' + mon.lvl })
        ]),
        el('div', { className: 'mon-card-types' }, sp.t.map(function (t) { return typeChip(t, true); })),
        hpBar(mon.hp, max, { thin: true }),
        el('div', { className: 'mon-card-hp' }, [
          el('span', { text: mon.hp + ' / ' + max }),
          statusChip(mon.status)
        ])
      ])
    ]);
    return card;
  }

  /** Ausführliche Ansicht mit Werten, Attacken und Herkunft. */
  function monDetail(mon, opts) {
    opts = opts || {};
    var sp = dex.sp(mon.sp), st = mons.stats(mon), max = st[0];
    var nature = dex.nature(mon.nat);
    var peak = Math.max.apply(null, st);
    var rows = PL.STATS.map(function (key, i) {
      var mod = nature && nature.p === key ? '+' : nature && nature.m === key ? '−' : '';
      var pct = peak > 0 ? st[i] / peak : 0;
      return el('div', { className: 'stat-row' }, [
        el('span', { className: 'stat-name', text: T.statShort(key) + mod }),
        el('span', { className: 'stat-value', text: st[i] }),
        el('div', { className: 'stat-bar' }, el('i', {
          className: mod === '+' ? 'up' : mod === '−' ? 'down' : '',
          style: { width: (pct * 100).toFixed(0) + '%' }
        })),
        el('span', { className: 'stat-sub', text: 'DW ' + mon.ivs[i] + ' · FP ' + mon.evs[i] })
      ]);
    });

    return el('div', { className: 'mon-detail' }, [
      el('div', { className: 'mon-detail-head' }, [
        el('div', { className: 'mon-detail-art' }, [
          sprite(mon, { eager: true, className: 'big' }),
          mon.shiny ? el('span', { className: 'shiny-mark big', text: '✦' }) : null
        ]),
        el('div', {}, [
          el('h3', {}, [mons.name(mon), genderMark(mon.gender)]),
          el('div', { className: 'muted', text: sp.n + (sp.dn && sp.dn !== sp.n ? '' : '') + ' · Nr. ' + sp.num }),
          el('div', { className: 'mon-detail-types' }, sp.t.map(function (t) { return typeChip(t); })),
          el('div', { className: 'mon-detail-line' }, [
            el('span', { text: 'Level ' + mon.lvl }),
            el('span', { text: 'KP ' + mon.hp + '/' + max }),
            statusChip(mon.status)
          ]),
          hpBar(mon.hp, max),
          el('div', { className: 'mon-detail-line small' }, [
            el('span', { text: 'Wesen ' + T.nature(mon.nat) }),
            el('span', { text: 'Fähigkeit ' + mon.ab }),
            el('span', {}, [el('span', { text: 'Tera ' }), typeChip(mon.tera, true)])
          ]),
          el('div', { className: 'mon-detail-line small' }, [
            el('span', { text: 'Gegenstand: ' + (mon.item ? PL.items.label(mon.item) : '—') }),
            el('span', { text: 'Freundschaft ' + (mon.friendship || 0) })
          ]),
          el('div', { className: 'exp-line' }, [
            expBar(mon),
            el('span', { className: 'muted', text: mon.lvl >= 100 ? 'max.' : (mons.expToNext(mon) + ' EP bis Level ' + (mon.lvl + 1)) })
          ])
        ])
      ]),
      el('div', { className: 'mon-detail-cols' }, [
        el('div', { className: 'stat-block' }, rows),
        el('div', { className: 'move-block' }, mon.moves.map(function (slot, i) {
          return moveRow(slot, { onClick: opts.onMove ? function () { opts.onMove(i); } : null });
        }))
      ])
    ]);
  }

  var CAT_ICON = { P: '💥', S: '✨', T: '🌀' };
  var CAT_NAME = { P: 'Physisch', S: 'Spezial', T: 'Status' };

  function moveRow(slot, opts) {
    opts = opts || {};
    var m = dex.move(slot.m || slot.move || slot);
    var pp = slot.pp !== undefined ? slot.pp : null;
    var maxPP = m.pp + (slot.ppUp || 0) * Math.floor(m.pp / 5);
    return el(opts.onClick ? 'button' : 'div', {
      className: 'move-row' + (opts.className ? ' ' + opts.className : ''),
      type: opts.onClick ? 'button' : null,
      onclick: opts.onClick || null,
      title: T.moveDesc(m)
    }, [
      el('span', { className: 'move-type', style: { background: TYPE_COLOR[m.t] }, text: T.type(m.t) }),
      el('span', { className: 'move-name', text: m.n }),
      el('span', { className: 'move-cat', text: CAT_ICON[m.c], title: CAT_NAME[m.c] }),
      el('span', { className: 'move-power', text: m.c === 'T' ? '—' : m.bp }),
      pp !== null ? el('span', { className: 'move-pp' + (pp === 0 ? ' empty' : ''), text: pp + '/' + maxPP }) : null
    ]);
  }

  /* ---------- Dialoge und Hinweise ------------------------------------------------ */

  var overlay = null;

  function ensureOverlay() {
    if (!overlay) overlay = $('#overlay');
    return overlay;
  }

  /**
   * Modal mit Titel, Inhalt und Schaltflächen.
   * actions: [{ label, onClick, primary, danger, close }]
   */
  function modal(opts) {
    var host = ensureOverlay();
    var box = el('div', { className: 'modal' + (opts.wide ? ' wide' : '') }, [
      opts.title ? el('h2', { className: 'modal-title', text: opts.title }) : null,
      el('div', { className: 'modal-body' }, opts.content),
      opts.actions ? el('div', { className: 'modal-actions' }, opts.actions.map(function (a) {
        return el('button', {
          className: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : ''),
          type: 'button',
          onclick: function () {
            if (a.onClick) a.onClick();
            if (a.close !== false) close();
          }
        }, a.label);
      })) : null
    ]);
    var back = el('div', { className: 'modal-back' }, box);
    if (opts.dismissable !== false) {
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
    }
    host.appendChild(back);
    host.classList.add('active');
    var focusable = box.querySelector('button, [tabindex]');
    if (focusable) focusable.focus();

    function close() {
      if (back.parentNode) back.parentNode.removeChild(back);
      if (!host.querySelector('.modal-back')) host.classList.remove('active');
      if (opts.onClose) opts.onClose();
    }
    box.close = close;
    back.close = close;
    return back;
  }

  function confirm(text, onYes, opts) {
    opts = opts || {};
    return modal({
      title: opts.title || 'Sicher?',
      content: el('p', { text: text }),
      actions: [
        { label: opts.yes || 'Ja', primary: true, danger: opts.danger, onClick: onYes },
        { label: opts.no || 'Abbrechen' }
      ]
    });
  }

  var toastHost = null;
  function toast(text, kind) {
    if (!toastHost) {
      toastHost = el('div', { className: 'toast-host' });
      doc.body.appendChild(toastHost);
    }
    var node = el('div', { className: 'toast' + (kind ? ' ' + kind : ''), text: text });
    toastHost.appendChild(node);
    root.setTimeout(function () { node.classList.add('out'); }, 2600);
    root.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 3200);
    return node;
  }

  /* ---------- Sonstiges ------------------------------------------------------------ */

  function money(n) { return Math.round(n).toLocaleString('de-DE') + ' ₽'; }

  function itemRow(item, opts) {
    opts = opts || {};
    return el(opts.onClick ? 'button' : 'div', {
      className: 'item-row' + (opts.className ? ' ' + opts.className : ''),
      type: opts.onClick ? 'button' : null,
      onclick: opts.onClick || null,
      disabled: opts.disabled || false
    }, [
      el('span', { className: 'item-icon', text: opts.icon || itemIcon(item) }),
      el('div', { className: 'item-text' }, [
        el('strong', { text: item.name + (opts.count > 1 ? ' ×' + opts.count : '') }),
        el('span', { className: 'muted', text: item.desc || '' })
      ]),
      opts.price !== undefined ? el('span', { className: 'item-price', text: money(opts.price) }) : null,
      opts.right || null
    ]);
  }

  var KIND_ICON = { ball: '🔴', heal: '🧪', status: '💊', boost: '📈', hold: '🎒', evo: '💠', tm: '💿', special: '⭐' };
  function itemIcon(item) {
    if (item.berry) return '🍒';
    if (item.mega) return '💎';
    return KIND_ICON[item.kind] || '📦';
  }

  PL.ui = {
    el: el, append: append, clear: clear, $: $,
    sprite: sprite, placeholder: placeholder,
    typeChip: typeChip, hpBar: hpBar, expBar: expBar, statusChip: statusChip, genderMark: genderMark,
    monCard: monCard, monDetail: monDetail, moveRow: moveRow,
    modal: modal, confirm: confirm, toast: toast,
    money: money, itemRow: itemRow, itemIcon: itemIcon,
    TYPE_COLOR: TYPE_COLOR, CAT_ICON: CAT_ICON, CAT_NAME: CAT_NAME
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
