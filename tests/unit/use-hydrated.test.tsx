import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHydrated } from "@/hooks/use-hydrated";

describe("useHydrated", () => {
  it("starts false then flips true after effect flushes", async () => {
    const { result } = renderHook(() => useHydrated());
    // after initial render + commit, the effect has run
    expect(result.current).toBe(true);
  });
});
