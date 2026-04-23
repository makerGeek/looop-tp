describe("Keyboard accessibility", () => {
  it("lesson page exposes keyboard-focusable controls", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=sandpack-editor]", { timeout: 20000 }).should("be.visible");
    cy.get("[data-testid=hint-toggle]").focus().should("be.focused");
    cy.get("[data-testid=complete-toggle]").focus().should("be.focused");
    cy.get("[data-testid=next-link]").focus().should("be.focused");
  });

  it("? shortcut opens the hint drawer", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=hint-toggle]").should("exist");
    cy.get("body").trigger("keydown", { key: "?" });
    cy.get("[data-testid=hint-panel]").should("exist");
  });

  it("J/K do not fire when an input is focused", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=sandpack-editor]", { timeout: 20000 }).should("be.visible");
    cy.visit("/learn/events-and-controlled-inputs");
    cy.get("body").trigger("keydown", { key: "j" });
    cy.location("pathname").should("match", /^\/learn\/lists-and-keys\/?$/);
  });
});
