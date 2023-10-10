import {
  ed,
  frequency,
  melt,
  unmelt,
  rank,
  sum,
  whichMin,
  subMatrix,
  reorderMatrix,
  normalizeMatrix,
  getWindowSize,
  upperTri,
} from "@/util/util";
import { scaleLinear, scalePoint, scaleSequential } from "d3-scale";
import { interpolateHsl } from "d3-interpolate";
import {
  flattenTree,
  isInSubTreeOf,
  leafs,
  parents,
  traversePostOrder,
  TreeNode,
} from "@/util/tree";
import difference from "lodash/difference";
import zip from "lodash/zip";
import range from "lodash/range";
import Vue from "vue";
import Vuex from "vuex";
import { agnes, Cluster } from "ml-hclust";
import { Matrix as MLMatrix } from "ml-matrix";
import * as druid from "@saehrimnir/druidjs";
import { forceSimulation, forceCollide, forceX, forceY } from "d3-force";
import axios from "axios";
import { mean, max } from "d3-array";

Vue.use(Vuex);

type DistanceMetric = "rank" | "distance-norm";

export type StoreState = {
  spaceTypes: { [spaceName: string]: "input" | "output" };
  spaceNames: string[];
  // Distance matrices per space
  // Absolute
  D: Readonly<Record<string, MLMatrix>>;
  // Absolute-norm
  Dnorm: Readonly<Record<string, MLMatrix>>;
  // Relative
  ranks: Readonly<Record<string, MLMatrix>>;
  // Actual data representing elements in each space
  spaces: {
    leafs: Readonly<Record<string, any[]>>;
    tooltips: Readonly<Record<string, any[]>>;
  };
  ctx: {
    leafs: any;
    tooltips: any;
  };
  leafvis: Record<string, string>;
  tooltipvis: Record<string, string[]>;
  rownames: Record<string, string[]>;
  datasetName: string;
  view: {
    linkage: "complete" | "average";
    fixColorscaleDirectionToInOut: boolean;
    useRelativeColorScale: boolean;
    windowSize: [number, number];
    dendrogramSize: [number, number];
    tree: any;
    highlightedLink: null | TreeNode;
    selectedLink: null | TreeNode;
    leafVisHeightPct: number;
    leafSpace: string;
    leafSpaceGrid: Record<string, boolean>;
    orderSpace: string;
    metric: DistanceMetric;
    spacePair: [string, string] | [];
    foldedLinks: string[];
    treeSubset: number[];
  };
};

const DEFAULT_STATE: StoreState = {
  datasetName: "",
  spaceTypes: {},
  D: {},
  Dnorm: {},
  ranks: {},
  spaces: { leafs: {}, tooltips: {} },
  ctx: { leafs: [], tooltips: [] },
  spaceNames: [],
  leafvis: {},
  tooltipvis: {},
  rownames: {},
  view: {
    linkage: "complete",
    fixColorscaleDirectionToInOut: false,
    useRelativeColorScale: false,
    dendrogramSize: [0, 0],
    windowSize: [0, 0],
    tree: null,
    highlightedLink: null,
    selectedLink: null,
    leafVisHeightPct: 0.33,
    metric: "rank",
    leafSpace: "",
    leafSpaceGrid: {},
    orderSpace: "",
    spacePair: [],
    foldedLinks: [],
    treeSubset: [],
  },
};

