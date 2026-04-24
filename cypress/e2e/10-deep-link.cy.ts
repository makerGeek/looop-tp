const ALL_SLUGS = [
  // Beginner (12)
  "jsx-and-components",
  "props-and-composition",
  "state-with-usestate",
  "events-and-controlled-inputs",
  "lists-and-keys",
  "conditional-rendering",
  "useeffect-essentials",
  "useref-imperative-dom",
  "styling-with-tailwind",
  "composition-with-shadcn",
  "organize-into-files",
  "typing-shared-models",
  // Intermediate (11)
  "usereducer-complex-state",
  "custom-hooks",
  "context-and-use",
  "react-hook-form-zod",
  "tanstack-query",
  "tanstack-router",
  "zustand-slices",
  "next-app-router",
  "feature-folder",
  "provider-and-hook",
  "container-presentational",
  // Advanced (8)
  "server-components",
  "useoptimistic",
  "useactionstate-server-actions",
  "suspense-use-promise",
  "route-handlers",
  "parallel-intercepting-routes",
  "error-boundary-files",
  "reducer-actions-types",
  // Expert (4)
  "react-compiler",
  "testing-vitest-rtl",
  "fullstack-trpc-drizzle",
  "component-library",
  // Auxiliary (4)
  "a11y-custom-combobox",
  "tooling-biome-ts",
  "design-tokens-theming",
  "monorepo-imports",
];

describe("Deep-link all 39 exercises", () => {
  for (const slug of ALL_SLUGS) {
    it(`renders /learn/${slug} with lesson title`, () => {
      cy.visit(`/learn/${slug}`);
      cy.get("[data-testid=lesson-title]")
        .should("be.visible")
        .and("not.be.empty");
      cy.get("[data-testid=exercise-footer]").should("be.visible");
    });
  }
});
