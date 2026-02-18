// js/game.js

import { START_SYMBOL, EXAMPLE_COUNT, MIN_EXAMPLE_LENGTH, MAX_EXAMPLE_LENGTH, SYMBOL_COUNT, MAX_GRAMMAR_GENERATION_ATTEMPTS } from './constants.js';
import { setupRuleForms } from './domSetup.js';
import { generate, buildGrammarFromDOM } from './grammar.js';
import { generateRandomGrammar } from './grammarGenerator.js';
import { parse, reconstructParseTree } from './parse.js';
import { ui, displayExamples, updateValidationStatus, clearMessage, showOverlay, displaySeed } from './ui.js';
import { selectVariedExamples } from './exampleSelector.js';
import { generateDerivationSteps } from './derivationVisualizer.js';

let gameState = {
    hiddenGrammar: null,
    gameExamples: [],
    isWon: false
};
let successfulParses = new Map();

function generateBase64Seed(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

/**
 * Validates that the example set doesn't have "easy" boundaries.
 * Requires at least 2 different starting symbols and 2 different ending symbols.
 */
function isSetDiverse(examples) {
    if (examples.length < 2) return false;
    const firsts = new Set(examples.map(ex => ex.result[0]));
    const lasts = new Set(examples.map(ex => ex.result[ex.result.length - 1]));
    return firsts.size >= 2 && lasts.size >= 2;
}

/**
 * Applies a grammar + example set to the DOM, shared by the success path
 * and the fallback path.
 */
function applyGameSetup(hiddenGrammar, gameExamples) {
    const ruleCount = Object.values(hiddenGrammar).reduce((acc, rules) => acc + rules.length, 0);
    setupRuleForms(ruleCount);
    displayExamples(gameExamples);
}

function initializeNewGame() {
    clearMessage();
    successfulParses.clear();

    const baseSeed = generateBase64Seed(6);
    displaySeed(baseSeed);

    // Track the best candidate found so far in case we exhaust all attempts
    // without ever hitting the diversity requirement. This replaces the old
    // recursive fallback which could loop indefinitely.
    let bestFallback = null;

    for (let i = 0; i < MAX_GRAMMAR_GENERATION_ATTEMPTS; i++) {
        const seed = baseSeed + i;
        const hiddenGrammar = generateRandomGrammar(SYMBOL_COUNT, 3, seed);
        const examplePool = generate(hiddenGrammar, START_SYMBOL, MAX_EXAMPLE_LENGTH, MIN_EXAMPLE_LENGTH);

        if (examplePool.length < EXAMPLE_COUNT) continue;

        // Try a few selection shuffles before discarding this grammar entirely.
        for (let selectionAttempt = 0; selectionAttempt < 5; selectionAttempt++) {
            const selectionSeed = seed + '_sel' + selectionAttempt;
            const gameExamples = selectVariedExamples(examplePool, hiddenGrammar, EXAMPLE_COUNT, selectionSeed);

            // Always keep the first viable (even if not diverse) result as a
            // fallback so we have something concrete to return if needed.
            if (!bestFallback && gameExamples.length >= EXAMPLE_COUNT) {
                bestFallback = { hiddenGrammar, gameExamples };
            }

            if (isSetDiverse(gameExamples)) {
                applyGameSetup(hiddenGrammar, gameExamples);
                return { hiddenGrammar, gameExamples };
            }
        }
    }

    // We exhausted all attempts without finding a perfectly diverse set.
    // Use the best viable candidate we recorded along the way. In practice
    // this path is never reached with MAX_GRAMMAR_GENERATION_ATTEMPTS = 500,
    // but it guarantees the function always returns something valid without
    // recursing back into startNewGame().
    if (bestFallback) {
        console.warn('CODEX: Could not find a perfectly diverse example set after', MAX_GRAMMAR_GENERATION_ATTEMPTS, 'attempts. Using best available candidate.');
        applyGameSetup(bestFallback.hiddenGrammar, bestFallback.gameExamples);
        return bestFallback;
    }

    // Absolute last resort: this should be unreachable in any real configuration,
    // but satisfies the type contract so callers never receive undefined.
    console.error('CODEX: Grammar generation failed entirely. Check SYMBOL_COUNT and EXAMPLE_COUNT configuration.');
    const emergencyGrammar = generateRandomGrammar(SYMBOL_COUNT, 3, baseSeed);
    const emergencyPool = generate(emergencyGrammar, START_SYMBOL, MAX_EXAMPLE_LENGTH, MIN_EXAMPLE_LENGTH);
    const emergencyExamples = emergencyPool.slice(0, EXAMPLE_COUNT);
    applyGameSetup(emergencyGrammar, emergencyExamples);
    return { hiddenGrammar: emergencyGrammar, gameExamples: emergencyExamples };
}

export function startNewGame() {
    const { hiddenGrammar, gameExamples } = initializeNewGame();
    gameState.hiddenGrammar = hiddenGrammar;
    gameState.gameExamples = gameExamples;
    gameState.isWon = false;
    validateUserGrammar();
}

export function validateUserGrammar() {
    const userGrammar = buildGrammarFromDOM();
    successfulParses.clear();

    gameState.gameExamples.forEach((example, index) => {
        const parseTable = parse(userGrammar, example.result, START_SYMBOL);
        const isParsable = !!parseTable;
        if (isParsable) successfulParses.set(index, parseTable);
        updateValidationStatus(index, isParsable);
    });

    const allValid = gameState.gameExamples.length > 0 && successfulParses.size === gameState.gameExamples.length;
    if (allValid && !gameState.isWon) {
        gameState.isWon = true;
        setTimeout(() => showOverlay("DECRYPTION COMPLETE", 'win'), 500);
    }
}

export function getDerivationSteps(exampleId) {
    const parseTable = successfulParses.get(exampleId);
    const example = gameState.gameExamples[exampleId];
    if (parseTable && example) {
        const parseTree = reconstructParseTree(parseTable, START_SYMBOL, example.result.length);
        if (parseTree) return generateDerivationSteps(parseTree);
    }
    return null;
}
