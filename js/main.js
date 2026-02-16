// js/main.js

import { setupPalette } from './domSetup.js';
import { startNewGame } from './game.js';
import { setupEventListeners } from './eventHandlers.js';
import { initUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    setupPalette();
    startNewGame();
    setupEventListeners();
});
