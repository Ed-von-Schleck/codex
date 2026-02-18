// js/domSetup.js

import { SYMBOL_COLORS, SYMBOL_CHARACTERS, START_SYMBOL } from './constants.js';
import { handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop, handleZoneClick } from './dragDrop.js';
import { selectSymbol } from './ui.js';

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

    form.appendChild(createDropZone());
    form.appendChild(arrow);
    form.appendChild(createDropZone());
    form.appendChild(createDropZone());

    return form;
}

/**
 * Rebuilds the symbol palette for the given difficulty symbol count.
 * Always clears the palette first so switching difficulty never leaves
 * stale symbols behind.
 *
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
 *
 * Requires the palette to already contain a live element with id === START_SYMBOL.
 */
export function setupRuleForms(ruleCount) {
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = '';

    if (ruleCount === 0) return;

    const startSymbolEl = document.getElementById(START_SYMBOL);

    for (let i = 0; i < ruleCount; i++) {
        const form = createRuleForm();

        if (i === 0) {
            const lhsZone     = form.querySelector('.drop-zone');
            const lockedSymbol = startSymbolEl.cloneNode(true);

            lockedSymbol.draggable = false;
            lockedSymbol.style.cursor = 'default';

            lhsZone.dataset.locked = 'true';
            lhsZone.removeEventListener('dragover', handleDragOver);
            lhsZone.removeEventListener('drop', handleDrop);
            lhsZone.appendChild(lockedSymbol);
        }

        rulesList.appendChild(form);
    }
}
