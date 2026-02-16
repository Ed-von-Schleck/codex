// js/derivationVisualizer.js

const ANIMATION_DURATION = 200;

function cloneSymbolForDisplay(sourceSymbol) {
    const clone = sourceSymbol.cloneNode(true);
    clone.classList.remove('selected'); 
    return clone;
}

export function renderGeneratedString(symbolArray, highlightIndex = -1) {
    const container = document.createElement('div');
    container.className = 'example-content-wrapper';

    symbolArray.forEach((symbolOrNode, index) => {
        const symbolId = typeof symbolOrNode === 'object' ? symbolOrNode.symbolId : symbolOrNode;
        const sourceSymbol = document.getElementById(symbolId);
        if (!sourceSymbol) return;
        
        const clone = cloneSymbolForDisplay(sourceSymbol);
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
    const visualizer = document.querySelector('.derivation-visualizer');
    if (visualizer) visualizer.remove();
}

export function showDerivation(listItem, steps) {
    hideDerivation();

    const visualizer = document.createElement('div');
    visualizer.className = 'derivation-visualizer';

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
            ruleDiv.appendChild(cloneSymbolForDisplay(document.getElementById(rule.lhs)));
            ruleDiv.append('→');
            rule.rhs.forEach(id => ruleDiv.appendChild(cloneSymbolForDisplay(document.getElementById(id))));
        } else {
            ruleDiv.style.visibility = 'hidden';
        }
        
        stepDiv.append(sequenceDiv, ruleDiv);
        visualizer.appendChild(stepDiv);
    });

    document.body.appendChild(visualizer);

    // Smart Positioning Logic
    const rect = listItem.getBoundingClientRect();
    const visRect = visualizer.getBoundingClientRect();
    
    let top = rect.top;
    let left = rect.left - visRect.width - 20; // Try left side

    // If no room on left, try right
    if (left < 10) {
        left = rect.right + 20;
    }
    
    // Fallback: If still no room (mobile), the CSS will center it via fixed positioning
    visualizer.style.top = `${Math.max(10, Math.min(top, window.innerHeight - visRect.height - 10))}px`;
    visualizer.style.left = `${left}px`;
}
