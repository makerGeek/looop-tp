describe("Not-found behaviour", () => {
  it("renders the friendly 404 page for missing slugs", () => {
    cy.request({
      url: "/learn/this-slug-does-not-exist",
      failOnStatusCode: false,
    }).then((resp) => {
      expect([404, 200]).to.include(resp.status);
    });
    cy.visit("/learn/this-slug-does-not-exist", { failOnStatusCode: false });
    cy.get("[data-testid=not-found]", { timeout: 10000 }).should("be.visible");
    cy.contains("Exercise not found").should("be.visible");
    cy.get("[data-testid=not-found-home]").click();
    cy.location("pathname").should("match", /^\/$/);
  });
});
