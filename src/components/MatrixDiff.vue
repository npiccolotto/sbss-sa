<template>
  <div>
    <div class="d-flex flex-row" style="gap: 5px">
      <div class="d-flex flex-row" style="gap: 5px">
        <div>
          <div @click="sortCells(space1)" class="text-center cursor-pointer">
            {{ space1 }}
          </div>
          <svg :width="width" :height="height">
            <g v-for="(cell, c) in focusData(O1)" :key="c">
              <rect
                :x="cell.x"
                :y="cell.y"
                :width="cell.width"
                :height="cell.height"
                :fill="cell.color"
              ></rect>
            </g>
            <g ref="brushF1" />
          </svg>
        </div>
        <div>
          <div @click="sortCells(space2)" class="text-center cursor-pointer">
            {{ space2 }}
          </div>
          <svg :width="width" :height="height">
            <g v-for="(cell, c) in focusData(O2)" :key="c">
              <rect
                :x="cell.x"
                :y="cell.y"
                :width="cell.width"
                :height="cell.height"
                :fill="cell.color"
              ></rect>
            </g>
            <g ref="brushF2" />
          </svg>
        </div>
      </div>
      <div>
        <div>{{ space1 }} - {{ space2 }}</div>
        <svg :width="width" :height="height" class="">
          <g v-for="(cell, c) in overviewData" :key="c">
            <rect
              :x="cell.x"
              :y="cell.y"
              :width="cell.width"
              :height="cell.height"
              :fill="cell.color"
            ></rect>
          </g>
          <g ref="brush" />
        </svg>
      </div>
    </div>
    <!--  <button class="btn btn-sm btn-light" @click="useDataLeafOrder()">
      Reset
    </button> -->
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { StoreState } from "@/store/index";
import { format } from "d3-format";
import { brush } from "d3-brush";
import { select } from "d3-selection";
import { interpolateGreys } from "d3-scale-chromatic";
import { scaleBand, scaleLinear, scaleSequential, ScaleBand } from "d3-scale";
import range from "lodash/range";
import { Matrix } from "ml-matrix";
import { melt, reorderMatrix } from "@/util/util";

const f = format(".2e");

class MatrixDiffClass extends Vue {
  @Prop({ default: 190 })
  public width!: number;
  @Prop({ default: 190 })
  public height!: number;

  @Prop()
  public space1!: string;
  @Prop()
  public space2!: string;

  public subset: [number, number] = [0, 0];
  public leafOrder: number[] = [];

  public focusDiffs!: any[];
  public overviewDiffs!: Matrix;
  public overviewScale!: ScaleBand<number>;
  public focusScale!: ScaleBand<number>;
  public b!: any;
  public b1!: any;
  public b2!: any;
  public O1!: Matrix;
  public O2!: Matrix;
}

@Component<MatrixDiffClass>({
  computed: {
    // overview spaces
    O1: function () {
      return this.$store.getters.M(this.$props.space1);
    },
    O2: function () {
      return this.$store.getters.M(this.$props.space2);
    },
    overviewDiffs: function () {
      let M = this.$store.getters.elementDiffsMatrix(this.O1, this.O2, false);
      M = reorderMatrix(new Matrix(M), this.leafOrder);
      return M;
    },
    overviewScale: function () {
      return scaleBand<number>()
        .domain(range(this.$store.getters.p))
        .range([0, this.width]);
    },
    overviewData: function () {
      let diffs: any[] = melt(this.overviewDiffs, false);
      let filteredDiffs: Matrix = new Matrix(
        this.$store.getters.elementDiffsMatrix(
          this.$store.getters.S(this.$props.space1),
          this.$store.getters.S(this.$props.space2),
          false
        )
      );
      const subset = range(this.$store.getters.p).slice(...this.subset);
      const subsetUsed = this.$store.getters.subsetSelected;
      const unfilteredColorScale = this.$store.getters.diffScale(
        this.$props.space1,
        this.$props.space2
      );
      const filteredColorScale = this.$store.getters.diffScale(
        this.$props.space1,
        this.$props.space2
      );
      diffs = diffs.map((d: any) => {
        const { row, col, value: diff } = d;
        const inSubset = subset.indexOf(row) >= 0 && subset.indexOf(col) >= 0;
        let color = unfilteredColorScale.chromatic(diff);
        if (subsetUsed) {
          color = inSubset
            ? filteredColorScale.chromatic(
                filteredDiffs.get(subset.indexOf(row), subset.indexOf(col))
              )
            : interpolateGreys(Math.abs(diff - 0.5));
        }
        return {
          inSubset,
          row,
          col,
          color,
          x: this.overviewScale(row),
          y: this.overviewScale(col),
          width: this.overviewScale.bandwidth(),
          height: this.overviewScale.bandwidth(),
        };
      });
      return diffs;
    },
    focusScale: function () {
      return scaleBand<number>().domain(this.leafOrder).range([0, this.width]);
    },
  },
})
export default class MatrixDiff extends MatrixDiffClass {
  reset() {
    this.$store.dispatch("setTreeSubset", range(this.$store.getters.p));
    this.b.clear(select(this.$refs.brush as SVGGElement));
    this.b1.clear(select(this.$refs.brushF1 as SVGGElement));
    this.b2.clear(select(this.$refs.brushF2 as SVGGElement));
    this.subset = [0, this.$store.getters.p];
  }

