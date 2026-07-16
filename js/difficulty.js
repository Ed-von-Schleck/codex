// js/difficulty.js
//
// Single source of truth for difficulty configuration.
// Every parameter that scales with difficulty lives here.

export const DIFFICULTIES = {
    NOVICE:   { symbols: 2, rules: 2, exampleCount: 7, stringLength: 5 },
    STANDARD: { symbols: 3, rules: 3, exampleCount: 7, stringLength: 5 },
    EXPERT:   { symbols: 4, rules: 4, exampleCount: 7, stringLength: 5 },
    INSANITY: { symbols: 5, rules: 5, exampleCount: 7, stringLength: 5 },
};

for (const [key, config] of Object.entries(DIFFICULTIES)) {
    config.key = key;
}

export const DEFAULT_DIFFICULTY_KEY = 'STANDARD';
