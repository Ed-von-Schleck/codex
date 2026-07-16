// js/domSetup.js

import { SYMBOL_COLORS, SYMBOL_CHARACTERS, START_SYMBOL } from './constants.js';
import { handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop, handleZoneClick } from './dragDrop.js';
import { selectSymbol } from './ui.js';

// ---------------------------------------------------------------------------
// Element factories (internal)
// ---------------------------------------------------------------------------

function createSymbolElement(symbolId) {
    const el = document.createElement('div');
    el.id = String(symbolId);
    el.className = 'symbol';
    el.textContent = SYMBOL_CHARACTERS[symbolId - 1];
    el.style.backgroundColor = SYMBOL_COLORS[symbolId - 1];

    if (el.id === START_SYMBOL) el.classList.add('start-symbol');

    el.draggable = true;
    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);

    el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSymbol(el.id);
    });

    return el;
}

function createDropZone() {
    const zone = document.createElement('div');
    zone.className = 'drop-zone';
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
    zone.addEventListener('click', handleZoneClick);
    return zone;
}

export function createRuleForm() {
    const form = document.createElement('div');
    form.className = 'rule-form';

    const arrow = document.createElement('span');
    arrow.className = 'rule-arrow';
    arrow.innerHTML = '&rarr;';

    form.appendChild(createDropZone()); // zones[0] = lhs
    form.appendChild(arrow);
    form.appendChild(createDropZone()); // zones[1] = rhs0
    form.appendChild(createDropZone()); // zones[2] = rhs1

    return form;
}

// ---------------------------------------------------------------------------
// Palette & rule forms
// ---------------------------------------------------------------------------

/**
 * Rebuilds the symbol palette for the given difficulty symbol count.
 * Must be called BEFORE setupRuleForms — the rule form builder clones
 * the start-symbol element directly from the live palette.
 */
export function setupPalette(symbolCount) {
    const palette = document.getElementById('symbol-palette');
    palette.innerHTML = '';
    for (let i = 1; i <= symbolCount; i++) {
        palette.appendChild(createSymbolElement(i));
    }
}

/**
 * Rebuilds the rule form grid for the given number of rules.
 * The first form's LHS zone is locked to the start symbol (symbol 1).
 */
export function setupRuleForms(ruleCount) {
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = '';

    if (ruleCount === 0) return;

    const startSymbolEl = document.getElementById(START_SYMBOL);

    for (let i = 0; i < ruleCount; i++) {
        const form = createRuleForm();

        if (i === 0) {
            const lhsZone      = form.querySelector('.drop-zone');
            const lockedSymbol = startSymbolEl.cloneNode(true);

            lockedSymbol.draggable    = false;
            lockedSymbol.style.cursor = 'default';

            lhsZone.dataset.locked = 'true';
            lhsZone.removeEventListener('dragover', handleDragOver);
            lhsZone.removeEventListener('drop', handleDrop);
            lhsZone.appendChild(lockedSymbol);
        }

        rulesList.appendChild(form);
    }
}

// ---------------------------------------------------------------------------
// Hint support
// ---------------------------------------------------------------------------

// Slot name → drop-zone index within a rule form
const SLOT_INDEX = { lhs: 0, rhs0: 1, rhs1: 2 };

/**
 * Reads the current symbol values from every rule form's drop zones.
 *
 * Returns an array of objects: { lhs, rhs0, rhs1 }
 *   - Each value is a symbol ID string (e.g. '2') or null if the zone is empty.
 *   - Form 0's lhs is always START_SYMBOL (the locked zone is always filled).
 */
export function readFormStates() {
    const forms = document.querySelectorAll('.rule-form');
    return Array.from(forms).map((form, i) => {
        const zones = form.querySelectorAll('.drop-zone');
        return {
            lhs:  i === 0 ? START_SYMBOL : (zones[0]?.children[0]?.id ?? null),
            rhs0: zones[1]?.children[0]?.id ?? null,
            rhs1: zones[2]?.children[0]?.id ?? null,
        };
    });
}

/**
 * Applies a computed hint to the DOM.
 *
 * - Clears the target zone first if isRepair is true (wrong symbol present).
 * - Clones the symbol from the palette (always available regardless of difficulty).
 * - Adds the hint-placed CSS class for the glow animation.
 * - Dispatches grammarChanged so validation runs immediately.
 *
 * @param {{ formIndex:number, slot:string, symbolId:string, isRepair:boolean }} hint
 */
export function applyHintToDOM(hint) {
    const forms = document.querySelectorAll('.rule-form');
    const form  = forms[hint.formIndex];
    if (!form) return;

    const zones    = form.querySelectorAll('.drop-zone');
    const zone     = zones[SLOT_INDEX[hint.slot]];
    if (!zone || zone.dataset.locked) return; // never touch the locked LHS

    const palette  = document.getElementById('symbol-palette');
    const source   = palette?.querySelector(`#${CSS.escape(hint.symbolId)}`);
    if (!source) return;

    const newElement = source.cloneNode(true);
    newElement.draggable = true;
    newElement.addEventListener('dragstart', handleDragStart);
    newElement.addEventListener('dragend',   handleDragEnd);
    newElement.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSymbol(hint.symbolId);
    });

    // hint-placed triggers a 1.5 s glow animation (see symbols.css).
    newElement.classList.add('hint-placed');
    setTimeout(() => newElement.classList.remove('hint-placed'), 1500);

    zone.innerHTML = ''; // clear existing content (handles both normal and repair)
    zone.appendChild(newElement);
    zone.dispatchEvent(new CustomEvent('grammarChanged', { bubbles: true }));
}
