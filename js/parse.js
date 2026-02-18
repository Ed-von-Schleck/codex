// js/parse.js

/**
 * Derives the highest symbol ID referenced anywhere in the grammar or the
 * token sequence. This replaces the previous hard-coded import of SYMBOL_COUNT,
 * making the parser a self-contained pure function with no external dependencies.
 */
function deriveMaxSymbol(grammar, tokenIds) {
    let max = 0;
    for (const id of tokenIds) {
        const n = Number(id);
        if (n > max) max = n;
    }
    for (const lhs in grammar) {
        const n = Number(lhs);
        if (n > max) max = n;
        for (const rhs of grammar[lhs]) {
            for (const sym of rhs) {
                const m = Number(sym);
                if (m > max) max = m;
            }
        }
    }
    return max;
}

export function parse(grammar, tokenIds, startSymbol) {
    const n = tokenIds.length;
    if (n === 0) return null;

    const maxSymbol = deriveMaxSymbol(grammar, tokenIds);

    const table = Array.from({ length: n }, () =>
        Array.from({ length: n + 1 }, () =>
            Array.from({ length: maxSymbol + 1 }, () => [])
        )
    );

    // Build inverse grammar map once: "B,C" -> [A, ...] for every rule A -> B C
    const inverseGrammar = new Map();
    for (const lhsId in grammar) {
        for (const rhs of grammar[lhsId]) {
            const key = rhs.join(',');
            if (!inverseGrammar.has(key)) {
                inverseGrammar.set(key, []);
            }
            inverseGrammar.get(key).push(lhsId);
        }
    }

    // Fill length-1 spans: each token recognises itself
    for (let i = 0; i < n; i++) {
        const tokenId = Number(tokenIds[i]);
        if (tokenId <= maxSymbol) {
            table[i][1][tokenId].push(null);
        }
    }

    // Fill longer spans via CYK
    for (let len = 2; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
            for (let p = 1; p < len; p++) {
                const firstPart = table[i][p];
                const secondPart = table[i + p][len - p];

                for (let B = 1; B <= maxSymbol; B++) {
                    if (firstPart[B].length === 0) continue;
                    for (let C = 1; C <= maxSymbol; C++) {
                        if (secondPart[C].length === 0) continue;

                        const key = `${B},${C}`;
                        const producers = inverseGrammar.get(key);
                        if (!producers) continue;
                        for (const A of producers) {
                            table[i][len][A].push({ rule: [String(B), String(C)], split: p });
                        }
                    }
                }
            }
        }
    }

    if (table[0][n][startSymbol].length > 0) {
        return table;
    }
    return null;
}

export function reconstructParseTree(table, startSymbolId, n) {
    if (!table || table[0][n][startSymbolId].length === 0) {
        return null;
    }

    function buildTree(symbolId, i, len) {
        const backpointers = table[i][len][symbolId];
        if (backpointers.length === 0) return null;

        const backpointer = backpointers[0];
        const node = { symbolId, children: [] };

        if (backpointer) {
            const { rule, split } = backpointer;
            const [B, C] = rule;
            const childB = buildTree(B, i, split);
            const childC = buildTree(C, i + split, len - split);
            if (childB && childC) {
                node.children.push(childB, childC);
                node.rule = rule;
            }
        }
        return node;
    }

    return buildTree(startSymbolId, 0, n);
}
