// js/exampleSelector.js

import { ruleKey } from './grammar.js';
import { getRandomElement } from './grammarGenerator.js';

/**
 * Picks `targetCount` examples from the pool, preferring a set that covers
 * every grammar rule, then topping up with random distinct examples.
 */
export function selectVariedExamples(examplePool, grammar, targetCount, seed) {
    const random = new Math.seedrandom(seed);

    const finalExamples = [];
    const finalExampleKeys = new Set();

    const ruleToExamplesMap = new Map();
    for (const lhs in grammar) {
        for (const rhs of grammar[lhs]) {
            ruleToExamplesMap.set(ruleKey(lhs, rhs), []);
        }
    }
    for (const example of examplePool) {
        for (const rule of example.usedRules) {
            ruleToExamplesMap.get(rule).push(example);
        }
    }

    const uncoveredRules = new Set(ruleToExamplesMap.keys());
    while (uncoveredRules.size > 0 && finalExamples.length < targetCount) {
        const randomRule = getRandomElement(Array.from(uncoveredRules), random);
        const candidates = ruleToExamplesMap.get(randomRule);
        if (candidates.length === 0) {
            uncoveredRules.delete(randomRule);
            continue;
        }

        const chosenExample = getRandomElement(candidates, random);
        const exampleKey = chosenExample.result.join(',');

        if (!finalExampleKeys.has(exampleKey)) {
            finalExamples.push(chosenExample);
            finalExampleKeys.add(exampleKey);
            for (const rule of chosenExample.usedRules) {
                uncoveredRules.delete(rule);
            }
        } else {
            uncoveredRules.delete(randomRule);
        }
    }

    const remainingPool = examplePool.filter(ex => !finalExampleKeys.has(ex.result.join(',')));
    while (finalExamples.length < targetCount && remainingPool.length > 0) {
        const randomIndex = Math.floor(random() * remainingPool.length);
        finalExamples.push(remainingPool.splice(randomIndex, 1)[0]);
    }

    return finalExamples;
}
