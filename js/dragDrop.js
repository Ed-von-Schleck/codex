// js/dragDrop.js

import { selectSymbol, getSelectedSymbolId, clearSelection } from './ui.js';

let draggedFromZone = null;

export function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    draggedFromZone = e.target.parentElement.classList.contains('drop-zone') ? e.target.parentElement : null;
    document.body.classList.add('is-dragging');
}

export function handleDragEnd(e) {
    document.body.classList.remove('is-dragging');
    if (draggedFromZone && e.dataTransfer.dropEffect === 'none') {
        draggedFromZone.innerHTML = '';
        draggedFromZone.dispatchEvent(new CustomEvent('grammarChanged', { bubbles: true }));
    }
    draggedFromZone = null;
}

export function handleDragOver(e) {
    e.preventDefault();
    const targetZone = e.target.closest('.drop-zone');
    if (targetZone && !targetZone.dataset.locked) {
        e.dataTransfer.dropEffect = 'move';
        targetZone.classList.add('drag-over');
    }
}

export function handleDragLeave(e) {
    const targetZone = e.target.closest('.drop-zone');
    if (targetZone) targetZone.classList.remove('drag-over');
}

export function handleDrop(e) {
    e.preventDefault();
    const targetZone = e.target.closest('.drop-zone');
    if (!targetZone || targetZone.dataset.locked) return;

    targetZone.classList.remove('drag-over');
    const droppedSymbolId = e.dataTransfer.getData('text/plain');
    performPlacement(targetZone, droppedSymbolId, !!draggedFromZone);
}

/**
 * Handle Tap-to-Place logic
 */
export function handleZoneClick(e) {
    const targetZone = e.currentTarget;
    if (targetZone.dataset.locked) return;

    const selectedId = getSelectedSymbolId();
    if (selectedId) {
        performPlacement(targetZone, selectedId, false);
    } else if (targetZone.children.length > 0) {
        // If clicking a filled zone without a selection, clear it
        targetZone.innerHTML = '';
        targetZone.dispatchEvent(new CustomEvent('grammarChanged', { bubbles: true }));
    }
}

/**
 * Shared placement logic for both Drag-and-Drop and Tap-to-Place
 */
function performPlacement(targetZone, symbolId, isMove) {
    const sourceSymbol = document.getElementById(symbolId);
    if (!sourceSymbol) return;

    const newElement = isMove && draggedFromZone 
        ? draggedFromZone.children[0] 
        : sourceSymbol.cloneNode(true);

    // Re-attach listeners for clones
    newElement.draggable = true;
    newElement.addEventListener('dragstart', handleDragStart);
    newElement.addEventListener('dragend', handleDragEnd);
    
    // Tap listener for the new clone (to allow re-selecting it)
    newElement.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSymbol(symbolId);
    });

    const existingElement = targetZone.children?.[0];

    if (isMove && draggedFromZone && draggedFromZone !== targetZone) {
        if (existingElement) draggedFromZone.appendChild(existingElement);
        else draggedFromZone.innerHTML = '';
    }
    
    targetZone.innerHTML = '';
    targetZone.appendChild(newElement);
    targetZone.dispatchEvent(new CustomEvent('grammarChanged', { bubbles: true }));
    clearSelection();
}
