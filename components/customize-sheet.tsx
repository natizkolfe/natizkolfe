"use client";

import { DishSwatch } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { money, SPICE_LABEL } from "@/lib/format";
import type { Customization, MealSlot, MenuItem } from "@/lib/types";

export interface CustomizeDraft {
  item: MenuItem;
  lineId: string | null;
  quantity: number;
  dayIndex: number | null;
  mealSlot: MealSlot | null;
  customization: Customization;
  days: { index: number; label: string }[];
  kind: "weekly" | "catering";
}

export function CustomizeSheet({
  draft,
  onClose,
  onChange,
  onSave,
}: {
  draft: CustomizeDraft | null;
  onClose: () => void;
  onChange: (next: CustomizeDraft) => void;
  onSave: () => void;
}) {
  const item = draft?.item;
  return (
    <Sheet open={Boolean(draft)} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
      <SheetContent
        side="right"
        className="h-full w-full overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        {draft && item ? (
          <>
            <SheetHeader className="shrink-0 pr-10">
              <div className="flex items-center gap-3">
                <DishSwatch color={item.swatch} name={item.name} />
                <div>
                  <SheetTitle className="font-display text-2xl">{item.name}</SheetTitle>
                  <SheetDescription>
                    {item.amharic} · {money(item.price)} each
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 pb-4">
              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              {item.kitchenNote ? <p className="text-sm leading-6">{item.kitchenNote}</p> : null}

              {draft.kind === "weekly" ? (
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Day</Label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {draft.days.map((day) => (
                        <button
                          key={day.index}
                          type="button"
                          onClick={() => onChange({ ...draft, dayIndex: day.index })}
                          className={`h-9 shrink-0 rounded-md border px-3 text-sm ${
                            draft.dayIndex === day.index
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["lunch", "dinner"] as const).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => onChange({ ...draft, mealSlot: slot })}
                        className={`h-10 rounded-md border text-sm capitalize ${
                          draft.mealSlot === slot ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Quantity is the number of servings. Mains usually match the guest count. Injera is often two per person.
                </p>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm font-medium">Servings</span>
                <Stepper
                  value={draft.quantity}
                  onChange={(quantity) => onChange({ ...draft, quantity })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="kitchen-notes">Special instructions for the kitchen</Label>
                <Textarea
                  id="kitchen-notes"
                  value={draft.customization.notes}
                  maxLength={400}
                  placeholder="Anything else about this dish only"
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      customization: { ...draft.customization, notes: event.target.value },
                    })
                  }
                />
              </div>

              {item.canChooseFastingStyle ? (
                <ChoiceRow
                  label="Preparation"
                  value={draft.customization.fastingStyle ?? "fasting"}
                  options={[
                    ["fasting", "Fasting, no meat or dairy"],
                    ["non_fasting", "With niter kibbeh"],
                  ]}
                  onChange={(value) =>
                    onChange({
                      ...draft,
                      customization: {
                        ...draft.customization,
                        fastingStyle: value as "fasting" | "non_fasting",
                      },
                    })
                  }
                />
              ) : null}

              {item.allowSpice ? (
                <ChoiceRow
                  label="Spice"
                  value={draft.customization.spiceLevel ?? item.defaultSpice ?? item.spiceLevels[0]}
                  options={item.spiceLevels.map((level) => [level, SPICE_LABEL[level]])}
                  onChange={(value) =>
                    onChange({
                      ...draft,
                      customization: {
                        ...draft.customization,
                        spiceLevel: value as Customization["spiceLevel"],
                      },
                    })
                  }
                />
              ) : null}

              {item.choice ? (
                <ChoiceRow
                  label={item.choice.label}
                  value={draft.customization.choice ?? item.choice.defaultOption}
                  options={item.choice.options.map((option) => [option, option])}
                  onChange={(value) =>
                    onChange({
                      ...draft,
                      customization: { ...draft.customization, choice: value },
                    })
                  }
                />
              ) : null}

              <CheckGroup
                label="Allergies"
                hint="Only allergens that can show up in this dish are listed."
                options={item.allergenHints}
                selected={draft.customization.allergens}
                onToggle={(option, checked) =>
                  onChange({
                    ...draft,
                    customization: {
                      ...draft.customization,
                      allergens: toggle(draft.customization.allergens, option, checked),
                    },
                  })
                }
              />
              <CheckGroup
                label="Leave out"
                options={item.ingredients}
                selected={draft.customization.excludedIngredients}
                onToggle={(option, checked) =>
                  onChange({
                    ...draft,
                    customization: {
                      ...draft.customization,
                      excludedIngredients: toggle(draft.customization.excludedIngredients, option, checked),
                    },
                  })
                }
              />
              <CheckGroup
                label="Prefer more of"
                options={item.preferredOptions}
                selected={draft.customization.preferredIngredients}
                onToggle={(option, checked) =>
                  onChange({
                    ...draft,
                    customization: {
                      ...draft.customization,
                      preferredIngredients: toggle(draft.customization.preferredIngredients, option, checked),
                    },
                  })
                }
              />
              <CheckGroup
                label="Diet and preparation"
                options={item.dietaryOptions}
                selected={draft.customization.dietary}
                onToggle={(option, checked) =>
                  onChange({
                    ...draft,
                    customization: {
                      ...draft.customization,
                      dietary: toggle(draft.customization.dietary, option, checked),
                    },
                  })
                }
              />
              <CheckGroup
                label="Sauce and condiments"
                options={item.sauces}
                selected={draft.customization.sauces}
                onToggle={(option, checked) =>
                  onChange({
                    ...draft,
                    customization: {
                      ...draft.customization,
                      sauces: toggle(draft.customization.sauces, option, checked),
                    },
                  })
                }
              />

              {item.extras.length ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Add-ons</p>
                  {item.extras.map((extra) => {
                    const checked = draft.customization.extras.includes(extra.id);
                    return (
                      <label key={extra.id} className="flex items-center gap-3 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            onChange({
                              ...draft,
                              customization: {
                                ...draft.customization,
                                extras: toggle(draft.customization.extras, extra.id, value === true),
                              },
                            })
                          }
                        />
                        <span>
                          {extra.name} · {money(extra.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

            </div>
            <SheetFooter className="shrink-0 border-t border-border bg-popover">
              <Button type="button" className="h-11" onClick={onSave}>
                {draft.lineId ? "Save this dish" : "Add this dish"}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" className="size-9" onClick={() => onChange(Math.max(1, value - 1))}>
        −
      </Button>
      <span className="w-8 text-center text-sm tabular-nums">{value}</span>
      <Button type="button" variant="outline" className="size-9" onClick={() => onChange(Math.min(500, value + 1))}>
        +
      </Button>
    </div>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              value === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckGroup({
  label,
  hint,
  options,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (option: string, checked: boolean) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="grid gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 text-sm">
            <Checkbox checked={selected.includes(option)} onCheckedChange={(value) => onToggle(option, value === true)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function toggle(list: string[], value: string, checked: boolean) {
  if (checked) return list.includes(value) ? list : [...list, value];
  return list.filter((entry) => entry !== value);
}
