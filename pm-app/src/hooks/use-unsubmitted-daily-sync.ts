import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useWorkspace } from "@/hooks/use-workspace";
import { getMyEntry, todayLocalDate } from "@/lib/queries/standup";

/**
 * Returns true when the signed-in user has NOT submitted today's standup
 * AND today is a weekday in the user's local timezone. Used by the sidebar
 * to render a subtle "you have work to do" dot on the Daily sync nav item.
 *
 * Hidden (returns false) in any of these cases:
 *  - session or workspace not ready yet (avoids flicker)
 *  - user has already submitted today
 *  - today is a weekend (Sat/Sun) in the user's local TZ — no work expectation
 *
 * Refreshes on window focus and route changes via `refresh()` (caller-driven).
 * v1: after a submit the dot disappears on next page load — see
 * decisions.md for rationale.
 */
export function useUnsubmittedDailySync(): {
  unsubmitted: boolean;
  refresh: () => void;
} {
  const { session, loading: sessionLoading } = useSession();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const [unsubmitted, setUnsubmitted] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (sessionLoading || workspaceLoading) return;
    const userId = session?.user.id;
    const workspaceId = workspace?.id;
    if (!userId || !workspaceId) {
      setUnsubmitted(false);
      return;
    }
    // Weekend short-circuit — Date#getDay returns 0 (Sun) … 6 (Sat) in local TZ.
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      setUnsubmitted(false);
      return;
    }
    getMyEntry(workspaceId, userId, todayLocalDate())
      .then((entry) => {
        if (cancelled) return;
        setUnsubmitted(entry === null);
      })
      .catch(() => {
        // Soft-fail: a fetch hiccup on a discoverability dot shouldn't
        // surface anything to the user; just leave the dot hidden.
        if (!cancelled) setUnsubmitted(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    session?.user.id,
    workspace?.id,
    sessionLoading,
    workspaceLoading,
    tick,
  ]);

  // Refetch on window focus — covers the common case of the user
  // submitting in another tab, then coming back here.
  useEffect(() => {
    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { unsubmitted, refresh };
}
