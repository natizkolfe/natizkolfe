"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
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
      <div className="flex h-11 overflow-hidden rounded-lg border border-input bg-card">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          value={value}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onChange={(event) => change(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (value < max) change(String(value + 1));
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (value <= min) setShowMinimum(true);
              else change(String(value - 1));
            }
          }}
          onBlur={() => {
            if (!Number.isInteger(count) || count < min) {
              setShowMinimum(true);
              onChange(min);
            }
          }}
        />
        <div className="flex w-8 flex-col border-l border-input">
          <button
            type="button"
            aria-label="Increase guests"
            className="flex flex-1 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => change(String(value + 1))}
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Decrease guests"
            className="flex flex-1 items-center justify-center border-t border-input text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => change(String(value - 1))}
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>
      {showMinimum ? <p className="text-sm">Minimum guest required is {min}.</p> : null}
    </div>
  );
}
