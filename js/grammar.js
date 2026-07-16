// js/grammar.js — pure grammar operations, no DOM access.

/** Canonical string key for a rule; shared by generate() and exampleSelector. */
export const ruleKey = (lhs, rhs) => `${lhs}->${rhs.join(',')}`;

/** Builds a grammar object from rule-form states, ignoring incomplete rows. */
export function buildGrammar(formStates) {
    const grammar = {};
    for (const { lhs, rhs0, rhs1 } of formStates) {
        if (lhs && rhs0 && rhs1) {
            (grammar[lhs] ??= []).push([rhs0, rhs1]);
        }
    }
    return grammar;
}

/**
 * BFS over sentential forms. Returns every distinct sequence of exactly
 * `length` symbols reachable from startSymbol, each with the set of rules
 * used to derive it.
 */
export function generate(grammar, startSymbol, length) {
    if (!grammar || Object.keys(grammar).length === 0) return [];

    const results = [];
    const queue   = [{ sequence: [startSymbol], usedRules: new Set() }];
    const visited = new Set([startSymbol]);

    for (let head = 0; head < queue.length; head++) {
        const { sequence, usedRules } = queue[head];

        if (sequence.length === length) {
            results.push({ result: sequence, usedRules });
            continue; // every expansion would grow the sequence past `length`
        }

        for (let i = 0; i < sequence.length; i++) {
            const productions = grammar[sequence[i]];
            if (!productions) continue;

            for (const rhs of productions) {
                const newSequence = [...sequence.slice(0, i), ...rhs, ...sequence.slice(i + 1)];
                const key = newSequence.join(',');
                if (visited.has(key)) continue;
                visited.add(key);
                queue.push({
                    sequence:  newSequence,
                    usedRules: new Set(usedRules).add(ruleKey(sequence[i], rhs)),
                });
            }
        }
    }
    return results;
}
