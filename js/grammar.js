// js/grammar.js

export function buildGrammarFromDOM() {
    const grammar = {};
    document.querySelectorAll('.rule-form').forEach(form => {
        const zones = form.querySelectorAll('.drop-zone');
        const lhsSymbolEl = zones[0]?.children?.[0];

        if (lhsSymbolEl) {
            const lhsId = lhsSymbolEl.id;
            const rhsSymbolEls = Array.from(zones).slice(1).map(z => z.children?.[0]);

            if (!rhsSymbolEls.includes(undefined)) {
                const rhsIds = rhsSymbolEls.map(el => el.id);
                grammar[lhsId] ??= [];
                grammar[lhsId].push(rhsIds);
            }
        }
    });
    return grammar;
}

export function generate(grammar, startSymbol, maxLength, minLength = 1) {
    if (!grammar || Object.keys(grammar).length === 0) return [];

    const results = [];
    const uniqueResultKeys = new Set();
    
    const initialState = {
        sequence: [startSymbol],
        usedRules: new Set(),
    };

    const queue = [initialState];
    const visited = new Set([startSymbol]);

    while (queue.length > 0) {
        const { sequence, usedRules } = queue.shift();
        const sequenceKey = sequence.join(',');

        if (sequence.length >= minLength && sequence.length <= maxLength) {
            if (!uniqueResultKeys.has(sequenceKey)) {
                uniqueResultKeys.add(sequenceKey);
                results.push({ result: sequence, usedRules });
            }
        }

        if (sequence.length >= maxLength) {
            continue;
        }

        for (let i = 0; i < sequence.length; i++) {
            const symbolToExpand = sequence[i];
            const productions = grammar[symbolToExpand];

            if (productions) {
                for (const chosenRule of productions) {
                    const newSequence = [...sequence.slice(0, i), ...chosenRule, ...sequence.slice(i + 1)];
                    const newSequenceKey = newSequence.join(',');

                    if (!visited.has(newSequenceKey)) {
                        visited.add(newSequenceKey);
                        
                        const rhsIds = chosenRule.join(',');
                        const newUsedRules = new Set(usedRules).add(`${symbolToExpand}->${rhsIds}`);
                        
                        queue.push({ sequence: newSequence, usedRules: newUsedRules });
                    }
                }
            }
        }
    }
    return results;
}
