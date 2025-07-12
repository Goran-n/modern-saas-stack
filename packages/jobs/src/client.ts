import { configure } from "@trigger.dev/sdk/v3";

// Configure the SDK with project details
export function configureTrigger() {
  configure({
    projectId: process.env.TRIGGER_PROJECT_ID!,
    apiKey: process.env.TRIGGER_API_KEY!,
    apiUrl: process.env.TRIGGER_API_URL || "https://api.trigger.dev",
  });
}

// Export configured tasks
export { tasks } from "@trigger.dev/sdk/v3";