import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { getOrCreateDefaultWorkspace } from "@/lib/queries/workspaces";
import type { Workspace } from "@/lib/types";

export function useWorkspace() {
  const { session, loading: sessionLoading } = useSession();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (sessionLoading) return;
    if (!session?.user) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getOrCreateDefaultWorkspace(
      session.user.id,
      session.user.email ?? "you@example.com"
    )
      .then((ws) => {
        if (!cancelled) {
          setWorkspace(ws);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user, sessionLoading]);

  return { workspace, loading: loading || sessionLoading, error };
}
