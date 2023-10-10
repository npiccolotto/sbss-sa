<template>
  <div
    @click="visible = !visible"
    :data-element-idx="elementIdx"
    :data-space="space"
    :data-vss="leafvis[space]"
    :style="{ width: width + 'px', height: height + 'px' }"
  >
    <TilemapVis
      v-if="leafvis[space] === 'tilemap'"
      :elementIdx="elementIdx"
      :elementName="elementName"
      :space="space"
      :width="width"
      :height="height"
    />
    <v-popover v-else :triggers="[]" :shown="visible" :autoHide="false">
      <UnmixingMatrixHeatmap
        v-if="leafvis[space] === 'unmixing-matrix-heatmap'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <MultiPolygon
        v-else-if="leafvis[space] === 'multipolygons'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <MultiRectangle
        v-else-if="leafvis[space] === 'multirectangles'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <PCPVis
        v-else-if="leafvis[space] === 'multivariate'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <BarChartVis
        v-else-if="leafvis[space] === 'barchart'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <KernelVis
        v-else-if="leafvis[space] === 'balls'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <EmbeddingVis
        v-else-if="leafvis[space] === 'embedding'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <TwoDimVectorVis
        v-else-if="leafvis[space] === '2dvector'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <PixelVis
        v-else-if="leafvis[space].startsWith('image-inline')"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <LineChartVis
        v-else-if="leafvis[space] === 'linechart'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <TextVis
        v-else-if="leafvis[space] === 'text'"
        :elementIdx="elementIdx"
        :elementName="elementName"
        :space="space"
        :width="width"
        :height="height"
      />
      <div v-else-if="leafvis[space] === 'image'">
        <ImageVis
          :elementIdx="elementIdx"
          :elementName="elementName"
          :space="space"
          :width="width"
          :height="height"
          :visible="visible"
        />
      </div>
      <div v-else>
        {{ $store.state.spaces.leafs[space][elementIdx] }}
      </div>
      <template #popper="{ hide }">
        <div class="text-right"><button @click="hide()">Close</button></div>
        <h5 class="text-center">{{ elementName }}</h5>
        <div class="d-flex flex-column">
          <div
            v-if="
              tooltipvis[space].includes('image') &&
              !tooltipvis[space].includes('image-inline')
            "
          >
            <ImageVis
              :elementIdx="elementIdx"
              :elementName="elementName"
              :space="space"
              :width="300"
              :height="300"
              :visible="visible"
            />
          </div>
          <GlobeVis
            v-if="tooltipvis[space].includes('geospatial-point-3d')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="300"
            :height="300"
            :visible="visible"
          />
          <PCPVis
            v-if="tooltipvis[space].includes('multivariate')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="300"
            :height="150"
          />
          <EmbeddingVis
            v-if="tooltipvis[space].includes('embedding')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="300"
            :height="300"
          />
          <GeoJSONVis
            v-if="tooltipvis[space].includes('geojson')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="400"
            :height="400"
            :visible="visible"
          />
          <IsolinesSetVis
            v-if="tooltipvis[space].includes('isolines-set')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="400"
            :height="400"
            :visible="visible"
          />
          <TwoDimVectorVis
            v-else-if="tooltipvis[space].includes('2dvector')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="width"
            :height="height"
          />
          <PixelVis
            v-else-if="tooltipvis[space].includes('image-inline')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="400"
            :height="400"
          />
          <LineChartVis
            v-else-if="tooltipvis[space].includes('linechart')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="width"
            :height="height"
          />
          <TextVis
            v-else-if="tooltipvis[space].includes('text')"
            :elementIdx="elementIdx"
            :elementName="elementName"
            :space="space"
            :width="width"
            :height="height"
          />
        </div>
      </template>
    </v-popover>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import EmbeddingVis from "@/EmbeddingVis.vue";
import UnmixingMatrixHeatmap from "@/UnmixingMatrixHeatmap.vue";
import KernelVis from "@/KernelVis.vue";
import MultiPolygon from "@/MultiPolygon.vue";
import MultiRectangle from "@/MultiRectangle.vue";
import PCPVis from "@/PCPVis.vue";
import GlobeVis from "@/GlobeVis.vue";
import TextVis from "@/TextVis.vue";
import PixelVis from "@/PixelVis.vue";
import GeoJSONVis from "@/GeoJSONVis.vue";
import IsolinesSetVis from "@/IsolinesSetVis.vue";
import BarChartVis from "@/BarChartVis.vue";
import TilemapVis from "@/TilemapVis.vue";
import ImageVis from "@/ImageVis.vue";
import TwoDimVectorVis from "@/TwoDimVectorVis.vue";
import LineChartVis from "@/LineChartVis.vue";

class LeafVisClass extends Vue {
  @Prop()
  public width!: number;
  @Prop()
  public height!: number;
  @Prop()
  public elementIdx!: number;
  @Prop()
  public space!: string;

  public elementName!: string;
  public visible = false;
}

@Component<LeafVisClass>({
  components: {
    PCPVis,
    TilemapVis,
    ImageVis,
    EmbeddingVis,
    IsolinesSetVis,
    GeoJSONVis,
    BarChartVis,
    KernelVis,
    GlobeVis,
    LineChartVis,
    TwoDimVectorVis,
    TextVis,
    PixelVis,
    MultiRectangle,
    MultiPolygon,
    UnmixingMatrixHeatmap,
  },
  computed: {
    leafvis: function () {
      return this.$store.state.leafvis;
    },
    tooltipvis: function () {
      return this.$store.state.tooltipvis;
    },
    elementName: function () {
      if (
        this.$store.state.rownames &&
        this.$store.state.rownames[this.space]
      ) {
        return this.$store.state.rownames[this.space][this.elementIdx];
      }
      return "";
    },
  },
})
export default class LeafVis extends LeafVisClass {}
</script>

<style lang="less" scoped>
div {
  text-align: center;
}
</style>
