<template>
  <svg :width="width" :height="height">
    <g
      v-for="cell in cells"
      :key="cell.id"
      :transform="'translate(' + cell.rowStart + ',' + cell.colStart + ')'"
    >
      <g v-if="cell.rowIdx < cell.colIdx">
        <Scatterplot
          :space1="cell.rowSpace"
          :space2="cell.colSpace"
          :width="cellSize"
          :height="cellSize"
        />
      </g>
      <g
        v-if="cell.rowSpace == cell.colSpace"
        :transform="'translate(' + cellSize / 3 + ',' + cellSize / 2 + ')'"
      >
        <text
          font-family="monospace"
          font-size="10"
          :font-weight="
            $store.state.view.spacePair.includes(cell.rowSpace)
              ? 'bold'
              : 'regular'
          "
          :fill="
            $store.state.view.spacePair.includes(cell.rowSpace)
              ? 'black'
              : 'grey'
          "
        >
          <title>{{ cell.rowSpace }}</title>
          {{ cell.rowSpace }}
        </text>
      </g>
      <!--
      <g v-if="cell.rowIdx <= cell.colIdx">
        <rect
          v-if="cell.rowIdx < cell.colIdx"
          x="0"
          y="0"
          @click="handler(cell)"
          :width="cellSize"
          :height="cellSize"
          fill="white"
          stroke="lightgray"
        />
        <g
          v-if="cell.rowSpace === cell.colSpace"
          :transform="'translate(' + cellSize / 2 + ',' + cellSize / 2 + ')'"
        >
          <text
            font-family="monospace"
            font-size="10"
            :font-weight="
              $store.state.view.spacePair.includes(cell.rowSpace)
                ? 'bold'
                : 'regular'
            "
            :fill="
              $store.state.view.spacePair.includes(cell.rowSpace)
                ? 'black'
                : 'grey'
            "
          >
            <title>{{ cell.rowSpace }}</title>
            {{ cell.rowSpace }}
          </text>
        </g>

        <g v-else>
          <rect
            @click="handler(cell)"
            v-for="(rect, i) in histogram(cell.rowSpace, cell.colSpace)"
            :key="i"
            :x="rect.x"
            :y="rect.y"
            :width="rect.width"
            :height="rect.height"
            :fill="rect.color"
          ></rect>
        </g>
      </g>-->
    </g>
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Scatterplot from "./Scatterplot.vue";
undefined;

class SPLOMClass extends Vue {
  public cellSize!: number;
  public N!: string[];
  public D!: number[][];
}
@Component<SPLOMClass>({
  components: { Scatterplot },
  computed: {
    cells: function () {
      const cells = [];
      for (const [i, s1] of this.$store.getters.spaceOrdering.entries()) {
        for (const [j, s2] of this.$store.getters.spaceOrdering.entries()) {
          //const i = this.$store.state.spaceNames.indexOf(s1);
          //const j = this.$store.state.spaceNames.indexOf(s2);
          cells.push({
            id: `${s2}/${s1}`,
            rowIdx: i,
            colIdx: j,
            rowStart: i * this.cellSize,
            rowEnd: (i + 1) * this.cellSize,
            colStart: j * this.cellSize,
            colEnd: (j + 1) * this.cellSize,
            rowSpace: s2,
            colSpace: s1,
          });
        }
      }
      return cells;
    },

    cellSize: function () {
      // with N = 100 and W,H=190 i can barely see stuff, that's enough
      return this.$props.width / this.$store.getters.spaceOrdering.length;
    },
  },
})
export default class SPLOM extends SPLOMClass {
  @Prop({ default: 100 })
  public width!: number;
  @Prop({ default: 100 })
  public height!: number;

  public histogram(space1: string, space2: string) {
    const d = this.diff(space2, space1);
    return d.map((r: any) => {
      return {
        width: (r.bin[1] - r.bin[0]) * this.cellSize,
        height: this.cellSize * r.freq_norm,
        color: r.color,
        x: r.bin[0] * this.cellSize,
        y: this.cellSize - this.cellSize * r.freq_norm,
      };
    });
  }

  public diff(space1: string, space2: string) {
    const diff = this.$store.getters.metricDiffFrequency(space1, space2);
    return diff;
  }

  public handler(cell: any) {
    this.$store.dispatch("setSpacePair", [cell.colSpace, cell.rowSpace]);
  }
}
</script>
