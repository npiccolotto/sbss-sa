<template>
  <div>
    <div class="d-flex" style="gap: 10px">
      <div>
        <div>
          Dendrogram
          <Tooltip text="Which similarity space to encode in Dendrogram" />
        </div>

        <b-dropdown :text="$store.state.view.spacePair[0]" variant="light">
          <b-dropdown-item
            v-for="space in $store.state.spaceNames"
            :key="space"
            @click="setSpace1(space)"
            :active="space === $store.state.view.spacePair[0]"
            >{{ space }}
          </b-dropdown-item>
        </b-dropdown>
      </div>
      <div>
        <div>
          Color by <Tooltip text="Which similarity space to encode in color" />
        </div>
        <b-dropdown :text="$store.state.view.spacePair[1]" variant="light">
          <b-dropdown-item
            v-for="space in $store.state.spaceNames"
            :key="space"
            @click="setSpace2(space)"
            :active="space === $store.state.view.spacePair[1]"
            >{{ space }}
          </b-dropdown-item>
        </b-dropdown>
      </div>
      <div>
        <div>
          Display
          <Tooltip text="Which visualization to use for data cases" />
        </div>
        <b-dropdown :text="$store.state.view.leafSpace" variant="light">
          <b-dropdown-item
            v-for="space in $store.state.spaceNames"
            :key="space"
            @click="setLeafSpace(space)"
            :active="space === $store.state.view.leafSpace"
            >{{ space }}
          </b-dropdown-item>
        </b-dropdown>
      </div>

      <div class="ml-1 mr-2 mb-1 align-end d-inline-block">
        <button
          type="button"
          class="btn btn-sm btn-secondary d-inline-flex"
          @click="
            autoFoldLevel = 0;
            intermediateAutoFoldLevel = -1;
          "
        >
          Unfold all
        </button>
      </div>
    </div>

    <svg class="dendrogram" :width="width" :height="dendrogramHeight" ref="svg">
      <g ref="rankAxis"></g>
      <rect
        :height="height"
        :width="40"
        :x="0"
        :y="0"
        fill="transparent"
        @mousemove="showIntermediateHeightFilterMarker"
        @mouseout="hideIntermediateHeightFilterMarker"
        @click="setIntermediateHeightFilterMarker"
      />

      <!--  <g>
        <line
          v-for="(link, l) in rank0links"
          :key="'rank0link' + l"
          :y1="dendrogramHeight - 1"
          :y2="dendrogramHeight - 1"
          :x1="link.x1"
          :x2="link.x2"
          :stroke="link.color"
          stroke-width="2"
        >
          <title>{{ link.diff }}</title>
        </line>
      </g> -->

      <g class="peek-line">
        <line
          :x1="peekLine.x1"
          :x2="peekLine.x2"
          :y1="peekLine.yS1"
          :y2="peekLine.yS1"
          stroke-width="1"
          stroke="black"
        />
        <line
          :y1="peekLine.yS1"
          :y2="peekLine.yS2"
          :x1="peekLine.x1 + peekLine.width / 2"
          :x2="peekLine.x1 + peekLine.width / 2"
          stroke-width="1"
          stroke="black"
        />
      </g>

      <g v-for="(link, l) in links" :key="'link-container' + link.id + l">
        <g>
          <g
            class="link folded"
            v-if="link.foldedSubtree.length > 0"
            :key="'link' + link.id + l"
            :transform="'translate(' + link.x + ',' + link.y + ')'"
          >
            <circle
              :r="sizeScale(link.hiddenLeafs)"
              :fill="link.color"
              @click="clickHandler($event, link)"
              @mouseover="highlightLink(link)"
              @mouseout="highlightLink(null)"
            >
              <title>{{ link.hiddenLeafs }} leafs invisible</title>
            </circle>
          </g>
          <path
            v-if="link.foldedSubtree.length === 0"
            class="link"
            :stroke-width="strokeWidth(link)"
            :stroke="link.color"
            fill="transparent"
            :d="path(link)"
            @click="clickHandler($event, link)"
            @mouseover="highlightLink(link)"
            @mouseout="highlightLink(null)"
          >
            <!--<title>
              {{ $store.state.view.spacePair[0] }}/{{ link.s1.value }}
              {{ $store.state.view.spacePair[1] }}/{{ link.s2.value }}
            </title>-->
          </path>
        </g>
      </g>
      <g ref="heightFilterMarker">
        <line
          class="height-filter-marker"
          :y1="tree.yScale(intermediateAutoFoldLevel * maxHeight)"
          :y2="tree.yScale(intermediateAutoFoldLevel * maxHeight)"
          :x1="20"
          :x2="width"
          stroke="lightgray"
          stroke-width="1"
          style="pointer-events: none"
        />
        <line
          class="height-filter-marker"
          :y1="tree.yScale(autoFoldLevel * maxHeight)"
          :y2="tree.yScale(autoFoldLevel * maxHeight)"
          :x1="20"
          :x2="40"
          stroke="lightgray"
          stroke-width="3"
          style="pointer-events: none"
        />
      </g>
      <g
        :transform="
          'translate(80,' +
          tree.yScale(intermediateAutoFoldLevel * maxHeight) +
          ')'
        "
      >
        <text font-size="32" fill="#bbb" opacity="0.5">
          ∆{{ space1 }}:
          {{ originalDistanceAtIntermediateAutoFoldLevel.space1 }} / ∆{{
            space2
          }}:
          {{ originalDistanceAtIntermediateAutoFoldLevel.space2 }}
        </text>
      </g>
      <!--
      <g class="mds1dpoints">
        <circle
          v-for="point in secondarySpaceSplit.points"
          :key="point.id"
          :r="2"
          :cx="point.x"
          :cy="point.y"
          :fill="point.fill"
          :data-id="point.id"
          :data-x-1d="point.x_1d"
          :stroke="'black'"
          stroke-width="1"
        >
          <title>{{ point.id }} {{ point.x_1d }}</title>
        </circle>
      </g>-->
    </svg>
    <div class="leaf-columns" :style="leafColumnStyles">
      <transition-group tag="div" name="move">
        <div
          v-for="leaf in tree.visibleLeafs"
          :key="leaf.id"
          :style="leafStyles(leaf).css"
        >
          <component
            :is="leafComponent"
            :space="$store.state.view.leafSpace"
            :elementIdx="$store.getters.leafToElementIdx(leaf)"
            v-bind="leafStyles(leaf).props"
          />
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script lang="ts">
import { scaleLinear, ScaleLinear, ScalePoint } from "d3-scale";
import { Component, Prop, Vue } from "vue-property-decorator";
import { leafs, TreeNode } from "@/util/tree";
import { axisLeft } from "d3-axis";
import { select } from "d3-selection";
import { extent } from "d3-array";
import { format } from "d3-format";
import intersection from "lodash/intersection";
import GeoJSONVis from "../GeoJSONVis.vue";
import { melt, MoltenCell } from "@/util/util";
import { StoreState } from "@/store";
import round from "lodash/round";
import Tooltip from "@/components/Tooltip.vue";

