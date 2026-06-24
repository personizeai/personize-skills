import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_your_project_id", // Replace with your Trigger.dev project ID
  runtime: "node",
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
    },
  },
  dirs: ["src/trigger"],
});
