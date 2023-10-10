<template>
  <svg :width="effectiveWidth" :height="height" style="background: white">
    <g
      v-for="(attrib, i) in bars"
      :key="i"
      :transform="'translate(0,' + attrib.y + ')'"
    >
      <g transform="translate(5,5)">
        <text font-size="8">{{ attrib.attr }}</text>
      </g>
      <rect
        :x="textOffset"
        :y="0"
        :height="yScale.step() / 2"
        :width="attrib.width"
        fill="black"
      >
        <title>{{ attrib.attr }}</title>
      </rect>
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
  public xScale!: Record<string, ScaleLinear<number, number>>;
  public element!: Record<string, number>;
  public effectiveWidth!: number;
  public attributes!: string[];
  public spaceData!: Record<string, number>[];
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
    attributes: function () {
      if (this.$store.getters.initialized) {
        return Object.keys(this.element).filter((x) => !x.startsWith("_"));
      }
      return [];
    },
    yScale: function () {
      return scalePoint<string>()
        .padding(1)
        .domain(this.attributes)
        .range([0, this.height]);
    },
    bars: function () {
      return this.attributes.map((attr) => {
        const y = this.yScale(attr);
        const w = this.xScale[attr](this.element[attr]);
        return {
          y,
          attr,
          width: w,
        };
      });
    },
    xScale: function () {
      // need multiple scales: 1 per attribute
      const scales: Record<string, ScaleLinear<number, number>> = {};
      for (const attr of this.attributes) {
        const attrExtent = extent(this.spaceData.map((e) => e[attr])) as [
          number,
          number
        ];
        scales[attr] = scaleLinear()
          .domain(attrExtent)
          .range([this.textOffset, this.effectiveWidth - margin]);
      }
      return scales;
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
