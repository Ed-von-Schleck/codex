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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

function initializeNewGame() {
    clearMessage();
    successfulParses.clear();

    const baseSeed = generateBase64Seed(6);
    displaySeed(baseSeed);

    for (let i = 0; i < MAX_GRAMMAR_GENERATION_ATTEMPTS; i++) {
        const seed = baseSeed + i;
        const hiddenGrammar = generateRandomGrammar(SYMBOL_COUNT, 3, seed);
        const examplePool = generate(hiddenGrammar, START_SYMBOL, MAX_EXAMPLE_LENGTH, MIN_EXAMPLE_LENGTH);

        if (examplePool.length >= EXAMPLE_COUNT) {
            const gameExamples = selectVariedExamples(examplePool, hiddenGrammar, EXAMPLE_COUNT, seed);
            const ruleCount = Object.values(hiddenGrammar).reduce((acc, rules) => acc + rules.length, 0);
            
            setupRuleForms(ruleCount);
            displayExamples(gameExamples);
            return { hiddenGrammar, gameExamples };
        }
    }
    throw new Error(`Failed to generate grammar.`);
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
        setTimeout(() => showOverlay("Puzzle Solved!", 'win'), 500);
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
