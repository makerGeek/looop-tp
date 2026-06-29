import { useEffect } from "react";

export interface Shortcut {
  key: string;
  meta?: boolean;
  handler: () => void;
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return t.isContentEditable;
}

export function useShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      for (const s of shortcuts) {
        const wantsMeta = s.meta === true;
        const metaPressed = e.metaKey || e.ctrlKey;
        if (wantsMeta !== metaPressed) continue;
        if (e.key !== s.key) continue;
        if (!wantsMeta && isEditableTarget(e.target)) continue;
        e.preventDefault();
        s.handler();
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);
}
