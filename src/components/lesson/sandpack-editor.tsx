"use client";

import { useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
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
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="truncate text-[11px] text-muted-foreground sm:text-xs">
          <span className="hidden sm:inline">
            {mode === "solution" ? "Viewing solution" : "Starter code"} · React
            19
          </span>
          <span className="sm:hidden">
            {mode === "solution" ? "Solution" : "Starter"} · R19
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResetKey((k) => k + 1);
              setMode("starter");
            }}
            data-testid="sandpack-reset"
            aria-label="Reset code"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          {mode === "solution" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMode("starter")}
              data-testid="sandpack-hide-solution"
              aria-label="Hide solution"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hide solution</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              data-testid="sandpack-show-solution"
              aria-label="Show solution"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Show solution</span>
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
            <SandpackFileExplorer
              autoHiddenFiles
              className="sp-file-explorer-custom"
              style={{ height: "100%" }}
            />
            <SandpackCodeEditor
              showLineNumbers
              showInlineErrors
              wrapContent
              showTabs
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
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  const [activePath, setActivePath] = useState<string | null>(
    entries[0]?.[0] ?? null
  );
  const active = entries.find(([p]) => p === activePath);

  // Group files by their folder for the left-hand tree.
  const tree = buildTree(entries.map(([p]) => p));

  if (entries.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center border-l bg-zinc-950 p-6 text-sm text-zinc-400"
        data-testid="readonly-viewer"
      >
        No code files provided.
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col border-l bg-zinc-950 text-zinc-100"
      data-testid="readonly-viewer"
    >
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400">
        Read-only walkthrough · server-side / compiler exercise — not runnable
        in the browser sandbox.
      </div>
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav
          className="max-h-40 overflow-auto border-b border-zinc-800 bg-zinc-900/40 py-2 text-xs sm:max-h-none sm:min-w-[200px] sm:max-w-[240px] sm:border-b-0 sm:border-r"
          aria-label="Files"
          data-testid="readonly-tree"
        >
          <FileTreeNode
            node={tree}
            depth={0}
            activePath={activePath}
            onSelect={setActivePath}
          />
        </nav>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {active ? (
            <>
              <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 px-4 py-1.5 font-mono text-[11px] text-zinc-400">
                {active[0]}
              </div>
              <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
                <code>{active[1].code}</code>
              </pre>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface TreeNode {
  name: string;
  path: string; // full path for files; folder path ending in "/" for folders
  isFile: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "/",
    isFile: false,
    children: [],
  };
  for (const full of paths) {
    const parts = full.split("/").filter(Boolean);
    let cur = root;
    let running = "";
    parts.forEach((part, i) => {
      running += "/" + part;
      const isFile = i === parts.length - 1;
      let child = cur.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: isFile ? full : running + "/",
          isFile,
          children: [],
        };
        cur.children.push(child);
      }
      cur = child;
    });
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
      return a.isFile ? 1 : -1; // folders first
    });
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

function FileTreeNode({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onSelect: (p: string) => void;
}) {
  return (
    <ul className={depth === 0 ? "" : "border-l border-zinc-800 pl-2"}>
      {node.children.map((child) => {
        if (child.isFile) {
          const active = child.path === activePath;
          return (
            <li key={child.path}>
              <button
                type="button"
                onClick={() => onSelect(child.path)}
                className={
                  "w-full truncate px-3 py-1 text-left font-mono text-[11px] " +
                  (active
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200")
                }
                style={{ paddingLeft: 12 + depth * 8 }}
                data-file={child.path}
              >
                {child.name}
              </button>
            </li>
          );
        }
        return (
          <li key={child.path}>
            <div
              className="px-3 py-1 font-mono text-[11px] font-semibold text-zinc-500"
              style={{ paddingLeft: 12 + depth * 8 }}
            >
              {child.name}/
            </div>
            <FileTreeNode
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          </li>
        );
      })}
    </ul>
  );
}
