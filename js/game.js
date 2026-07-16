// js/game.js

import { START_SYMBOL, SYMBOL_COUNT, MAX_GRAMMAR_GENERATION_ATTEMPTS } from './constants.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY_KEY } from './difficulty.js';
import { setupPalette, setupRuleForms, readFormStates, applyHintToDOM } from './domSetup.js';
import { generate, buildGrammarFromDOM } from './grammar.js';
import { generateRandomGrammar } from './grammarGenerator.js';
import { parse, reconstructParseTree } from './parse.js';
import { displayExamples, updateValidationStatus, clearMessage, showOverlay,
         displaySeed, displayDifficulty, setHintButtonEnabled } from './ui.js';
import { selectVariedExamples } from './exampleSelector.js';
import { generateDerivationSteps } from './derivationVisualizer.js';
import { setGameParamsInURL } from './urlManager.js';
import { computeHint } from './hints.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let activeDifficulty = DIFFICULTIES[DEFAULT_DIFFICULTY_KEY];

let gameState = {
    hiddenGrammar: null,
    gameExamples:  [],
    isWon:         false,
    hintCount:     0,
};

let successfulParses = new Map();

// ---------------------------------------------------------------------------
// Public API — difficulty
// ---------------------------------------------------------------------------

export function getActiveDifficultyKey() {
    return activeDifficulty.key;
}

export function setDifficulty(key) {
    activeDifficulty = DIFFICULTIES[key] ?? DIFFICULTIES[DEFAULT_DIFFICULTY_KEY];
}

// ---------------------------------------------------------------------------
// Public API — game lifecycle
// ---------------------------------------------------------------------------

export function startNewGame(seedOverride = null) {
    const { hiddenGrammar, gameExamples, baseSeed } =
        initializeNewGame(activeDifficulty, seedOverride);

    gameState.hiddenGrammar = hiddenGrammar;
    gameState.gameExamples  = gameExamples;
    gameState.isWon         = false;
    gameState.hintCount     = 0;

    setHintButtonEnabled(true);
    setGameParamsInURL(baseSeed, activeDifficulty.key);
    displayDifficulty(activeDifficulty.label);

    validateUserGrammar();
}

// ---------------------------------------------------------------------------
// Public API — validation
// ---------------------------------------------------------------------------

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
        setHintButtonEnabled(false);
        // hintCount is captured now; the closure reads the live value at fire
        // time, which is correct because hintCount is incremented synchronously
        // before applyHintToDOM triggers validateUserGrammar.
        setTimeout(
            () => showOverlay('DECRYPTION COMPLETE', 'win', gameState.hintCount),
            500
        );
    }
}

// ---------------------------------------------------------------------------
// Public API — derivation visualiser
// ---------------------------------------------------------------------------

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
// Public API — hint system
// ---------------------------------------------------------------------------

/**
 * Computes and applies the next hint.
 *
 * The hint computation NEVER references the hidden grammar directly as a
 * target — it searches for any valid grammar consistent with what the
 * player has already placed. See hints.js for the full algorithm.
 *
 * hintCount is incremented BEFORE the DOM placement so that if placing the
 * hinted symbol wins the game, the win overlay's 500 ms closure sees the
 * correct (already-incremented) count.
 */
export function getAndApplyHint() {
    if (gameState.isWon) return;

    setHintButtonEnabled(false);

    const formStates = readFormStates();
    const hint = computeHint(
        gameState.hiddenGrammar,
        formStates,
        gameState.gameExamples,
        activeDifficulty.symbols
    );

    if (hint) {
        gameState.hintCount++;      // increment before DOM placement (see above)
        applyHintToDOM(hint);
    }

    if (!gameState.isWon) {
        setHintButtonEnabled(true);
    }
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

function isSetDiverse(examples) {
    if (examples.length < 2) return false;
    const firsts = new Set(examples.map(ex => ex.result[0]));
    const lasts  = new Set(examples.map(ex => ex.result[ex.result.length - 1]));
    return firsts.size >= 2 && lasts.size >= 2;
}

/**
 * Writes a validated game setup to the DOM.
 * ORDER IS CRITICAL: setupPalette before setupRuleForms.
 */
function applyGameSetup(hiddenGrammar, gameExamples, difficulty) {
    setupPalette(difficulty.symbols);
    const ruleCount = Object.values(hiddenGrammar)
        .reduce((acc, rules) => acc + rules.length, 0);
    setupRuleForms(ruleCount);
    displayExamples(gameExamples);
}

function initializeNewGame(difficulty, forcedBaseSeed = null) {
    clearMessage();
    successfulParses.clear();

    const baseSeed = forcedBaseSeed ?? generateBase64Seed(6);
    displaySeed(baseSeed);

    let bestFallback = null;

    for (let i = 0; i < MAX_GRAMMAR_GENERATION_ATTEMPTS; i++) {
        const seed          = baseSeed + i;
        const hiddenGrammar = generateRandomGrammar(
            difficulty.symbols, difficulty.rules, seed
        );
        const examplePool = generate(
            hiddenGrammar, START_SYMBOL,
            difficulty.stringLength, difficulty.stringLength
        );

        if (examplePool.length < difficulty.exampleCount) continue;

        for (let selectionAttempt = 0; selectionAttempt < 5; selectionAttempt++) {
            const selectionSeed = seed + '_sel' + selectionAttempt;
            const gameExamples  = selectVariedExamples(
                examplePool, hiddenGrammar, difficulty.exampleCount, selectionSeed
            );

            if (!bestFallback && gameExamples.length >= difficulty.exampleCount) {
                bestFallback = { hiddenGrammar, gameExamples };
            }

            if (isSetDiverse(gameExamples)) {
                applyGameSetup(hiddenGrammar, gameExamples, difficulty);
                return { hiddenGrammar, gameExamples, baseSeed };
            }
        }
    }

    if (bestFallback) {
        console.warn(
            `CODEX: No diverse set found after ${MAX_GRAMMAR_GENERATION_ATTEMPTS} attempts.`,
            'Using best available candidate.'
        );
        applyGameSetup(bestFallback.hiddenGrammar, bestFallback.gameExamples, difficulty);
        return { ...bestFallback, baseSeed };
    }

    console.error('CODEX: Grammar generation failed entirely. Check difficulty.js config.');
    const emergencyGrammar  = generateRandomGrammar(SYMBOL_COUNT, difficulty.rules, baseSeed);
    const emergencyPool     = generate(emergencyGrammar, START_SYMBOL, difficulty.stringLength, difficulty.stringLength);
    const emergencyExamples = emergencyPool.slice(0, difficulty.exampleCount);
    applyGameSetup(emergencyGrammar, emergencyExamples, difficulty);
    return { hiddenGrammar: emergencyGrammar, gameExamples: emergencyExamples, baseSeed };
}
