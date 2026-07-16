// js/hints.js
//
// Hint computation for CODEX.
//
// The hint system NEVER assumes the player is building the hidden grammar.
// It finds any valid complete grammar consistent with the player's current
// filled slots, then hints the next empty slot from that completion.
//
// Three-phase algorithm:
//   A. Try all permutations of hidden-grammar rules. If any matches every
//      filled slot (0 conflicts), the player is on track → fill next empty.
//   B. If all permutations conflict, run a bounded deterministic backtracking
//      search for an alternative valid completion. If found → fill next empty.
//   C. If no alternative exists, the player is cornered. Suggest replacing
//      the first conflicting slot with the hidden-grammar permutation's value.

import { START_SYMBOL } from './constants.js';
import { parse } from './parse.js';

// Maximum nodes explored before the backtracking search gives up.
// 10 000 nodes at ~875 CYK ops/leaf is well under 100 ms on any device.
const MAX_BACKTRACK_NODES = 10_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes the next hint given the current game state.
 *
 * @param {object}   hiddenGrammar  — the hidden grammar object from game.js
 * @param {object[]} formStates     — current slot values from readFormStates()
 * @param {object[]} examples       — target example objects with .result arrays
 * @param {number}   symbolCount    — number of symbols in the active difficulty
 *
 * @returns {{ formIndex:number, slot:string, symbolId:string, isRepair:boolean }|null}
 *   formIndex — which rule form (0-indexed)
 *   slot      — 'lhs' | 'rhs0' | 'rhs1'
 *   symbolId  — the symbol to place (as a string, e.g. '3')
 *   isRepair  — true if the slot already has the wrong symbol and must be cleared
 *
 *   Returns null only if everything is already correct (game is won).
 */
export function computeHint(hiddenGrammar, formStates, examples, symbolCount) {
    const hiddenRules = flattenGrammar(hiddenGrammar);
    // Safety: if rule counts mismatch (shouldn't happen), fall back gracefully.
    if (hiddenRules.length !== formStates.length) {
        console.warn('CODEX hints: rule count mismatch. Falling back to first rule.');
        return findRepairSlot(formStates, hiddenRules.slice(0, formStates.length));
    }

    // ── Phase A: Hidden grammar permutation search ────────────────────────
    // Only consider permutations where perm[0].lhs === START_SYMBOL, since
    // form 0's LHS is permanently locked to the start symbol.
    const perms = generatePermutations(hiddenRules)
        .filter(p => p[0].lhs === START_SYMBOL);

    let bestPerm      = perms[0] ?? hiddenRules; // fallback if none pass filter
    let bestConflicts = Infinity;

    for (const perm of perms) {
        const conflicts = scorePermutation(perm, formStates);
        if (conflicts < bestConflicts) {
            bestConflicts = conflicts;
            bestPerm      = perm;
        }
        if (conflicts === 0) break; // can't do better
    }

    if (bestConflicts === 0) {
        // Player's filled slots are fully consistent with this permutation.
        return findNextSlot(formStates, bestPerm, false);
    }

    // ── Phase B: Alternative valid-completion search ──────────────────────
    // The player might be building a different valid grammar. Search for any
    // completion of the empty slots that parses all examples.
    const altCompletion = findAlternativeCompletion(formStates, examples, symbolCount);
    if (altCompletion) {
        return findNextSlot(formStates, altCompletion, false);
    }

    // ── Phase C: Repair ───────────────────────────────────────────────────
    // No valid completion exists from the player's current state.
    // Guide them toward the best matching hidden-grammar permutation,
    // replacing the first wrong slot.
    return findRepairSlot(formStates, bestPerm);
}

// ---------------------------------------------------------------------------
// Grammar utilities
// ---------------------------------------------------------------------------

/**
 * Flattens a grammar object to an ordered array of rule objects.
 * { '1': [['2','3'], ['4','5']], '2': [['1','3']] }
 *   → [{ lhs:'1', rhs0:'2', rhs1:'3' }, { lhs:'1', rhs0:'4', rhs1:'5' }, ...]
 */
