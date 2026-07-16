// js/derivationVisualizer.js

import { cloneSymbol } from './domSetup.js';

export function renderGeneratedString(symbolArray, highlightIndex = -1) {
    const container = document.createElement('div');
    container.className = 'example-content-wrapper';

    symbolArray.forEach((symbolOrNode, index) => {
        const symbolId = typeof symbolOrNode === 'object' ? symbolOrNode.symbolId : symbolOrNode;
        const clone = cloneSymbol(symbolId, false);
        if (!clone) return;

        if (index === highlightIndex) {
            clone.classList.add('replaced-symbol');
        }
        container.appendChild(clone);
    });
    return container;
}

export function generateDerivationSteps(parseTree) {
    const allSteps = [];
    let currentSequence = [parseTree];

    allSteps.push({
        sequence: [...currentSequence],
        rule: { lhs: null, rhs: null },
        replacedSymbolIndex: -1
    });

    while (currentSequence.some(item => item?.children?.length > 0)) {
        const nextSequence = [];
        let hasExpandedThisStep = false;
        let appliedRule = null;
        let replacedIndex = -1;

        for (const [index, item] of currentSequence.entries()) {
            if (item?.children?.length > 0 && !hasExpandedThisStep) {
                nextSequence.push(...item.children);
                appliedRule = { lhs: item.symbolId, rhs: item.rule };
                replacedIndex = index;
                hasExpandedThisStep = true;
            } else {
                nextSequence.push(item);
            }
        }
        if (!hasExpandedThisStep) break;
        currentSequence = nextSequence;
        allSteps.push({
            sequence: [...currentSequence],
            rule: appliedRule,
            replacedSymbolIndex: replacedIndex
        });
    }
    return allSteps;
}

export function hideDerivation() {
    document.querySelector('.derivation-visualizer')?.remove();
}

export function showDerivation(listItem, steps) {
    hideDerivation();

    const visualizer = document.createElement('div');
    visualizer.className = 'derivation-visualizer';

    const header = document.createElement('div');
    header.className = 'visualizer-header';
    header.textContent = 'DERIVATION LOG // RECONSTRUCTION';
    visualizer.appendChild(header);

    steps.forEach((currentStep, i) => {
        const nextStep = steps[i + 1];
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';

        const highlightIndex = nextStep ? nextStep.replacedSymbolIndex : -1;
        const sequenceDiv = renderGeneratedString(currentStep.sequence, highlightIndex);

        const ruleDiv = document.createElement('div');
        ruleDiv.className = 'step-rule';

        if (nextStep?.rule?.lhs) {
            const { rule } = nextStep;
            ruleDiv.appendChild(cloneSymbol(rule.lhs, false));
            ruleDiv.insertAdjacentHTML('beforeend', '<span class="rule-arrow-mini">→</span>');
            rule.rhs.forEach(id => ruleDiv.appendChild(cloneSymbol(id, false)));
        } else {
            ruleDiv.style.visibility = 'hidden';
        }

        stepDiv.append(sequenceDiv, ruleDiv);
        visualizer.appendChild(stepDiv);
    });

    // Append hidden first to measure the final size before positioning.
    visualizer.style.visibility = 'hidden';
    document.body.appendChild(visualizer);

    const rect = listItem.getBoundingClientRect();
    const visRect = visualizer.getBoundingClientRect();
    const padding = 20;

    let top = rect.top + (rect.height / 2) - (visRect.height / 2);
    let left = rect.left - visRect.width - 30; // left of the sidebar
    if (left < padding) left = rect.right + 30; // flip to the right if off-screen

    top = Math.max(padding, Math.min(top, window.innerHeight - visRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - visRect.width - padding));

    visualizer.style.top = `${top}px`;
    visualizer.style.left = `${left}px`;
    visualizer.style.visibility = 'visible';
}
