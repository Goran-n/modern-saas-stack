import { createPinia } from "pinia";
import { createApp } from "vue";
import { validateEnv } from "../../config/env";
import App from "./App.vue";
import "./style.css";

// Validate environment variables before starting the app
try {
  validateEnv();
} catch (error) {
  console.error("Environment validation failed:", error);
  // Display error to user in the popup
  document.body.innerHTML = `
    <div style="padding: 20px; color: #dc2626;">
      <h3>Configuration Error</h3>
      <pre style="white-space: pre-wrap; font-size: 12px;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
  throw error;
}

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
