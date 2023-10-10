<template>
  <svg :width="effectiveWidth" :height="height" style="background: white">
    <g
      v-for="(attrib, i) in bars"
      :key="i"
      :transform="'translate(0,' + attrib.y + ')'"
    >
      <rect
        :x="0"
        :y="0"
        :height="yScale.step() / 2"
        :width="attrib.width"
        fill="black"
      ></rect>
    </g>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scalePoint, ScalePoint, ScaleLinear, scaleLinear } from "d3-scale";
import { extent } from "d3-array";

class PCPClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementIdx!: number;

  public yScale!: ScalePoint<string>;
  public xScale!: ScaleLinear<number, number>;
  public element!: number[];
  public effectiveWidth!: number;
  public spaceData!: number[][];
  public textOffset = 50;
}

const margin = 5;

// Vertical PCP
@Component<PCPClass>({
  computed: {
    effectiveWidth: function () {
      return this.$props.width - margin;
    },
    spaceData: function () {
      return this.$store.state.spaces.leafs[this.$props.space];
    },
    element: function () {
      return this.spaceData[this.$props.elementIdx];
    },
    yScale: function () {
      return scalePoint<string>()
        .padding(1)
        .domain(this.element.map((s, i) => i + ""))
        .range([0, this.height]);
    },
    bars: function () {
      return this.element.map((x, i) => {
        const y = this.yScale(i + "");
        const w = this.xScale(x);
        return {
          y,
          width: w,
        };
      });
    },
    xScale: function () {
      const ext = extent(this.spaceData.flat()) as [number, number];
      return scaleLinear()
        .domain(ext)
        .range([margin, this.effectiveWidth - margin]);
    },
  },
})
export default class PCP extends PCPClass {}
</script>

<style lang="less" scoped>
path {
  stroke-width: 2px;
  stroke: black;
  fill: none;
}
</style>
