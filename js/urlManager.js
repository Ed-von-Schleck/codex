// js/urlManager.js
//
// Handles all URL-related concerns: reading game parameters from the URL
// on startup, writing parameters back after each game starts, and building
// the share URL for the clipboard.
//
// URL schema:  ?seed=ABC123&diff=standard
//   seed — 6 uppercase alphanumeric characters (A-Z, 0-9)
//   diff — lowercase difficulty key: novice | standard | expert | insanity

import { DIFFICULTIES, DEFAULT_DIFFICULTY_KEY } from './difficulty.js';

// ── Constants ────────────────────────────────────────────────────────────────

const SEED_PARAM = 'seed';
const DIFF_PARAM = 'diff';
const SEED_PATTERN = /^[A-Z0-9]{6}$/;

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Parses the current URL's query string for game parameters.
 *
 * Returns:
 *   { seed: string|null, difficultyKey: string|null }
 *
 * Either value is null if the parameter is absent or invalid.
 * Callers should treat null as "use your own default".
 */
export function getGameParamsFromURL() {
    const params = new URLSearchParams(window.location.search);

    const rawSeed = params.get(SEED_PARAM);
    const seed = rawSeed && SEED_PATTERN.test(rawSeed.toUpperCase())
        ? rawSeed.toUpperCase()
        : null;

    const rawDiff = params.get(DIFF_PARAM);
    const difficultyKey = rawDiff && DIFFICULTIES[rawDiff.toUpperCase()]
        ? rawDiff.toUpperCase()
        : null;

    return { seed, difficultyKey };
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Updates the browser URL (without a page reload) to reflect the game that
 * just started. Uses replaceState so the browser history isn't polluted with
 * every new puzzle.
 */
export function setGameParamsInURL(seed, difficultyKey) {
    const params = new URLSearchParams();
    params.set(SEED_PARAM, seed);
    params.set(DIFF_PARAM, difficultyKey.toLowerCase());

    const base = window.location.origin + window.location.pathname;
    const newURL = `${base}?${params.toString()}`;

    window.history.replaceState(null, '', newURL);
}

// ── Clipboard ─────────────────────────────────────────────────────────────────

/**
 * Copies the current page URL (which always reflects the active game after
 * setGameParamsInURL has been called) to the clipboard.
 *
 * Returns a Promise that resolves on success and rejects on failure.
 * Tries the modern Clipboard API first, falls back to execCommand for
 * HTTP environments (e.g. python -m http.server), and as a last resort
 * opens a prompt so the user can copy manually.
 */
export async function copyShareURL() {
    const url = window.location.href;

    // Modern path — requires HTTPS or localhost
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(url);
            return;
        } catch {
            // Fall through to legacy method
        }
    }

    // Legacy path — works on HTTP
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.cssText =
        'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let success = false;
    try {
        success = document.execCommand('copy');
    } catch {
        // Fall through to prompt
    }
    document.body.removeChild(textarea);

    if (success) return;

    // Last resort — let the user copy manually from a prompt.
    // This is the graceful failure path and should be essentially unreachable
    // in any browser made after 2015.
    window.prompt('Copy this link to share the puzzle:', url);
}
