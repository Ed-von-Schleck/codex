// js/parse.js

import { SYMBOL_COUNT } from './constants.js';

export function parse(grammar, tokenIds, startSymbol) {
  const n = tokenIds.length;
  if (n === 0) return null;

  const table = Array.from({ length: n }, () =>
    Array.from({ length: n + 1 }, () =>
      Array.from({ length: SYMBOL_COUNT + 1 }, () => [])
    )
  );

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

  for (let i = 0; i < n; i++) {
    const tokenId = tokenIds[i];
    table[i][1][tokenId].push(null);
  }

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      for (let p = 1; p < len; p++) {
        const firstPart = table[i][p];
        const secondPart = table[i + p][len - p];

        for (let B = 1; B <= SYMBOL_COUNT; B++) {
          if (firstPart[B].length === 0) continue;
          for (let C = 1; C <= SYMBOL_COUNT; C++) {
            if (secondPart[C].length === 0) continue;

            const key = `${B},${C}`;
            const producers = inverseGrammar.get(key) || [];
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
