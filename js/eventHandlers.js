// js/eventHandlers.js

import { ui, showOverlay, hideOverlay, updateDifficultyButtons,
         clearStickyDerivation } from './ui.js';
import { startNewGame, validateUserGrammar, getDerivationSteps,
         setDifficulty, getActiveDifficultyKey, getAndApplyHint, isGameWon } from './game.js';
import { showDerivation, hideDerivation } from './derivationVisualizer.js';
import { setupDragDropEvents } from './dragDrop.js';
import { copyShareURL } from './urlManager.js';
import { DIFFICULTIES } from './difficulty.js';

// ---------------------------------------------------------------------------
// Menu & overlay
// ---------------------------------------------------------------------------

function openMenu() {
    // After a win there is nothing to resume, so reuse the win layout.
    showOverlay('SYSTEM MENU', isGameWon() ? 'win' : 'menu');
}

function setupMenuEvents() {
    ui.menuButton.addEventListener('click', openMenu);

    ui.overlayNewGameButton.addEventListener('click', () => {
        startNewGame();
        hideOverlay();
    });

    ui.overlayResumeButton.addEventListener('click', hideOverlay);

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (ui.workspaceOverlay.classList.contains('hidden')) openMenu();
        else hideOverlay();
    });

    ui.workspaceOverlay.addEventListener('click', (e) => {
        if (e.target === ui.workspaceOverlay) hideOverlay();
    });
}

// ---------------------------------------------------------------------------
// Share button
// ---------------------------------------------------------------------------

let copyFeedbackTimeout = null;

function setupShareEvents() {
    ui.overlayShareButton.addEventListener('click', async () => {
        clearTimeout(copyFeedbackTimeout);

        try {
            await copyShareURL();
            ui.overlayShareButton.textContent = 'LINK COPIED ✓';
            ui.overlayShareButton.classList.add('btn-share--copied');
        } catch {
            ui.overlayShareButton.textContent = 'COPY FAILED';
        }

        copyFeedbackTimeout = setTimeout(() => {
            ui.overlayShareButton.textContent = 'COPY CHALLENGE LINK';
            ui.overlayShareButton.classList.remove('btn-share--copied');
        }, 2000);
    });
}

// ---------------------------------------------------------------------------
// Difficulty selector
// ---------------------------------------------------------------------------

function setupDifficultyEvents() {
    const container = document.querySelector('.difficulty-buttons');

    for (const key of Object.keys(DIFFICULTIES)) {
        const btn = document.createElement('button');
        btn.className = 'btn-difficulty';
        btn.dataset.difficulty = key;
        btn.textContent = key;
        container.appendChild(btn);
    }

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-difficulty');
        if (!btn) return;
        setDifficulty(btn.dataset.difficulty);
        updateDifficultyButtons(btn.dataset.difficulty);
    });

    updateDifficultyButtons(getActiveDifficultyKey());
}

// ---------------------------------------------------------------------------
// Derivation visualiser
// ---------------------------------------------------------------------------

function showDerivationForItem(li) {
    const steps = getDerivationSteps(Number(li.dataset.exampleId));
    if (steps) showDerivation(li, steps);
}

function setupDerivationVisualizerEvents() {
    let hoveredListItem = null;

    ui.examplesList.addEventListener('mouseover', (e) => {
        const targetLi = e.target.closest('li.is-valid:not(.sticky-visualizer)');
        if (targetLi === hoveredListItem) return;
        hoveredListItem = targetLi;
        if (targetLi) showDerivationForItem(targetLi);
        else hideDerivation();
    });

    ui.examplesList.addEventListener('mouseleave', () => {
        if (hoveredListItem) {
            hoveredListItem = null;
            hideDerivation();
        }
    });

    ui.examplesList.addEventListener('click', (e) => {
        const listItem = e.target.closest('li.is-valid');
        if (!listItem) return;

        const wasSticky = listItem.classList.contains('sticky-visualizer');
        clearStickyDerivation();

        if (!wasSticky) {
            listItem.classList.add('sticky-visualizer');
            showDerivationForItem(listItem);
        }
    });

    document.addEventListener('click', (e) => {
        const stickyItem = ui.examplesList.querySelector('.sticky-visualizer');
        if (stickyItem && !stickyItem.contains(e.target)) {
            clearStickyDerivation();
        }
    });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function setupEventListeners() {
    setupMenuEvents();
    ui.hintButton.addEventListener('click', getAndApplyHint);
    setupShareEvents();
    setupDifficultyEvents();
    setupDerivationVisualizerEvents();
    setupDragDropEvents();
    document.addEventListener('grammarChanged', validateUserGrammar);
}
