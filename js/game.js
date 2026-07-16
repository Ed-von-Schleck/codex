// js/game.js

import { START_SYMBOL, MAX_GRAMMAR_GENERATION_ATTEMPTS } from './constants.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY_KEY } from './difficulty.js';
import { setupPalette, setupRuleForms, readFormStates, applyHintToDOM } from './domSetup.js';
import { generate, buildGrammar } from './grammar.js';
import { generateRandomGrammar } from './grammarGenerator.js';
import { parse, reconstructParseTree } from './parse.js';
import { displayExamples, updateValidationStatus, updateProgress, showOverlay,
         displaySeed, displayDifficulty, setHintButtonEnabled,
         clearStickyDerivation } from './ui.js';
import { selectVariedExamples } from './exampleSelector.js';
import { generateDerivationSteps } from './derivationVisualizer.js';
import { setGameParamsInURL } from './urlManager.js';
import { computeHint } from './hints.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

// Difficulty selected in the menu; applies from the next game on.
let activeDifficultyKey = DEFAULT_DIFFICULTY_KEY;

let winOverlayTimeout = null;

const gameState = {
    difficulty:    DIFFICULTIES[DEFAULT_DIFFICULTY_KEY],
    hiddenGrammar: null,
    gameExamples:  [],
    isWon:         false,
    hintCount:     0,
};

// ---------------------------------------------------------------------------
// Public API — difficulty
// ---------------------------------------------------------------------------

export function getActiveDifficultyKey() {
    return activeDifficultyKey;
}

export function setDifficulty(key) {
    if (DIFFICULTIES[key]) activeDifficultyKey = key;
}

export function isGameWon() {
    return gameState.isWon;
}

// ---------------------------------------------------------------------------
// Public API — game lifecycle
// ---------------------------------------------------------------------------

export function startNewGame(seedOverride = null) {
    clearTimeout(winOverlayTimeout);

    const difficulty = DIFFICULTIES[activeDifficultyKey];
    const baseSeed   = seedOverride ?? generateSeed();
    const { hiddenGrammar, gameExamples } = findGameSetup(difficulty, baseSeed);

    gameState.difficulty    = difficulty;
    gameState.hiddenGrammar = hiddenGrammar;
    gameState.gameExamples  = gameExamples;
    gameState.isWon         = false;
    gameState.hintCount     = 0;

    setupPalette(difficulty.symbols);
    setupRuleForms(difficulty.rules);
    displayExamples(gameExamples);

    displaySeed(baseSeed);
    displayDifficulty(difficulty.key);
    setHintButtonEnabled(true);
    setGameParamsInURL(baseSeed, difficulty.key);

    validateUserGrammar();
}

// ---------------------------------------------------------------------------
// Public API — validation
// ---------------------------------------------------------------------------

export function validateUserGrammar() {
    clearStickyDerivation(); // any open derivation popover is now stale
    const userGrammar = buildGrammar(readFormStates());

    let solved = 0;
    gameState.gameExamples.forEach((example, index) => {
        const isParsable = !!parse(userGrammar, example.result, START_SYMBOL);
        if (isParsable) solved++;
        updateValidationStatus(index, isParsable);
    });
    updateProgress(solved, gameState.gameExamples.length);

    if (solved > 0 && solved === gameState.gameExamples.length && !gameState.isWon) {
        gameState.isWon = true;
        setHintButtonEnabled(false);
        winOverlayTimeout = setTimeout(
            () => showOverlay('DECRYPTION COMPLETE', 'win', gameState.hintCount),
            500
        );
    }
}

// ---------------------------------------------------------------------------
// Public API — derivation visualiser
// ---------------------------------------------------------------------------

export function getDerivationSteps(exampleId) {
    const example = gameState.gameExamples[exampleId];
    if (!example) return null;

    const parseTable = parse(buildGrammar(readFormStates()), example.result, START_SYMBOL);
    if (!parseTable) return null;

    const parseTree = reconstructParseTree(parseTable, START_SYMBOL, example.result.length);
    return parseTree ? generateDerivationSteps(parseTree) : null;
}

// ---------------------------------------------------------------------------
// Public API — hint system
// ---------------------------------------------------------------------------

/**
 * Computes and applies the next hint. The hint search never targets the
 * hidden grammar directly — it looks for any valid grammar consistent with
 * the player's placed symbols (see hints.js).
 */
export function getAndApplyHint() {
    if (gameState.isWon) return;

    const hint = computeHint(
        gameState.hiddenGrammar,
        readFormStates(),
        gameState.gameExamples,
        gameState.difficulty.symbols
    );

    if (hint) {
        gameState.hintCount++; // before placement, so a winning hint is counted
        applyHintToDOM(hint);
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateSeed() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
}

function isSetDiverse(examples) {
    if (examples.length < 2) return false;
    const firsts = new Set(examples.map(ex => ex.result[0]));
    const lasts  = new Set(examples.map(ex => ex.result[ex.result.length - 1]));
    return firsts.size >= 2 && lasts.size >= 2;
}

/**
 * Searches seeded grammar candidates for one whose example set is diverse
 * (varied first and last symbols). Falls back to the first workable
 * candidate, and as a last resort to an unfiltered example pool.
 */
function findGameSetup(difficulty, baseSeed) {
    let fallback = null;

    for (let i = 0; i < MAX_GRAMMAR_GENERATION_ATTEMPTS; i++) {
        const seed          = baseSeed + i;
        const hiddenGrammar = generateRandomGrammar(difficulty.symbols, difficulty.rules, seed);
        const examplePool   = generate(hiddenGrammar, START_SYMBOL, difficulty.stringLength);

        if (examplePool.length < difficulty.exampleCount) continue;

        for (let attempt = 0; attempt < 5; attempt++) {
            const gameExamples = selectVariedExamples(
                examplePool, hiddenGrammar, difficulty.exampleCount, seed + '_sel' + attempt
            );
            fallback ??= { hiddenGrammar, gameExamples };
            if (isSetDiverse(gameExamples)) return { hiddenGrammar, gameExamples };
        }
    }

    if (fallback) {
        console.warn(`CODEX: No diverse example set found after ${MAX_GRAMMAR_GENERATION_ATTEMPTS} attempts. Using best available candidate.`);
        return fallback;
    }

    console.error('CODEX: Grammar generation failed entirely. Check difficulty.js config.');
    const hiddenGrammar = generateRandomGrammar(difficulty.symbols, difficulty.rules, baseSeed);
    const examplePool   = generate(hiddenGrammar, START_SYMBOL, difficulty.stringLength);
    return { hiddenGrammar, gameExamples: examplePool.slice(0, difficulty.exampleCount) };
}
