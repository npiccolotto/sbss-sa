<template>
  <svg
    :width="sideLength"
    :height="sideLength"
    style="background: white; border: 1px solid gray"
  >
    <circle
      v-for="point in embeddedPoints.notHighlighted"
      :key="point.id"
      :r="1"
      :cx="point.x"
      :cy="point.y"
      :fill="'black'"
    />
    <circle
      r="2"
      :cx="embeddedPoints.highlighted.x"
      :cy="embeddedPoints.highlighted.y"
      :fill="'red'"
    />
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { Matrix } from "ml-matrix";
import { extent } from "d3-array";
import range from "lodash/range";

class EmbeddingClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementIdx!: number;

  public matrix!: Matrix;
  public xScale!: ScaleLinear<number, number>;
  public yScale!: ScaleLinear<number, number>;
  public sideLength!: number;
}

const margin = 10;

@Component<EmbeddingClass>({
  computed: {
    sideLength: function () {
      let side = Math.min(this.$props.width, this.$props.height);
      //side = Math.min(side, 75);
      return side;
    },
    matrix: function () {
      return new Matrix(this.$store.state.spaces.leafs[this.$props.space]);
    },
    yScale: function () {
      const yExtent = extent(this.matrix.getColumn(1)) as [number, number];
      const y = scaleLinear()
        .domain(yExtent)
        .range([this.sideLength - margin, margin]);
      return y;
    },
    xScale: function () {
      const xExtent = extent(this.matrix.getColumn(0)) as [number, number];
      const x = scaleLinear()
        .domain(xExtent)
        .range([margin, this.sideLength - margin]);
      return x;
    },
    embeddedPoints: function () {
      const X = this.matrix;
      const result = [];
      for (const r of range(X.rows)) {
        const el = X.getRow(r);
        const highlighted = r === this.$props.elementIdx;
        result.push({
          id: r,
          x: this.xScale(el[0]),
          y: this.yScale(el[1]),
          highlighted,
        });
      }
      return {
        highlighted: result.find((r) => r.highlighted),
        notHighlighted: result.filter((r) => !r.highlighted),
      };
    },
  },
})
export default class Embedding extends EmbeddingClass {}
</script>

<style lang="less" scoped>
svg {
}
</style>
