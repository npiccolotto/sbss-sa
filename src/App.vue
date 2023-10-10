<template>
  <MetaSims
    :width="1400"
    :height="600"
    :leafComponent="leafComponent"
    :spaces="spaces"
  />
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import MetaSims from "@/components/MetaSims.vue";
import LeafVis from "@/LeafVis.vue";

class AppClass extends Vue {
  async fetchData(n: string) {
    this.$store.dispatch("fetchData", n);
  }
}

@Component<AppClass>({
  components: { MetaSims },
  watch: {
    dataset: function (n, o) {
      if (n !== o) {
        this.fetchData(n);
      }
    },
  },
  data: function () {
    return {
      leafComponent: LeafVis,
      dataset: "mtcars-DR",
      spaces: { D: {}, space: {} },
    };
  },
})
export default class App extends AppClass {
  mounted() {
    const dataset =
      new URL(window.location.href).searchParams.get("dataset") || "mtcars-DR";
    this.$data.dataset = dataset;
    this.fetchData(this.$data.dataset);
    this.$store.dispatch("updateWindowSize");
  }
}
</script>

<style lang="less">
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #111;
}

label {
  user-select: none;

  &.disabled {
    color: #aaa;
  }
}

.v-tooltip {
  display: block !important;
  z-index: 10000;

  .v-tooltip-inner {
    background: black;
    color: white;
    border-radius: 16px;
    padding: 5px 10px 4px;
  }

  .v-tooltip-arrow {
    width: 0;
    height: 0;
    border-style: solid;
    position: absolute;
    margin: 5px;
    border-color: black;
    z-index: 1;
  }

  &[x-placement^="top"] {
    margin-bottom: 5px;

    .v-tooltip-arrow {
      border-width: 5px 5px 0 5px;
      border-left-color: transparent !important;
      border-right-color: transparent !important;
      border-bottom-color: transparent !important;
      bottom: -5px;
      left: calc(50% - 5px);
      margin-top: 0;
      margin-bottom: 0;
    }
  }

  &[x-placement^="bottom"] {
    margin-top: 5px;

    .v-tooltip-arrow {
      border-width: 0 5px 5px 5px;
      border-left-color: transparent !important;
      border-right-color: transparent !important;
      border-top-color: transparent !important;
      top: -5px;
      left: calc(50% - 5px);
      margin-top: 0;
      margin-bottom: 0;
    }
  }

  &[x-placement^="right"] {
    margin-left: 5px;

    .v-tooltip-arrow {
      border-width: 5px 5px 5px 0;
      border-left-color: transparent !important;
      border-top-color: transparent !important;
      border-bottom-color: transparent !important;
      left: -5px;
      top: calc(50% - 5px);
      margin-left: 0;
      margin-right: 0;
    }
  }

  &[x-placement^="left"] {
    margin-right: 5px;

    .v-tooltip-arrow {
      border-width: 5px 0 5px 5px;
      border-top-color: transparent !important;
      border-right-color: transparent !important;
      border-bottom-color: transparent !important;
      right: -5px;
      top: calc(50% - 5px);
      margin-left: 0;
      margin-right: 0;
    }
  }

  &.v-popover {
    .v-popover-inner {
      background: #444;
      color: white;
      padding: 24px;
      border-radius: 5px;
      box-shadow: 0 5px 30px rgba(black, 0.1);
    }

    .v-popover-arrow {
      border-color: #444;
    }
  }

  &[aria-hidden="true"] {
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.15s, visibility 0.15s;
  }

  &[aria-hidden="false"] {
    visibility: visible;
    opacity: 1;
    transition: opacity 0.15s;
  }
}
</style>
