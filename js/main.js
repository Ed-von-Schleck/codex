// js/main.js
//
// Entry point. Boot sequence:
//   1. initUI        — cache all DOM element references
//   2. Parse URL     — extract seed and difficulty params if present
//   3. setDifficulty — apply URL difficulty before the first game starts
//   4. startNewGame  — generate (or replay) the game; writes URL via replaceState
//   5. setupEventListeners — attach all interaction handlers
//
// Step 5 must come after step 4 so that setupDifficultyEvents reads the
// already-committed active difficulty when initialising the button highlight.

import { startNewGame, setDifficulty } from './game.js';
import { setupEventListeners } from './eventHandlers.js';
import { initUI } from './ui.js';
import { getGameParamsFromURL } from './urlManager.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();

    // Read URL parameters. Both may be null if not present or invalid.
    const { seed, difficultyKey } = getGameParamsFromURL();

    // Apply the URL difficulty (if valid) before starting the game so that
    // the first game uses it. setDifficulty is a no-op for invalid keys.
    if (difficultyKey) {
        setDifficulty(difficultyKey);
    }

    // Start the game. If a seed was found in the URL, replay that exact puzzle;
    // otherwise generate a fresh random one.
    startNewGame(seed);

    // Wire all event listeners. setupDifficultyEvents inside will read the
    // current active difficulty (already committed above) to set the correct
    // button highlight — including when set from a URL parameter.
    setupEventListeners();
});
