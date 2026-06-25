"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { updateFitThreshold } from "@/app/onboarding/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [60, 65, 70, 75, 80, 85, 90];

/** Adjustable default Fit threshold that gates the feed's "strong matches" view. */
export function FitThresholdControl({ value }: { value: number }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [current, setCurrent] = React.useState(String(value));

  const onChange = (v: string) => {
    setCurrent(v);
    setSaved(false);
    startTransition(async () => {
      await updateFitThreshold(Number(v));
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o} value={String(o)}>
              Fit ≥ {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {saved && !pending && (
        <span className="flex items-center gap-1 text-xs text-success">
          <Check className="h-3.5 w-3.5" /> Saved
        </span>
      )}
    </div>
  );
}
