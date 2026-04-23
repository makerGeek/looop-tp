"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import type { Exercise, SandpackFileMap } from "@/types/exercise";
import { LessonNarrative } from "@/components/lesson/lesson-narrative";
import { ExerciseFooter } from "@/components/lesson/exercise-footer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/cn";
import { BookOpen, Code2 } from "lucide-react";

const SandpackEditor = dynamic(
  () =>
    import("@/components/lesson/sandpack-editor").then((m) => ({
      default: m.SandpackEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full items-center justify-center bg-zinc-950 text-sm text-zinc-400"
        data-testid="sandpack-editor"
      >
        Loading editor…
      </div>
    ),
  }
);

interface Props {
  exercise: Exercise;
  prev?: Exercise;
  next?: Exercise;
  starterFiles: SandpackFileMap;
  solutionFiles: SandpackFileMap;
  activeFile: string;
  children: React.ReactNode;
}

export function LessonLayout({
  exercise,
  prev,
  next,
  starterFiles,
  solutionFiles,
  activeFile,
  children,
}: Props) {
  const hydrated = useHydrated();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const narrative = (
    <LessonNarrative exercise={exercise}>{children}</LessonNarrative>
  );
  const editor = (
    <SandpackEditor
      slug={exercise.slug}
      template={exercise.sandpackTemplate}
      starterFiles={starterFiles}
      solutionFiles={solutionFiles}
      activeFile={activeFile}
    />
  );

  // Avoid a remount flash: don't render the narrative (and its hint-toggle)
  // before we know the viewport. Pre-hydration shows a minimal skeleton so
  // clicks can't land on a soon-to-be-unmounted copy.
  if (!hydrated) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
        <div
          className="flex-1 min-h-0 animate-pulse bg-muted/40"
          data-testid="lesson-skeleton"
          aria-hidden
        />
        <ExerciseFooter exercise={exercise} prev={prev} next={next} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex-1 min-h-0">
        {isDesktop ? (
          <PanelGroup
            direction="horizontal"
            className="h-full"
            autoSaveId={`lesson-${exercise.slug}`}
          >
            <Panel defaultSize={42} minSize={30}>
              {narrative}
            </Panel>
            <PanelResizeHandle className="group relative w-1 bg-border transition-colors data-[resize-handle-state=hover]:bg-primary data-[resize-handle-state=drag]:bg-primary" />
            <Panel minSize={30}>{editor}</Panel>
          </PanelGroup>
        ) : (
          <MobileTabs narrative={narrative} editor={editor} />
        )}
      </div>
      <ExerciseFooter exercise={exercise} prev={prev} next={next} />
    </div>
  );
}

function MobileTabs({
  narrative,
  editor,
}: {
  narrative: React.ReactNode;
  editor: React.ReactNode;
}) {
  const [tab, setTab] = useState<"lesson" | "editor">("lesson");
  return (
    <div className="flex h-full flex-col" data-testid="mobile-tabs">
      <div
        role="tablist"
        aria-label="Lesson view"
        className="grid grid-cols-2 border-b bg-muted/40"
      >
        <TabButton
          active={tab === "lesson"}
          onClick={() => setTab("lesson")}
          icon={<BookOpen className="h-4 w-4" />}
          label="Lesson"
          testId="mobile-tab-lesson"
        />
        <TabButton
          active={tab === "editor"}
          onClick={() => setTab("editor")}
          icon={<Code2 className="h-4 w-4" />}
          label="Editor"
          testId="mobile-tab-editor"
        />
      </div>
      {/* Keep both panes mounted so the Sandpack iframe doesn't reinit on tab switch. */}
      <div
        className={cn("flex-1 min-h-0", tab === "lesson" ? "block" : "hidden")}
      >
        {narrative}
      </div>
      <div
        className={cn("flex-1 min-h-0", tab === "editor" ? "block" : "hidden")}
      >
        {editor}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  testId: string;
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex h-11 items-center justify-center gap-2 text-sm font-medium transition-colors",
        active
          ? "border-b-2 border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
