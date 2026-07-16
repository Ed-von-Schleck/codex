// js/main.js — entry point.

import { startNewGame, setDifficulty } from './game.js';
import { setupEventListeners } from './eventHandlers.js';
import { initUI } from './ui.js';
import { getGameParamsFromURL } from './urlManager.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();

    // Both are null if absent or invalid. Apply the URL difficulty before
    // starting so the first game (and its button highlight) uses it.
    const { seed, difficultyKey } = getGameParamsFromURL();
    if (difficultyKey) setDifficulty(difficultyKey);

    // With a seed from the URL, replay that exact puzzle.
    startNewGame(seed);

    setupEventListeners();
});
