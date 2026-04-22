import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-20 text-center"
      data-testid="not-found"
    >
      <div className="text-6xl font-bold tracking-tight text-muted-foreground">
        404
      </div>
      <h1 className="text-xl font-semibold">Exercise not found</h1>
      <p className="text-sm text-muted-foreground">
        The exercise you're looking for doesn't exist in this curriculum.
      </p>
      <Button asChild>
        <Link href="/" data-testid="not-found-home">
          <Home className="h-4 w-4" />
          Back to curriculum
        </Link>
      </Button>
    </div>
  );
}
