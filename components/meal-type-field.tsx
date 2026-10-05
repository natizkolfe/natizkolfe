"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DishPhoto } from "@/components/dish-photo";
import { useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { linesForMealType, mealTypeDropsLines, TABLE_OPTIONS } from "@/lib/packages";
import type { DraftLine, FastingPreference, OrderKind } from "@/lib/types";
import { cn } from "cn";

function tableParam(value: string | null): FastingPreference | null {
  return value === "fasting" || value === "non_fasting" || value === "mixed" ? value : null;
}

/** Keeps the meal type in the address bar without changing weekly vs catering. */
export function useMealTypeNavigation(pathname: "/order" | "/order/menu") {
  const router = useRouter();
  const params = useSearchParams();
  const { draft, setDraft } = useDraft();
  const pending = useRef<FastingPreference | null>(null);
  const applied = useRef<string | null>(null);
  const requested = tableParam(params.get("table"));

  useEffect(() => {
    if (!draft) return;
    const urlKey = `${pathname}|${draft.kind}|${requested ?? ""}`;
    if (pending.current) {
      if (requested === pending.current) {
        pending.current = null;
        applied.current = urlKey;
        return;
      }
      if (draft.fastingPreference === pending.current) return;
      pending.current = null;
    }
    if (applied.current === urlKey) return;
    applied.current = urlKey;
    if (!requested || requested === draft.fastingPreference) return;
    setDraft({
      ...draft,
      fastingPreference: requested,
      lines: linesForMealType(draft.lines, draft.fastingPreference, requested, draft.kind, draft.guestCount),
    });
  }, [draft, pathname, requested, setDraft]);

  return function selectMealType(preference: FastingPreference) {
    if (!draft || preference === draft.fastingPreference) return;
    pending.current = preference;
    applied.current = `${pathname}|${draft.kind}|${preference}`;
    setDraft({
      ...draft,
      fastingPreference: preference,
      lines: linesForMealType(draft.lines, draft.fastingPreference, preference, draft.kind, draft.guestCount),
    });
    router.push(`${pathname}?kind=${draft.kind}&table=${preference}`);
  };
}

export function MealTypeField({
  kind,
  preference,
  lines,
  onSelect,
}: {
  kind: OrderKind;
  preference: FastingPreference;
  lines: DraftLine[];
  onSelect: (preference: FastingPreference) => void;
}) {
  const [pending, setPending] = useState<FastingPreference | null>(null);
  const current = TABLE_OPTIONS.find((option) => option.id === preference);
  const next = TABLE_OPTIONS.find((option) => option.id === pending);

  function choose(id: FastingPreference) {
    if (id === preference) return;
    if (mealTypeDropsLines(lines, id, kind)) {
      setPending(id);
      return;
    }
    setPending(null);
    onSelect(id);
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">Choose your meal type</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {TABLE_OPTIONS.map((option) => {
          const selected = preference === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(option.id)}
              className={cn(
                "rounded-lg border px-3 py-3 text-left",
                selected ? "border-primary bg-primary/5" : "border-border bg-background",
              )}
            >
              <span className="flex gap-1" aria-hidden>
                {option.icons.map((id) => (
                  <DishPhoto key={id} id={id} size="sm" />
                ))}
              </span>
              <span className="mt-2 block text-sm font-medium">{option.title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.detail}</span>
            </button>
          );
        })}
      </div>
      {pending && current && next ? (
        <div className="rounded-lg border border-border bg-background px-3 py-3">
          <p className="text-sm font-medium">Change meal type?</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            You currently have {current.title} meal selections. Changing to {next.title} may clear selections that are not
            available under the new meal type.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-10 px-3"
              onClick={() => {
                const choice = pending;
                setPending(null);
                onSelect(choice);
              }}
            >
              Change meal type
            </Button>
            <Button type="button" variant="outline" className="h-10 bg-card px-3" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
