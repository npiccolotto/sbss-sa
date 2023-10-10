<template>
  <svg :width="effectiveWidth" :height="effectiveHeight">
    <rect
      x="0"
      y="0"
      :width="effectiveWidth"
      :height="effectiveHeight"
      fill="white"
    />
    <path
      v-for="(line, id) in lines"
      :key="id"
      :d="line.line"
      :data-isovalue="line.val"
      fill="none"
      stroke-width="1"
    />
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { line, curveNatural } from "d3-shape";
import { extent } from "d3-array";
import { StoreState } from "./store";

class IsolineClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public isolines!: [number, number][][][]; // from outermost = isovalue, isoline, coordinates

  public yScale!: ScaleLinear<number, number>;
  public xScale!: ScaleLinear<number, number>;
  public extent!: [[number, number], [number, number], number];

  public aspectRatio!: number;
  public effectiveWidth!: number;
  public effectiveHeight!: number;
}

const margin = 5;

@Component<IsolineClass>({
  computed: {
    extent: function () {
      const xs = extent(
        this.isolines
          .flat()
          .flat()
          .map(([x]) => x)
      ) as [number, number];
      const ys = extent(
        this.isolines
          .flat()
          .flat()
          .map(([, y]) => y)
      ) as [number, number];

      return [xs, ys];
    },
    effectiveWidth: function () {
      return this.$props.width;
    },
    effectiveHeight: function () {
      return this.$props.height / this.aspectRatio;
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
    xScale: function () {
      return scaleLinear()
        .domain(this.extent[0])
        .range([margin, this.effectiveWidth - margin]);
    },
    yScale: function () {
      return scaleLinear()
        .domain([...this.extent[1]].reverse())
        .range([margin, this.effectiveHeight - margin]);
    },
    lines: function () {
      const lineGen = line().curve(curveNatural);
      const lines = [];
      for (const [val, isoval] of this.isolines.entries()) {
        for (const isoline of isoval) {
          const points = isoline.map(([x, y]) => [
            this.xScale(x),
            this.yScale(y),
          ]) as [number, number][];
          lines.push({
            val,
            line: lineGen(points),
          });
        }
      }
      return lines;
    },
  },
})
export default class Isoline extends IsolineClass {}
</script>

<style lang="less" scoped>
path {
  stroke: #ccc;

  &[data-isovalue="0"] {
    stroke: #8c510a;
  }
  &[data-isovalue="1"] {
    stroke: #bf812d;
  }
  &[data-isovalue="2"] {
    stroke: #dfc27d;
  }
  &[data-isovalue="3"] {
    stroke: #f6e8c3;
  }
  &[data-isovalue="4"] {
    stroke: #f5f5f5;
  }
  &[data-isovalue="5"] {
    stroke: #c7eae5;
  }
  &[data-isovalue="6"] {
    stroke: #80cdc1;
  }
  &[data-isovalue="7"] {
    stroke: #35978f;
  }
  &[data-isovalue="8"] {
    stroke: #01665e;
  }
}
</style>
