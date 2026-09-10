/* =============================================================================
 * browser.mjs — den Browser finden, egal welche Fassung installiert ist
 * -----------------------------------------------------------------------------
 * Playwright bringt für jede eigene Fassung eine bestimmte Chromium-Nummer mit.
 * Auf dieser Maschine liegt aber eine feste Chromium-Fassung bereit, und die
 * beiden Nummern gehen bei jedem Paketwechsel auseinander — dann bricht jeder
 * Browsertest mit »Executable doesn't exist« ab, obwohl ein Browser da ist.
 *
 * Deshalb hier einmal die Suche, in dieser Reihenfolge:
 *   1. CHROMIUM_PFAD, wenn gesetzt
 *   2. der bereitgestellte Browser unter /opt/pw-browsers/chromium
 *   3. was Playwright selbst mitbringt
 * ========================================================================== */

import { existsSync } from 'node:fs';

const BEREITGESTELLT = '/opt/pw-browsers/chromium';

/** Startoptionen für chromium.launch() — ergänzt den Pfad, wenn nötig. */
export function startOptionen(extra) {
  const opts = Object.assign({}, extra || {});
  if (process.env.CHROMIUM_PFAD) opts.executablePath = process.env.CHROMIUM_PFAD;
  else if (existsSync(BEREITGESTELLT)) opts.executablePath = BEREITGESTELLT;
  return opts;
}
