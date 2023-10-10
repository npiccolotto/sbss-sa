<template>
  <svg :width="width" :height="height">
    <g :transform="'translate(' + centeringOffset + ',0)'">
      <rect
        v-for="(cell, i) in displayMatrix"
        :key="i"
        :x="cell.x"
        :width="cell.side"
        :y="cell.y"
        :height="cell.side"
        :fill="cell.color"
      >
        <title>{{ cell.ovalue }}</title>
      </rect>
    </g>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scalePoint, ScalePoint, ScaleLinear, scaleLinear } from "d3-scale";
import range from "lodash/range";
import { extent } from "d3-array";
import { interpolateGreys } from "d3-scale-chromatic";
import { Matrix } from "ml-matrix";
import { melt } from "./util/util";

class UnmixingMatrixHeatmapClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementIdx!: number;

  public matrix!: Matrix;
  public scale!: ScalePoint<string>;
  public element!: number[][];
  public p!: number;
  public shortestSide!: number;
}

const margin = 5;

@Component<UnmixingMatrixHeatmapClass>({
  computed: {
    shortestSide: function () {
      return Math.min(this.$props.width, this.$props.height);
    },
    centeringOffset: function () {
      return (this.width - this.p * this.scale.step()) / 2;
    },
    element: function () {
      return this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ];
    },
    matrix: function () {
      return new Matrix(this.element);
    },
    displayMatrix: function () {
      const nM = new Matrix(this.p, this.p);
      for (const i of range(this.p)) {
        const row = this.matrix.getRow(i);
        const [min, max] = extent(row.map((x) => Math.abs(x))) as [
          number,
          number
        ];
        nM.setRow(
          i,
          row.map((x) => (Math.abs(x) - min) / (max - min))
        );
      }
      return melt(nM, false).map((c) => {
        return {
          ...c,
          color: interpolateGreys(c.value),
          ovalue: this.matrix.get(c.row, c.col),
          x: this.scale(c.row + ""),
          y: this.scale(c.col + ""),
          side: this.scale.step(),
        };
      });
    },
    p: function () {
      return this.matrix.columns;
    },
    scale: function () {
      return scalePoint()
        .domain(range(this.p).map((i) => i + ""))
        .range([margin, this.shortestSide - margin]);
    },
  },
})
export default class UnmixingMatrixHeatmap extends UnmixingMatrixHeatmapClass {}
</script>

<style lang="less" scoped>
rect {
  stroke-width: 0px;
}
</style>
