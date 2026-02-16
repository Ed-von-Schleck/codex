// js/exampleSelector.js

export function selectVariedExamples(examplePool, grammar, targetCount, seed) {
    const random = new Math.seedrandom(seed);

    const getRandomElement = (arr) => {
        if (arr.length === 0) return undefined;
        return arr[Math.floor(random() * arr.length)];
    };

    const finalExamples = [];
    const finalExampleKeys = new Set();

    const ruleToExamplesMap = new Map();
    const allRules = new Set();
    for (const lhsId in grammar) {
        for (const rhs of grammar[lhsId]) {
            const ruleKey = `${lhsId}->${rhs.join(',')}`;
            allRules.add(ruleKey);
            ruleToExamplesMap.set(ruleKey, []);
        }
    }
    for (const example of examplePool) {
        for (const rule of example.usedRules) {
            ruleToExamplesMap.get(rule).push(example);
        }
    }

    const uncoveredRules = new Set(allRules);
    while (uncoveredRules.size > 0 && finalExamples.length < targetCount) {
        const randomRule = getRandomElement(Array.from(uncoveredRules));
        const candidates = ruleToExamplesMap.get(randomRule);
        if (!candidates || candidates.length === 0) {
            uncoveredRules.delete(randomRule);
            continue;
        }

        const chosenExample = getRandomElement(candidates);
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

    let remainingPool = examplePool.filter(ex => !finalExampleKeys.has(ex.result.join(',')));

    while (finalExamples.length < targetCount && remainingPool.length > 0) {
        const randomIndex = Math.floor(random() * remainingPool.length);
        const randomExample = remainingPool.splice(randomIndex, 1)[0];
        finalExamples.push(randomExample);
    }

    return finalExamples.sort((a, b) => a.result.length - b.result.length);
}
