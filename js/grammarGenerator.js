// js/grammarGenerator.js

const getRandomElement = (arr, random) => {
    if (arr.length === 0) return null;
    return arr[Math.floor(random() * arr.length)];
};

export function generateRandomGrammar(numSymbols, numRules, seed) {
    const random = new Math.seedrandom(seed);
    if (numSymbols === 0 || numRules === 0) return {};

    const allSymbols = Array.from({ length: numSymbols }, (_, i) => String(i + 1));
    const startSymbol = allSymbols[0];
    const rules = [];
    const expanded = new Set();
    const unexpanded = [startSymbol];

    const targetStartRules = numRules > 2 ? 2 : 1;
    let startRuleCount = 0;

    while (rules.length < numRules) {
        let lhs;
        
        if (startRuleCount < targetStartRules) {
            lhs = startSymbol;
            startRuleCount++;
        } else if (unexpanded.length > 0) {
            const idx = Math.floor(random() * unexpanded.length);
            lhs = unexpanded.splice(idx, 1)[0];
        } else {
            lhs = getRandomElement(Array.from(expanded), random);
        }

        const rhs = [
            getRandomElement(allSymbols, random),
            getRandomElement(allSymbols, random)
        ];

        rules.push({ lhs, rhs });
        expanded.add(lhs);

        for (const s of rhs) {
            if (!expanded.has(s) && !unexpanded.includes(s)) {
                unexpanded.push(s);
            }
        }
    }

    const grammar = {};
    for (const { lhs, rhs } of rules) {
        grammar[lhs] ??= [];
        grammar[lhs].push(rhs);
    }

    return grammar;
}
