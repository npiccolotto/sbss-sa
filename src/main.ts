import Vue from "vue";
import App from "./App.vue";
import store from "./store";
import { VTooltip, Dropdown } from "floating-vue";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faQuestionCircle } from "@fortawesome/free-regular-svg-icons";
import { BootstrapVue } from "bootstrap-vue";
import "bootstrap/dist/js/bootstrap.bundle.js";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import "floating-vue/dist/style.css";

import "leaflet/dist/leaflet.css";

/* add icons to the library */
library.add(faQuestionCircle);

Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.directive("tooltip", VTooltip as any);
Vue.component("v-popover", Dropdown);
Vue.use(BootstrapVue);

Vue.config.productionTip = false;

new Vue({
  store,
  render: (h) => h(App),
}).$mount("#app");
