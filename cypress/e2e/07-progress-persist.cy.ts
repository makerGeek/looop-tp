describe("Progress persistence", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearProgress();
    cy.reload();
  });

  it("marking complete awards XP and persists across reload", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=xp-count]").should("contain.text", "0");
    cy.get("[data-testid=complete-toggle]").click();
    cy.get("[data-testid=complete-toggle]").should("contain.text", "Completed");
    cy.get("[data-testid=xp-count]").should("contain.text", "50");
    cy.reload();
    cy.get("[data-testid=xp-count]").should("contain.text", "50");
    cy.get("[data-testid=complete-toggle]").should("contain.text", "Completed");
  });

  it("progress page reflects completions across tiers", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=complete-toggle]").click();
    cy.visit("/learn/usereducer-complex-state");
    cy.get("[data-testid=complete-toggle]").click();
    cy.visit("/learn/useoptimistic");
    cy.get("[data-testid=complete-toggle]").click();
    cy.visit("/progress");
    cy.get("[data-testid=progress-xp]").should("contain.text", "325");
    cy.get("[data-tier-summary=beginner]").should("contain.text", "1 / 10");
    cy.get("[data-tier-summary=intermediate]").should("contain.text", "1 / 8");
    cy.get("[data-tier-summary=advanced]").should("contain.text", "1 / 6");
  });

  it("reset progress clears XP and completions", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=complete-toggle]").click();
    cy.visit("/progress");
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });
    cy.get("[data-testid=reset-progress]").click();
    cy.get("[data-testid=progress-xp]").should("contain.text", "0");
  });

  it("unmark rolls back completion", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=complete-toggle]").click();
    cy.get("[data-testid=complete-toggle]").should("contain.text", "Completed");
    cy.get("[data-testid=complete-toggle]").click();
    cy.get("[data-testid=complete-toggle]").should("contain.text", "Mark complete");
  });
});
