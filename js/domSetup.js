// js/domSetup.js

import { SYMBOL_COUNT, SYMBOL_COLORS, SYMBOL_CHARACTERS, START_SYMBOL } from './constants.js';
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
    
    // Add Tap-to-Place Selection
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
    zone.addEventListener('click', handleZoneClick); // Tap-to-Place
    return zone;
}

export function createRuleForm() {
    const form = document.createElement('div');
    form.className = 'rule-form';

    const arrow = document.createElement('span');
    arrow.className = 'rule-arrow';
    arrow.innerHTML = '&rarr;';

    const lhs = createDropZone();
    form.appendChild(lhs);
    form.appendChild(arrow);

    form.appendChild(createDropZone());
    form.appendChild(createDropZone());

    return form;
}

export function setupPalette() {
    const palette = document.getElementById('symbol-palette');
    palette.innerHTML = '';
    for (let i = 1; i <= SYMBOL_COUNT; i++) {
        palette.appendChild(createSymbolElement(i));
    }
}

export function setupRuleForms(ruleCount) {
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = '';

    if (ruleCount === 0) return;

    const startSymbolEl = document.getElementById(START_SYMBOL);

    for (let i = 0; i < ruleCount; i++) {
        const form = createRuleForm();

        if (i === 0) {
            const lhsZone = form.querySelector('.drop-zone');
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
