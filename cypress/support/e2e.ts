import "cypress-mochawesome-reporter/register";
import "@cypress/code-coverage/support";
import "cypress-axe";
import "./commands";

// Ignore uncaught errors originating in dev-only / third-party tooling so they
// don't mask the assertions we actually care about.
Cypress.on("uncaught:exception", (err) => {
  const msg = err.message ?? "";
  const stack = err.stack ?? "";
  if (
    /ResizeObserver loop/i.test(msg) ||
    /Hydration failed/i.test(msg) ||
    /Invalid or unexpected token/i.test(msg) ||
    /Loading chunk/i.test(msg) ||
    /sandpack|codesandbox|nodebox/i.test(stack)
  ) {
    return false;
  }
  return true;
});
