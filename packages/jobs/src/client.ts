import { configure } from "@trigger.dev/sdk/v3";

// Configure the SDK with project details
export function configureTrigger() {
  configure({
    secretKey: process.env.TRIGGER_SECRET_KEY!,
  });
}

// Export configured tasks
export { tasks } from "@trigger.dev/sdk/v3";
