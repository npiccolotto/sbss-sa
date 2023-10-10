<template>
  <div>
    <div class="legend-container">
      <span
        class="legend left"
        v-if="
          $store.state.view.fixColorscaleDirectionToInOut &&
          $store.state.spaceTypes[space1] !== $store.state.spaceTypes[space2]
        "
        ><span v-if="$store.getters.shouldFlipColorScale(space1, space2)"
          >← stable</span
        ><span v-else>← sensitive</span></span
      >
      <span class="legend left" v-else>← more variation in {{ space2 }}</span>
      <span
        class="legend right"
        v-if="
          $store.state.view.fixColorscaleDirectionToInOut &&
          $store.state.spaceTypes[space1] !== $store.state.spaceTypes[space2]
        "
        ><span v-if="$store.getters.shouldFlipColorScale(space1, space2)"
          >sensitive →</span
        ><span v-else>stable →</span></span
      >
      <span class="legend right" v-else>more variation in {{ space1 }} →</span>
    </div>
    <div class="d-flex flex-column" style="gap: 2px">
      <!-- <img :src="scaleImgBinned" height="15" :width="width" /> -->
      <img :src="scaleImg" height="15" :width="width" />
    </div>
    <div class="legend-container">
      <span class="legend">{{ extremeValues[1] }}</span>
      <span class="legend">{{ extremeValues[0] }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { format } from "d3-format";
import { ScaleLinear } from "d3-scale";

type Scale = {
  bins: [number, number][];
  numeric: ScaleLinear<number, number>;
  numericAbs: ScaleLinear<number, number>;
  chromatic: (x: number) => string;
  range: [number, number];
  rangeAbs: [number, number];
  scheme: string[];
};

const f = format(".2e");

function rampImg(scale: any, n = 256, rel = true, useBins = false) {
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = 1;
  const context = canvas.getContext("2d")!;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const range = rel ? scale.range : scale.rangeAbs;
    // if this bit is outside of our color range, draw gray
    if (x < range[0] || x > range[1]) {
      context.fillStyle = "#eee";
    } else {
      const bin = scale.bins.findIndex(
        ([min, max]: [number, number]) => min <= x && x < max
      );
      context.fillStyle = useBins ? scale.scheme[bin] : scale.chromatic(x);
    }
    context.fillRect(i, 0, 1, 1);
  }

  const url = canvas.toDataURL();
  return url;
}
class MatrixDiffClass extends Vue {
  @Prop({ default: 200 })
  public width!: number;
  @Prop({ default: 10 })
  public height!: number;

  @Prop()
  public space1!: string;
  @Prop()
  public space2!: string;

  public scale!: Scale;
}
@Component<MatrixDiffClass>({
  computed: {
    scale: function () {
      const scale = this.$store.getters.diffScale(
        this.space1,
        this.space2,
        this.$store.state.view.useRelativeColorScale
      );
      return scale;
    },
    extremeValues: function () {
      return [
        f(this.scale.numericAbs.invert(this.scale.rangeAbs[0])),
        f(this.scale.numericAbs.invert(this.scale.rangeAbs[1])),
      ];
    },
    scaleImg: function () {
      const img = rampImg(
        this.scale,
        256,
        this.$store.state.view.useRelativeColorScale,
        false
      );
      return img;
    },
    scaleImgBinned: function () {
      return rampImg(
        this.scale,
        256,
        this.$store.state.view.useRelativeColorScale,
        true
      );
    },
  },
})
export default class MatrixDiff extends MatrixDiffClass {}
</script>
<style lang="less" scoped>
.legend {
  font-family: monospace;
  font-size: 8px;

  &.right {
    text-align: right;
  }
}
.legend-container {
  display: flex;
  justify-content: space-between;
}
</style>
