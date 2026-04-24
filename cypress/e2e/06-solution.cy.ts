describe("Solution reveal flow", () => {
  beforeEach(() => {
    cy.visit("/learn/jsx-and-components");
    cy.clearProgress();
    cy.reload();
    cy.get("[data-testid=sandpack-editor]", { timeout: 20000 }).should("be.visible");
  });

  it("asks for confirmation before showing the solution", () => {
    cy.get("[data-testid=sandpack-show-solution]").click();
    cy.contains("Reveal the solution?").should("be.visible");
    cy.get("[data-testid=solution-cancel]").click();
    cy.contains("Reveal the solution?").should("not.exist");
  });

  it("reveals and then hides the solution", () => {
    cy.get("[data-testid=sandpack-show-solution]").click();
    cy.get("[data-testid=solution-confirm]").click();
    cy.get("[data-testid=sandpack-hide-solution]").should("be.visible");
    cy.contains("Viewing solution").should("be.visible");
    cy.get("[data-testid=sandpack-hide-solution]").click();
    cy.get("[data-testid=sandpack-show-solution]").should("be.visible");
    cy.contains("Starter code").should("be.visible");
  });

  it("reset returns to starter mode", () => {
    cy.get("[data-testid=sandpack-show-solution]").click();
    cy.get("[data-testid=solution-confirm]").click();
    cy.get("[data-testid=sandpack-reset]").click();
    cy.contains("Starter code").should("be.visible");
  });
});
