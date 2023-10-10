<template>
  <svg :width="width" :height="height">
    <rect
      v-for="(rect, i) in rects"
      :key="i"
      :x="rect.x1"
      :width="rect.x2 - rect.x1"
      :y="rect.y1"
      :height="rect.y2 - rect.y1"
    ></rect>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scalePoint, ScalePoint, ScaleLinear, scaleLinear } from "d3-scale";
import range from "lodash/range";
import { extent } from "d3-array";
import { Matrix } from "ml-matrix";

class MultiRectangleClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementIdx!: number;

  public matrix!: Matrix;
  public numAttributes!: number;
  public yScale!: ScalePoint<string>;
  public xScale!: ScaleLinear<number, number>;
  public effectiveWidth!: number;
  public shortestSide!: number;
  public element!: any;
  public extent!: { x: [number, number]; y: [number, number] };
}

const margin = 5;

@Component<MultiRectangleClass>({
  computed: {
    shortestSide: function () {
      return Math.min(this.$props.width, this.$props.height);
    },
    element: function () {
      return this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ];
    },
    extent: function () {
      const M = new Matrix(this.element);
      const x = extent([...M.getColumn(0), ...M.getColumn(1)]);
      const y = extent([...M.getColumn(2), ...M.getColumn(3)]);
      return { x, y };
    },
    yScale: function () {
      return scaleLinear()
        .domain(this.extent.y)
        .range([this.shortestSide - margin, margin]);
    },
    xScale: function () {
      return scaleLinear()
        .domain(this.extent.x)
        .range([margin, this.shortestSide - margin]);
    },
    rects: function () {
      const polys = [];
      for (const rect of this.element) {
        polys.push({
          x1: this.xScale(rect[0]),
          x2: this.xScale(rect[1]),
          y1: this.yScale(rect[3]),
          y2: this.yScale(rect[2]),
        });
      }
      return polys;
    },
  },
})
export default class MultiRectangle extends MultiRectangleClass {}
</script>

<style lang="less" scoped>
rect {
  stroke-width: 1px;
  stroke: black;
  fill: none;
}
</style>