class Dendrogram extends Vue {
  @Prop()
  public space1!: string;
  @Prop()
  public space2!: string;

  @Prop({ default: 400 })
  public width!: number;
  @Prop({ default: 400 })
  public height!: number;
  @Prop({ default: () => [5, 5] })
  public margin!: [number, number]; // x, y

  @Prop()
  public leafComponent!: Vue;

  public highlightedLink!: null | TreeNode;
  public highlightedLeafs!: Record<string, TreeNode>;
  public autoFoldLevel: number = 0;
  public maxHeight!: number;

  public links!: TreeNode[];

  public dendrogramHeight!: number;
  public tree!: {
    tree: any[];
    xScale: ScalePoint<number>;
    yScale: ScaleLinear<number, number>;
    visibleLeafs: TreeNode[];
  };

  public intermediateAutoFoldLevel: number = 0;
  public startY: number = 0;
}

@Component<Dendrogram>({
  components: { Tooltip },
  watch: {
    autoFoldLevel: function (n, o) {
      if (n !== o) {
        this.$store.dispatch("foldAutomatically", {
          strategy: "fold-by-height",
          height: n * this.maxHeight,
        });
      }
    },
  },
  computed: {
    originalDistanceAtIntermediateAutoFoldLevel: function () {
      let relativeDistance = this.tree.yScale.invert(
        this.tree.yScale(this.intermediateAutoFoldLevel * this.maxHeight)
      );
      let moltenS = melt(this.$store.getters.S(this.space1, this.space2));
      let cellWithClosestRank = moltenS.reduce((prev, cur) =>
        Math.abs(prev.value - relativeDistance) <
        Math.abs(cur.value - relativeDistance)
          ? prev
          : cur
      );
      const space1Dist = (this.$store.state as StoreState).D[this.space1].get(
        cellWithClosestRank.row,
        cellWithClosestRank.col
      );
      const space2Dist = (this.$store.state as StoreState).D[this.space2].get(
        cellWithClosestRank.row,
        cellWithClosestRank.col
      );
      return { space1: round(space1Dist, 2), space2: round(space2Dist, 2) };
    },
    highlightedLink: function () {
      return this.$store.state.view.highlightedLink;
    },
    highlightedLeafs: function () {
      return this.$store.getters.highlightedLeafs;
    },
    maxHeight: function () {
      return this.$store.getters.heightRange(
        this.$store.getters.S(this.$props.space1)
      )[1];
    },
    dendrogramHeight: function () {
      return this.height * (1 - this.$store.state.view.leafVisHeightPct);
    },
    peekLine: function () {
      if (this.highlightedLink !== null) {
        const x2 = this.tree.xScale.range()[0] + 10;
        const x1 = this.tree.xScale.range()[0];
        return {
          width: x2 - x1,
          x1,
          x2,
          yS1: this.tree.yScale(this.highlightedLink.s1.value),
          yS2: this.tree.yScale(this.highlightedLink.s2.value),
        };
      }
      return -1;
    },
    secondarySpaceSplit: function () {
      if (
        this.highlightedLink !== null &&
        this.highlightedLink.children.length > 0 &&
        Object.entries(this.highlightedLeafs).length > 0
      ) {
        const highlightedLeafs = Object.values(this.highlightedLeafs);

        return this.$store.getters.secondarySpacePoints(
          this.highlightedLink,
          highlightedLeafs,
          this.space2,
          this.highlightedLink.y,
          [this.highlightedLink.x1, this.highlightedLink.x2]
        );
      }
      return { points: [] };
    },
    rank0links: function () {
      const elementDiffs = this.$store.getters.elementDiffsMatrix(
        this.space1,
        this.space2
      );
      const leafs = this.tree.visibleLeafs;
      const step = this.tree.xScale.step();
      const margin = step / 10;
      const links: {
        x1: number;
        x2: number;
        color: string;
        diff: number;
      }[] = [];
      for (let i = 0; i < leafs.length - 1; i++) {
        const l1 = leafs[i];
        const l2 = leafs[i + 1];
        if (l1.parent.id !== l2.parent.id) {
          const l1index = l1.index >= 0 ? l1.index : l1.displayChild.index;
          const l2index = l2.index >= 0 ? l2.index : l2.displayChild.index;

          const e = elementDiffs[l1index][l2index] as number;
          const scales = this.$store.getters.diffScale(
            this.space1,
            this.space2,
            this.$store.state.view.useRelativeColorScale
          );
          const color = scales.chromatic(e);

          links.push({
            x1: l1.x + margin,
            x2: l2.x - margin,
            diff: e,
            color: color,
          });
        }
      }
      return links;
    },
    tree: function () {
      return this.$store.state.view.tree;
    },
    nodes: function () {
      return this.tree.tree.filter((n) => n.isLeaf).reverse();
    },
    sizeScale: function () {
      const collapsedLinks = this.links.filter(
        (l) => l.foldedSubtree.length > 0
      );
      const domain = extent(
        collapsedLinks.map((l) => ((l as unknown) as TreeNode).hiddenLeafs)
      ) as [number, number];
      const range = [50, 250]; // min and max area of circle
      const areaScale = scaleLinear().domain(domain).range(range);
      function scale(d: number) {
        const targetA = areaScale(d);
        const r = Math.sqrt(targetA / Math.PI);
        return r;
      }
      return scale;
    },
    links: function () {
      const diffScale = this.$store.getters.diffScale(
        this.space1,
        this.space2,
        this.$store.state.view.useRelativeColorScale
      );
      let links = this.tree.tree.filter((n) => !n.isLeaf).reverse();
      links.forEach((l) => (l.color = diffScale.chromatic(l.diff)));
      return links;
    },
    leafColumnStyles: function () {
      return {
        position: "relative",
        width: `${this.width}px`,
      };
    },
  },
})
export default class DendrogramClass extends Dendrogram {
  toggleFolded(d: TreeNode) {
    this.$store.dispatch("toggleFolded", d);
  }

