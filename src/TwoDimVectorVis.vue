<template>
  <svg :width="effectiveWidth" :height="effectiveWidth">
    <circle
      r="2"
      :cx="effectiveWidth / 2"
      :cy="effectiveWidth / 2"
      fill="black"
    />
    <circle
      :r="effectiveWidth / 3"
      :cx="effectiveWidth / 2"
      :cy="effectiveWidth / 2"
      fill="transparent"
      stroke-dasharray="4 4"
      stroke="#aaa"
    />
    <line v-bind="line" />
    <text
      text-anchor="middle"
      fill="#aaa"
      :x="effectiveWidth / 2"
      :y="effectiveWidth * 0.9"
    >
      {{ element[0] }} {{ unit }}
    </text>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { line, curveNatural } from "d3-shape";
import { extent } from "d3-array";
import { StoreState } from "./store";
import { Matrix } from "ml-matrix";

class TextClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementIdx!: number;
  @Prop()
  public visible!: boolean;
  @Prop({ default: "m/s" })
  public unit!: string;

  public effectiveWidth!: number;
  public line!: { x1: number; x2: number; y1: number; y2: number };
  public element!: [number, number];
  public extent!: [number, number];
  public allDataPoints!: number[];
}
const margin = 2;
@Component<TextClass>({
  computed: {
    effectiveWidth: function () {
      return this.$props.width - margin * 2;
    },
    extent: function () {
      return extent(this.allDataPoints);
    },
    allDataPoints: function () {
      const el = this.$store.state.spaces.leafs[this.$props.space].map(
        (e: [number, number]) => e[0]
      );
      return el.flat(2);
    },
    line: function () {
      const maxR = this.effectiveWidth / 3;
      const r = (this.element[0] / this.extent[1]) * maxR;
      console.log(this.extent, this.element, maxR, r);
      const t = (this.element[1] * Math.PI) / 180;
      return {
        x1: this.effectiveWidth / 2,
        y1: this.effectiveWidth / 2,
        x2: this.effectiveWidth / 2 + r * Math.cos(t),
        y2: this.effectiveWidth / 2 + r * Math.sin(t),
        stroke: "black",
        fill: "transparent",
      };
    },
    element: function () {
      return this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ];
    },
  },
})
export default class Text extends TextClass {}
</script>
