<template>
  <div>
    <canvas
      :data-elementIdx="elementIdx"
      :data-space="space"
      @mousemove="onMouseMove"
      @mouseout="onMouseOut"
      :width="shorterSide - margin"
      :height="shorterSide - margin"
      ref="canvas"
    ></canvas>
    <div v-show="pixelValue !== '(NA)'">{{ pixelValue }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scaleLinear, ScaleSequential, scaleSequential } from "d3-scale";
import { line, curveNatural } from "d3-shape";
import { extent } from "d3-array";
import {
  interpolateOranges,
  interpolateBlues,
  interpolateGreens,
  interpolateGreys,
} from "d3-scale-chromatic";
import { StoreState } from "./store";
import { Matrix } from "ml-matrix";
import { formatNumber } from "./util/util";

class PixelVislass extends Vue {
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

  public pixelValue = "(NA)";
  public extent!: [number, number];
  public element!: (number | undefined)[][];
  public margin = 2;
  public shorterSide!: number;
  public allDataPoints!: number[];
  public scaleColor!: ScaleSequential<string, string>;
}

@Component<PixelVislass>({
  computed: {
    shorterSide: function () {
      return (
        Math.min(this.width - 2 * this.margin, this.height - 2 * this.margin) -
        this.margin
      );
    },
    extent: function () {
      const [min, max] = extent(this.allDataPoints);
      return [min, max];
    },
    allDataPoints: function () {
      const el = this.$store.state.spaces.leafs[
        this.$props.space
      ].map((r: (number | undefined)[]) =>
        r.map((c: number | undefined) => (c === null ? undefined : c))
      );
      return el.flat(2);
    },

    scaleColor: function () {
      type Interpolator =
        | "interpolateBlues"
        | "interpolateGreys"
        | "interpolateGreens"
        | "interpolateOranges";
      type InterpolatingFn = (t: number) => string;
      const colors: Record<Interpolator, InterpolatingFn> = {
        interpolateBlues,
        interpolateOranges,
        interpolateGreens,
        interpolateGreys,
      };
      let leafVis: string[] = this.$store.state.leafvis[
        this.$props.space
      ].split(":");
      let color: InterpolatingFn = interpolateGreys;
      if (leafVis.length > 1) {
        color = colors[leafVis[1] as Interpolator];
      }

      const scale = scaleSequential(color).domain(this.extent).unknown("#fff");
      return scale;
    },
    element: function () {
      const el = this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ].map((r: (number | undefined)[]) =>
        r.map((c: number | undefined) => (c === null ? undefined : c))
      );

      return el;
    },
  },
})
export default class PixelVis extends PixelVislass {
  onMouseOut() {
    this.pixelValue = "(NA)";
  }
  onMouseMove(e: MouseEvent) {
    const { offsetX, offsetY } = e;
    const x = Math.floor(
      offsetX / Math.floor(this.shorterSide / this.element.length)
    );
    const y = Math.floor(
      offsetY / Math.floor(this.shorterSide / this.element.length)
    );
    this.pixelValue = Number.isFinite(this.element[x][y])
      ? formatNumber(this.element[x][y] as number)
      : "(NA)";
  }
  draw() {
    const canvas = this.$refs.canvas as HTMLCanvasElement;
    const w = this.element.length;
    const h = this.element[0].length;
    const context = canvas.getContext("2d")!;
    const pixelw = Math.floor(this.shorterSide / w);
    const pixelh = Math.floor(this.shorterSide / h);
    context.clearRect(0, 0, w * pixelw, h * pixelw);
    for (let i = 0; i < w; ++i) {
      for (let j = 0; j < h; ++j) {
        context.fillStyle = this.scaleColor(this.element[i][j] as number);

        context.fillRect(i * pixelw, j * pixelw, pixelw, pixelh);
      }
    }
  }
  mounted() {
    this.draw();
  }

  updated() {
    this.draw();
  }
}
</script>

<style lang="less" scoped></style>
