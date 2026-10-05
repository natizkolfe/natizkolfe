"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

export function GuestCountField({
  id,
  count,
  min,
  max,
  onChange,
}: {
  id: string;
  count: number;
  min: number;
  max: number;
  onChange: (count: number) => void;
}) {
  const [showMinimum, setShowMinimum] = useState(false);
  const value = Number.isInteger(count) ? Math.min(max, Math.max(min, count)) : min;

  function change(raw: string) {
    const text = String(raw);
    if (text.trim() === "") return;
    const next = Number(text);
    if (!Number.isInteger(next) || next < min) {
      setShowMinimum(true);
      onChange(min);
      return;
    }
    setShowMinimum(false);
    onChange(Math.min(max, next));
  }

  return (
    <div className="grid gap-2">
      <div className="flex h-11 max-w-xs items-center gap-2">
        <button
          type="button"
          aria-label="Decrease guests"
          className="flex size-11 items-center justify-center rounded-lg border border-input bg-card text-foreground disabled:opacity-40"
          onClick={() => {
            if (value <= min) setShowMinimum(true);
            else change(String(value - 1));
          }}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          value={value}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onChange={(event) => change(event.target.value)}
          onBlur={() => {
            if (!Number.isInteger(count) || count < min) {
              setShowMinimum(true);
              onChange(min);
            }
          }}
        />
        <button
          type="button"
          aria-label="Increase guests"
          disabled={value >= max}
          className="flex size-11 items-center justify-center rounded-lg border border-input bg-card text-foreground disabled:opacity-40"
          onClick={() => change(String(value + 1))}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      {showMinimum ? <p className="text-sm">Minimum guest required is {min}.</p> : null}
    </div>
  );
}
