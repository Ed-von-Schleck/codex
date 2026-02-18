// js/ui.js

import { renderGeneratedString } from './derivationVisualizer.js';

// ---------------------------------------------------------------------------
// DOM reference cache
// ---------------------------------------------------------------------------

export const ui = {};

export function initUI() {
    ui.examplesList          = document.getElementById('examples-list');
    ui.rulesContainer        = document.getElementById('rules-list');
    ui.menuButton            = document.getElementById('menu-button');
    ui.workspaceOverlay      = document.getElementById('workspace-overlay');
    ui.overlayTitle          = document.getElementById('overlay-title');
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
    if (ui.gameSeedDisplay) {
        ui.gameSeedDisplay.textContent = `SEQ_ID: ${seed}`;
    }
}

export function displayDifficulty(label) {
    if (ui.gameDifficultyDisplay) {
        ui.gameDifficultyDisplay.textContent = label;
    }
}

// ---------------------------------------------------------------------------
// Difficulty selector buttons
// ---------------------------------------------------------------------------

/**
 * Syncs the active visual state of the difficulty buttons in the overlay
 * to the given key. Called at startup (reflecting the committed difficulty,
 * which may have come from a URL param) and on each user selection.
 */
export function updateDifficultyButtons(activeKey) {
    document.querySelectorAll('.btn-difficulty').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.difficulty === activeKey);
    });
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

/**
 * Shows the workspace overlay.
 *
 * type: 'menu' | 'win'
 *   'win'  — hides the resume button (game complete, nothing to resume).
 *            Share button is fully visible as the primary call-to-action.
 *   'menu' — shows both resume and share buttons.
 */
export function showOverlay(title = '', type = 'menu') {
    ui.overlayTitle.textContent = title;

    if (ui.overlayResumeButton) {
        ui.overlayResumeButton.style.display = type === 'win' ? 'none' : '';
    }

    ui.workspaceOverlay.classList.remove('hidden');
}

export function hideOverlay() {
    ui.workspaceOverlay.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Example list
// ---------------------------------------------------------------------------

export function displayExamples(examples) {
    ui.examplesList.innerHTML = '';
    examples.forEach((example, index) => {
        const li = document.createElement('li');
        li.dataset.exampleId = index;
        const wrapper = renderGeneratedString(example.result);
        li.appendChild(wrapper);
        ui.examplesList.appendChild(li);
    });
    updateProgress(0, examples.length);
}

export function updateValidationStatus(exampleIndex, isParsable) {
    const li = ui.examplesList.querySelector(`li[data-example-id='${exampleIndex}']`);
    if (li) li.classList.toggle('is-valid', isParsable);

    const total  = ui.examplesList.querySelectorAll('li').length;
    const solved = ui.examplesList.querySelectorAll('li.is-valid').length;
    updateProgress(solved, total);
}

function updateProgress(solved, total) {
    if (ui.progressDisplay) {
        ui.progressDisplay.textContent = `${solved}/${total}`;
    }
    if (ui.progressFill) {
        const pct = total > 0 ? (solved / total) * 100 : 0;
        ui.progressFill.style.width = `${pct}%`;
    }
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function displayMessage(message) { console.log(message); }
export function clearMessage() {}

// ---------------------------------------------------------------------------
// Symbol selection state
// ---------------------------------------------------------------------------

let selectedSymbolId = null;

export function selectSymbol(id) {
    if (selectedSymbolId === id) {
        clearSelection();
        return;
    }
    clearSelection();
    selectedSymbolId = id;
    const el = document.getElementById(id);
    if (el) el.classList.add('selected');
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
