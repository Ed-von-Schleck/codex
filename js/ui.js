// js/ui.js

import { renderGeneratedString, hideDerivation } from './derivationVisualizer.js';

// ---------------------------------------------------------------------------
// DOM reference cache
// ---------------------------------------------------------------------------

export const ui = {};

export function initUI() {
    ui.examplesList          = document.getElementById('examples-list');
    ui.menuButton            = document.getElementById('menu-button');
    ui.hintButton            = document.getElementById('hint-button');
    ui.workspaceOverlay      = document.getElementById('workspace-overlay');
    ui.overlayTitle          = document.getElementById('overlay-title');
    ui.overlaySubtitle       = document.getElementById('overlay-subtitle');
    ui.overlayNewGameButton  = document.getElementById('overlay-new-game-button');
    ui.overlayResumeButton   = document.getElementById('overlay-resume-button');
    ui.overlayShareButton    = document.getElementById('overlay-share-button');
    ui.gameSeedDisplay       = document.getElementById('game-seed-display');
    ui.gameDifficultyDisplay = document.getElementById('game-difficulty-display');
    ui.progressDisplay       = document.getElementById('game-progress');
    ui.progressFill          = document.getElementById('progress-fill');
}

// ---------------------------------------------------------------------------
// Header display
// ---------------------------------------------------------------------------

export function displaySeed(seed) {
    ui.gameSeedDisplay.textContent = `SEQ_ID: ${seed}`;
}

export function displayDifficulty(label) {
    ui.gameDifficultyDisplay.textContent = label;
}

export function setHintButtonEnabled(enabled) {
    ui.hintButton.disabled = !enabled;
}

export function updateDifficultyButtons(activeKey) {
    document.querySelectorAll('.btn-difficulty').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.difficulty === activeKey);
    });
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

/**
 * Shows the workspace overlay. type 'win' hides the resume button; the
 * subtitle appears only for wins that used hints.
 */
export function showOverlay(title = '', type = 'menu', hintCount = 0) {
    ui.overlayTitle.textContent = title;

    if (type === 'win' && hintCount > 0) {
        ui.overlaySubtitle.textContent =
            `SOLVED WITH ${hintCount} ${hintCount === 1 ? 'HINT' : 'HINTS'}`;
        ui.overlaySubtitle.style.display = '';
    } else {
        ui.overlaySubtitle.style.display = 'none';
    }

    ui.overlayResumeButton.style.display = type === 'win' ? 'none' : '';
    ui.workspaceOverlay.classList.remove('hidden');
}

export function hideOverlay() {
    ui.workspaceOverlay.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Example list & progress
// ---------------------------------------------------------------------------

export function displayExamples(examples) {
    ui.examplesList.innerHTML = '';
    examples.forEach((example, index) => {
        const li = document.createElement('li');
        li.dataset.exampleId = index;
        li.appendChild(renderGeneratedString(example.result));
        ui.examplesList.appendChild(li);
    });
    updateProgress(0, examples.length);
}

/** Updates a row's validity and reports whether it just flipped to valid. */
export function updateValidationStatus(exampleIndex, isParsable) {
    const li = ui.examplesList.querySelector(`li[data-example-id='${exampleIndex}']`);
    if (!li) return false;
    const wasValid = li.classList.contains('is-valid');
    li.classList.toggle('is-valid', isParsable);
    return isParsable && !wasValid;
}

export function updateProgress(solved, total) {
    ui.progressDisplay.textContent = `${solved}/${total}`;
    ui.progressFill.style.width = `${total > 0 ? (solved / total) * 100 : 0}%`;
}

/** Unpins and removes any derivation popover (grammar or game changed). */
export function clearStickyDerivation() {
    ui.examplesList.querySelector('.sticky-visualizer')
        ?.classList.remove('sticky-visualizer');
    hideDerivation();
}

// ---------------------------------------------------------------------------
// Symbol selection (tap-to-place)
// ---------------------------------------------------------------------------

let selectedSymbolId = null;

export function selectSymbol(id) {
    const wasSelected = selectedSymbolId === id;
    clearSelection();
    if (wasSelected) return; // tapping the selected symbol deselects it

    selectedSymbolId = id;
    document.getElementById(id)?.classList.add('selected'); // palette original
    document.body.classList.add('has-selection');
}

export function clearSelection() {
    selectedSymbolId = null;
    document.querySelectorAll('.symbol.selected').forEach(el => el.classList.remove('selected'));
    document.body.classList.remove('has-selection');
}

export function getSelectedSymbolId() {
    return selectedSymbolId;
}
