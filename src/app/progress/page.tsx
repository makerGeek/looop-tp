import { allExercises, getTieredExercises } from "@/lib/exercises";
import { ProgressView } from "@/components/progress/progress-view";

export const metadata = { title: "Progress · React 2026 Course" };

export default function ProgressPage() {
  return (
    <ProgressView tiered={getTieredExercises()} all={allExercises()} />
  );
}
