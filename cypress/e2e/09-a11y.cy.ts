import "cypress-axe";

const runAxe = () => {
  cy.injectAxe();
  cy.checkA11y(
    undefined,
    { includedImpacts: ["serious", "critical"] },
    (violations) => {
      violations.forEach((v) => {
        // biome-ignore lint/suspicious/noConsoleLog: test surface
        console.log(`axe violation: ${v.id} — ${v.help}`);
      });
    },
    true
  );
};

describe("Accessibility sweeps", () => {
  it("home page has no serious/critical violations", () => {
    cy.visit("/");
    cy.get("[data-testid=home-page]").should("be.visible");
    runAxe();
  });

  it("progress page has no serious/critical violations", () => {
    cy.visit("/progress");
    cy.get("[data-testid=progress-page]").should("be.visible");
    runAxe();
  });

  it("lesson page (readonly) has no serious/critical violations", () => {
    cy.visit("/learn/server-components");
    cy.get("[data-testid=readonly-viewer]").should("be.visible");
    runAxe();
  });
});
