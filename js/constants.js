// js/constants.js

// Maximum number of symbols across all difficulty levels (INSANITY).
// Used as the ceiling for palette rendering and in emergency-fallback paths.
// Per-game symbol counts come from the active difficulty config in difficulty.js.
export const SYMBOL_COUNT = 5;

export const SYMBOL_COLORS = ['#d9534f', '#5bc0de', '#5cb85c', '#f0ad4e', '#6f42c1'];
export const SYMBOL_CHARACTERS = ['●', '■', '▲', '◆', '★'];

export const START_SYMBOL = '1';

// Standard/default values kept for reference. Active gameplay reads
// exampleCount and stringLength from the difficulty config in difficulty.js.
export const EXAMPLE_COUNT = 7;
export const MIN_EXAMPLE_LENGTH = 5;
export const MAX_EXAMPLE_LENGTH = 5;

// Raised from 50 in Phase 0. Pure-math generation makes 500 iterations
// essentially instant; this ceiling is a safety net, not a common path.
export const MAX_GRAMMAR_GENERATION_ATTEMPTS = 500;