function flattenGrammar(grammar) {
    const rules = [];
    for (const lhs in grammar) {
        for (const rhs of grammar[lhs]) {
            rules.push({ lhs, rhs0: rhs[0], rhs1: rhs[1] });
        }
    }
    return rules;
}

/**
 * Builds a grammar object from an array of rule-form state objects.
 * Only includes rows where all three slots are filled.
 */
function buildGrammarFromFormStates(formStates) {
    const grammar = {};
    for (const { lhs, rhs0, rhs1 } of formStates) {
        if (lhs && rhs0 && rhs1) {
            grammar[lhs] ??= [];
            grammar[lhs].push([rhs0, rhs1]);
        }
    }
    return grammar;
}

/** Returns true if the grammar parses every example string. */
function parsesAll(grammar, examples) {
    return examples.every(ex => parse(grammar, ex.result, START_SYMBOL) !== null);
}

// ---------------------------------------------------------------------------
// Permutation utilities
// ---------------------------------------------------------------------------

/** Generates all permutations of an array (recursive, fine for length ≤ 5). */
function generatePermutations(arr) {
    if (arr.length <= 1) return [[...arr]];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const rest = arr.filter((_, j) => j !== i);
        for (const perm of generatePermutations(rest)) {
            result.push([arr[i], ...perm]);
        }
    }
    return result;
}

/**
 * Counts how many of the player's filled slots conflict with a given
 * permutation of hidden rules.
 *
 * Form 0's LHS is always START_SYMBOL (locked) and is always included in
 * the check — so permutations where perm[0].lhs !== START_SYMBOL get a
 * guaranteed conflict even if the player has no other fills.
 */
function scorePermutation(perm, formStates) {
    let conflicts = 0;
    for (let i = 0; i < formStates.length; i++) {
        const form = formStates[i];
        const rule = perm[i];
        // For form 0 lhs: always filled (START_SYMBOL) — check it
        if (form.lhs  !== null && form.lhs  !== rule.lhs)  conflicts++;
        if (form.rhs0 !== null && form.rhs0 !== rule.rhs0) conflicts++;
        if (form.rhs1 !== null && form.rhs1 !== rule.rhs1) conflicts++;
    }
    return conflicts;
}

// ---------------------------------------------------------------------------
// Slot-selection helpers
// ---------------------------------------------------------------------------

/**
 * Returns the ordered list of slots to consider for a given form index.
 * Form 0's LHS is permanently locked (always filled with START_SYMBOL),
 * so we skip it.
 */
function slotOrder(formIndex) {
    return formIndex === 0 ? ['rhs0', 'rhs1'] : ['lhs', 'rhs0', 'rhs1'];
}

/** True if a form has at least one free slot filled and at least one empty. */
function isPartiallyFilled(form, formIndex) {
    const slots = slotOrder(formIndex);
    const filledCount = slots.filter(s => form[s] !== null).length;
    return filledCount > 0 && filledCount < slots.length;
}

/**
 * Finds the next empty slot to hint, given a fully-specified target completion.
 *
 * Priority:
 *   1. Complete a partially-started row (some slots filled, some empty).
 *      Gives the player immediate visual feedback when a rule completes.
 *   2. Start a fresh empty row.
 *
 * Within each priority tier, rows are processed in form order (0, 1, 2, …).
 * Within a row: lhs → rhs0 → rhs1 (skipping the locked lhs for form 0).
 *
 * @param {boolean} isRepair — passed through to the returned hint object.
 */
