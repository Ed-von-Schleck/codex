// js/game.js

import { START_SYMBOL, SYMBOL_COUNT, MAX_GRAMMAR_GENERATION_ATTEMPTS } from './constants.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY_KEY } from './difficulty.js';
import { setupPalette, setupRuleForms } from './domSetup.js';
import { generate, buildGrammarFromDOM } from './grammar.js';
import { generateRandomGrammar } from './grammarGenerator.js';
import { parse, reconstructParseTree } from './parse.js';
import { displayExamples, updateValidationStatus, clearMessage, showOverlay, displaySeed, displayDifficulty } from './ui.js';
import { selectVariedExamples } from './exampleSelector.js';
import { generateDerivationSteps } from './derivationVisualizer.js';
import { setGameParamsInURL } from './urlManager.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let activeDifficulty = DIFFICULTIES[DEFAULT_DIFFICULTY_KEY];

let gameState = {
    hiddenGrammar: null,
    gameExamples:  [],
    isWon:         false,
};

let successfulParses = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the key of the currently active difficulty.
 * Used by eventHandlers to initialise the difficulty button highlight
 * correctly when the difficulty has been set from a URL parameter before
 * the event listeners are attached.
 */
export function getActiveDifficultyKey() {
    return activeDifficulty.key;
}

/**
 * Change the difficulty used the next time startNewGame() is called.
 * Does not restart the current game.
 */
export function setDifficulty(key) {
    activeDifficulty = DIFFICULTIES[key] ?? DIFFICULTIES[DEFAULT_DIFFICULTY_KEY];
}

/**
 * Starts a new game.
 *
 * @param {string|null} seedOverride — if provided, the game is generated from
 *   this specific base seed instead of a freshly generated one. Passing a seed
 *   from the URL allows seeded game replay. Pass null (default) for a random game.
 */
export function startNewGame(seedOverride = null) {
    const { hiddenGrammar, gameExamples, baseSeed } =
        initializeNewGame(activeDifficulty, seedOverride);

    gameState.hiddenGrammar = hiddenGrammar;
    gameState.gameExamples  = gameExamples;
    gameState.isWon         = false;

    // Keep the URL in sync with the committed game so the address bar is always
    // shareable. Uses replaceState — no history entry is added.
    setGameParamsInURL(baseSeed, activeDifficulty.key);

    // Header reflects the difficulty of the game that actually started,
    // which may differ from the selector state if the player changed
    // difficulty in the menu without starting a new game.
    displayDifficulty(activeDifficulty.label);

    validateUserGrammar();
}

export function validateUserGrammar() {
    const userGrammar = buildGrammarFromDOM();
    successfulParses.clear();

    gameState.gameExamples.forEach((example, index) => {
        const parseTable = parse(userGrammar, example.result, START_SYMBOL);
        const isParsable  = !!parseTable;
        if (isParsable) successfulParses.set(index, parseTable);
        updateValidationStatus(index, isParsable);
    });

    const allValid =
        gameState.gameExamples.length > 0 &&
        successfulParses.size === gameState.gameExamples.length;

    if (allValid && !gameState.isWon) {
        gameState.isWon = true;
        setTimeout(() => showOverlay('DECRYPTION COMPLETE', 'win'), 500);
    }
}

