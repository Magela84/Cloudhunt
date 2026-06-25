"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY = "any";

export function FeedFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === "" || value === ANY) next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  const get = (key: string) => params.get(key) ?? "";
  const hasFilters = Array.from(params.keys()).length > 0;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <Field label="Provider">
        <Select value={get("provider") || ANY} onValueChange={(v) => setParam("provider", v)}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            <SelectItem value="AWS">AWS</SelectItem>
            <SelectItem value="Azure">Azure</SelectItem>
            <SelectItem value="GCP">GCP</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Fit bucket">
        <Select value={get("bucket") || ANY} onValueChange={(v) => setParam("bucket", v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            <SelectItem value="MATCH">Match</SelectItem>
            <SelectItem value="STRETCH">Stretch</SelectItem>
            <SelectItem value="REACH">Reach</SelectItem>
            <SelectItem value="SKIP">Skip</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Seniority">
        <Select value={get("seniority") || ANY} onValueChange={(v) => setParam("seniority", v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Mid</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="lead">Lead/Staff</SelectItem>
            <SelectItem value="principal">Principal</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Min Legit">
        <Select value={get("legitMin") || ANY} onValueChange={(v) => setParam("legitMin", v)}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            <SelectItem value="50">50+</SelectItem>
            <SelectItem value="65">65+</SelectItem>
            <SelectItem value="75">75+</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Salary floor (USD)">
        <Input
          type="number"
          className="w-32"
          placeholder="e.g. 120000"
          defaultValue={get("salaryFloor")}
          onBlur={(e) => setParam("salaryFloor", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("salaryFloor", (e.target as HTMLInputElement).value);
          }}
        />
      </Field>

      <Field label="Include keyword">
        <Input
          className="w-36"
          placeholder="e.g. terraform"
          defaultValue={get("include")}
          onBlur={(e) => setParam("include", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("include", (e.target as HTMLInputElement).value);
          }}
        />
      </Field>

      <Field label="Exclude keyword">
        <Input
          className="w-36"
          placeholder="e.g. senior"
          defaultValue={get("exclude")}
          onBlur={(e) => setParam("exclude", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("exclude", (e.target as HTMLInputElement).value);
          }}
        />
      </Field>

      <label className="flex h-9 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={get("remote") === "1"}
          onChange={(e) => setParam("remote", e.target.checked ? "1" : null)}
        />
        Remote only
      </label>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
