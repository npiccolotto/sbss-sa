<template>
  <svg :width="effectiveWidth" :height="effectiveHeight">
    <path v-for="(poly, i) in polys" :key="i" :d="poly.path"></path>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scalePoint, ScalePoint, ScaleLinear, scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import range from "lodash/range";
import { extent } from "d3-array";
import { Matrix } from "ml-matrix";
import { StoreState } from "./store";

class MultiPolygonClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementIdx!: number;

  public matrix!: Matrix;
  public yScale!: ScalePoint<string>;
  public xScale!: ScaleLinear<number, number>;
  public effectiveWidth!: number;
  public aspectRatio!: number;
  public effectiveHeight!: number;
  public shortestSide!: number;
  public element!: any;
  public extent!: { x: [number, number]; y: [number, number] };
}

const margin = 5;

@Component<MultiPolygonClass>({
  computed: {
    shortestSide: function () {
      return Math.min(this.$props.width, this.$props.height);
    },
    effectiveWidth: function () {
      if (this.aspectRatio <= 1) {
        return this.shortestSide * this.aspectRatio;
      }
      return this.shortestSide;
    },
    effectiveHeight: function () {
      if (this.aspectRatio <= 1) {
        return this.shortestSide;
      }
      return this.shortestSide / this.aspectRatio;
    },
    element: function () {
      return this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ];
    },
    aspectRatio: function () {
      const xy = (this.$store
        .state as StoreState).ctx.tooltips.points_flat.map(
        ([x, y]: [number, number]) => [x, y]
      ) as [number, number][];
      const x = extent(xy.map((xy) => xy[0])) as [number, number];
      const y = extent(xy.map((xy) => xy[1])) as [number, number];
      const ar = (x[1] - x[0]) / (y[1] - y[0]);
      return ar;
    },
    extent: function () {
      const M = new Matrix(this.element.flat());
      const x = extent(M.getColumn(0)) as [number, number];
      const y = extent(M.getColumn(1)) as [number, number];
      return { x, y };
    },
    yScale: function () {
      return scaleLinear()
        .domain(this.extent.y)
        .range([this.effectiveHeight - margin, margin]);
    },
    xScale: function () {
      return scaleLinear()
        .domain(this.extent.x)
        .range([margin, this.effectiveWidth - margin]);
    },
    polys: function () {
      const polys = [];
      const lineGen = line();
      for (const el of this.element) {
        polys.push({
          path: lineGen(
            el.map(([x, y]: any) => [this.xScale(x), this.yScale(y)])
          ),
        });
      }
      return polys;
    },
  },
})
export default class MultiPolygon extends MultiPolygonClass {}
</script>

<style lang="less" scoped>
path {
  stroke-width: 1px;
  stroke: black;
  fill: none;
}
</style>
