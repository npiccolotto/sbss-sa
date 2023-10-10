<template>
  <div>{{ element }}</div>
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

  public element!: Matrix;
}

@Component<TextClass>({
  computed: {
    element: function () {
      return this.$store.state.spaces.leafs[this.$props.space][
        this.$props.elementIdx
      ];
    },
  },
})
export default class Text extends TextClass {}
</script>
