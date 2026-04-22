describe("Landing page", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearProgress();
  });

  it("renders the hero + curriculum grid with 5 tiers", () => {
    cy.get("[data-testid=home-page]").should("be.visible");
    cy.contains("Master the modern React ecosystem");
    cy.get("[data-testid=curriculum-grid]").should("be.visible");
    cy.get("[data-testid=tier-section]").should("have.length", 5);
  });

  it("shows the correct exercise counts per tier", () => {
    cy.get("[data-testid=tier-section][data-tier=beginner] [data-testid=exercise-card]").should(
      "have.length",
      10
    );
    cy.get("[data-testid=tier-section][data-tier=intermediate] [data-testid=exercise-card]").should(
      "have.length",
      8
    );
    cy.get("[data-testid=tier-section][data-tier=advanced] [data-testid=exercise-card]").should(
      "have.length",
      6
    );
    cy.get("[data-testid=tier-section][data-tier=expert] [data-testid=exercise-card]").should(
      "have.length",
      3
    );
    cy.get("[data-testid=tier-section][data-tier=auxiliary] [data-testid=exercise-card]").should(
      "have.length",
      3
    );
  });

  it("renders 30 cards total and shows total XP", () => {
    cy.get("[data-testid=exercise-card]").should("have.length", 30);
    cy.get("[data-testid=total-xp]").should("contain.text", "XP available");
  });

  it("hero start button navigates to the first exercise", () => {
    cy.get("[data-testid=hero-start]").click();
    cy.url().should("include", "/learn/jsx-and-components");
  });

  it("hero progress button navigates to the progress page", () => {
    cy.get("[data-testid=hero-progress]").click();
    cy.url().should("include", "/progress");
  });
});
