<template>
  <div ref="globeContainer" style="width: 300px; height: 300px"></div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Globe from "globe.gl";

class GlobeVisClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public elementIdx!: number;
  @Prop()
  public space!: string;
  @Prop()
  public elementName!: string;
  @Prop()
  public visible!: boolean;

  public showGlobe() {}
}

@Component<GlobeVisClass>({
  watch: {
    visible: function (n, o) {
      if (n) {
        this.showGlobe();
      } else {
        // teardown?
      }
    },
  },
})
export default class GlobeVis extends GlobeVisClass {
  mounted() {
    if (this.$props.visible) {
      this.showGlobe();
    }
  }
  showGlobe() {
    const pointsData = this.$store.state.spaces.tooltips[this.$props.space].map(
      ([lng, lat]: [number, number], i: number) => {
        const pointIsElement = i === this.$props.elementIdx;
        const height = pointIsElement ? 0.25 : 0.1;
        const color = pointIsElement ? "red" : "white";
        return {
          lng,
          lat,
          height,
          color,
        };
      }
    );

    Globe()(this.$refs.globeContainer as HTMLElement)
      .width(300)
      .height(300)
      .pointsData(pointsData)
      .pointLat("lat")
      .pointLng("lng")
      .pointColor("color")
      .pointAltitude("height")
      .pointsMerge(true)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-day.jpg")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .showGraticules(true);
  }
}
</script>
