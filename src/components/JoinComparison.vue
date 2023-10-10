<template>
  <svg :width="width" :height="height">
    <g ref="rankAxis" />
    <path
      v-for="(line, id) in spaceLines"
      :key="'line' + id"
      :d="line.path"
      fill="none"
      :stroke="line.color"
      :stroke-width="2"
    />
    <g
      v-for="text in spaceTexts"
      :key="'text-' + text.name"
      :transform="'translate(' + (2 / 3) * width + ',' + text.y + ')'"
    >
      <text
        font-size="8"
        font-family="monospace"
        :font-weight="text.name === primarySpace ? 'bold' : 'regular'"
      >
        {{ text.name }}
      </text>
    </g>
    <!-- <circle
        v-for="(point, p) in line.points"
        :key="p"
        :cx="point.x"
        :cy="point.y"
        r="2"
        :fill="point.fill"
        stroke="black"
      /> -->
    <!--   <line
      v-if="highlightedLink !== null"
      :x1="0"
      :x2="width"
      :y1="yScale(highlightedLink.height)"
      :y2="yScale(highlightedLink.height)"
      stroke="black"
    /> -->
  </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { axisLeft } from "d3-axis";
import { select } from "d3-selection";
import { format } from "d3-format";
import { scalePoint, ScalePoint, ScaleLinear } from "d3-scale";
import { Dictionary } from "lodash";
import { TreeNode } from "@/util/tree";

class JoinComparisonClass extends Vue {
  @Prop({ default: 200 })
  public width!: number;
  @Prop({ default: 180 })
  public height!: number;

  public highlightedLink!: any;
  public spaces!: string[];
  public highlightedLeafs!: Dictionary<TreeNode>;
  public primarySpace!: string;
  public maxHeight!: number;
  public yScale!: ScaleLinear<number, number>;
  public yScaleText!: ScalePoint<string>;
  public spaceJoins!: any[];
  public spaceTexts!: any[];

  public axisWidth = 40;
}

@Component<JoinComparisonClass>({
  computed: {
    highlightedLink: function () {
      return this.$store.state.view.highlightedLink;
    },
    highlightedLeafs: function () {
      return this.$store.getters.highlightedLeafs;
    },
    spaces: function () {
      return this.$store.state.spaceNames;
    },
    spaceJoins: function () {
      if (this.highlightedLink === null || this.highlightedLink.isLeaf) {
        return [];
      }
      const S1 = this.$store.getters.S(this.primarySpace);
      const elementsL = this.highlightedLink.children[0].indices();
      const elementsR = this.highlightedLink.children[1].indices();

      const reference = this.$store.getters.getClusterDiameter(
        S1,
        elementsL,
        elementsR
      );

      const lines = this.spaces.map((space) => {
        const S2 = this.$store.getters.S(space);
        const pair = this.$store.getters.getClusterDiameter(
          S2,
          elementsL,
          elementsR
        );
        const diffScale = this.$store.getters.diffScale(
          this.primarySpace,
          space,
          this.$store.state.view.useRelativeColorScale
        );
        const dist = pair;
        const y = this.yScale(dist);
        const diff = diffScale.numericAbs(reference - dist); // TODO make toggle
        const color = diffScale.chromatic(diff);
        return {
          name: space,
          y,
          color,
        };
      });
      lines.sort((a, b) => a.y - b.y);
      return lines;
    },
    spaceTexts: function () {
      return this.spaceJoins.map((l) => ({
        name: l.name,
        y: this.yScaleText(l.name),
      }));
    },
    spaceLines: function () {
      return this.spaceJoins.map((j, i) => {
        const y = j.y;
        const color = j.color;
        const text = this.spaceTexts[i];
        const path = `M${this.axisWidth},${y} h10 L${
          (2 / 3) * this.width - 10
        },${text.y}`;
        return { color, path };
      });
    },
    yScale: function () {
      return this.$store.getters.yScale({
        dendrogramHeight: this.$props.height,
        margin: 10,
      });
    },
    yScaleText: function () {
      return scalePoint()
        .domain(this.spaceJoins.map((l) => l.name))
        .range([0, this.height])
        .padding(1);
    },
    primarySpace: function () {
      return this.$store.state.view.spacePair[0];
    },
    maxHeight: function () {
      return this.$store.getters.heightRange(
        this.$store.getters.S(this.primarySpace)
      )[1];
    },
  },
})
export default class JoinComparison extends JoinComparisonClass {
  drawAxis() {
    // rank order scale on left
    const axisEl = this.$refs.rankAxis as SVGGElement;
    const axis = axisLeft(this.yScale.nice()).tickFormat(format(".1e"));

    for (const c of Array.from(axisEl.children)) {
      axisEl.removeChild(c);
    }
    select(axisEl)
      .call(axis)
      .call((g) => {
        g.attr("transform", `translate(${this.axisWidth})`);
        g.selectAll(".tick text")
          .attr("font-size", 8)
          .attr("font-family", "monospace");
      });
  }

  mounted() {
    this.drawAxis();
  }

  updated() {
    this.drawAxis();
  }
}
</script>
<style lang="less" scoped>
svg {
}
line {
  stroke-width: 2px;
  fill: none;
}
</style>
