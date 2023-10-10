import zip from "lodash/zip";
import last from "lodash/last";
import reduce from "lodash/reduce";
import { Matrix } from "ml-matrix";
import range from "lodash/range";

/**
 * Returns a permutation that, if applied to x, sorts it ascendingly.
 *
 * @param x the array
 */
export function sortPerm(x: number[]) {
  return [...x]
    .map((v, i) => [v, i])
    .sort(([v1], [v2]) => (v1 < v2 ? -1 : v2 < v1 ? 1 : 0))
    .map(([v, i]) => i);
}

/**
 * Given a permutation p, it returns its inverse permutation p'.
 * applyPerm(applyPerm(x, p), p') = x
 *
 * @param perm the permutation
 */
export function invertPerm(perm: number[]) {
  // perm is e.g. [3,4,2,1] which means 1st element goes to index 3, 2nd to 4th etc.
  // the inverse permutation is then moving the 3rd element to index 1, the 4th to 2nd etc.
  // => [4,3,1,2]
  let inverted = perm.map(() => -1); // init
  for (const [from, to] of perm.entries()) {
    inverted[to] = from;
  }
  return inverted;
}

/**
 * Applies a permutation to the array. Does not mutate.
 *
 * @param x the array
 * @param perm the permutation
 */
export function applyPerm<T = any>(x: T[], perm: number[]) {
  return perm.map((i) => x[i]);
}

export function sameValueRanges(x: number[], minLength = 1) {
  let result = [];
  let it = [0];
  for (let i = 1; i < x.length; i++) {
    if (x[it[0]] === x[i]) {
      // same rank as before
      it.push(i);
    } else {
      // different rank
      if (it.length > minLength) {
        result.push(it);
      }
      it = [i];
    }
  }
  if (it.length > minLength) {
    result.push(it);
  }
  return result;
}

export function sum(values: number[]) {
  return values.reduce((s, v) => s + v, 0);
}

/**
 * Returns the rank of the array's elements.
 *
 * @param x the array. null ellements are not allowed.
 * @param ties how ties should be handled. options are 'min', 'avg', 'max'. defaults to 'avg'.
 */
export function rank(x: number[], ties: "min" | "avg" | "max" = "avg") {
  const perm = sortPerm(x);
  const sorted = applyPerm(x, perm);
  type Accumulator<T> = {
    tieValue: null | T;
    lastValue: null | T;
    numTies: number;
    ranks: number[];
  };
  const foo = reduce<number, Accumulator<number>>(
    sorted,
    (agg, v, i) => {
      // TODO floating points? are we ok?
      if (agg.lastValue === v) {
        return {
          tieValue: v,
          lastValue: v,
          numTies: agg.numTies + 1,
          ranks: [...agg.ranks, last(agg.ranks)!],
        };
      }
      return {
        tieValue: null,
        lastValue: v,
        numTies: 0,
        ranks: [...agg.ranks, i + 1],
      };
    },
    {
      tieValue: null,
      numTies: 0,
      lastValue: null,
      ranks: [],
    }
  );
  const subRangesOfSameRank = sameValueRanges(foo.ranks);
  for (const subrange of subRangesOfSameRank) {
    const min = foo.ranks[subrange[0]];
    const max = min + subrange.length - 1;
    const avg = (min + max) / 2;
    let replaceWith = 0;
    switch (ties) {
      case "min":
        replaceWith = min;
        break;
      case "avg":
        replaceWith = avg;
        break;
      case "max":
        replaceWith = max;
        break;
    }
    for (const index of subrange) {
      foo.ranks[index] = replaceWith;
    }
  }
  return applyPerm(foo.ranks, invertPerm(perm));
}

export type MoltenCell = {
  row: number;
  col: number;
  value: number;
};
export type MoltenMatrix = MoltenCell[];
export function melt(D: Matrix, triangleOnly = false): MoltenMatrix {
  const result = [];
  for (let i = 0; i < D.rows; i++) {
    for (let j = triangleOnly ? i + 1 : 0; j < D.columns; j++) {
      result.push({
        row: i,
        col: j,
        value: D.get(i, j),
      });
    }
  }
  return result;
}

export function unmelt(M: MoltenMatrix, fromTriangle = true) {
  if (fromTriangle) {
    const N = Math.max(...M.map((d) => d.col)) + 1;
    const D = Matrix.zeros(N, N);
    for (const d of M) {
      D.set(d.row, d.col, d.value);
      D.set(d.col, d.row, d.value);
    }
    return D;
  }
  throw new Error("do not know how to unmelt from full D");
}

export function ed(v1: number[], v2: number[]) {
  if (v1.length !== v2.length) {
    throw new Error(
      `vectors must be same length: ${v1.length} !== ${v2.length}`
    );
  }
  return Math.sqrt(
    zip(v1, v2)
      .map(([x1, x2]) => Math.abs(x1! - x2!) ** 2)
      .reduce((s, v) => s + v, 0)
  );
}

