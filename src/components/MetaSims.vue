<template>
  <div>
    <div v-if="$store.getters.initialized" :style="gridStyle">
      <aside class="d-flex flex-column" style="gap: 25px">
        <div>
          <div>
            <strong
              >Similarity Comparison
              <Tooltip
                text="Compare distances either by ranks (highlights order, de-emphasizes magnitude) or min-max normed (reverse)."
            /></strong>
          </div>

          <div
            class="btn-group btn-group-sm mt-3"
            role="group"
            aria-label="Metric"
          >
            <button
              type="button"
              @click="setMetric('rank')"
              title="Uses ranks of distances instead of their original values."
              :class="{
                btn: true,
                'btn-light': $store.state.view.metric !== 'rank',
                'btn-primary': $store.state.view.metric === 'rank',
              }"
            >
              Ranked
            </button>
            <button
              @click="setMetric('distance-norm')"
              type="button"
              title="Uses normalized distance, i.e., original values converted to the unit interval [0,1]."
              :class="{
                btn: true,
                'btn-light': $store.state.view.metric !== 'distance-norm',
                'btn-primary': $store.state.view.metric === 'distance-norm',
              }"
            >
              Normed
            </button>
          </div>
        </div>
        <div>
          <div>
            <strong
              >Linkage Criterion
              <Tooltip
                text="Whether cluster diameter is measured by biggest distance of elements or average distance."
            /></strong>
          </div>

          <div
            class="btn-group btn-group-sm mt-3"
            role="group"
            aria-label="complete"
          >
            <button
              type="button"
              @click="setLinkageCriterion('complete')"
              title="Cluster diameter is biggest distance of elements."
              :class="{
                btn: true,
                'btn-light': $store.state.view.linkage !== 'complete',
                'btn-primary': $store.state.view.linkage === 'complete',
              }"
            >
              Complete
            </button>
            <button
              @click="setLinkageCriterion('average')"
              type="button"
              title="Cluster diameter is average distance of elements."
              :class="{
                btn: true,
                'btn-light': $store.state.view.linkage !== 'average',
                'btn-primary': $store.state.view.linkage === 'average',
              }"
            >
              Average
            </button>
          </div>
        </div>
        <div>
          <div><strong>Color Scale</strong></div>
          <div>
            <label class="small" for="relativeScale"
              ><input
                id="relativeScale"
                v-model="$store.state.view.useRelativeColorScale"
                type="checkbox"
              />
              Fit to observed
              <Tooltip
                text="Fit color scale to the interval observed in the data."
              />
            </label>
            <!--  <label
              title="Automatically flip color scale such that blue always means 'stable parameter' and red always 'sensitive'."
              :class="{
                small: true,
                disabled: !$store.state.spaceTypes[
                  $store.state.view.spacePair[0]
                ],
              }"
              for="fixToInOut"
              ><input
                id="fixToInOut"
                v-model="$store.state.view.fixColorscaleDirectionToInOut"
                type="checkbox"
                :disabled="
                  !$store.state.spaceTypes[$store.state.view.spacePair[0]]
                "
              />
              Auto-adjust direction
            </label> -->
          </div>
          <ColorScale
            :width="asideSize"
            :space1="$store.state.view.spacePair[0]"
            :space2="$store.state.view.spacePair[1]"
          />
        </div>
        <div>
          <div>
            <strong
              >Shepard Matrix
              <Tooltip
                text="Shepard diagrams for all pairs of similarity spaces. A dot represents the similarity of two data cases. Two similarity spaces are identical when the Shepard diagram shows a diagonal line. "
            /></strong>
          </div>
          <div>
            <SPLOM :width="asideSize" :height="asideSize" />
          </div>
        </div>
        <div class="">
          <div>
            <strong
              >Subset Sensitivity
              <Tooltip
                text="Shows how similar/different a subset of data cases is in all other similarity spaces."
            /></strong>
          </div>
          <JoinComparison />
        </div>
      </aside>
      <div>
        <div>
          <strong
            >Discrepancy Dendrogram
            <Tooltip
              text="Highlights data cases that are similar in one similarity space but not in another. Line height encodes similarity in *Dendrogram* space (lower is more similar), color encodes difference to similarity in *Color* space."
          /></strong>
        </div>
        <Dendrogram
          :space1="$store.state.view.spacePair[0]"
          :space2="$store.state.view.spacePair[1]"
          :width="$store.state.view.dendrogramSize[0]"
          :height="$store.state.view.dendrogramSize[1]"
          :leafComponent="leafComponent"
        />
      </div>
      <div>
        <div>
          <strong
            >Gallery
            <Tooltip text="Visualizations of selected data cases in a grid."
          /></strong>
        </div>
        <div
          style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
          "
        >
          <div>
            <label class="d-block" for="grid-cols"># Grid Columns</label>
            <input
              id="grid-cols"
              type="range"
              min="1"
              step="1"
              max="10"
              v-model.number="gridColumns"
            />
          </div>
          <div>
            <label class="d-block" for="grid-width">Column Width</label>
            <input
              id="grid-width"
              type="range"
              min="20"
              step="10"
              max="200"
              v-model.number="leafVisSideLength"
            />
          </div>
          <div>
            <div>Display</div>
            <div
              class="btn-group btn-group-sm"
              role="group"
              aria-label="Basic example"
            >
              <button
                v-for="space in $store.state.spaceNames"
                :key="space"
                type="button"
                :class="{
                  btn: true,
                  'btn-light': !$store.state.view.leafSpaceGrid[space],
                  'btn-primary': $store.state.view.leafSpaceGrid[space],
                }"
                @click="toggleLeafSpaceGrid(space)"
              >
                {{ space.substring(0, 3).toUpperCase() }}
              </button>
            </div>
          </div>
          <div>
            <div>Sort by</div>
            <div
              class="btn-group btn-group-sm"
              role="group"
              aria-label="Basic example"
            >
              <button
                v-for="space in $store.state.spaceNames"
                :key="space"
                type="button"
                :class="{
                  btn: true,
                  'btn-light': space !== $store.state.view.orderSpace,
                  'btn-primary': space === $store.state.view.orderSpace,
                }"
                @click="setOrderSpace(space)"
              >
                {{ space.substring(0, 3).toUpperCase() }}
              </button>
            </div>
          </div>
        </div>

        <div :style="detailGridStyle">
          <div :key="i" v-for="i in order" class="d-flex flex-row">
            <LeafVis
              v-for="space in leafSpaces"
              :key="space + i"
              :space="space"
              :elementIdx="i"
              :width="leafVisSideLength / leafSpaces.length"
              :height="leafVisSideLength / leafSpaces.length"
            />
          </div>
        </div>
        <b-button
          v-b-toggle.collapse-1
          class="mt-2"
          variant="light"
          v-if="false"
          >Show subset best/worst match</b-button
        >
        <b-collapse id="collapse-1">
          <div class="best-worst-grid" :style="bestWorstGridStyle">
            <div class="header" style="grid-area: header_col1">Best match</div>
            <div class="header" style="grid-area: header_col2">Worst match</div>
            <div class="header" style="grid-area: header_row1">
              {{ $store.state.view.spacePair[0] }}
            </div>
            <div class="header" style="grid-area: header_row2">
              {{ $store.state.view.spacePair[1] }}
            </div>
            <div
              v-for="(cell, i) in bestWorstMatch"
              :key="i"
              class="d-flex flex-row"
              :style="`grid-area: item${i}`"
            >
              <LeafVis
                v-for="space in leafSpaces"
                :key="'l_' + space + i"
                :space="space"
                :elementIdx="cell.left"
                :width="75"
                :height="75"
              />
              <LeafVis
                v-for="space in leafSpaces"
                :key="'r_' + space + i"
                :space="space"
                :elementIdx="cell.right"
                :width="75"
                :height="75"
              />
            </div></div
        ></b-collapse>
      </div>
    </div>
    <span v-else>initializing</span>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import MatrixDiff from "@/components/MatrixDiff.vue";
