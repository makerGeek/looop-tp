import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/providers/theme-provider";

describe("ThemeProvider", () => {
  it("passes children through", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <span>child</span>
      </ThemeProvider>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
