import { getTieredExercises, allExercises, totalAvailableXp } from "@/lib/exercises";
import { CurriculumGrid } from "@/components/curriculum/curriculum-grid";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  const tiered = getTieredExercises();
  const all = allExercises();
  const totalXp = totalAvailableXp();
  const firstSlug = all[0]?.slug;
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10"
      data-testid="home-page"
    >
      <section className="mb-8 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:mb-10 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          React 2026 · Codecademy-inspired
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Master the modern React ecosystem.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
          {all.length} interactive, progressively-difficult exercises covering
          React 19, Next.js 15, TanStack, Zustand, Tailwind v4, Vitest, Cypress,
          and the full 2026 toolchain. Write code in the browser, see it run
          instantly, collect XP.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
          {firstSlug ? (
            <Button asChild size="lg" data-testid="hero-start">
              <Link href={`/learn/${firstSlug}`}>
                <span className="hidden sm:inline">
                  Start with exercise 1
                </span>
                <span className="sm:hidden">Start learning</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          <Button asChild size="lg" variant="outline">
            <Link href="/progress" data-testid="hero-progress">
              View progress
            </Link>
          </Button>
          <span
            className="text-xs text-muted-foreground"
            data-testid="total-xp"
          >
            {totalXp} XP available across {all.length} exercises
          </span>
        </div>
      </section>
      <CurriculumGrid tiered={tiered} />
    </div>
  );
}