export const metasimsModule = {
  state: DEFAULT_STATE,
  getters: {
    initialized: (state: StoreState, getters: any) => {
      const checks = [
        state.spaceNames.length > 0,
        Object.keys(state.spaces).length > 0,
        Object.keys(state.D).length > 0,
        Object.keys(state.ranks).length > 0,
        ...state.spaceNames.map((s) => !!state.D[s]),
      ];
      const initialized = checks.reduce((r, c) => r && c, true);
      return initialized;
    },
    p: (state: StoreState) => {
      return state.D[state.spaceNames[0]].columns;
    },
    subsetSelected: (state: StoreState, getters: any) => {
      const p = getters.p;
      return state.view.treeSubset.length > 0;
    },
    leafToElementIdx: (state: StoreState) => (leaf: TreeNode) => {
      const idx = leaf.index < 0 ? leaf.displayChild.index : leaf.index;
      return idx;
    },
    leafOrder: (state: StoreState, getters: any) => (S: MLMatrix) => {
      //return range(S.columns);
      return leafs(getters.agnes(S), true).map((l) => l.index);
    },
    yScale: (state: StoreState, getters: any) => ({
      dendrogramHeight,
      margin,
    }: any) => {
      const [space1] = state.view.spacePair;
      return scaleLinear()
        .domain(getters.heightRange(getters.S(space1)))
        .range([dendrogramHeight - margin, margin]);
    },
    highlightedLeafs: (state: StoreState, getters: any) => {
      if (state.view.highlightedLink === null) {
        return {};
      }
      const leefs = leafs(state.view.highlightedLink, false, true).reduce(
        (agg, l) => ({ ...agg, [l.id]: l }),
        {}
      );
      return leefs;
    },
    rownames: (state: StoreState) => (space: string) => {
      if (state.rownames && state.rownames.space) {
        return state.rownames[space];
      }
      return [];
    },
    tree: (state: StoreState, getters: any) => ({
      yScale,
      width,
      margin,
    }: any) => {
      const h = getters.hierarchy(
        state.view.spacePair[0],
        state.view.spacePair[1]
      );
      let visibleLeafs = leafs(h, true);

      const axisWidth = 40;
      const xScale = scalePoint<string>()
        .padding(0.5)
        .domain(visibleLeafs.map((l) => l.id))
        .range([margin + axisWidth, width - margin]);
      traversePostOrder(h, (cluster: Cluster & any) => {
        cluster.x = xScale(cluster.id);
        cluster.y = yScale.range()[0];

        if (cluster.children.length > 0) {
          const [left, right] = cluster.children as Cluster[] & any;
          cluster.x = (left.x + right.x) / 2;
          cluster.y = yScale(cluster.s1.value);

          cluster.x1 = left.x;
          cluster.y1 = left.y;
          cluster.x2 = right.x;
          cluster.y2 = right.y;
        } else if (cluster.foldedSubtree.length > 0) {
          cluster.y = yScale(cluster.s1.value);
        }
      });
      return {
        agnes: h,
        tree: flattenTree(h),
        visibleLeafs,
        xScale,
        allLeafs: leafs(h, false, true),
      };
    },
    M: (state: StoreState) => (space: string) => {
      switch (state.view.metric) {
        case "rank":
          return state.ranks[space];
        case "distance-norm":
          return state.Dnorm[space];
        default:
          throw new Error("unknown metric");
      }
    },
    S: (state: StoreState, getters: any) => (space: string) => {
      let metric: "ranks" | "D" | "Dnorm" = "ranks";
      if (state.view.metric === "distance-norm") {
        metric = "Dnorm";
      }

      let S = state[metric][space];
      return S;
    },
    secondarySpacePoints: (state: StoreState, getters: any) => (
      link: TreeNode | null,
      leafs: TreeNode[],
      space: string,
      y: number,
      xExtent: [number, number]
    ) => {
      type Point = {
        x: number;
        y: number;
        id: string;
        fill: "gray" | "white";
      };

      if (link === null) {
        return {
          points: [],
        };
      }

      const positions1d: number[] = getters.project1D(
        leafs.map((l) => l.index),
        space
      );

      const subTree1 = link.foldedSubtree.length
        ? link.foldedSubtree[0]
        : link.children[0];
      let points: Point[] = zip<TreeNode, number>(leafs, positions1d).map(
        ([node, d]) => {
          const inSubtree = isInSubTreeOf(node!, subTree1!);
          return {
            id: node!.id,
            x: d!,
            y,
            fill: inSubtree ? "white" : "gray",
          };
        }
      );
      // orient the whole system properly - we want the center of mass of white points to be left of the black points' center
      const whitePoints = points.filter((p) => p.fill === "white");
      const blackPoints = points.filter((p) => p.fill !== "white");
      // every point has unit mass so the moment is just the sum of positions and total mass is number of points
      const whiteMoment = sum(whitePoints.map((p) => p.x));
      const blackMoment = sum(blackPoints.map((p) => p.x));
      const whiteCenter = whiteMoment / whitePoints.length;
      const blackCenter = blackMoment / blackPoints.length;

      // invert 1d positions if white center is right of black center
      points = points.map((p) => ({
        ...p,
        x: whiteCenter > blackCenter ? -p.x : p.x,
      }));

      // move points such that center of mass is at 0.5
      const center = sum(points.map((p) => p.x)) / points.length;
      const offset = 0.5 - center;
      points = points.map((p) => ({ ...p, x: offset + p.x }));
      const newCenter = sum(points.map((p) => p.x)) / points.length;

      // make up scale such that new COM is in the center of the join line
      // and its width equals to the unit interval in 1D
      const scale = scaleLinear()
        .domain([newCenter - 0.5, newCenter + 0.5])
        .range(xExtent);

      points = points.map((p) => ({
        ...p,
        x: scale(p.x),
      }));

      // now do a quick force simulation to avoid overlaps
      const sim = forceSimulation<Point>(points)
        .force("collision", forceCollide(2))
        .force(
          "positionX",
          forceX().x(({ x }: any) => x)
        )
        .force(
          "positionY",
          forceY().y(({ y }: any) => y)
        )
        .stop();
      sim.tick(500);

      return { points };
    },
    /*  leafPairs: (state: StoreState, getters: any) => (space: string) => {
      const H = getters.hierarchy(space, space);
      const lfs = leafs(H);
      const pairs = [];
      lfs.sort((a, b) => (a.index < b.index ? -1 : b.index < a.index ? 1 : 0));
      for (let i = 0; i < lfs.length - 1; i++) {
        for (let j = i + 1; j < lfs.length; j++) {
          pairs.push([lfs[i], lfs[j]]);
        }
      }
      return pairs;
    },
    leafPaths: (state: StoreState, getters: any) => (space: string) => {
      const H = getters.hierarchy(space, space);
      const pairs = getters.leafPairs(space) as [TreeNode, TreeNode][];
      return pairs.map(([a, b]) => leafPathDist(H, a.index, b.index));
    }, */
    spaceDistPaths: (state: StoreState, getters: any) => (
      space1: string,
      space2: string
    ) => {
      const H1 = getters.leafPaths(space1);
      const H2 = getters.leafPaths(space2);
      return ed(H1, H2);
    },
    agnes: (state: StoreState, getters: any) => (S1: MLMatrix) => {
      return agnes(S1.to2DArray(), {
        isDistanceMatrix: true,
        method: state.view.linkage,
      });
    },
    metricDiffFrequency: (state: StoreState, getters: any) => (
      space1: string,
      space2: string
    ) => {
      if (!getters.initialized) {
        return [];
      }
      // compute change in <metric> for all element pairs
      // basically then a 5 bin histogram is what i want
      const S1 = getters.S(space1);
      const S2 = getters.S(space2);
      const diffs = getters
        .elementDiffs(S1, S2)
        .map((d: any) => d.diff) as number[];
      diffs.sort((a: number, b: number) => (a < b ? -1 : b < a ? 1 : 0));
      // 0..1
      // 0.. 0.5 .. 1  => [-1,1]

      const scale = getters.diffScale(
        space1,
        space2,
        state.view.useRelativeColorScale
      );
      const bins = scale.bins as [number, number][];
      const r = [];
      const n = diffs.length;
      for (let i = 0; i < bins.length; i++) {
        const bracket = bins[i].map((x: number) => scale.numericAbs.invert(x));
        const freq = frequency(diffs, bins[i]);
        r.push({
          index: 0,
          bin: bins[i],
          color: scale.scheme[i],
          bracket,
          freq,
          freq_norm: freq / n,
          binIdx: i,
        });
      }
      return r;
    },
    getJoinPair: (state: StoreState, getters: any) => (
      S: MLMatrix,
      elements: number[]
    ) => {
      const D_frozen = S;
      const D = melt(D_frozen);
      let pair = D.find(
        (x) => elements.indexOf(x.row) >= 0 && elements.indexOf(x.col) >= 0
      )!;
      for (let i = 0; i < D.length; i++) {
        const x = D[i];
        if (elements.indexOf(x.row) >= 0 && elements.indexOf(x.col) >= 0) {
          if (x.value > pair.value) {
            pair = x;
          }
        }
      }
      return pair;
    },
    getClusterDiameter: (state: StoreState, getters: any) => (
      S: MLMatrix,
      elementsL: number[],
      elementsR: number[],
      criterion = "complete"
    ) => {
      const elements = [...elementsL, ...elementsR];
      const Sprime = S.selection(elements, elements);
      const asVector = upperTri(Sprime);
      if (criterion === "complete") {
        return max(asVector);
      }
      if (criterion === "average") {
        return mean(asVector);
      }
      throw new Error(`no such linkage criterion: ${criterion}`);
    },
    spaceDistance: (state: StoreState, getters: any) => {
      // build distance matrix of spaces
      const spaces = state.spaceNames;
      const D = new MLMatrix(spaces.length, spaces.length);
      for (const [i, s1] of spaces.entries()) {
        for (const [j, s2] of spaces.entries()) {
          const M1 = new MLMatrix(getters.M(s1));
          const M2 = new MLMatrix(getters.M(s2));

          const d = M1.sub(M2).norm("frobenius");
          D.set(i, j, d);
        }
      }
      return D;
    },
    spaceOrdering: (state: StoreState, getters: any) => {
      const D = getters.spaceDistance;
      const H = getters.agnes(D);
      return leafs(H)
        .map((l) => l.index)
        .map((i) => state.spaceNames[i]);
    },
    hierarchy: (state: StoreState, getters: any) => (
      space1: string,
      space2: string
    ) => {
      const S1 = getters.S(space1);
      const S2 = getters.S(space2);
      const hclust: Cluster = getters.agnes(S1);
      const diffScale = getters.diffScale(
        space1,
        space2,
        state.view.useRelativeColorScale
      );
      traversePostOrder(hclust as TreeNode & Cluster, (cluster: any) => {
        cluster.foldedSubtree = [];
        cluster.displayChild = {};

        for (const child of cluster.children) {
          child.parent = cluster;
        }

        if (cluster.isLeaf) {
          cluster.id = cluster.index + "";
        } else {
          const elementsLeft = cluster.children[0].indices();
          const elementsRight = cluster.children[1].indices();
          cluster.s1 = {
            value: getters.getClusterDiameter(
              S1,
              elementsLeft,
              elementsRight,
              state.view.linkage
            ),
          };
          cluster.s2 = {
            value: getters.getClusterDiameter(
              S2,
              elementsLeft,
              elementsRight,
              state.view.linkage
            ),
          };
          cluster.diff = diffScale.numericAbs(
            cluster.s1.value - cluster.s2.value
          );

          cluster.id = `(${cluster.children[0].id}/${cluster.children[1].id})`;
        }
      });

      hclust.traverse((cluster: any) => {
        if (state.view.foldedLinks.includes(cluster.id)) {
          const leefs = leafs(cluster);
          const leefIdxs = leefs.map((l) => l.index);
          cluster.foldedSubtree = cluster.children;
          cluster.children = [];

          let subD = S1.selection(leefIdxs, leefIdxs);

          const rowSums = range(subD.rows).map((r) => sum(subD.getRow(r)));
          const subDIdxMostCentral = whichMin(rowSums);
          cluster.displayChild = leefs.find(
            (l) => l.index === leefIdxs[subDIdxMostCentral]
          );

          cluster.hiddenLeafs = cluster.size - 1;
        }
      });
      return hclust;
    },
    rankRange: (state: StoreState, getters: any) => (S: MLMatrix) => {
      const n = S.columns;
      const maxRank = (n * (n - 1)) / 2;
      return [1, maxRank];
    },
    rankDiffRangeRelative: (state: StoreState) => (
      S1: MLMatrix,
      S2: MLMatrix
    ) => {
      let D = MLMatrix.sub(S1, S2);
      return [D.min(), D.max()];
    },
    rankDiffRange: (state: StoreState, getters: any) => (
      S1: MLMatrix,
      S2: MLMatrix
    ) => {
      const n = S1.columns;
      const maxRank = (n * (n - 1)) / 2;
      const minRank = 1;
      return [-1 * (maxRank - minRank), maxRank - minRank];
    },
    distanceRange: (state: StoreState, getters: any) => (S: MLMatrix) => {
      // this is [0,1] if distance is normalized
      const min = S.min();
      const max = S.max();
      return [min, max];
    },
    distanceNormRange: (state: StoreState, getters: any) => (S: MLMatrix) => {
      return [0, 1];
    },
    distanceNormDiffRange: () => () => {
      return [-1, 1];
    },
    distanceNormDiffRangeRelative: (state: StoreState, getters: any) => (
      S1: MLMatrix,
      S2: MLMatrix
    ) => {
      let D = MLMatrix.sub(S1, S2);
      return [D.min(), D.max()];
    },
    distanceDiffRange: (state: StoreState, getters: any) => (
      S1: MLMatrix,
      S2: MLMatrix
    ) => {
      let D = MLMatrix.sub(S1, S2);

      return [D.min(), D.max()];
    },
    heightRange: (state: StoreState, getters: any) => (S: MLMatrix) => {
      if (state.view.metric === "rank") {
        return getters.rankRange(S);
      }
      if (state.view.metric === "distance-norm") {
        return getters.distanceNormRange(S);
      }
      return getters.distanceRange(S);
    },
    elementDiffsMatrix: (state: StoreState, getters: any) => (
      space1: string,
      space2: string
    ) => {
      const elementDiffs = getters.elementDiffs(space1, space2, false);
      const S1 = getters.S(space1);
      const S2 = getters.S(space2);
      const D = new MLMatrix(S1.rows, S2.columns);
      for (const d of elementDiffs) {
        const diff = d.diff;
        D.set(d.row, d.col, diff);
        D.set(d.col, d.row, diff);
      }
      return D.to2DArray();
    },
    shouldFlipColorScale: (state: StoreState) => (
      space1: string,
      space2: string
    ) => {
      if (state.view.fixColorscaleDirectionToInOut) {
        const s1type = state.spaceTypes[space1];
        const s2type = state.spaceTypes[space2];

        if (s1type === "output" && s2type === "input") {
          return true;
        }
      }
      return false;
    },
    diffScale: (state: StoreState, getters: any) => (
      space1: string,
      space2: string,
      useRelativeColorScale = false
    ) => {
      let [minDiffAbs, maxDiffAbs] = [0, 0];
      let [minDiff, maxDiff] = [0, 0];

      const S1 = getters.S(space1) as MLMatrix;
      const S2 = getters.S(space2) as MLMatrix;

      if (state.view.metric === "rank") {
        [minDiffAbs, maxDiffAbs] = getters.rankDiffRange(S1, S2);
        [minDiff, maxDiff] = getters.rankDiffRangeRelative(S1, S2);
      } else {
        [minDiffAbs, maxDiffAbs] = getters.distanceNormDiffRange(S1, S2);
        [minDiff, maxDiff] = getters.distanceNormDiffRangeRelative(S1, S2);
      }

      // console.log({ minDiff, maxDiff, minDiffAbs, maxDiffAbs });

      const scaleRdBu = ["#580123", "#efefef", "#1f3360"];
      const scalePRGr = ["#39014b", "#efefef", "#274524"];
      let scaleInUse = [...scaleRdBu];
      if (state.view.metric === "distance-norm") {
        scaleInUse = [...scalePRGr];
      }

      if (getters.shouldFlipColorScale(space1, space2)) {
        scaleInUse.reverse();
      }

      let numericAbs = scaleLinear()
        .clamp(true)
        .domain([minDiffAbs, 0, maxDiffAbs])
        .range([0, 0.5, 1]);
      const chromatic = scaleLinear<string, number>()
        .domain(
          useRelativeColorScale
            ? [numericAbs(minDiff), 0.5, numericAbs(maxDiff)]
            : [numericAbs(minDiffAbs), 0.5, numericAbs(maxDiffAbs)]
        )
        .range(scaleInUse)
        .interpolate(interpolateHsl);

      let range = [numericAbs(minDiff), numericAbs(maxDiff)];
      let min = useRelativeColorScale ? minDiff : minDiffAbs;
      let max = useRelativeColorScale ? maxDiff : maxDiffAbs;

      const bins = [
        [numericAbs(min), numericAbs(min) + (1 / 3) * (0.5 - numericAbs(min))],
        [
          numericAbs(min) + (1 / 3) * (0.5 - numericAbs(min)),
          numericAbs(min) + (2 / 3) * (0.5 - numericAbs(min)),
        ],
        [numericAbs(min) + (2 / 3) * (0.5 - numericAbs(min)), 0.5],
        [0.5, 0.5 + (numericAbs(max) - 0.5) * (1 / 3)],
        [
          0.5 + (numericAbs(max) - 0.5) * (1 / 3),
          0.5 + (numericAbs(max) - 0.5) * (2 / 3),
        ],
        [0.5 + (numericAbs(max) - 0.5) * (2 / 3), numericAbs(max)],
      ];

      if (minDiff < 0 && maxDiff > 0) {
        // how it should be

        let numeric = scaleLinear()
          .domain([minDiff, 0, maxDiff])
          .range([0, 0.5, 1]);

        return {
          range,
          rangeAbs: [0, 1],
          bins,
          numeric,
          numericAbs,
          chromatic,
          scheme: bins.map(([start, end]) =>
            chromatic(start + (end - start) / 2)
          ),
        };
      } else if (minDiff === 0 && maxDiff !== 0) {
        let numeric = scaleLinear().domain([0, maxDiff]).range([0.5, 1]);

        return {
          range,
          rangeAbs: [0.5, 1],
          bins: bins.slice(3),
          numericAbs,
          numeric,
          chromatic,
          scheme: bins.map(([start, end]) =>
            chromatic(start + (end - start) / 2)
          ),
        };
      } else if (maxDiff === 0 && minDiff !== 0) {
        let numeric = scaleLinear().domain([minDiff, 0]).range([0, 0.5]);
        return {
          rangeAbs: [0, 0.5],
          range,
          bins: bins.slice(0, 3),
          numeric,
          numericAbs,
          chromatic,
          scheme: bins.map(([start, end]) =>
            chromatic(start + (end - start) / 2)
          ),
        };
      } else {
        let numeric = scaleLinear().domain([-1, 1]).range([0, 1]);

        return {
          range,
          rangeAbs: [0, 1],
          bins,
          numeric,
          numericAbs,
          chromatic,
          scheme: bins.map(([start, end]) =>
            chromatic(start + (end - start) / 2)
          ),
        };
      }
    },
    elementDiffs: (state: StoreState, getters: any) => (
      space1: string,
      space2: string,
      triangleOnly = true
    ) => {
      const diffScale = getters.diffScale(
        space1,
        space2,
        state.view.useRelativeColorScale
      );
      const S1 = getters.S(space1);
      const S2 = getters.S(space2);
      const zipped = zip(melt(S1, triangleOnly), melt(S2, triangleOnly)).map(
        ([s1, s2]: [any, any]) => ({
          // use s1 matrix position here, only for matrixdiff view
          row: s1.row,
          col: s1.col,
          s1,
          s2,
          diff: diffScale.numericAbs(s1.value - s2.value), // TODO make toggle
          color: diffScale.chromatic(diffScale.numericAbs(s1.value - s2.value)),
        })
      );
      return zipped;
    },
    N: (state: StoreState) => (space: string) => {
      return state.spaces.leafs[space] ? state.spaces.leafs[space].length : 0;
    },
    project1D: (state: StoreState, getters: any) => (
      leafIds: number[],
      space: string,
      d = 1
    ) => {
      const D = getters.S(space);
      const Dsub = D.selection(leafIds, leafIds);
      const M = druid.Matrix.from(Dsub.to2DArray());
      const mds = new druid.MDS(M, d, "precomputed");
      return mds.transform().col(0);
    },
    bestWorstMatch: (state: StoreState, getters: any) => (
      node: TreeNode,
      space: string
    ) => {
      if (!node.children.length) {
        return null;
      }
      const [left, right] = node.children;
      const leftChildren = leafs(left, true).map((l) =>
        getters.leafToElementIdx(l)
      );
      const rightChildren = leafs(right, true).map((l) =>
        getters.leafToElementIdx(l)
      );
      const S = getters
        .S(space)
        .selection(leftChildren, rightChildren) as MLMatrix;
      let [bestRow, bestCol] = S.minIndex();
      let best = {
        left: leftChildren[bestRow],
        right: rightChildren[bestCol],
        match: S.get(bestRow, bestCol),
      };

      let [worstRow, worstCol] = S.maxIndex();
      let worst = {
        left: leftChildren[worstRow],
        right: rightChildren[worstCol],
        match: S.get(worstRow, worstCol),
      };

      return { best, worst };
    },
  },
  mutations: {
    init(
      state: StoreState,
      spaces: {
        dataset: string;
        data: {
          types?: { input: string[]; output: string[] };
          D: Record<string, number[][]>;
          leafs: {
            ctx: any[];
            space: Record<string, any[]>;
            vis: Record<string, string>;
          };
          tooltips: {
            ctx: any[];
            space: Record<string, any[]>;
            vis: Record<string, string[]>;
          };
          rownames: Record<string, string[]>;
        };
      }
    ) {
      const spaceNames = Object.keys(spaces.data.D);

      /* if (spaces.data.types) {
        for (const input of spaces.data.types.input) {
          Vue.set(state.spaceTypes, input, "input");
        }
        for (const output of spaces.data.types.output) {
          Vue.set(state.spaceTypes, output, "output");
        }
        state.view.fixColorscaleDirectionToInOut = true;
      } else {
        state.view.fixColorscaleDirectionToInOut = false;
      }
 */
      // convert spaces to MLMatrix
      const D: Record<string, MLMatrix> = {};
      for (const space of spaceNames) {
        D[space] = new MLMatrix(spaces.data.D[space]);
      }
      state.spaces = Object.freeze({
        leafs: spaces.data.leafs.space,
        tooltips: spaces.data.tooltips.space,
      });
      state.ctx = Object.freeze({
        leafs: spaces.data.leafs.ctx,
        tooltips: spaces.data.tooltips.ctx,
      });
      state.D = Object.freeze(D);
      state.leafvis = Object.freeze(spaces.data.leafs.vis);
      state.tooltipvis = Object.freeze(spaces.data.tooltips.vis);
      state.rownames = Object.freeze(spaces.data.rownames);
      state.view.spacePair = [spaceNames[0], spaceNames[1]];
      state.view.leafSpace = spaceNames[0];
      state.view.leafSpaceGrid = { [spaceNames[0]]: true };
      state.view.orderSpace = spaceNames[1];
      state.spaceNames = spaceNames;
      const ranks: Record<string, MLMatrix> = {};
      const normed: Record<string, MLMatrix> = {};
      for (const space of spaceNames) {
        let moltenSpace = melt(D[space], true);
        // ranked
        const spaceRank = rank(moltenSpace.map((x) => x.value));
        ranks[space] = unmelt(
          moltenSpace.map((x, i) => ({
            ...x,
            value: spaceRank[i],
          })),
          true
        );

        // normalized dist
        normed[space] = normalizeMatrix(D[space]);
      }

      state.ranks = Object.freeze(ranks);
      state.Dnorm = Object.freeze(normed);
      state.datasetName = spaces.dataset;
      // state.view.treeSubset = range(state.ranks[spaceNames[0]].columns);
    },
    toggleTreeSubset(
      state: StoreState,
      payload: { node: TreeNode; subset: number[] }
    ) {
      const { node, subset } = payload;
      const replace = true;
      if (!replace) {
        const treeSubset = state.view.treeSubset;

        const diff1 = difference(treeSubset, subset);
        const diff2 = difference(subset, treeSubset);

        state.view.treeSubset = [...diff1, ...diff2];
      } else {
        state.view.treeSubset = subset;
      }
      state.view.selectedLink = node;
    },
    setLeafSpace(state: StoreState, space: string) {
      state.view.leafSpace = space;
    },
    setLinkageCriterion(state: StoreState, criterion: string) {
      state.view.linkage = criterion as "complete" | "average";
    },
    toggleLeafSpaceGrid(state: StoreState, space: string) {
      let sp: Record<string, boolean> = {
        ...state.view.leafSpaceGrid,
        [space]: !state.view.leafSpaceGrid[space],
      };
      state.view.leafSpaceGrid = sp;
    },
    setOrderSpace(state: StoreState, space: string) {
      state.view.orderSpace = space;
    },
    setMetric(state: StoreState, metric: DistanceMetric) {
      state.view.metric = metric;
    },
    updateWindowSize(state: StoreState, windowSize: [number, number]) {
      state.view.windowSize = windowSize;
      state.view.dendrogramSize = [windowSize[0] * 0.5, windowSize[1]];
    },
    toggleFolded(state: StoreState, d: TreeNode) {
      if (!d.isLeaf) {
        const idx = state.view.foldedLinks.indexOf(d.id);
        // TODO mutation
        let newFolded = [...state.view.foldedLinks];
        if (idx >= 0) {
          newFolded.splice(idx, 1);
        } else {
          newFolded.push(d.id);
        }
        state.view.foldedLinks = newFolded;
      }
    },
    foldAutomatically(
      state: StoreState,
      payload: {
        strategy:
          | "fold-all"
          | "unfold-all"
          | "fold-by-height"
          | "fold-everything-else";
        height?: number;
        node?: TreeNode;
      }
    ) {
      state.view.foldedLinks = [];
      if (payload.strategy === "unfold-all") {
        return;
      }
      if (payload.strategy === "fold-all") {
        const newFolded: string[] = [];
        traversePostOrder(state.view.tree.agnes, (node) =>
          newFolded.push(node.id)
        );
        state.view.foldedLinks = newFolded;
        return;
      }
      if (payload.strategy === "fold-by-height") {
        let height = payload.height || 0;

        // fold every link that is underneath that height
        const newFolded: string[] = [];
        let max = 0;
        state.view.tree.agnes.traverse((node: any) => {
          if (node.height > max) {
            max = node.height;
          }
          if (node.height < height && !node.isLeaf) {
            newFolded.push(node.id);
          }
        });
        state.view.foldedLinks = newFolded;
        return;
      }

      const allNodeIds: string[] = [];
      state.view.tree.agnes.traverse((n: TreeNode) => allNodeIds.push(n.id));
      if (!payload.node) {
        throw new Error("node undefined");
      }
      const node = payload.node;
      const nodeSubtree: string[] = [];
      traversePostOrder(node, (c) => nodeSubtree.push(c.id));
      const nodeParents = parents(node).map((d) => d.id);
      const newFolded = difference(allNodeIds, [
        node.id,
        ...nodeSubtree,
        ...nodeParents,
      ]);
      state.view.foldedLinks = newFolded;
    },
    setSpacePair(state: StoreState, spaces: [string, string]) {
      state.view.spacePair = spaces;
    },
    setTree(state: StoreState, tree: any) {
      state.view.tree = tree;
    },
    setHighlightedLink(state: StoreState, link: TreeNode) {
      state.view.highlightedLink = link;
    },
  },
  actions: {
    async fetchData({ commit, dispatch }: any, dataset: string) {
      const { data } = await axios.get(`/data/${dataset}.json`);
      commit("init", { dataset, data });
      dispatch("setSpacePair", Object.keys(data.D).slice(0, 2));
      dispatch("updateWindowSize");
    },
    toggleFolded({ commit, dispatch }: any, d: TreeNode) {
      commit("toggleFolded", d);
      dispatch("updateTree");
    },
    setMetric({ commit, dispatch }: any, metric: string) {
      commit("setMetric", metric);
      dispatch("updateTree");
    },
    setLeafSpace({ commit }: any, space: string) {
      commit("setLeafSpace", space);
    },
    toggleLeafSpaceGrid({ commit }: any, space: string) {
      commit("toggleLeafSpaceGrid", space);
    },
    setOrderSpace({ commit }: any, space: string) {
      commit("setOrderSpace", space);
    },
    setSpacePair({ commit, dispatch }: any, spaces: [string, string]) {
      commit("setSpacePair", spaces);
      dispatch("updateTree");
    },
    setHighlightedLink({ commit }: any, link: TreeNode) {
      commit("setHighlightedLink", link);
    },
    updateWindowSize({ commit }: any) {
      const ws = getWindowSize();
      commit("updateWindowSize", [ws.width, ws.height]);
    },
    updateTree({ commit, getters, state }: any) {
      if (!getters.initialized) {
        return;
      }
      // TODO this is ugly
      // also the fact that this action needs to be dispatched after every other action that affects the dendrogram
      const margin = 5;
      const width = state.view.dendrogramSize[0];
      const dendrogramHeight =
        (1 - state.view.leafVisHeightPct) * state.view.dendrogramSize[1];
      const yScale = getters.yScale({ dendrogramHeight, margin });
      const tree = getters.tree({
        yScale,
        margin,
        width,
      });
      commit("setTree", { ...tree, yScale });
    },
    foldAutomatically({ commit, dispatch }: any, payload: any) {
      commit("foldAutomatically", payload);
      dispatch("updateTree");
    },
    toggleTreeSubset({ commit, getters }: any, node: TreeNode) {
      const subset = leafs(node, true).map((l) => getters.leafToElementIdx(l));
      commit("toggleTreeSubset", { node, subset });
    },
    setLinkageCriterion({ commit, dispatch }: any, criterion: string) {
      commit("setLinkageCriterion", criterion);
      dispatch("updateTree");
    },
  },
};

export default new Vuex.Store(metasimsModule);