import JoinComparison from "@/components/JoinComparison.vue";
import ColorScale from "@/components/ColorScale.vue";
import SPLOM from "@/components/SPLOM.vue";
import Dendrogram from "@/components/Dendrogram.vue";
import LeafVis from "@/LeafVis.vue";
import Scatterplot from "@/components/Scatterplot.vue";
import { applyPerm, subMatrix } from "@/util/util";
import { seriate } from "@/util/seriate";
import Tooltip from "./Tooltip.vue";

class MetaSimsClass extends Vue {
  @Prop({ default: 600 })
  public mainSize!: number;
  @Prop({ default: 200 })
  public asideSize!: number;
  @Prop({ default: 10 })
  public gap!: number;
  @Prop({ default: 600 })
  public height!: number;

  @Prop()
  public spaces!: {
    D: Record<string, number[][]>;
    space: Record<string, number[][]>;
    vis: Record<string, string>;
    rownames: Record<string, string[]>;
  };
  @Prop()
  public leafComponent!: any;

  public leafVisSideLength = 100;
  public gridColumns = 4;
}

@Component<MetaSimsClass>({
  components: {
    MatrixDiff,
    LeafVis,
    Tooltip,
    Dendrogram,
    ColorScale,
    SPLOM,
    JoinComparison,
    Scatterplot,
  },
  computed: {
    bestWorstMatch: function () {
      if (this.$store.state.view.selectedLink) {
        let matrix = [
          [this.$store.state.view.spacePair[0], "best"],
          [this.$store.state.view.spacePair[0], "worst"],
          [this.$store.state.view.spacePair[1], "best"],
          [this.$store.state.view.spacePair[1], "worst"],
        ];

        matrix = matrix.map(
          ([space, bestworst]) =>
            this.$store.getters.bestWorstMatch(
              this.$store.state.view.selectedLink,
              space
            )[bestworst]
        );

        return matrix;
      }
    },
    order: function () {
      const orderSpace = this.$store.state.view.orderSpace;
      const treeSubset = this.$store.state.view.treeSubset;
      if (treeSubset.length < 1) {
        return [];
      }
      const D = this.$store.getters.S(orderSpace);
      const Dsub = subMatrix(D, treeSubset);
      const order = seriate(Dsub);
      return applyPerm(treeSubset, order);
    },
    leafSpaces: function () {
      const sp = Object.keys(this.$store.state.view.leafSpaceGrid).filter(
        (sp) => this.$store.state.view.leafSpaceGrid[sp]
      );
      console.log(sp);
      return sp;
    },
    bestWorstGridStyle: function () {
      return {};
    },
    detailGridStyle: function () {
      return {
        display: "grid",
        "grid-template-columns": `repeat(${this.gridColumns}, ${this.leafVisSideLength}px)`,
        "grid-gap": "10px",
      };
    },
    gridStyle: function () {
      return {
        display: "grid",
        "grid-template-columns": "200px 2fr 1fr",
        "grid-gap": "25px",
      };
    },
  },
})
export default class MetaSims extends MetaSimsClass {
  setMetric(metric: "rank" | "distance-norm") {
    this.$store.dispatch("setMetric", metric);
  }
  toggleLeafSpaceGrid(space: string) {
    this.$store.dispatch("toggleLeafSpaceGrid", space);
  }
  setOrderSpace(space: string) {
    this.$store.dispatch("setOrderSpace", space);
  }
  setLinkageCriterion(criterion: string) {
    this.$store.dispatch("setLinkageCriterion", criterion);
  }
}
</script>

<style lang="less">
.best-worst-grid {
  margin-top: 2rem;
  display: grid;
  grid-gap: 10px;
  grid-auto-columns: 300px;
  grid-template-columns: 20px 300px 300px;
  grid-template-rows: 20px 75px 75px;
  grid-template-areas:
    "detail header_col1 header_col2"
    "header_row1 item0 item1"
    "header_row2 item2 item3";

  > :not(.header) {
    border: 1px solid black;
    padding: 2px;
  }

  > .header {
    text-align: center;
    vertical-align: middle;
    font-size: 12px;
  }
}
</style>