export function getDerivationSteps(exampleId) {
    const parseTable = successfulParses.get(exampleId);
    const example    = gameState.gameExamples[exampleId];
    if (parseTable && example) {
        const parseTree = reconstructParseTree(parseTable, START_SYMBOL, example.result.length);
        if (parseTree) return generateDerivationSteps(parseTree);
    }
    return null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateBase64Seed(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
}

/**
 * Validates that the example set is not trivially solvable from string
 * boundaries alone. Requires at least 2 distinct first symbols and 2 distinct
 * last symbols across the full example set.
 */
function isSetDiverse(examples) {
    if (examples.length < 2) return false;
    const firsts = new Set(examples.map(ex => ex.result[0]));
    const lasts  = new Set(examples.map(ex => ex.result[ex.result.length - 1]));
    return firsts.size >= 2 && lasts.size >= 2;
}

/**
 * Writes a validated game setup to the DOM.
 *
 * ORDER IS CRITICAL: setupPalette must precede setupRuleForms because
 * setupRuleForms clones the start-symbol element out of the live palette.
 */
function applyGameSetup(hiddenGrammar, gameExamples, difficulty) {
    setupPalette(difficulty.symbols);

    const ruleCount = Object.values(hiddenGrammar)
        .reduce((acc, rules) => acc + rules.length, 0);
    setupRuleForms(ruleCount);

    displayExamples(gameExamples);
}

/**
 * Generates a hidden grammar and matching example set for the given difficulty.
 *
 * @param {object} difficulty — a difficulty config object from difficulty.js
 * @param {string|null} forcedBaseSeed — if non-null, used instead of generating
 *   a fresh seed. Enables deterministic replay from a shared URL.
 *
 * Returns { hiddenGrammar, gameExamples, baseSeed }.
 * baseSeed is always the 6-character seed that was committed, whether it came
 * from forcedBaseSeed or was freshly generated. Callers use this to write
 * the URL parameter.
 */
function initializeNewGame(difficulty, forcedBaseSeed = null) {
    clearMessage();
    successfulParses.clear();

    const baseSeed = forcedBaseSeed ?? generateBase64Seed(6);
    displaySeed(baseSeed);

    let bestFallback = null;

    for (let i = 0; i < MAX_GRAMMAR_GENERATION_ATTEMPTS; i++) {
        const seed          = baseSeed + i;
        const hiddenGrammar = generateRandomGrammar(
            difficulty.symbols,
            difficulty.rules,
            seed
        );
        const examplePool = generate(
            hiddenGrammar,
            START_SYMBOL,
            difficulty.stringLength,
            difficulty.stringLength  // min === max: all examples are the same length
        );

        if (examplePool.length < difficulty.exampleCount) continue;

        for (let selectionAttempt = 0; selectionAttempt < 5; selectionAttempt++) {
            const selectionSeed = seed + '_sel' + selectionAttempt;
            const gameExamples  = selectVariedExamples(
                examplePool,
                hiddenGrammar,
                difficulty.exampleCount,
                selectionSeed
            );

            // Record the first viable (even if non-diverse) result as a fallback.
            if (!bestFallback && gameExamples.length >= difficulty.exampleCount) {
                bestFallback = { hiddenGrammar, gameExamples };
            }

            if (isSetDiverse(gameExamples)) {
                applyGameSetup(hiddenGrammar, gameExamples, difficulty);
                return { hiddenGrammar, gameExamples, baseSeed };
            }
        }
    }

    // Exhausted all attempts — use best viable candidate found above.
    if (bestFallback) {
        console.warn(
            `CODEX: No diverse set found after ${MAX_GRAMMAR_GENERATION_ATTEMPTS} attempts.`,
            'Using best available candidate.'
        );
        applyGameSetup(bestFallback.hiddenGrammar, bestFallback.gameExamples, difficulty);
        return { ...bestFallback, baseSeed };
    }

    // Absolute last resort — unreachable under any sane configuration.
    console.error('CODEX: Grammar generation failed entirely. Check difficulty.js config.');
    const emergencyGrammar  = generateRandomGrammar(SYMBOL_COUNT, difficulty.rules, baseSeed);
    const emergencyPool     = generate(emergencyGrammar, START_SYMBOL, difficulty.stringLength, difficulty.stringLength);
    const emergencyExamples = emergencyPool.slice(0, difficulty.exampleCount);
    applyGameSetup(emergencyGrammar, emergencyExamples, difficulty);
    return { hiddenGrammar: emergencyGrammar, gameExamples: emergencyExamples, baseSeed };
}
