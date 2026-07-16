// js/constants.js

export const SYMBOL_COLORS = ['#d9534f', '#5bc0de', '#5cb85c', '#f0ad4e', '#6f42c1'];
export const SYMBOL_CHARACTERS = ['●', '■', '▲', '◆', '★'];

export const START_SYMBOL = '1';

/** Symbol ids are the strings '1'..'count'. */
export const symbolIds = count =>
    Array.from({ length: count }, (_, i) => String(i + 1));

export const MAX_GRAMMAR_GENERATION_ATTEMPTS = 500;
