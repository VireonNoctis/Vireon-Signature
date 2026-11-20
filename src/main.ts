import { createApp } from "vue";
import App from "./app/App.vue";
import "./styles/tokens.css";
import "./features/signature-studio/styles/studio.css";
import "./features/signature-studio/styles/motion.css";

document.documentElement.dataset.theme = "nothing";
document.documentElement.style.colorScheme = "dark";
document.body.dataset.theme = "nothing";

createApp(App).mount("#app");
