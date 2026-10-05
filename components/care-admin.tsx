"use client";

import { useEffect, useMemo, useState } from "react";
import { CarePageView } from "@/components/care-page";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { CARE_FIELDS, EMPTY_CARE_SECTIONS, resolveOrderCare } from "@/lib/care";
import type { CareInstruction, CareSections, OrderKind } from "@/lib/types";

type MenuChoice = { id: string; name: string };

const blank = (): CareInstruction => ({
  id: "",
  kind: "template",
  name: "",
  foodIds: [],
  category: "",
  service: "",
  durationDays: null,
  templateId: null,
  sections: EMPTY_CARE_SECTIONS(),
  active: true,
  version: 1,
  placeholder: true,
  updatedAt: "",
});

export function CareAdmin() {
  const [instructions, setInstructions] = useState<CareInstruction[] | null>(null);
  const [menu, setMenu] = useState<MenuChoice[]>([]);
  const [draft, setDraft] = useState<CareInstruction>(blank());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [previewFood, setPreviewFood] = useState("");
  const [previewKind, setPreviewKind] = useState<OrderKind>("weekly");
  const [previewDays, setPreviewDays] = useState<7 | 14>(7);

  function load() {
    return api<{ instructions: CareInstruction[]; menu: MenuChoice[] }>("/api/admin/care")
      .then((data) => {
        setInstructions(data.instructions);
        setMenu(data.menu);
        setPreviewFood((current) => current || data.menu[0]?.id || "");
      })
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    void load();
  }, []);

  const names = useMemo(() => new Map(menu.map((item) => [item.id, item.name])), [menu]);
  const templates = (instructions ?? []).filter((entry) => entry.kind === "template");
  const preview = useMemo(() => {
    if (!instructions || !previewFood) return null;
    const foods = resolveOrderCare(instructions, {
      kind: previewKind,
      durationDays: previewKind === "weekly" ? previewDays : null,
      lines: [{ itemId: previewFood, name: names.get(previewFood) ?? previewFood }],
    });
    if (foods.length === 0) return null;
    return {
      orderNumber: "Preview",
      version: `1.${Math.max(...foods.flatMap((food) => food.sources.map((source) => source.version)))}`,
      placeholder: foods.some((food) => food.placeholder),
      foods: foods.map((food) => ({ foodId: food.foodId, name: food.name, sections: food.sections })),
    };
  }, [instructions, previewFood, previewKind, previewDays, names]);

  function updateSection(key: keyof CareSections, value: string) {
    setDraft((current) => ({ ...current, sections: { ...current.sections, [key]: value } }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const body = {
      kind: draft.kind,
      name: draft.name,
      foodIds: draft.foodIds,
      category: draft.category,
      service: draft.service,
      durationDays: draft.durationDays,
      templateId: draft.templateId,
      sections: draft.sections,
      active: draft.active,
      placeholder: draft.placeholder,
    };
    try {
      if (draft.id) {
        await api(`/api/admin/care/${draft.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/admin/care", { method: "POST", body: JSON.stringify(body) });
      }
      setDraft(blank());
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The instruction could not be saved.");
    } finally {
      setPending(false);
    }
  }

  async function toggle(instruction: CareInstruction) {
    setError("");
    try {
      await api(`/api/admin/care/${instruction.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !instruction.active }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The instruction could not be updated.");
    }
  }

  if (!instructions) return <p className="text-muted-foreground">{error || "Loading food instructions…"}</p>;

  return (
    <div>
      <PageIntro
        title="Food instructions"
        lede="DRAFT / PLACEHOLDER – NOT FINAL. Edit storage, serving, and reheating text here. Stickers carry a QR code, not the instruction wording."
      />
      <form className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5" onSubmit={save}>
        <p className="font-medium">{draft.id ? `Edit ${draft.name}` : "New instruction"}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Instruction name">
            <Input className="h-11 bg-background px-3" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Food category">
            <Input className="h-11 bg-background px-3" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          </Field>
          <Field label="Type">
            <select
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              value={draft.kind}
              onChange={(event) => setDraft({ ...draft, kind: event.target.value === "override" ? "override" : "template" })}
            >
              <option value="template">Shared template</option>
              <option value="override">Food-specific override</option>
            </select>
          </Field>
          <Field label="Service">
            <select
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              value={draft.service}
              onChange={(event) => {
                const service = event.target.value === "weekly" || event.target.value === "catering" ? event.target.value : "";
                setDraft({ ...draft, service, durationDays: service === "catering" ? null : draft.durationDays });
              }}
            >
              <option value="">Any service</option>
              <option value="weekly">Weekly meal</option>
              <option value="catering">Catering</option>
            </select>
          </Field>
          <Field label="Weekly duration">
            <select
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              value={draft.durationDays ?? ""}
              disabled={draft.service === "catering"}
              onChange={(event) => {
                const value = event.target.value;
                setDraft({ ...draft, durationDays: value === "14" ? 14 : value === "7" ? 7 : null });
              }}
            >
              <option value="">Any length</option>
              <option value="7">1 week</option>
              <option value="14">2 weeks</option>
            </select>
          </Field>
          {draft.kind === "override" ? (
            <Field label="Extends template">
              <select
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
                value={draft.templateId ?? ""}
                onChange={(event) => setDraft({ ...draft, templateId: event.target.value || null })}
              >
                <option value="">None</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Foods</legend>
          <div className="mt-2 grid max-h-48 gap-2 overflow-auto sm:grid-cols-2">
            {menu.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.foodIds.includes(item.id)}
                  onChange={() => {
                    const foodIds = draft.foodIds.includes(item.id)
                      ? draft.foodIds.filter((id) => id !== item.id)
                      : [...draft.foodIds, item.id];
                    setDraft({ ...draft, foodIds });
                  }}
                />
                {item.name}
              </label>
            ))}
          </div>
        </fieldset>
        {CARE_FIELDS.map((field) => (
          <Field key={field.key} label={field.label}>
            <Textarea
              className="min-h-24 bg-background px-3 py-2"
              value={draft.sections[field.key]}
              onChange={(event) => updateSection(field.key, event.target.value)}
            />
          </Field>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.placeholder}
            onChange={(event) => setDraft({ ...draft, placeholder: event.target.checked })}
          />
          DRAFT / PLACEHOLDER – NOT FINAL
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" className="h-11 px-4" disabled={pending}>
            {pending ? "Saving…" : draft.id ? "Save changes" : "Create"}
          </Button>
          {draft.id ? (
            <Button type="button" variant="outline" className="h-11 bg-background" onClick={() => setDraft(blank())}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      <section className="mt-8">
        <h2 className="font-display text-3xl">Preview</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={previewFood} onChange={(event) => setPreviewFood(event.target.value)}>
            {menu.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            value={previewKind}
            onChange={(event) => setPreviewKind(event.target.value === "catering" ? "catering" : "weekly")}
          >
            <option value="weekly">Weekly meal</option>
            <option value="catering">Catering</option>
          </select>
          {previewKind === "weekly" ? (
            <select
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              value={previewDays}
              onChange={(event) => setPreviewDays(event.target.value === "14" ? 14 : 7)}
            >
              <option value="7">1 week</option>
              <option value="14">2 weeks</option>
            </select>
          ) : null}
        </div>
        <div className="mt-4 max-w-lg rounded-2xl border border-border">
          {preview ? <CarePageView care={preview} /> : <p className="p-5 text-sm text-muted-foreground">No active instructions for this food.</p>}
        </div>
      </section>

      <ul className="mt-8 grid gap-3">
        {instructions.map((instruction) => (
          <li key={instruction.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{instruction.name}</p>
              <p className="text-sm text-muted-foreground">
                {instruction.active ? "Active" : "Inactive"} · version {instruction.version}
                {instruction.placeholder ? " · DRAFT / PLACEHOLDER – NOT FINAL" : ""}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {instruction.kind === "template" ? "Template" : "Override"}
              {instruction.category ? ` · ${instruction.category}` : ""}
              {" · "}
              {instruction.service === "weekly" ? "Weekly" : instruction.service === "catering" ? "Catering" : "Any service"}
              {instruction.durationDays === 14 ? " · 2 weeks" : instruction.durationDays === 7 ? " · 1 week" : ""}
            </p>
            <p className="mt-1 text-sm">{instruction.foodIds.map((id) => names.get(id) ?? id).join(", ")}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" className="h-9 bg-background" onClick={() => setDraft(instruction)}>
                Edit
              </Button>
              <Button type="button" variant="outline" className="h-9 bg-background" onClick={() => toggle(instruction)}>
                {instruction.active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
