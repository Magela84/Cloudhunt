"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  id?: string;
  className?: string;
}

/**
 * Chip-style multi-value input. Add on Enter or comma; remove with the × or
 * Backspace on an empty field. Optional click-to-add suggestions.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  id,
  className,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const remainingSuggestions = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="rounded-sm opacity-60 hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {remainingSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {remainingSuggestions.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
