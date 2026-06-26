import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    viewportWidth: 1280,
    viewportHeight: 800,
    retries: { runMode: 1, openMode: 0 },
    reporter: "cypress-mochawesome-reporter",
    reporterOptions: {
      charts: true,
      reportPageTitle: "React 2026 Course · E2E Report",
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
      reportDir: "cypress/reports",
      overwrite: false,
      html: true,
      json: true,
    },
    setupNodeEvents(on, config) {
      // biome-ignore lint/correctness/noNodejsModules: cypress config runs in Node
      require("cypress-mochawesome-reporter/plugin")(on);
      require("@cypress/code-coverage/task")(on, config);
      return config;
    },
  },
});
