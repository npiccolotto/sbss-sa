<template>
  <svg :width="effectiveWidth" :height="height" style="background: white">
    <g ref="axis" transform="translate(0,0)" />
    <g ref="axisX" :transform="'translate(0,' + (height - 5 * margin) + ')'" />
    <path :d="line" />
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scalePoint, ScalePoint, ScaleLinear, scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import { axisRight, axisTop, axisBottom } from "d3-axis";
import { select } from "d3-selection";
import { line, Line } from "d3-shape";

class LineChartClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementIdx!: number;

  public yScale!: ScaleLinear<number, number>;
  public xScale!: ScaleLinear<number, number>;
  public element!: [number, number][];
  public effectiveWidth!: number;
  public spaceData!: number[][];
  public textOffset = 50;
  public line!: string;
  public margin = 5;
  public lineScale!: Line<[number, number]>;
  public extent!: [number, number];
}

// Vertical LineChart
@Component<LineChartClass>({
  computed: {
    effectiveWidth: function () {
      return this.$props.width - 2 * this.margin;
    },
    spaceData: function () {
      return this.$store.state.spaces.leafs[this.$props.space];
    },
    extent: function () {
      return extent(this.spaceData.flat(2));
    },
    element: function () {
      return this.spaceData[this.$props.elementIdx].map((x, i) => [i, x]);
    },
    yScale: function () {
      return scaleLinear()
        .domain(this.extent)
        .range([this.height - this.margin, this.margin]);
    },
    lineScale: function () {
      type Datum = [number, number];
      return line<Datum>(
        (d: Datum) => this.xScale(d[0]),
        (d: Datum) => this.yScale(d[1])
      );
    },
    line: function () {
      return this.lineScale(this.element);
    },
    xScale: function () {
      return scaleLinear()
        .domain([0, this.element.length])
        .range([this.margin, this.effectiveWidth - this.margin]);
    },
  },
})
export default class LineChart extends LineChartClass {
  drawAxis() {
    const axisEl = this.$refs.axis as SVGGElement;
    select(axisEl)
      .call(
        axisRight(this.yScale).tickSize(this.effectiveWidth - this.margin * 2)
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke-opacity", 0.5)
          .attr("stroke-dasharray", "2,2")
      )
      //.call((g) => g.selectAll(".tick(:first-of-type) line").remove())
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("x", 4)
          .attr("dy", -4)
          .attr("fill", "#aaa")
      );

    const xAxisEl = this.$refs.axisX as SVGGElement;
    select(xAxisEl)
      .call(
        axisBottom(this.xScale)
          .tickSize(5)
          .tickValues([3, 6, 9, 12, 15, 18, 21])
      )
      .call((g) => g.select(".domain").remove())
      .call(
        (g) => g.selectAll(".tick line").attr("stroke-opacity", 0.5)
        //.attr("stroke-dasharray", "2,2")
      )
      //.call((g) => g.selectAll(".tick(:first-of-type) line").remove())
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("x", 0)
          .attr("dy", 10)
          .attr("fill", "#aaa")
      );
  }
  mounted() {
    this.drawAxis();
  }
  updated() {
    this.drawAxis();
  }
}
</script>

<style lang="less" scoped>
path {
  stroke-width: 2px;
  stroke: black;
  fill: none;
}
</style>
