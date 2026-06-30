import { Sunrise } from "lucide-react";
import { EntryForm } from "@/components/standup/EntryForm";
import { YesterdayEntry } from "@/components/standup/YesterdayEntry";

export function DailySync() {
  return (
    <section>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sunrise className="h-5 w-5 text-primary" />
          Daily sync
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Async standup &middot; 30 seconds, then your morning back.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          {/* B-D3 wired here; B-D4 layers read-only + Edit; B-D5 surfaces yesterday. */}
          <EntryForm />
          <YesterdayEntry />
        </div>
        {/* TODO(B-D6..B-D10): digest card, coverage strip, stale hint, etc. */}
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Digest goes here
        </div>
      </div>

      {/* TODO(B-D11): History disclosure goes here. */}
    </section>
  );
}
