import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TierBadge } from "@/components/lesson/tier-badge";
import { ProgressRing } from "@/components/progress/progress-ring";
import type { Tier } from "@/types/exercise";

describe("Button variants", () => {
  for (const variant of [
    "default",
    "destructive",
    "outline",
    "secondary",
    "ghost",
    "link",
  ] as const) {
    it(`renders variant=${variant}`, () => {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
    });
  }

  for (const size of ["default", "sm", "lg", "icon"] as const) {
    it(`renders size=${size}`, () => {
      render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole("button", { name: size })).toBeInTheDocument();
    });
  }

  it("asChild forwards to an alternative element", () => {
    render(
      <Button asChild>
        <a href="/foo">link</a>
      </Button>
    );
    expect(screen.getByRole("link", { name: "link" })).toBeInTheDocument();
  });
});

describe("Card pieces", () => {
  it("renders all composable sections", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>T</CardTitle>
          <CardDescription>D</CardDescription>
        </CardHeader>
        <CardContent>C</CardContent>
        <CardFooter>F</CardFooter>
      </Card>
    );
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
  });
});

describe("Badge variants", () => {
  for (const v of ["default", "secondary", "outline"] as const) {
    it(`renders variant=${v}`, () => {
      const { container } = render(<Badge variant={v}>{v}</Badge>);
      expect(container.firstChild).toHaveTextContent(v);
    });
  }
});

describe("Progress", () => {
  it("renders with a value", () => {
    const { container } = render(<Progress value={42} />);
    expect(container.querySelector('[role="progressbar"]')).toBeTruthy();
  });
  it("renders with undefined value", () => {
    const { container } = render(<Progress />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("Separator", () => {
  it("renders horizontal by default", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveAttribute(
      "data-orientation",
      "horizontal"
    );
  });
  it("supports vertical", () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveAttribute(
      "data-orientation",
      "vertical"
    );
  });
});

describe("TierBadge", () => {
  const tiers: Tier[] = [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
    "auxiliary",
  ];
  for (const t of tiers) {
    it(`renders ${t}`, () => {
      render(<TierBadge tier={t} />);
      expect(screen.getByText(new RegExp(t, "i"))).toBeInTheDocument();
    });
  }
});

describe("ProgressRing", () => {
  it("clamps negative values to 0", () => {
    const { container } = render(<ProgressRing value={-10} />);
    expect(container.textContent).toContain("0%");
  });
  it("clamps >100 values", () => {
    const { container } = render(<ProgressRing value={150} />);
    expect(container.textContent).toContain("100%");
  });
  it("accepts custom label", () => {
    render(<ProgressRing value={50} label="half" />);
    expect(screen.getByLabelText("half")).toBeInTheDocument();
  });
});
