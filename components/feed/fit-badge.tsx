import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FitBucket } from "@/lib/scoring/fit";

const BUCKET_VARIANT: Record<
  FitBucket,
  "success" | "warning" | "secondary" | "destructive"
> = {
  MATCH: "success",
  STRETCH: "warning",
  REACH: "secondary",
  SKIP: "destructive",
};

const BUCKET_LABEL: Record<FitBucket, string> = {
  MATCH: "Match",
  STRETCH: "Stretch",
  REACH: "Reach",
  SKIP: "Skip",
};

/** Fit Score badge with qualification bucket. */
export function FitBadge({
  score,
  bucket,
}: {
  score: number | null;
  bucket: FitBucket | null;
}) {
  if (score == null || bucket == null) {
    return (
      <Badge variant="outline" className="gap-1" title="Not yet fit-scored">
        <Target className="h-3 w-3" />
        Fit —
      </Badge>
    );
  }
  return (
    <Badge
      variant={BUCKET_VARIANT[bucket]}
      className="gap-1"
      title="Qualification Fit Score (estimate) vs your profile"
    >
      <Target className="h-3 w-3" />
      Fit {score} · {BUCKET_LABEL[bucket]}
    </Badge>
  );
}
