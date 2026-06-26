/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      clearProgress(): Chainable<void>;
      freezeDate(iso: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("clearProgress", () => {
  cy.window().then((win) => {
    win.localStorage.removeItem("r26-progress");
  });
});

Cypress.Commands.add("freezeDate", (iso: string) => {
  cy.clock(new Date(iso).getTime(), ["Date"]);
});

export {};