export function hammingDistance<T = number>(v1: T[], v2: T[]): number {
  if (v1.length !== v2.length) {
    throw new Error(
      `hamming distance requires equal-length strings. got ${v1.length} and ${v2.length}.`
    );
  }
  let hamming = 0;
  for (let i = 0; i < v1.length; i++) {
    if (v1[i] === v2[i]) {
      hamming += 1;
    }
  }
  return hamming;
}

export function longestCommonSubsequence<T = number>(v1: T[], v2: T[]) {
  const m = v1.length;
  const n = v2.length;
  const C = new Matrix(m + 1, n + 1);
  C.setRow(
    0,
    [...v1, 0].map(() => 0)
  );
  C.setColumn(
    0,
    [...v2, 0].map(() => 0)
  );
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const ii = i + 1;
      const jj = j + 1;
      if (v1[i] === v2[j]) {
        C.set(ii, jj, C.get(ii - 1, jj - 1) + 1);
      } else {
        C.set(ii, jj, Math.max(C.get(ii, jj - 1), C.get(ii - 1, jj)));
      }
    }
  }
  return C.get(m, n);
}

export function ntile(x: number[], ntile: number): number {
  const n = x.length;
  const idx = Math.ceil((ntile / 100) * n) - 1;
  return idx <= n - 1 ? x[idx] : (last(x) as number);
}

export function ntiles(x: number[], n = 5) {
  let r = [];
  let step = 100 / n;
  for (let i = 1; i <= n; i++) {
    r.push(ntile(x, Math.floor(i * step)));
  }
  return r;
}

export function frequency(x: number[], minmax: [number, number] = [0, 0]) {
  const min = Math.min(...minmax);
  const max = Math.max(...minmax);
  const y = applyPerm(x, sortPerm(x));
  let i = 0;
  while (y[i] < min) {
    i += 1;
  }
  let j = i;
  while (y[j] < max) {
    j += 1;
  }
  return j - i;
}

export function withTiming(name: string, fn: (...args: any[]) => any) {
  console.log(name, "start");
  const t0 = performance.now();
  const r = fn();
  const t1 = performance.now();
  console.log(name, "end");
  console.log(name, "took", t1 - t0, "ms");
  return r;
}

export function whichMin(values: number[]) {
  let min = Infinity;
  let minIdx = -1;
  for (const [i, v] of values.entries()) {
    if (v < min) {
      minIdx = i;
      min = v;
    }
  }
  return minIdx;
}

/**
 * Makes a non-contiguous subset of the matrix.
 */
export function subMatrix(M: Matrix, rowsCols: number[]) {
  const M2 = new Matrix(rowsCols.length, rowsCols.length);

  for (const [i, r] of rowsCols.entries()) {
    const row = M.getRow(r);
    const nrow = rowsCols.map((j) => row[j]);
    M2.setRow(i, nrow);
  }
  return M2;
}

/**
 * Returns upper triangle of a matrix
 *
 * @param M Matrix
 * @param includeDiag boolean, if true the diagonal is included
 */
export function upperTri(M: Matrix, includeDiag = false) {
  const nRows = M.rows;
  const nCols = M.columns;
  const result = [];
  if (nRows === 1 && nCols === 1) {
    return [M.get(0, 0)];
  }
  for (let i = 0; i < nRows; i++) {
    const startJ = includeDiag ? i : i + 1;
    for (let j = startJ; j < nCols; j++) {
      result.push(M.get(i, j));
    }
  }
  return result;
}

export function reorderMatrix(M: Matrix, perm: number[]) {
  if (perm.length < M.rows) {
    return M;
  }
  const M2 = new Matrix(M.rows, M.columns);

  for (const [i, r] of perm.entries()) {
    const row = M.getRow(r);
    M2.setRow(i, applyPerm(row, perm));
  }
  return M2;
}

export function normalizeMatrix(M: Matrix) {
  let min = M.min();
  let max = M.max();

  const M2 = M.clone();

  let fn = (x: number) => (x - min) / (max - min);
  for (const i of range(M.rows)) {
    for (const j of range(M.columns)) {
      M2.set(i, j, fn(M.get(i, j)));
    }
  }
  return M2;
}

export function getWindowSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

const KM_FORMAT = new Intl.NumberFormat("en-US", {
  unit: "kilometer",
} as Intl.NumberFormatOptions);
const NR_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "scientific",
} as Intl.NumberFormatOptions);

export function formatRing(ring: [number, number]) {
  return ring.map((r) => KM_FORMAT.format(r)).join("–") + " km";
}

export function formatNumber(x: number) {
  return NR_FORMAT.format(x);
}
