import { expect } from "chai";
import {
  rank,
  sortPerm,
  applyPerm,
  invertPerm,
  whichMin,
  sameValueRanges,
  frequency,
  ntile,
  ntiles,
  subMatrix,
} from "@/util/util";
import range from "lodash/range";
import shuffle from "lodash/shuffle";
import { Matrix } from "ml-matrix";

//TODO explicitly define globals in eslint config
/* eslint-disable no-undef */

describe("util", () => {
  it("whichMin", () => {
    const arr = shuffle(range(100));
    expect(whichMin(arr)).to.eql(arr.indexOf(0));
    expect(whichMin([])).to.eql(-1);
  });
  it("sameValueRanges", () => {
    expect(sameValueRanges([1, 1, 1, 1, 1])).to.eql([[0, 1, 2, 3, 4]]);
    expect(sameValueRanges([0, 1, 1, 1, 3])).to.eql([[1, 2, 3]]);
    expect(sameValueRanges([0, 1, 3, 1, 2, 1])).to.eql([]);
  });
  describe("rank", () => {
    it("min ties", () => {
      expect(rank([], "min")).to.eql([]);
      expect(rank([0, 0, 0, 0, 0], "min")).to.eql([1, 1, 1, 1, 1]);
      expect(rank([1, 2, 3, 4, 5], "min")).to.eql([1, 2, 3, 4, 5]);
      expect(rank([3, 2, 1, 5, 4], "min")).to.eql([3, 2, 1, 5, 4]);
      expect(rank([3, 5, 3, 3, 5, 4], "min")).to.eql([1, 5, 1, 1, 5, 4]);
    });
    it("avg ties", () => {
      expect(rank([0, 0, 0, 0, 0], "avg")).to.eql([3, 3, 3, 3, 3]);
    });
    it("max ties", () => {
      expect(rank([0, 0, 0, 0, 0], "max")).to.eql([5, 5, 5, 5, 5]);
    });
  });
  it("sortPerm", () => {
    expect(sortPerm([25, 10, 3, 2, 1])).to.eql([4, 3, 2, 1, 0]);
  });
  it("applyPerm", () => {
    const arr = [1, 5, 2, 6, 7, 8, 2, 4, 6, 6];
    const p = sortPerm(arr);
    expect(applyPerm(arr, p)).to.eql(arr.sort());
  });
  it("invertPerm", () => {
    let p = [2, 3, 1, 0];
    expect(invertPerm(p)).to.eql([3, 2, 0, 1]);

    let arr = [1, 5, 2, 6, 7, 8, 2, 4, 6, 6];
    p = sortPerm(arr);
    let pi = invertPerm(p);
    expect(applyPerm(applyPerm(arr, p), pi)).to.eql(arr);
  });

  describe("subMatrix", () => {
    const M = new Matrix([range(3), range(3, 6), range(6, 9)]);
    expect(subMatrix(M, [2, 1]).to2DArray()).to.eql([
      [8, 7],
      [5, 4],
    ]);
  });

  describe("percentiles", () => {
    const x = [15, 20, 35, 40, 50];

    it("ntile", () => {
      expect(ntile(x, 5)).to.eql(15);
      expect(ntile(x, 30)).to.eql(20);
      expect(ntile(x, 40)).to.eql(20);
      expect(ntile(x, 50)).to.eql(35);
      expect(ntile(x, 100)).to.eql(50);
    });
    it("ntiles", () => {
      expect(ntiles(x, 3)).to.eql([20, 40, 50]);
    });
    it("frequency", () => {
      const x = [1, 2, 2, 2, 5, 9, 10, 11];
      expect(frequency(x, [1, 2])).to.eql(1);
      expect(frequency(x, [2, 1])).to.eql(1);
      expect(frequency(x, [1, 3])).to.eql(4);
      expect(frequency(x, [12, 15])).to.eql(0);
    });
  });
});
/* eslint-enable no-undef */
