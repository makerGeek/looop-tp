"use client";

import dynamic from "next/dynamic";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import type { Exercise, SandpackFileMap } from "@/types/exercise";
import { LessonNarrative } from "@/components/lesson/lesson-narrative";
import { ExerciseFooter } from "@/components/lesson/exercise-footer";

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
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex-1 min-h-0">
        <PanelGroup
          direction="horizontal"
          className="h-full"
          autoSaveId={`lesson-${exercise.slug}`}
        >
          <Panel defaultSize={42} minSize={30}>
            <LessonNarrative exercise={exercise}>{children}</LessonNarrative>
          </Panel>
          <PanelResizeHandle className="group relative w-1 bg-border transition-colors data-[resize-handle-state=hover]:bg-primary data-[resize-handle-state=drag]:bg-primary" />
          <Panel minSize={30}>
            <SandpackEditor
              slug={exercise.slug}
              template={exercise.sandpackTemplate}
              starterFiles={starterFiles}
              solutionFiles={solutionFiles}
              activeFile={activeFile}
            />
          </Panel>
        </PanelGroup>
      </div>
      <ExerciseFooter exercise={exercise} prev={prev} next={next} />
    </div>
  );
}
