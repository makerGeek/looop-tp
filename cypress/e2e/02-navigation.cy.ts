describe("Navigation", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearProgress();
  });

  it("navigates from card to lesson and back via TopBar home", () => {
    cy.get("[data-testid=exercise-card]")
      .filter("[data-slug=jsx-and-components]")
      .first()
      .click();
    cy.location("pathname").should("eq", "/learn/jsx-and-components");
    cy.get("[data-testid=lesson-title]").should("contain.text", "JSX & Components");
    cy.get("[data-testid=home-link]").click();
    cy.location("pathname").should("eq", "/");
  });

  it("Next/Prev buttons advance and retreat correctly", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=next-link]").click();
    cy.location("pathname").should("eq", "/learn/props-and-composition");
    cy.get("[data-testid=prev-link]").click();
    cy.location("pathname").should("eq", "/learn/jsx-and-components");
  });

  it("J/K keyboard shortcuts move between exercises", () => {
    cy.visit("/learn/state-with-usestate");
    cy.get("body").trigger("keydown", { key: "j" });
    cy.location("pathname").should("eq", "/learn/events-and-controlled-inputs");
    cy.get("body").trigger("keydown", { key: "k" });
    cy.location("pathname").should("eq", "/learn/state-with-usestate");
  });

  it("the top nav progress link works", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=progress-link]").click();
    cy.location("pathname").should("eq", "/progress");
  });

  it("first exercise shows Start of course placeholder", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=exercise-footer]").should(
      "contain.text",
      "Start of course"
    );
    cy.get("[data-testid=prev-link]").should("not.exist");
  });

  it("last exercise shows the Finish course CTA", () => {
    cy.visit("/learn/design-tokens-theming");
    cy.get("[data-testid=finish-link]").should("exist").click();
    cy.location("pathname").should("eq", "/progress");
  });
});
