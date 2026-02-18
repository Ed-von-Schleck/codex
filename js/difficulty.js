// js/difficulty.js
//
// Single source of truth for difficulty configuration.
// Every numeric parameter that scales with difficulty lives here.
// Nothing else in the codebase should hardcode these values.

export const DIFFICULTIES = {
    NOVICE: {
        key:          'NOVICE',
        label:        'NOVICE',
        symbols:      2,
        rules:        2,
        exampleCount: 7,
        stringLength: 5,
    },
    STANDARD: {
        key:          'STANDARD',
        label:        'STANDARD',
        symbols:      3,
        rules:        3,
        exampleCount: 7,
        stringLength: 5,
    },
    EXPERT: {
        key:          'EXPERT',
        label:        'EXPERT',
        symbols:      4,
        rules:        4,
        exampleCount: 7,
        stringLength: 5,
    },
    INSANITY: {
        key:          'INSANITY',
        label:        'INSANITY',
        symbols:      5,
        rules:        5,
        exampleCount: 7,
        stringLength: 5,
    },
};

// Used to initialise game.js's activeDifficulty and to set the
// overlay's initial active button without hardcoding strings elsewhere.
export const DEFAULT_DIFFICULTY_KEY = 'STANDARD';
