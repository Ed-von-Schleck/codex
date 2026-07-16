// js/eventHandlers.js

import { ui, showOverlay, hideOverlay, updateDifficultyButtons } from './ui.js';
import { startNewGame, validateUserGrammar, getDerivationSteps,
         setDifficulty, getActiveDifficultyKey, getAndApplyHint } from './game.js';
import { showDerivation, hideDerivation } from './derivationVisualizer.js';
import { copyShareURL } from './urlManager.js';

// ---------------------------------------------------------------------------
// Menu & overlay
// ---------------------------------------------------------------------------

function setupMenuEvents() {
    ui.menuButton.addEventListener('click', () => {
        showOverlay('SYSTEM MENU', 'menu');
    });

    ui.overlayNewGameButton.addEventListener('click', () => {
        startNewGame();
        hideOverlay();
    });

    ui.overlayResumeButton.addEventListener('click', () => {
        hideOverlay();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const isOverlayVisible = !ui.workspaceOverlay.classList.contains('hidden');
        if (isOverlayVisible) {
            hideOverlay();
        } else {
            showOverlay('SYSTEM MENU', 'menu');
        }
    });

    ui.workspaceOverlay.addEventListener('click', (e) => {
        if (e.target === ui.workspaceOverlay) hideOverlay();
    });
}

// ---------------------------------------------------------------------------
// Hint button
// ---------------------------------------------------------------------------

function setupHintEvents() {
    if (!ui.hintButton) return;
    ui.hintButton.addEventListener('click', () => {
        getAndApplyHint();
    });
}

// ---------------------------------------------------------------------------
// Share button
// ---------------------------------------------------------------------------

let copyFeedbackTimeout = null;

function setupShareEvents() {
    ui.overlayShareButton.addEventListener('click', async () => {
        if (copyFeedbackTimeout) {
            clearTimeout(copyFeedbackTimeout);
            copyFeedbackTimeout = null;
        }

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
            copyFeedbackTimeout = null;
        }, 2000);
    });
}

// ---------------------------------------------------------------------------
// Difficulty selector
// ---------------------------------------------------------------------------

function setupDifficultyEvents() {
    document.querySelectorAll('.btn-difficulty').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.difficulty;
            setDifficulty(key);
            updateDifficultyButtons(key);
        });
    });

    updateDifficultyButtons(getActiveDifficultyKey());
}

// ---------------------------------------------------------------------------
// Derivation visualiser
// ---------------------------------------------------------------------------

function setupDerivationVisualizerEvents() {
    let hoveredListItem = null;

    const clearStickyVisualizer = () => {
        const currentSticky = ui.examplesList.querySelector('.sticky-visualizer');
        if (currentSticky) {
            currentSticky.classList.remove('sticky-visualizer');
            hideDerivation();
        }
    };

    ui.examplesList.addEventListener('mouseover', (e) => {
        const targetLi = e.target.closest('li.is-valid:not(.sticky-visualizer)');
        if (targetLi !== hoveredListItem) {
            hoveredListItem = targetLi;
            if (targetLi) {
                const exampleId = parseInt(targetLi.dataset.exampleId, 10);
                const steps = getDerivationSteps(exampleId);
                if (steps) showDerivation(targetLi, steps);
            } else {
                hideDerivation();
            }
        }
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

        const isAlreadySticky = listItem.classList.contains('sticky-visualizer');
        clearStickyVisualizer();

        if (!isAlreadySticky) {
            listItem.classList.add('sticky-visualizer');
            const exampleId = parseInt(listItem.dataset.exampleId, 10);
            const steps = getDerivationSteps(exampleId);
            if (steps) showDerivation(listItem, steps);
        }
    });

    document.addEventListener('click', (e) => {
        const stickyItem = ui.examplesList.querySelector('.sticky-visualizer');
        if (stickyItem && !stickyItem.contains(e.target)) {
            clearStickyVisualizer();
        }
    });
}

// ---------------------------------------------------------------------------
// Grammar change
// ---------------------------------------------------------------------------

function setupGrammarEvents() {
    document.addEventListener('grammarChanged', validateUserGrammar);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function setupEventListeners() {
    setupMenuEvents();
    setupHintEvents();
    setupShareEvents();
    setupDifficultyEvents();
    setupDerivationVisualizerEvents();
    setupGrammarEvents();
}