  setLeafSpace(space: string) {
    this.$store.dispatch("setLeafSpace", space);
  }

  setSpace1(space: string) {
    this.$store.dispatch("setSpacePair", [
      space,
      this.$store.state.view.spacePair[1],
    ]);
  }
  setSpace2(space: string) {
    this.$store.dispatch("setSpacePair", [
      this.$store.state.view.spacePair[0],
      space,
    ]);
  }

  showIntermediateHeightFilterMarker(event: any) {
    let bounds = event.target.getBoundingClientRect();
    let y = event.clientY - bounds.top;
    let yi = this.tree.yScale.invert(y);
    let yiNorm = yi / this.tree.yScale.invert(0);
    this.intermediateAutoFoldLevel = Math.min(1, Math.max(0, yiNorm));
  }
  hideIntermediateHeightFilterMarker() {
    this.intermediateAutoFoldLevel = -1;
  }
  setIntermediateHeightFilterMarker() {
    this.autoFoldLevel = this.intermediateAutoFoldLevel;
  }

  drawTree() {
    // rank order scale on left
    const axisEl = this.$refs.rankAxis as SVGGElement;
    const axis = axisLeft(this.tree.yScale).tickFormat(format(".1e"));

    for (const c of Array.from(axisEl.children)) {
      axisEl.removeChild(c);
    }

    select(axisEl)
      .append("g")
      .attr("opacity", 0.5)
      .attr(
        "transform",
        `rotate(-90)translate(${-this.dendrogramHeight / 4},${-10})`
      )
      .append("text")
      .attr("font-size", 36)
      .attr("fill", "#bbb")
      .text(
        this.$store.state.view.metric === "rank"
          ? "Ranked Distance"
          : "Normed Distance"
      );
    select(axisEl)
      .call(axis)
      .call((g) => {
        g.attr("transform", "translate(40)");
        g.selectAll(".tick text")
          .style("user-select", "none")
          .style("pointer-events", "none")
          .attr("font-size", 8)
          .attr("font-family", "monospace");
      });
  }