  useDataLeafOrder() {
    this.leafOrder = range(this.$store.getters.p);
  }

  focusData(F: Matrix) {
    let diffs: any[] = melt(F, false);
    let extent = [F.min(), F.max()];
    const colorScale = scaleSequential()
      .domain(extent)
      .interpolator(interpolateGreys);

    diffs = diffs.map((d: any) => {
      const { row, col, value } = d;
      return {
        row,
        col,
        color: colorScale(value),
        x: this.focusScale(row),
        y: this.focusScale(col),
        width: this.focusScale.bandwidth(),
        height: this.focusScale.bandwidth(),
      };
    });
    return diffs;
  }

  drawBrush() {
    const brushEl = this.$refs.brush as SVGGElement;
    const brushElF1 = this.$refs.brushF1 as SVGGElement;
    const brushElF2 = this.$refs.brushF2 as SVGGElement;
    const store = this.$store;
    const leafOrder = this.leafOrder;

    this.b = brush();
    this.b1 = brush();
    this.b2 = brush();

    const brushHandler = (
      b: any,
      el: SVGElement,
      scale: ScaleBand<number>,
      otherbrushes: [any, SVGGElement, (x: number) => number][] = []
    ) => (evt: any) => {
      // avoid recursive calls from brush move command at end of function
      if (!evt.mode) {
        return;
      }
      // reset brush
      if (!evt.selection) {
        this.reset();
        return;
      }

      let [topleft, bottomright] = evt.selection;

      const niceSelection = (x: number) => {
        return Math.floor(x / scale.bandwidth()) * scale.bandwidth();
      };
      topleft = topleft.map(niceSelection);
      bottomright = bottomright.map(niceSelection);
      topleft = [Math.min(...topleft), Math.min(...topleft)];
      bottomright = [Math.min(...bottomright), Math.min(...bottomright)];

      b.move(select(el), [topleft, bottomright]);
      otherbrushes.forEach(
        ([brush, element, scl]: [any, SVGGElement, (x: number) => number]) =>
          brush.move(select(element), [
            topleft.map((t: number) => scl(t)),
            bottomright.map((b: number) => scl(b)),
          ])
      );
      let treeSubset: [number, number] = [
        topleft.map((x: number) => Math.floor(x / scale.bandwidth()))[0],
        bottomright.map((x: number) => Math.floor(x / scale.bandwidth()))[0],
      ];
      this.subset = treeSubset;
      store.dispatch(
        "setTreeSubset",
        leafOrder.slice(treeSubset[0], treeSubset[1])
      );
    };

    select(brushEl).call(
      this.b.on(
        "end",
        brushHandler(this.b, brushEl, this.overviewScale, [
          [this.b1, brushElF1, (x: number) => x],
          [this.b2, brushElF2, (x: number) => x],
        ])
      )
    );
    select(brushElF1).call(
      this.b1.on(
        "end",
        brushHandler(this.b1, brushElF1, this.focusScale, [
          [this.b2, brushElF2, (x: number) => x],
          [this.b, brushEl, (x: number) => x],
        ])
      )
    );
    select(brushElF2).call(
      this.b2.on(
        "end",
        brushHandler(this.b2, brushElF2, this.focusScale, [
          [this.b1, brushElF1, (x) => x],
          [this.b, brushEl, (x) => x],
        ])
      )
    );
  }

  sortCells(space: string) {
    this.leafOrder = this.$store.getters.leafOrder(
      space === this.space1 ? this.O1 : this.O2
    );
  }

  mounted() {
    this.drawBrush();
    this.leafOrder = range(this.$store.getters.p);
  }

  updated() {
    this.drawBrush();
  }
}
</script>
<style lang="less" scoped>
svg {
  display: block;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
