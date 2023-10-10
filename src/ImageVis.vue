<template>
  <div>
    <img
      v-for="img in images"
      :src="img"
      :key="img"
      :style="{
        width: width - margin + 'px',
        height: 'auto',
        'max-height': height + 'px',
        'object-fit': 'contain',
        padding: '3px 0',
      }"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scaleLinear, ScaleLinear } from "d3-scale";
import { line, curveNatural } from "d3-shape";
import { extent } from "d3-array";
import { StoreState } from "./store";
import { Matrix } from "ml-matrix";

class ImageVislass extends Vue {
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

  @Prop()
  public setIdx!: number;

  public element!: string[];
  public margin = 2;
  public shorterSide!: number;
}

@Component<ImageVislass>({
  computed: {
    shorterSide: function () {
      return (
        Math.min(this.width - 2 * this.margin, this.height - 2 * this.margin) -
        this.margin
      );
    },
    element: function () {
      const el = this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ];
      return el;
    },
    images: function () {
      if (this.setIdx !== undefined) {
        return [
          `/images/${this.$store.state.datasetName}/${this.space}/${this.elementIdx}-${this.setIdx}.jpg`,
        ];
      }
      return this.element.map(
        (img) => `/images/${this.$store.state.datasetName}/${this.space}/${img}`
      );
    },
  },
})
export default class ImageVis extends ImageVislass {}
</script>

<style lang="less" scoped></style>
