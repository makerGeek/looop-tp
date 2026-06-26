import { describe, expect, it } from "vitest";
import { exerciseFrontmatterSchema } from "@/lib/exercise-schema";

const valid = {
  id: "ex-01",
  slug: "jsx-and-components",
  tier: "beginner",
  order: 1,
  tierOrder: 1,
  title: "JSX",
  objective: "Learn JSX.",
  estMinutes: 10,
  hints: ["a", "b"],
  starterPath: "jsx/starter",
  solutionPath: "jsx/solution",
  sandpackTemplate: "react19-vite",
  tags: ["jsx"],
  xp: 50,
};

describe("exerciseFrontmatterSchema", () => {
  it("accepts a well-formed entry", () => {
    expect(exerciseFrontmatterSchema.parse(valid)).toMatchObject({
      slug: "jsx-and-components",
    });
  });

  it("rejects invalid slugs", () => {
    const result = exerciseFrontmatterSchema.safeParse({
      ...valid,
      slug: "Invalid Slug",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown tiers", () => {
    const result = exerciseFrontmatterSchema.safeParse({
      ...valid,
      tier: "novice",
    });
    expect(result.success).toBe(false);
  });

  it("requires at least two hints", () => {
    const result = exerciseFrontmatterSchema.safeParse({
      ...valid,
      hints: ["only one"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown templates", () => {
    const result = exerciseFrontmatterSchema.safeParse({
      ...valid,
      sandpackTemplate: "astro",
    });
    expect(result.success).toBe(false);
  });

  it("rejects order above 99", () => {
    const result = exerciseFrontmatterSchema.safeParse({
      ...valid,
      order: 200,
    });
    expect(result.success).toBe(false);
  });
});
