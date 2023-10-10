<template>
  <div :style="{ 'max-width': 2 * width + 'px' }">
    <Isoline
      v-for="(el, id) in element"
      :key="id"
      :isolines="el"
      :width="120"
      :height="120"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { scaleLinear, ScaleLinear } from "d3-scale";
import Isoline from "@/Isoline.vue";
import { StoreState } from "./store";

class IsolinesSetVisClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public elementIdx!: number;
  @Prop()
  public space!: string;

  public element!: any;
}

@Component<IsolinesSetVisClass>({
  components: { Isoline },
  computed: {
    element: function () {
      const el = this.$store.state.spaces.tooltips[this.$props.space][
        this.$props.elementIdx
      ];
      return el;
    },
  },
})
export default class IsolinesSetVis extends IsolinesSetVisClass {}
</script>

<style lang="less" scoped>
circle,
path {
  stroke-width: 2px;
  stroke: black;
  fill: transparent;
}
text {
  font-size: 8px;
}
</style>
