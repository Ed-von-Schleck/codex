// js/beckon.js
//
// Idle "beckon": after a few seconds of true idle on an untouched board,
// flash the first palette symbol with the selection outline, then flash the
// first empty unlocked zone with the selection glow — demonstrating
// select→place as two taps, using only the visual vocabulary the real
// interaction produces. Classes + timers only; nothing travels or is cloned.

import { prefersReducedMotion } from './domSetup.js';
import { ui } from './ui.js';

const IDLE_DELAY_MS  = 3000;
const ZONE_LAG_MS    = 400;
const FLASH_MS       = 600;
const REARM_DELAY_MS = 10000;
const MAX_RUNS       = 3;

let idleTimer = null;
let runs = 0;

function flash(el) {
    if (!el) return;
    el.classList.add('beckon');
    setTimeout(() => el.classList.remove('beckon'), FLASH_MS);
}

/**
 * Only demonstrate on an untouched board the player can actually see, and
 * only while they have nothing selected — the beckon borrows the selection
 * outline, so it would otherwise point at the wrong symbol.
 */
function shouldBeckon() {
    return !prefersReducedMotion()
        && ui.workspaceOverlay.classList.contains('hidden')
        && !document.body.classList.contains('has-selection')
        && !document.querySelector('.drop-zone:not([data-locked]) .symbol');
}

function arm(delay) {
    clearTimeout(idleTimer);
    if (runs >= MAX_RUNS) return;

    idleTimer = setTimeout(() => {
        // Don't spend a run on a beckon nobody can see; wait for the next idle.
        if (!shouldBeckon()) return;

        flash(document.querySelector('#symbol-palette .symbol'));
        setTimeout(() => {
            flash(document.querySelector('.drop-zone:not([data-locked]):empty'));
        }, ZONE_LAG_MS);

        runs++;
        arm(REARM_DELAY_MS);
    }, delay);
}

export function initBeckon() {
    // Any interaction restarts the idle clock; the beckon fires only on true
    // idle. Once a symbol is placed, shouldBeckon() stays false on its own.
    document.addEventListener('pointerdown', () => arm(IDLE_DELAY_MS));

    // A new game is an untouched board again, so the demonstration is owed
    // afresh — including to the player who idled through it and gave up.
    document.addEventListener('gameStarted', () => {
        runs = 0;
        arm(IDLE_DELAY_MS);
    });

    arm(IDLE_DELAY_MS);
}
