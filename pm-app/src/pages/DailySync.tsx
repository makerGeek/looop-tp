import { useState } from "react";
import { Sunrise } from "lucide-react";
import { CoverageStrip } from "@/components/standup/CoverageStrip";
import { DigestCard } from "@/components/standup/DigestCard";
import { EntryForm } from "@/components/standup/EntryForm";
import { EntryHistory } from "@/components/standup/EntryHistory";
import { YesterdayEntry } from "@/components/standup/YesterdayEntry";

export function DailySync() {
  // Bumped after EntryForm reports a successful save so the CoverageStrip
  // re-fetches without a full page reload (AC 5.2).
  const [refreshKey, setRefreshKey] = useState(0);

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

      <div className="mb-6">
        <CoverageStrip refreshKey={refreshKey} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          {/* B-D3 wired here; B-D4 layers read-only + Edit; B-D5 surfaces yesterday. */}
          <EntryForm onSubmitted={() => setRefreshKey((k) => k + 1)} />
          <YesterdayEntry />
        </div>
        {/* B-D6..B-D9 wired here. */}
        <div>
          <DigestCard />
        </div>
      </div>

      <EntryHistory />
    </section>
  );
}
