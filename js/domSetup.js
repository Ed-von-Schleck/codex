// js/domSetup.js
//
// Builds and mutates the workspace DOM (palette, rule forms, drop zones).
// All interaction is handled by the delegated listeners in dragDrop.js,
// so no element here carries listeners of its own.

import { SYMBOL_COLORS, SYMBOL_CHARACTERS, START_SYMBOL } from './constants.js';

// Decoration that lives on a palette original for a moment. None of it may
// travel to a clone, or a symbol placed mid-flash keeps the outline forever.
const TRANSIENT_CLASSES = ['selected', 'beckon', 'pulse-success', 'hint-placed'];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Read live, so toggling the OS setting takes effect without a reload. */
export function prefersReducedMotion() {
    return reducedMotion.matches;
}

/**
 * Marks whether a symbol can be picked up. Display-only copies say so in a
 * class rather than relying on their container, so cursor and drag agree.
 */
function setInteractive(el, interactive) {
    el.draggable = interactive;
    el.classList.toggle('symbol--static', !interactive);
}

function createSymbolElement(symbolId, interactive = true) {
    const el = document.createElement('div');
    const id = String(symbolId);
    el.id = id; // only palette originals keep an id; clones carry just the dataset
    el.dataset.symbolId = id;
    el.className = 'symbol';
    el.textContent = SYMBOL_CHARACTERS[symbolId - 1];
    el.style.backgroundColor = SYMBOL_COLORS[symbolId - 1];
    if (id === START_SYMBOL) el.classList.add('start-symbol');
    setInteractive(el, interactive);
    return el;
}

/**
 * Clones a palette symbol. Pass interactive = false for display-only copies
 * (example list, derivation visualizer).
 */
export function cloneSymbol(symbolId, interactive = true) {
    const source = document.getElementById(symbolId);
    if (!source) return null;
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove(...TRANSIENT_CLASSES);
    setInteractive(clone, interactive);
    return clone;
}

// Only used when there is no animation to wait on; keep in step with the
// pulse-success duration in symbols.css.
const PULSE_MS = 1000;

/**
 * Pulses a symbol green for the length of the CSS animation. `extraClass`
 * rides along for the same span (the hint's marker outline). A symbol already
 * mid-pulse is left alone — one placement, one pulse.
 */
export function pulseSuccess(el, extraClass = null) {
    if (!el || el.classList.contains('pulse-success')) return;

    // The glow is motion and drops out under reduced motion. The hint's marker
    // outline is not motion, and stays either way — it says where the hint went.
    const animate = !prefersReducedMotion();
    const classes = [...(animate ? ['pulse-success'] : []), ...(extraClass ? [extraClass] : [])];
    if (classes.length === 0) return;

    el.classList.add(...classes);
    const clear = () => el.classList.remove(...classes);
    // animationend keeps the duration declared in the CSS alone.
    if (animate) el.addEventListener('animationend', clear, { once: true });
    else setTimeout(clear, PULSE_MS);
}

/** Pulses whatever symbol a zone holds — feedback for a validating placement. */
export function pulseZoneSymbol(zone) {
    pulseSuccess(zone?.querySelector('.symbol'));
}

/** Replaces a drop zone's content and notifies the validator. */
export function setZoneContent(zone, el = null) {
    zone.innerHTML = '';
    if (el) zone.appendChild(el);
    zone.dispatchEvent(new CustomEvent('grammarChanged', { bubbles: true }));
}

export function setupPalette(symbolCount) {
    const palette = document.getElementById('symbol-palette');
    palette.innerHTML = '';
    for (let i = 1; i <= symbolCount; i++) {
        palette.appendChild(createSymbolElement(i));
    }
}

/**
 * Rebuilds the rule form grid. The first form's LHS zone is locked to the
 * start symbol.
 */
export function setupRuleForms(ruleCount) {
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = '';

    for (let i = 0; i < ruleCount; i++) {
        const form = document.createElement('div');
        form.className = 'rule-form';
        form.innerHTML =
            '<div class="drop-zone"></div>' +
            '<span class="rule-arrow">&rarr;</span>' +
            '<div class="drop-zone"></div>' +
            '<div class="drop-zone"></div>';

        if (i === 0) {
            const lhsZone = form.querySelector('.drop-zone');
            lhsZone.dataset.locked = 'true';
            const lockedSymbol = createSymbolElement(Number(START_SYMBOL), false);
            lockedSymbol.removeAttribute('id');
            lhsZone.appendChild(lockedSymbol);
        }

        rulesList.appendChild(form);
    }
}

// Slot name → drop-zone index within a rule form
const SLOT_INDEX = { lhs: 0, rhs0: 1, rhs1: 2 };

/**
 * Reads the current symbol from every rule form's drop zones.
 * Returns [{ lhs, rhs0, rhs1 }] — symbol id strings, or null where empty.
 */
export function readFormStates() {
    return Array.from(document.querySelectorAll('.rule-form'), form => {
        const [lhs, rhs0, rhs1] = Array.from(form.querySelectorAll('.drop-zone'),
            zone => zone.children[0]?.dataset.symbolId ?? null);
        return { lhs, rhs0, rhs1 };
    });
}

/**
 * Places a hinted symbol: { formIndex, slot, symbolId }.
 * Replaces whatever the target zone holds and flashes the hint glow.
 */
export function applyHintToDOM({ formIndex, slot, symbolId }) {
    const form = document.querySelectorAll('.rule-form')[formIndex];
    const zone = form?.querySelectorAll('.drop-zone')[SLOT_INDEX[slot]];
    if (!zone || zone.dataset.locked) return;

    const symbol = cloneSymbol(symbolId);
    if (!symbol) return;

    // Pulse before inserting: setZoneContent validates synchronously, and a
    // hinted symbol that completes a rule would otherwise be pulsed twice.
    pulseSuccess(symbol, 'hint-placed');
    setZoneContent(zone, symbol);
}
