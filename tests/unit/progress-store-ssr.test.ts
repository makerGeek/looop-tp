import { describe, expect, it, vi } from "vitest";

describe("progress-store SSR fallback", () => {
  it("persist storage is a no-op when window is undefined", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulate SSR
    delete (globalThis as { window?: unknown }).window;
    vi.resetModules();
    // Re-import the store in a context where `window` is missing.
    const mod = await import("@/stores/progress-store");
    // Getting state should still work, just without persistence.
    expect(mod.useProgressStore.getState().xp).toBe(0);
    // @ts-expect-error - restore
    globalThis.window = originalWindow;
  });
});
