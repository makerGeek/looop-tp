export type Tier =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "auxiliary";

export type SandpackTemplate =
  | "react19-vite"
  | "react19-tailwind"
  | "readonly";

export interface ExerciseFrontmatter {
  id: string;
  slug: string;
  tier: Tier;
  order: number;
  tierOrder: number;
  title: string;
  objective: string;
  estMinutes: number;
  hints: string[];
  starterPath: string;
  solutionPath: string;
  sandpackTemplate: SandpackTemplate;
  tags: string[];
  xp: number;
}

export interface Exercise extends ExerciseFrontmatter {
  body: string;
}

export interface SandpackFileMap {
  [path: string]: { code: string; active?: boolean; hidden?: boolean };
}
