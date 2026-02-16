// js/eventHandlers.js

import { ui, showOverlay, hideOverlay } from './ui.js';
import { startNewGame, validateUserGrammar, getDerivationSteps } from './game.js';
import { showDerivation, hideDerivation } from './derivationVisualizer.js';

function setupMenuEvents() {
    ui.menuButton.addEventListener('click', () => {
        showOverlay('SYSTEM MENU', 'menu');
    });

    ui.overlayNewGameButton.addEventListener('click', () => {
        startNewGame();
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
        if (e.target === ui.workspaceOverlay) {
            hideOverlay();
        }
    });
}

function setupDerivationVisualizerEvents() {
    const clearStickyVisualizer = () => {
        const currentSticky = ui.examplesList.querySelector('.sticky-visualizer');
        if (currentSticky) {
            currentSticky.classList.remove('sticky-visualizer');
            hideDerivation();
        }
    };

    let hoveredListItem = null;

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

export function setupEventListeners() {
    setupMenuEvents();
    setupDerivationVisualizerEvents();

    document.addEventListener('grammarChanged', validateUserGrammar);
}
