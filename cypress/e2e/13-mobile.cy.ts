// iPhone SE-ish portrait — the narrowest viewport we support.
const MOBILE = { width: 375, height: 667 };

describe("Mobile layout (375×667)", () => {
  beforeEach(() => {
    cy.viewport(MOBILE.width, MOBILE.height);
    cy.visit("/");
    cy.clearProgress();
  });

  it("top bar is visible and stays within viewport", () => {
    cy.get("[data-testid=top-bar]").should("be.visible");
    cy.get("[data-testid=home-link]").should("be.visible");
    cy.get("[data-testid=xp-meter]").should("be.visible");
    cy.get("[data-testid=streak-flame]").should("be.visible");
    cy.get("[data-testid=theme-toggle]").should("be.visible");
  });

  it("landing hero CTA is visible without horizontal scroll", () => {
    cy.get("[data-testid=hero-start]").should("be.visible");
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(MOBILE.width + 1);
    });
  });

  it("lesson page renders tabs instead of split-pane on mobile", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=mobile-tabs]", { timeout: 15000 }).should("exist");
    cy.get("[data-testid=mobile-tab-lesson]").should("be.visible");
    cy.get("[data-testid=mobile-tab-editor]").should("be.visible");
  });

  it("can switch between lesson and editor tabs", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=mobile-tab-editor]", { timeout: 15000 }).click();
    cy.get("[data-testid=mobile-tab-editor]").should(
      "have.attr",
      "aria-selected",
      "true"
    );
    cy.get("[data-testid=mobile-tab-lesson]").click();
    cy.get("[data-testid=mobile-tab-lesson]").should(
      "have.attr",
      "aria-selected",
      "true"
    );
    cy.get("[data-testid=lesson-title]").should("be.visible");
  });

  it("exercise footer buttons fit and are tappable on mobile", () => {
    cy.visit("/learn/jsx-and-components");
    cy.get("[data-testid=complete-toggle]").should("be.visible");
    cy.get("[data-testid=next-link]").should("be.visible").click();
    cy.location("pathname").should(
      "match",
      /^\/learn\/props-and-composition\/?$/
    );
  });

  it("progress page stacks stats on small screens", () => {
    cy.visit("/progress");
    cy.get("[data-testid=progress-page]").should("be.visible");
    cy.get("[data-testid=progress-xp]").should("be.visible");
    cy.get("[data-testid=progress-streak]").should("be.visible");
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(MOBILE.width + 1);
    });
  });

  it("all 39 curriculum cards are reachable", () => {
    cy.get("[data-testid=exercise-card]").should("have.length", 39);
  });
});
