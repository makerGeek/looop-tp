import fs from "node:fs";
import path from "node:path";
import type { SandpackFileMap } from "@/types/exercise";

const STARTERS_ROOT = path.join(process.cwd(), "src", "sandpack", "starters");

function readDir(dir: string): SandpackFileMap {
  if (!fs.existsSync(dir)) return {};
  const map: SandpackFileMap = {};
  const walk = (current: string, relPrefix: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.posix.join(relPrefix, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
      } else {
        const code = fs.readFileSync(full, "utf8");
        map[`/${rel}`] = { code };
      }
    }
  };
  walk(dir, "");
  return map;
}

export interface ExerciseSandpack {
  starterFiles: SandpackFileMap;
  solutionFiles: SandpackFileMap;
  activeFile: string;
}

export function getExerciseSandpack(slug: string): ExerciseSandpack {
  const base = path.join(STARTERS_ROOT, slug);
  const starterFiles = readDir(path.join(base, "starter"));
  const solutionFiles = readDir(path.join(base, "solution"));
  const pickActive = (map: SandpackFileMap): string => {
    const keys = Object.keys(map);
    const app =
      keys.find((k) => k.endsWith("/App.tsx")) ||
      keys.find((k) => k.endsWith("/App.jsx")) ||
      keys.find((k) => k.endsWith("/App.js"));
    return app || keys[0] || "/App.tsx";
  };
  return {
    starterFiles,
    solutionFiles,
    activeFile: pickActive(starterFiles),
  };
}
