import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function legitTier(score: number): "high" | "medium" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/** Compact "Legit Score (estimate)" badge. Never claims verification. */
export function LegitBadge({ score }: { score: number }) {
  const tier = legitTier(score);
  const variant =
    tier === "high" ? "success" : tier === "medium" ? "warning" : "destructive";
  const Icon =
    tier === "high" ? ShieldCheck : tier === "medium" ? ShieldQuestion : ShieldAlert;
  return (
    <Badge variant={variant} className="gap-1" title="Legit Score is an estimate, not a verification.">
      <Icon className="h-3 w-3" />
      Legit {score}
      <span className="opacity-70">est.</span>
    </Badge>
  );
}
