// js/dragDrop.js
//
// All symbol interaction — drag-and-drop and tap-to-place — via listeners
// delegated to the document. Symbols and drop zones need no wiring of their
// own, so clones behave identically to originals by construction.

import { cloneSymbol, setZoneContent } from './domSetup.js';
import { selectSymbol, getSelectedSymbolId, clearSelection } from './ui.js';

let draggedFromZone = null;

function dropTarget(e) {
    const zone = e.target.closest('.drop-zone');
    return zone && !zone.dataset.locked ? zone : null;
}

export function setupDragDropEvents() {
    document.addEventListener('dragstart', (e) => {
        const symbol = e.target.closest('.symbol');
        if (!symbol) return;
        e.dataTransfer.setData('text/plain', symbol.dataset.symbolId);
        draggedFromZone = symbol.parentElement.classList.contains('drop-zone')
            ? symbol.parentElement
            : null;
        document.body.classList.add('is-dragging');
    });

    document.addEventListener('dragend', (e) => {
        document.body.classList.remove('is-dragging');
        // Dropped outside any zone: dragging a placed symbol away removes it.
        if (draggedFromZone && e.dataTransfer.dropEffect === 'none') {
            setZoneContent(draggedFromZone, null);
        }
        draggedFromZone = null;
    });

    document.addEventListener('dragover', (e) => {
        const zone = dropTarget(e);
        if (!zone) return; // no preventDefault → not a drop target
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
    });

    document.addEventListener('dragleave', (e) => {
        e.target.closest('.drop-zone')?.classList.remove('drag-over');
    });

    document.addEventListener('drop', (e) => {
        const zone = dropTarget(e);
        if (!zone) return;
        e.preventDefault();
        zone.classList.remove('drag-over');
        placeSymbol(zone, e.dataTransfer.getData('text/plain'), !!draggedFromZone);
    });

    // Tap-to-place: tap a symbol to select it, tap a zone to place it there.
    document.addEventListener('click', (e) => {
        const zone = e.target.closest('.drop-zone');
        if (zone?.dataset.locked) return;

        const symbol = e.target.closest('.symbol');
        if (symbol && (zone || symbol.parentElement.id === 'symbol-palette')) {
            selectSymbol(symbol.dataset.symbolId);
            return;
        }
        if (!zone) return;

        const selectedId = getSelectedSymbolId();
        if (selectedId) {
            placeSymbol(zone, selectedId, false);
        } else if (zone.children.length > 0) {
            setZoneContent(zone, null); // tap a filled zone with no selection: clear it
        }
    });
}

/** Shared placement for drag-and-drop and tap-to-place. */
function placeSymbol(targetZone, symbolId, isMove) {
    const newElement = isMove && draggedFromZone
        ? draggedFromZone.children[0]
        : cloneSymbol(symbolId);
    if (!newElement) return;

    // Moving onto an occupied zone swaps: the displaced symbol goes back
    // to the source zone (appendChild below detaches it from the target).
    if (isMove && draggedFromZone && draggedFromZone !== targetZone) {
        const displaced = targetZone.children[0];
        if (displaced) draggedFromZone.appendChild(displaced);
    }

    setZoneContent(targetZone, newElement);
    clearSelection();
}
