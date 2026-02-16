import { renderGeneratedString } from './derivationVisualizer.js';

export const ui = {};

export function initUI() {
    ui.examplesList = document.getElementById('examples-list');
    ui.rulesContainer = document.getElementById('rules-list');
    ui.menuButton = document.getElementById('menu-button');
    ui.workspaceOverlay = document.getElementById('workspace-overlay');
    ui.overlayTitle = document.getElementById('overlay-title');
    ui.overlayNewGameButton = document.getElementById('overlay-new-game-button');
    ui.gameSeedDisplay = document.getElementById('game-seed-display');
    ui.progressDisplay = document.getElementById('game-progress');
    ui.progressFill = document.getElementById('progress-fill'); // New visual bar
}

export function displayMessage(message) { console.log(message); }
export function clearMessage() {}

export function displaySeed(seed) {
    if (ui.gameSeedDisplay) ui.gameSeedDisplay.textContent = `SEQ_ID: ${seed}`;
}

export function displayExamples(examples) {
    ui.examplesList.innerHTML = '';
    examples.forEach((example, index) => {
        const li = document.createElement('li');
        li.dataset.exampleId = index;
        const wrapper = renderGeneratedString(example.result);
        li.appendChild(wrapper);
        ui.examplesList.appendChild(li);
    });
    updateProgress(0, examples.length);
}

export function updateValidationStatus(exampleIndex, isParsable) {
    const li = ui.examplesList.querySelector(`li[data-example-id='${exampleIndex}']`);
    if (li) li.classList.toggle('is-valid', isParsable);
    
    const total = ui.examplesList.querySelectorAll('li').length;
    const solved = ui.examplesList.querySelectorAll('li.is-valid').length;
    updateProgress(solved, total);
}

function updateProgress(solved, total) {
    if (ui.progressDisplay) ui.progressDisplay.textContent = `${solved}/${total}`;
    if (ui.progressFill) {
        const percentage = total > 0 ? (solved / total) * 100 : 0;
        ui.progressFill.style.width = `${percentage}%`;
    }
}

export function showOverlay(title = '', type = 'menu') {
    ui.overlayTitle.textContent = title;
    ui.workspaceOverlay.classList.remove('hidden');
}

export function hideOverlay() {
    ui.workspaceOverlay.classList.add('hidden');
}

let selectedSymbolId = null;

export function selectSymbol(id) {
    if (selectedSymbolId === id) {
        clearSelection();
        return;
    }
    
    clearSelection();
    selectedSymbolId = id;
    const el = document.getElementById(id);
    if (el) el.classList.add('selected');
    document.body.classList.add('has-selection');
}

export function clearSelection() {
    selectedSymbolId = null;
    document.querySelectorAll('.symbol.selected').forEach(el => el.classList.remove('selected'));
    document.body.classList.remove('has-selection');
}

export function getSelectedSymbolId() {
    return selectedSymbolId;
}
