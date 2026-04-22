describe("Sandpack readonly viewer", () => {
  it("renders the readonly viewer for Server Components exercise", () => {
    cy.visit("/learn/server-components");
    cy.get("[data-testid=readonly-viewer]", { timeout: 15000 }).should("be.visible");
    cy.get("iframe").should("not.exist");
  });

  it("readonly viewer shows file paths and code blocks", () => {
    cy.visit("/learn/server-components");
    cy.get("[data-testid=readonly-viewer]")
      .should("contain.text", "page.tsx")
      .and("contain.text", "LikeButton");
  });

  it("all 6 readonly exercises render the readonly viewer", () => {
    const readonlySlugs = [
      "server-components",
      "useactionstate-server-actions",
      "route-handlers",
      "parallel-intercepting-routes",
      "react-compiler",
      "fullstack-trpc-drizzle",
      "tooling-biome-ts",
    ];
    for (const slug of readonlySlugs) {
      cy.visit(`/learn/${slug}`);
      cy.get("[data-testid=readonly-viewer]", { timeout: 15000 }).should("be.visible");
    }
  });
});
