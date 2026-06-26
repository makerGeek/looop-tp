describe("Sandpack live editor", () => {
  it("loads the React 19 live editor on exercise 1", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=sandpack-editor]", { timeout: 20000 }).should("be.visible");
    cy.get("iframe", { timeout: 20000 }).should("exist").and("be.visible");
  });

  it("exposes the reset and show-solution controls", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=sandpack-editor]", { timeout: 20000 }).should("be.visible");
    cy.get("[data-testid=sandpack-reset]").should("be.visible");
    cy.get("[data-testid=sandpack-show-solution]").should("be.visible");
  });
});
