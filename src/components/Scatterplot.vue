<template>
  <svg :width="width" :height="height">
    <rect
      :width="width"
      :height="height"
      x="0"
      y="0"
      stroke="gray"
      fill="white"
    />
    <circle
      v-for="point in points"
      :key="point.id"
      :cx="point.x"
      :cy="point.y"
      :stroke-width="0"
      :fill="point.color"
      :r="1"
    />
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { format } from "d3-format";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { axisLeft, axisBottom } from "d3-axis";
import range from "lodash/range";
import { select } from "d3-selection";
import { StoreState } from "@/store";
import { extent } from "d3-array";
import { Matrix } from "ml-matrix";
import { leafs } from "@/util/tree";

let margin = 2;

class ScatterplotClass extends Vue {
  @Prop({ default: 200 })
  public width!: number;
  @Prop({ default: 200 })
  public height!: number;

  @Prop()
  public space1!: string;
  @Prop()
  public space2!: string;

  public axisWidth = 0;

  public yScale!: ScaleLinear<number, number>;
  public xScale!: ScaleLinear<number, number>;
}
@Component<ScatterplotClass>({
  computed: {
    allPointsUndimmed: function () {
      const state = this.$store.state as StoreState;
      return state.view.highlightedLink === null;
    },
    xScale: function () {
      return scaleLinear()
        .domain(
          extent(
            (this.$store.getters.S(this.space1) as Matrix).to1DArray().reverse()
          ) as [number, number]
        )
        .range([margin + this.axisWidth, this.width - margin - this.axisWidth]);
    },
    yScale: function () {
      return scaleLinear()
        .domain(
          extent(
            (this.$store.getters.S(this.space2) as Matrix).to1DArray()
          ) as [number, number]
        )
        .range([
          this.height - margin - this.axisWidth,
          margin + this.axisWidth,
        ]);
    },
    points: function () {
      const S1 = this.$store.getters.S(this.space1) as Matrix;
      const S2 = this.$store.getters.S(this.space2) as Matrix;
      const diffScale = this.$store.getters.diffScale(
        this.space1,
        this.space2,
        this.$store.state.view.useRelativeColorScale
      );

      const points = [];
      for (const i of range(S1.rows)) {
        for (const j of range(i + 1, S1.columns)) {
          const s1 = S1.get(i, j);
          const s2 = S2.get(i, j);

          points.push({
            id: `${i}/${j}`,
            x: this.xScale(s1),
            y: this.yScale(s2),
            color: diffScale.chromatic(diffScale.numericAbs(s1 - s2)),
          });
        }
      }
      return points;
    },
  },
})
export default class Scatterplot extends ScatterplotClass {
  drawAxis() {
    const xAxisEl = this.$refs.xAxis as SVGGElement;
    const xAxis = axisBottom(this.xScale.nice()).ticks(5);

    for (const c of Array.from(xAxisEl.children)) {
      xAxisEl.removeChild(c);
    }
    select(xAxisEl)
      .call(xAxis)
      .call((g) => {
        g.attr(
          "transform",
          `translate(0, ${this.height - margin - this.axisWidth})`
        );
        g.selectAll(".tick text")
          .attr("font-size", 8)
          .attr("font-family", "monospace");
      })
      .append("text")
      .attr("font-size", 16)
      .attr("fill", "#bbb")
      .attr("transform", `translate(${this.width / 2},${this.axisWidth})`)
      .text(this.space1);

    const yAxisEl = this.$refs.yAxis as SVGGElement;
    const yAxis = axisLeft(this.yScale.nice()).ticks(5);

    for (const c of Array.from(yAxisEl.children)) {
      yAxisEl.removeChild(c);
    }
    select(yAxisEl)
      .call(yAxis)
      .call((g) => {
        g.attr("transform", `translate(${this.axisWidth})`);
        g.selectAll(".tick text")
          .attr("font-size", 8)
          .attr("font-family", "monospace");
      })
      .append("text")
      .attr("font-size", 16)
      .attr("fill", "#bbb")
      .attr(
        "transform",
        `rotate(-90)translate(${-this.height / 2}, ${-this.axisWidth / 2})`
      )
      .text(this.space2);
  }

  mounted() {
    //  this.drawAxis();
  }
  updated() {
    // this.drawAxis();
  }
}
</script>
<style lang="less" scoped>
.legend {
  font-family: monospace;
  font-size: 8px;
}
.legend-container {
  display: flex;
  justify-content: space-between;
}
</style>
