"use client";

import { useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import type { SandpackFileMap, SandpackTemplate } from "@/types/exercise";
import { Button } from "@/components/ui/button";
import { RotateCcw, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProgressStore } from "@/stores/progress-store";

interface Props {
  slug: string;
  template: SandpackTemplate;
  starterFiles: SandpackFileMap;
  solutionFiles: SandpackFileMap;
  activeFile: string;
}

const REACT19_DEPS = {
  react: "^19.0.0",
  "react-dom": "^19.0.0",
};

export function SandpackEditor({
  slug,
  template,
  starterFiles,
  solutionFiles,
  activeFile,
}: Props) {
  const [mode, setMode] = useState<"starter" | "solution">("starter");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const revealSolution = useProgressStore((s) => s.revealSolution);

  const files = mode === "solution" ? solutionFiles : starterFiles;

  const customSetup = useMemo(
    () => ({ dependencies: REACT19_DEPS }),
    []
  );

  if (template === "readonly") {
    return <ReadonlyCodeViewer files={solutionFiles} />;
  }

  return (
    <div className="flex h-full flex-col" data-testid="sandpack-editor">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {mode === "solution" ? "Viewing solution" : "Starter code"} · React 19
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResetKey((k) => k + 1);
              setMode("starter");
            }}
            data-testid="sandpack-reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          {mode === "solution" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMode("starter")}
              data-testid="sandpack-hide-solution"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide solution
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              data-testid="sandpack-show-solution"
            >
              <Eye className="h-3.5 w-3.5" />
              Show solution
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <SandpackProvider
          key={`${slug}-${mode}-${resetKey}`}
          template="react-ts"
          files={files}
          customSetup={customSetup}
          options={{
            activeFile,
            recompileMode: "delayed",
            recompileDelay: 400,
          }}
          theme="dark"
        >
          <SandpackLayout className="!h-full !rounded-none !border-0">
            <SandpackCodeEditor
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{ height: "100%" }}
            />
            <SandpackPreview
              showNavigator
              showRefreshButton
              style={{ height: "100%" }}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal the solution?</DialogTitle>
            <DialogDescription>
              Try the exercise first — you'll remember the pattern better. You
              can always come back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              data-testid="solution-cancel"
            >
              Keep trying
            </Button>
            <Button
              onClick={() => {
                revealSolution(slug);
                setMode("solution");
                setConfirmOpen(false);
              }}
              data-testid="solution-confirm"
            >
              Reveal solution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReadonlyCodeViewer({ files }: { files: SandpackFileMap }) {
  const entries = Object.entries(files);
  return (
    <div
      className="flex h-full flex-col overflow-auto border-l bg-zinc-950"
      data-testid="readonly-viewer"
    >
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400">
        Read-only walkthrough · server-side / compiler exercise — not runnable
        in the browser sandbox.
      </div>
      {entries.length === 0 ? (
        <div className="p-6 text-sm text-zinc-400">
          No code files provided.
        </div>
      ) : (
        entries.map(([path, file]) => (
          <div key={path} className="border-b border-zinc-800">
            <div className="bg-zinc-900 px-4 py-1.5 text-xs font-mono text-zinc-400">
              {path}
            </div>
            <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed text-zinc-100">
              <code>{file.code}</code>
            </pre>
          </div>
        ))
      )}
    </div>
  );
}
