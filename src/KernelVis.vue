<template>
  <svg :width="width" :height="height">
    <!-- <g v-for="(line, l) in lines" :key="l">
      <path :d="line"></path>
    </g> -->

    <circle :r="ball.r2" :cx="ball.cx" :cy="ball.cy" fill="gray">
      <title>{{ title }}</title>
    </circle>
    <circle :r="ball.r1" :cx="ball.cx" :cy="ball.cy" fill="white">
      <title>{{ title }}</title>
    </circle>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { StoreState } from "./store";
import { formatRing } from "./util/util";

class KernelVisClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public elementIdx!: number;
  @Prop()
  public space!: string;

  public yScale!: ScaleLinear<number, number>;
  public xScale!: ScaleLinear<number, number>;
  public max!: number;
  public shortestSide!: number;
  public element!: [number, number];
}

const margin = 5;

@Component<KernelVisClass>({
  computed: {
    shortestSide: function () {
      return Math.min(this.$props.width, this.$props.height);
    },
    title: function () {
      return formatRing(this.element.map((x) => x / 1000) as [number, number]);
    },
    max: function () {
      const kernels = (this.$store.state as StoreState).spaces.leafs[
        this.$props.space
      ];
      return Math.max(...kernels.flat());
    },
    xScale: function () {
      return scaleLinear()
        .domain([0, this.max])
        .range([0, this.shortestSide / 2 - margin]);
    },
    element: function () {
      return this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ];
    },
    ball: function () {
      return {
        r1: this.xScale(this.element[0]),
        r2: this.xScale(this.element[1]),
        cx: this.width / 2,
        cy: this.width / 2 + margin,
      };
    },
  },
})
export default class KernelVis extends KernelVisClass {}
</script>

<style lang="less" scoped>
circle,
path {
  stroke-width: 1px;
  stroke: black;
}
text {
  font-size: 8px;
}
</style>
