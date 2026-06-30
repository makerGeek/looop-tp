import { useCallback, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { CommandBar } from "@/components/CommandBar";
import { TaskDrawer } from "@/components/TaskDrawer";
import { SignIn } from "@/pages/SignIn";
import { Inbox } from "@/pages/Inbox";
import { Projects } from "@/pages/Projects";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { DailySync } from "@/pages/DailySync";
import { useWorkspace } from "@/hooks/use-workspace";
import { useShortcuts } from "@/hooks/use-shortcuts";
import type { Project } from "@/lib/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route element={<RequireAuth />}>
            <Route element={<AuthedShell />}>
              <Route element={<AppLayout />}>
                <Route index element={<InboxRoute />} />
                <Route path="p" element={<Projects />} />
                <Route path="p/:slug" element={<ProjectDetailRoute />} />
                <Route path="sync" element={<DailySync />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Shared state that lives above the route tree: which task is open in the
// drawer, the Cmd-K bar's open state, and which project is currently in view
// (so Cmd-K's "Create task in current project" knows where to add).
function AuthedShell() {
  const { workspace } = useWorkspace();
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const onCreateTaskFromCommandBar = useCallback(() => {
    if (!currentProject) return;
    // Bump the signal so ProjectDetail reloads + scrolls to its new-task input.
    setRefreshSignal((n) => n + 1);
  }, [currentProject]);

  useShortcuts([
    {
      key: "k",
      meta: true,
      handler: () => setCmdOpen((o) => !o),
    },
    {
      key: "Escape",
      handler: () => {
        setCmdOpen(false);
        setDrawerTaskId(null);
      },
    },
  ]);

  return (
    <ShellContext.Provider
      value={{
        openTaskDrawer: setDrawerTaskId,
        setCurrentProject,
        refreshSignal,
        bumpRefresh: () => setRefreshSignal((n) => n + 1),
      }}
    >
      <Outlet />
      <CommandBar
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        workspaceId={workspace?.id ?? null}
        onCreateTask={onCreateTaskFromCommandBar}
      />
      <TaskDrawer
        taskId={drawerTaskId}
        workspaceId={workspace?.id ?? ""}
        onClose={() => setDrawerTaskId(null)}
        onChanged={() => setRefreshSignal((n) => n + 1)}
      />
    </ShellContext.Provider>
  );
}

import { createContext, useContext } from "react";

interface ShellApi {
  openTaskDrawer: (id: string | null) => void;
  setCurrentProject: (p: Project | null) => void;
  refreshSignal: number;
  bumpRefresh: () => void;
}

const ShellContext = createContext<ShellApi | null>(null);

function useShell(): ShellApi {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("ShellContext missing");
  return ctx;
}

function InboxRoute() {
  const { openTaskDrawer } = useShell();
  return <Inbox onOpenTask={openTaskDrawer} />;
}

function ProjectDetailRoute() {
  const { openTaskDrawer, setCurrentProject, refreshSignal } = useShell();
  return (
    <ProjectDetail
      selectedTaskId={null}
      onSelectTask={(id) => openTaskDrawer(id)}
      refreshSignal={refreshSignal}
      onProjectLoaded={setCurrentProject}
    />
  );
}