function findNextSlot(formStates, targetRules, isRepair) {
    // Priority 1: partially filled rows
    for (let i = 0; i < formStates.length; i++) {
        if (!isPartiallyFilled(formStates[i], i)) continue;
        for (const slot of slotOrder(i)) {
            if (formStates[i][slot] === null) {
                return { formIndex: i, slot, symbolId: targetRules[i][slot], isRepair };
            }
        }
    }

    // Priority 2: completely empty rows
    for (let i = 0; i < formStates.length; i++) {
        const slots = slotOrder(i);
        if (slots.some(s => formStates[i][s] !== null)) continue; // not fully empty
        return { formIndex: i, slot: slots[0], symbolId: targetRules[i][slots[0]], isRepair };
    }

    return null; // all slots filled — game should be won already
}

/**
 * Finds the first slot that is either wrong (filled but conflicting with
 * targetRules) or empty. Used in the repair phase.
 *
 * Empty slots are returned with isRepair: false (they just need filling).
 * Conflicting slots are returned with isRepair: true (they need replacing).
 */
function findRepairSlot(formStates, targetRules) {
    for (let i = 0; i < formStates.length; i++) {
        for (const slot of slotOrder(i)) {
            const current = formStates[i][slot];
            const target  = targetRules[i]?.[slot];
            if (target === undefined) continue; // safety guard
            if (current === null)    return { formIndex: i, slot, symbolId: target, isRepair: false };
            if (current !== target)  return { formIndex: i, slot, symbolId: target, isRepair: true  };
        }
    }
    return null; // nothing wrong — game is won
}

// ---------------------------------------------------------------------------
// Alternative-completion search (backtracking)
// ---------------------------------------------------------------------------

/**
 * Collects all empty slots from formStates in the natural fill order.
 * (Form 0 rhs0/rhs1, then form 1 lhs/rhs0/rhs1, etc.)
 */
function collectEmptySlots(formStates) {
    const slots = [];
    for (let i = 0; i < formStates.length; i++) {
        for (const slot of slotOrder(i)) {
            if (formStates[i][slot] === null) {
                slots.push({ formIndex: i, slot });
            }
        }
    }
    return slots;
}

/**
 * Searches for any completion of the empty slots such that the resulting
 * grammar parses all example strings.
 *
 * Uses deterministic DFS (symbols tried in order '1', '2', …) so that
 * repeated calls with the same player state always return the same completion.
 * Capped at MAX_BACKTRACK_NODES to stay responsive on harder difficulties.
 *
 * Returns an array of rule objects in form order (same shape as a hidden
 * grammar permutation), or null if no valid completion was found.
 */
function findAlternativeCompletion(formStates, examples, symbolCount) {
    const emptySlots = collectEmptySlots(formStates);
    if (emptySlots.length === 0) {
        // All slots filled — check if the grammar already parses everything
        const g = buildGrammarFromFormStates(formStates);
        return parsesAll(g, examples)
            ? formStates.map(f => ({ lhs: f.lhs, rhs0: f.rhs0, rhs1: f.rhs1 }))
            : null;
    }

    // Deep-copy formStates so backtracking can mutate freely
    const workStates = formStates.map(f => ({ ...f }));
    const counter    = { n: 0 };
    const symbols    = Array.from({ length: symbolCount }, (_, i) => String(i + 1));

    const result = backtrack(workStates, emptySlots, 0, examples, symbols, counter);
    return result;
}

/**
 * Recursive DFS backtracker.
 * At the leaf (all empty slots filled) it runs CYK on all examples.
 */
function backtrack(workStates, emptySlots, idx, examples, symbols, counter) {
    if (++counter.n > MAX_BACKTRACK_NODES) return null;

    if (idx === emptySlots.length) {
        const grammar = buildGrammarFromFormStates(workStates);
        return parsesAll(grammar, examples)
            ? workStates.map(f => ({ lhs: f.lhs, rhs0: f.rhs0, rhs1: f.rhs1 }))
            : null;
    }

    const { formIndex, slot } = emptySlots[idx];

    for (const sym of symbols) {
        workStates[formIndex][slot] = sym;
        const result = backtrack(workStates, emptySlots, idx + 1, examples, symbols, counter);
        if (result !== null) return result;
        workStates[formIndex][slot] = null; // restore for next iteration
    }

    return null;
}