  path(d: TreeNode) {
    if (d.children.length) {
      return `M${d.x1},${d.y1} V${d.y} H${d.x2} V${d.y2}`;
    }
  }

  leafStyles(d: TreeNode) {
    const step = this.tree.xScale.step();
    let highlighted = false;
    if (d.isLeaf) {
      highlighted = this.highlightedLeafs[d.id] !== undefined;
    } else {
      const grandleafs = leafs(d, false, true);
      highlighted = grandleafs.some((l) => this.highlightedLeafs[l.id]);
    }
    return {
      css: {
        position: "absolute",
        left: `${d.x - step / 2}px`,
        paddingBottom: highlighted ? "5px" : "0px",
        borderBottom: highlighted ? "2px solid gray" : "1px solid transparent",
      },
      props: {
        width: step,
        height: this.height - this.dendrogramHeight - 100,
      },
    };
  }

  mounted() {
    this.drawTree();
  }

  updated() {
    this.drawTree();
  }
  strokeWidth(link: any) {
    const treeSubset = this.$store.state.view.treeSubset;
    const lfs = leafs(link, false, true).map((l) => l.index);
    if (intersection(lfs, treeSubset).length === lfs.length) {
      return 5;
    }
    return 3;
  }

  clickHandler(event: MouseEvent, node: TreeNode) {
    if (event.metaKey) {
      this.$store.dispatch("foldAutomatically", {
        strategy: "fold-everything-else",
        node,
      });
      return;
    }
    if (event.shiftKey) {
      this.toggleFolded(node);

      return;
    }
    this.$store.dispatch("toggleTreeSubset", node);
  }

  highlightLink(link: TreeNode) {
    this.$store.dispatch("setHighlightedLink", link);
  }
}
</script>

<style lang="less" scoped>
.peek-line line {
  stroke: gray;
}
svg .link {
  cursor: pointer;
  &:hover {
    stroke-width: 5px;
  }

  &.folded circle:hover {
    stroke: gray;
    stroke-width: 2;
  }
}
.move {
  &-move {
    transition: transform 500ms;
  }

  &-leave-to,
  &-leave {
    opacity: 0;
    transform: translateY(50px);

    &-active {
      transition: opacity, transform 500ms;
    }
  }

  &-enter {
    opacity: 0;
    transform: translateY(-50px);

    &-active {
      transition: opacity, transform 500ms;
    }
  }
}
</style>
