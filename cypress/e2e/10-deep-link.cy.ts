const ALL_SLUGS = [
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
  "usereducer-complex-state",
  "custom-hooks",
  "context-and-use",
  "react-hook-form-zod",
  "tanstack-query",
  "tanstack-router",
  "zustand-slices",
  "next-app-router",
  "server-components",
  "useoptimistic",
  "useactionstate-server-actions",
  "suspense-use-promise",
  "route-handlers",
  "parallel-intercepting-routes",
  "react-compiler",
  "testing-vitest-rtl",
  "fullstack-trpc-drizzle",
  "a11y-custom-combobox",
  "tooling-biome-ts",
  "design-tokens-theming",
];

describe("Deep-link all 30 exercises", () => {
  for (const slug of ALL_SLUGS) {
    it(`renders /learn/${slug} with lesson title`, () => {
      cy.visit(`/learn/${slug}`);
      cy.get("[data-testid=lesson-title]").should("be.visible").and("not.be.empty");
      cy.get("[data-testid=exercise-footer]").should("be.visible");
    });
  }
});
