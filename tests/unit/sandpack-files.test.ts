import { describe, expect, it } from "vitest";
import { getExerciseSandpack } from "@/lib/sandpack-files";

describe("getExerciseSandpack", () => {
  it("loads starter and solution for exercise 1", () => {
    const { starterFiles, solutionFiles, activeFile } = getExerciseSandpack(
      "jsx-and-components"
    );
    expect(Object.keys(starterFiles).length).toBeGreaterThan(0);
    expect(Object.keys(solutionFiles).length).toBeGreaterThan(0);
    expect(activeFile).toMatch(/App\.tsx$/);
  });

  it("returns empty maps for a missing slug", () => {
    const { starterFiles, solutionFiles } = getExerciseSandpack("missing-slug");
    expect(starterFiles).toEqual({});
    expect(solutionFiles).toEqual({});
  });

  it("resolves nested file paths inside solution dirs", () => {
    const { solutionFiles } = getExerciseSandpack("server-components");
    const paths = Object.keys(solutionFiles);
    expect(paths.some((p) => p.includes("/app/users/"))).toBe(true);
  });
});
