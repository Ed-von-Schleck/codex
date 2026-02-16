// js/grammarGenerator.js

const getRandomElement = (arr, random) => {
    if (arr.length === 0) return null;
    return arr[Math.floor(random() * arr.length)];
};

export function generateRandomGrammar(numSymbols, numRules, seed) {
    const random = new Math.seedrandom(seed);
    if (numSymbols === 0 || numRules === 0) {
        return {};
    }

    const allSymbols = Array.from({ length: numSymbols }, (_, i) => String(i + 1));
    const startSymbol = allSymbols[0];
    const rules = [];

    const unexpanded = [startSymbol];
    const expanded = new Set();

    while (unexpanded.length > 0 && rules.length < numRules) {
        const unexpandedIndex = Math.floor(random() * unexpanded.length);
        const lhs = unexpanded.splice(unexpandedIndex, 1)[0];

        if (expanded.has(lhs)) continue;

        const currentlyUsedSymbols = new Set([...expanded, ...unexpanded, lhs]);
        const unusedSymbols = allSymbols.filter(s => !currentlyUsedSymbols.has(s));

        let symbol1, symbol2;
        if (unusedSymbols.length > 0) {
            symbol1 = getRandomElement(unusedSymbols, random);
            symbol2 = getRandomElement(allSymbols, random);
        } else {
            symbol1 = getRandomElement(allSymbols, random);
            symbol2 = getRandomElement(allSymbols, random);
        }

        const rhs = random() < 0.5 ? [symbol1, symbol2] : [symbol2, symbol1];
        rules.push({ lhs, rhs });
        expanded.add(lhs);

        for (const symbol of rhs) {
            if (!expanded.has(symbol) && !unexpanded.includes(symbol)) {
                unexpanded.push(symbol);
            }
        }
    }

    const expandedSymbols = Array.from(expanded);

    while (rules.length < numRules) {
        let lhs;
        
        const ruleCounts = rules.reduce((acc, rule) => {
            acc[rule.lhs] = (acc[rule.lhs] || 0) + 1;
            return acc;
        }, {});

        const symbolsWithOneRule = expandedSymbols.filter(s => ruleCounts[s] === 1);

        if (symbolsWithOneRule.length > 0) {
            lhs = getRandomElement(symbolsWithOneRule, random);
        } else {
            lhs = getRandomElement(expandedSymbols, random);
        }

        const rhs = [
            getRandomElement(expandedSymbols, random),
            getRandomElement(expandedSymbols, random)
        ];
        rules.push({ lhs, rhs });
    }

    const grammar = {};
    for (const { lhs, rhs } of rules) {
        grammar[lhs] ??= [];
        grammar[lhs].push(rhs);
    }

    return grammar;
}
