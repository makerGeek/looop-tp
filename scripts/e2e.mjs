#!/usr/bin/env node
// Thin wrapper around start-server-and-test so SIGINT/SIGTERM handling is
// predictable and cleanup runs.
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const CYPRESS_CMD = process.argv[2] === "open" ? "cypress:open" : "cypress:run";

function cleanup() {
  try {
    if (existsSync(".next")) rmSync(".next", { recursive: true, force: true });
  } catch {}
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

cleanup();
const proc = spawn(
  "node_modules/.bin/start-server-and-test",
  ["dev:test", "http://localhost:3000", CYPRESS_CMD],
  { stdio: "inherit", shell: false }
);

proc.on("exit", (code) => {
  process.exit(code ?? 0);
});
