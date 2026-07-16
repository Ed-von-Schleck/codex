// js/domSetup.js
//
// Builds and mutates the workspace DOM (palette, rule forms, drop zones).
// All interaction is handled by the delegated listeners in dragDrop.js,
// so no element here carries listeners of its own.

import { SYMBOL_COLORS, SYMBOL_CHARACTERS, START_SYMBOL } from './constants.js';

function createSymbolElement(symbolId) {
    const el = document.createElement('div');
    const id = String(symbolId);
    el.id = id; // only palette originals keep an id; clones carry just the dataset
    el.dataset.symbolId = id;
    el.className = 'symbol';
    el.textContent = SYMBOL_CHARACTERS[symbolId - 1];
    el.style.backgroundColor = SYMBOL_COLORS[symbolId - 1];
    if (id === START_SYMBOL) el.classList.add('start-symbol');
    el.draggable = true;
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
    clone.classList.remove('selected');
    clone.draggable = interactive;
    return clone;
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
            const lockedSymbol = createSymbolElement(Number(START_SYMBOL));
            lockedSymbol.removeAttribute('id');
            lockedSymbol.draggable = false;
            lockedSymbol.style.cursor = 'default';
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

    symbol.classList.add('hint-placed'); // 1.5 s glow animation (symbols.css)
    setTimeout(() => symbol.classList.remove('hint-placed'), 1500);
    setZoneContent(zone, symbol);
}
