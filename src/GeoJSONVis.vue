<template>
  <l-map
    v-if="visible"
    ref="map"
    :style="{ width: width + 'px', height: height + 'px' }"
  >
    <l-tile-layer :url="url" :attribution="attribution"></l-tile-layer>
    <l-marker v-for="(marker, id) in markers" :key="id" :lat-lng="marker">
      <l-icon :icon-size="[16, 16]" :icon-anchor="[8, 8]" :icon-url="iconUrl">
      </l-icon>
    </l-marker>
    <l-geo-json :geojson="geojson"></l-geo-json>
  </l-map>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { LMap, LTileLayer, LMarker, LGeoJson, LIcon } from "vue2-leaflet";
import { StoreState } from "./store";

class GeoJSONClass extends Vue {
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

  public sideLength!: number;
  public bounds!: [number, number][];
  public geojson!: any;

  public url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  public attribution =
    '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors';
  public iconUrl =
    process.env.VUE_APP_PUBLIC_PATH + "/images/icon-location.png";
}

@Component<GeoJSONClass>({
  watch: {
    visible: function (n, o) {
      if (n) {
        setTimeout(() => {
          (this.$refs.map as any).mapObject.invalidateSize(); // tslint disable-line
          (this.$refs.map as any).mapObject.fitBounds(this.bounds);
        }, 0);
      }
    },
  },
  components: { LMap, LTileLayer, LMarker, LIcon, LGeoJson },
  computed: {
    sideLength: function () {
      let side = Math.min(this.$props.width, this.$props.height);
      //side = Math.min(side, 75);
      return side;
    },
    markers: function () {
      const latlon = (this.$store
        .state as StoreState).ctx.tooltips.points.map(
        ([lon, lat]: [number, number]) => [lat, lon]
      );
      return latlon;
    },
    bounds: function () {
      let bounds: {
        minLon?: number;
        maxLon?: number;
        minLat?: number;
        maxLat?: number;
      } = {};
      for (const feat of this.geojson.features) {
        for (const [lon, lat] of feat.geometry.coordinates[0]) {
          if (
            bounds.minLon === undefined ||
            (bounds.minLon !== undefined && bounds.minLon > lon)
          ) {
            bounds.minLon = lon;
          }
          if (
            bounds.maxLon === undefined ||
            (bounds.maxLon !== undefined && bounds.maxLon < lon)
          ) {
            bounds.maxLon = lon;
          }
          if (
            bounds.minLat === undefined ||
            (bounds.minLat !== undefined && bounds.minLat > lat)
          ) {
            bounds.minLat = lat;
          }
          if (
            bounds.maxLat === undefined ||
            (bounds.maxLat !== undefined && bounds.maxLat < lat)
          ) {
            bounds.maxLat = lat;
          }
        }
      }
      return [
        [bounds.minLat, bounds.minLon],
        [bounds.maxLat, bounds.maxLon],
      ];
    },
    geojson: function () {
      return this.$store.state.spaces.tooltips[this.$props.space][
        this.$props.elementIdx
      ];
    },
  },
})
export default class GeoJSON extends GeoJSONClass {}
</script>

<style lang="less" scoped>
svg {
}
</style>
