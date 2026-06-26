"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardNav(prevSlug?: string, nextSlug?: string): void {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          e.target.isContentEditable
        ) {
          return;
        }
      }
      if (e.key === "j" && nextSlug) {
        router.push(`/learn/${nextSlug}`);
      } else if (e.key === "k" && prevSlug) {
        router.push(`/learn/${prevSlug}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevSlug, nextSlug, router]);
}
