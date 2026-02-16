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
    
    // Add a header for the "Data Log" look
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
            ruleDiv.appendChild(cloneSymbolForDisplay(document.getElementById(rule.lhs)));
            ruleDiv.insertAdjacentHTML('beforeend', '<span class="rule-arrow-mini">→</span>');
            rule.rhs.forEach(id => ruleDiv.appendChild(cloneSymbolForDisplay(document.getElementById(id))));
        } else {
            ruleDiv.style.visibility = 'hidden';
        }
        
        stepDiv.append(sequenceDiv, ruleDiv);
        visualizer.appendChild(stepDiv);
    });

    // We must append it to the body hidden first to measure its final size
    visualizer.style.visibility = 'hidden';
    visualizer.style.display = 'block';
    document.body.appendChild(visualizer);

    const rect = listItem.getBoundingClientRect();
    const visRect = visualizer.getBoundingClientRect();
    
    // Calculate vertical center
    let top = rect.top + (rect.height / 2) - (visRect.height / 2);
    
    // Position to the LEFT of the sidebar (standard)
    let left = rect.left - visRect.width - 30; 

    // FLIP logic: If it goes off-screen left, put it on the right
    if (left < 20) {
        left = rect.right + 30;
    }

    // FINAL CLAMP: Keep it inside the viewport padding
    const padding = 20;
    top = Math.max(padding, Math.min(top, window.innerHeight - visRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - visRect.width - padding));

    visualizer.style.top = `${top}px`;
    visualizer.style.left = `${left}px`;
    visualizer.style.visibility = 'visible';
}
