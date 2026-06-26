#!/usr/bin/env node
// Cloudflare Pages' dashboard integration is configured to serve `dist/`.
// Next's static export lands in `out/`, so we mirror it to `dist/` after build.
import { cpSync, existsSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  console.error("Expected Next static export at ./out — did `next build` run?");
  process.exit(1);
}

if (existsSync("dist")) rmSync("dist", { recursive: true, force: true });
cpSync("out", "dist", { recursive: true });
console.log("Copied out/ → dist/ for Cloudflare Pages.");
