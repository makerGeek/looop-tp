import Link from "next/link";
import { Zap } from "lucide-react";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { XpMeter } from "@/components/progress/xp-meter";
import { StreakFlame } from "@/components/progress/streak-flame";

export function TopBar() {
  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur"
      data-testid="top-bar"
    >
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
          data-testid="home-link"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          React 2026 Course
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            href="/"
            className="rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"
          >
            Curriculum
          </Link>
          <Link
            href="/progress"
            data-testid="progress-link"
            className="rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"
          >
            Progress
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <XpMeter />
        <StreakFlame />
        <ThemeToggle />
      </div>
    </header>
  );
}
