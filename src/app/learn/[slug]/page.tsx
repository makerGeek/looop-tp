import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import { allExercises, getAdjacent, getExerciseBySlug } from "@/lib/exercises";
import { getExerciseSandpack } from "@/lib/sandpack-files";
import { LessonLayout } from "@/components/lesson/lesson-layout";
import { useMDXComponents } from "../../../../mdx-components";

export function generateStaticParams() {
  return allExercises().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ex = getExerciseBySlug(slug);
  if (!ex) return { title: "Exercise not found" };
  return {
    title: `${ex.order}. ${ex.title} · React 2026 Course`,
    description: ex.objective,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);
  if (!exercise) notFound();
  const { prev, next } = getAdjacent(slug);
  const { starterFiles, solutionFiles, activeFile } = getExerciseSandpack(slug);

  const { content } = await compileMDX({
    source: exercise.body,
    components: useMDXComponents({}),
    options: { parseFrontmatter: false },
  });

  return (
    <LessonLayout
      exercise={exercise}
      prev={prev}
      next={next}
      starterFiles={starterFiles}
      solutionFiles={solutionFiles}
      activeFile={activeFile}
    >
      {content}
    </LessonLayout>
  );
}
