describe("Theme toggle", () => {
  beforeEach(() => {
    cy.visit("/");
    // Wait for hydration so next-themes has attached and the button handler is live.
    cy.get("[data-testid=xp-count]").should("exist");
    // Small beat to let useEffect-based hooks flush.
    cy.wait(200);
  });

  it("toggles between light and dark", () => {
    cy.get("html").then(($html) => {
      const wasDark = $html.hasClass("dark");
      cy.get("[data-testid=theme-toggle]").click();
      cy.get("html").should(
        wasDark ? "not.have.class" : "have.class",
        "dark"
      );
    });
  });

  it("persists theme across navigation", () => {
    cy.get("html").then(($html) => {
      const wasDark = $html.hasClass("dark");
      cy.get("[data-testid=theme-toggle]").click();
      const expectDark = !wasDark;
      cy.get("html").should(
        expectDark ? "have.class" : "not.have.class",
        "dark"
      );
      cy.visit("/progress");
      cy.get("[data-testid=progress-page]").should("be.visible");
      cy.get("html").should(
        expectDark ? "have.class" : "not.have.class",
        "dark"
      );
    });
  });
});
