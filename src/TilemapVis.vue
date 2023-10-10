<template>
  <div
    :style="{
      width: effectiveWidth + 'px',
      height: height + 'px',
      'line-height': 0,
    }"
  >
    <div
      v-for="(tile, i) in tiles"
      :key="i"
      :style="{ float: 'left' }"
      :title="tile.x"
    >
      <v-popover>
        <div
          :style="{
            width: tileSize + 'px',
            height: tileSize + 'px',
            background: tile.fill,
            display: 'block',
            float: 'left',
          }"
        ></div>
        <template #popper="{ hide }">
          <button @click="hide()">Close</button>
          <ImageVis
            :elementIdx="elementIdx + 1"
            :setIdx="i + 1"
            :space="space"
            width="400"
            height="400"
          />
        </template>
      </v-popover>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import {
  scalePoint,
  ScalePoint,
  ScaleLinear,
  scaleLinear,
  scaleSequential,
  ScaleSequential,
} from "d3-scale";
import { interpolateGreys } from "d3-scale-chromatic";
import { extent } from "d3-array";
import Isoline from "@/Isoline.vue";
import ImageVis from "@/ImageVis.vue";

class TilemapClass extends Vue {
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
  public colorScale!: ScaleSequential<number, string>;
  public element!: number[];
  public effectiveWidth!: number;
  public spaceData!: number[][];
  public textOffset = 50;
  public margin = 2;
  public globalExtent!: [number, number];
}
function ceil10(n: number) {
  return Math.ceil(n / 10) * 10;
}

function nextSq(n: number) {
  return Math.ceil(Math.sqrt(n)) ** 2;
}

// Vertical PCP
@Component<TilemapClass>({
  components: { Isoline, ImageVis },
  computed: {
    effectiveWidth: function () {
      return this.$props.width - 2 * this.margin;
    },
    tileSize: function () {
      // w = 120
      // h= 120
      // -> we can fit 12x12=144 squares of size 10x10, or 2x2=4 of size 60
      // w = 120
      // h = 10
      // -> 12x1 = 12 squares of size 10x10
      return ceil10(
        Math.sqrt(
          (this.effectiveWidth * this.height) / nextSq(this.element.length)
        )
      );
    },
    spaceData: function () {
      return this.$store.state.spaces.leafs[this.$props.space];
    },
    element: function () {
      return this.spaceData[this.$props.elementIdx].map((x) => Math.abs(x));
    },
    globalExtent: function () {
      return extent(this.spaceData.flat().map((x) => Math.abs(x)));
    },
    colorScale: function () {
      return scaleSequential()
        .interpolator(interpolateGreys)
        .domain(this.globalExtent as [number, number]);
    },
    yScale: function () {
      return scalePoint<string>()
        .padding(1)
        .domain(this.element.map((s, i) => i + ""))
        .range([0, this.height]);
    },
    tiles: function () {
      return this.element.map((x, i) => {
        return {
          fill: this.colorScale(x),
          x,
          isoline: this.$store.state.spaces.tooltips[this.$props.space][
            this.$props.elementIdx
          ][i],
        };
      });
    },
    xScale: function () {
      const ext = extent(this.spaceData.flat()) as [number, number];
      return scaleLinear()
        .domain(ext)
        .range([this.margin, this.effectiveWidth]);
    },
  },
})
export default class Tilemap extends TilemapClass {}
</script>

<style lang="less" scoped>
path {
  stroke-width: 2px;
  stroke: black;
  fill: none;
}
</style>
