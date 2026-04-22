import { z } from "zod";

export const tierEnum = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "auxiliary",
]);

export const sandpackTemplateEnum = z.enum([
  "react19-vite",
  "react19-tailwind",
  "readonly",
]);

export const exerciseFrontmatterSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
  tier: tierEnum,
  order: z.number().int().min(1).max(30),
  tierOrder: z.number().int().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  estMinutes: z.number().int().min(1).max(240),
  hints: z.array(z.string().min(1)).min(2).max(6),
  starterPath: z.string().min(1),
  solutionPath: z.string().min(1),
  sandpackTemplate: sandpackTemplateEnum,
  tags: z.array(z.string()).default([]),
  xp: z.number().int().min(0).max(1000),
});

export type ExerciseFrontmatterInput = z.input<typeof exerciseFrontmatterSchema>;
export type ExerciseFrontmatterParsed = z.output<typeof exerciseFrontmatterSchema>;
