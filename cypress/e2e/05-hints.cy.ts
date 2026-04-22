describe("Hint drawer", () => {
  beforeEach(() => {
    // Clear storage via a fast-loading route, then navigate to the lesson.
    cy.visit("/");
    cy.clearProgress();
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=hint-toggle]", { timeout: 20000 }).should("exist");
  });

  it("reveals hints progressively", () => {
    cy.get("[data-testid=hint-toggle]").click({ force: true });
    cy.get("[data-testid=hint-panel]", { timeout: 10000 }).should("exist");
    cy.get("[data-testid=hint-reveal]", { timeout: 10000 })
      .should("exist")
      .click({ force: true });
    cy.get("[data-testid=hint-1]").should("exist");
    cy.get("[data-testid=hint-reveal]").click({ force: true });
    cy.get("[data-testid=hint-2]").should("exist");
    cy.get("[data-testid=hint-reveal]").click({ force: true });
    cy.get("[data-testid=hint-3]").should("exist");
    cy.get("[data-testid=hint-reveal]").should("not.exist");
  });

  it("persists hint count across reload", () => {
    cy.get("[data-testid=hint-toggle]").click({ force: true });
    cy.get("[data-testid=hint-reveal]", { timeout: 10000 }).click({ force: true });
    cy.get("[data-testid=hint-reveal]").click({ force: true });
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=hint-toggle]", { timeout: 20000 }).click({
      force: true,
    });
    cy.get("[data-testid=hint-1]").should("exist");
    cy.get("[data-testid=hint-2]").should("exist");
    cy.get("[data-testid=hint-3]").should("not.exist");
  });

  it("toggles collapse/expand", () => {
    cy.get("[data-testid=hint-toggle]").click({ force: true });
    cy.get("[data-testid=hint-panel]", { timeout: 10000 }).should("exist");
    cy.get("[data-testid=hint-toggle]").click({ force: true });
    cy.get("[data-testid=hint-panel]").should("not.exist");
  });
});
