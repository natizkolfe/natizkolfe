"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { ALLERGENS, DIETARY_PREFERENCES, DISLIKED_INGREDIENTS, SPICE_LABEL } from "@/lib/format";
import { emptyPreferences } from "@/lib/orders";
import type { FastingPreference, Preferences, PublicUser, SpiceLevel } from "@/lib/types";

const control = "h-11 bg-card px-3";

export function AccountForm() {
  const { user, ready, refresh } = useAuth();

  if (!ready) {
    return (
      <Shell>
        <p className="text-muted-foreground">Opening your account…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <PageIntro title="Sign in to keep preferences" lede="Allergies and spice saved here are suggested on each new dish. You can still change a single plate." />
        <Button className="mt-6 h-11 px-4" render={<Link href="/login?next=/account" />}>
          Sign in
        </Button>
      </Shell>
    );
  }

  return <AccountEditor user={user} refresh={refresh} />;
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

function AccountEditor({ user, refresh }: { user: PublicUser; refresh: () => Promise<void> }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [preferences, setPreferences] = useState<Preferences>(user.preferences ?? emptyPreferences());
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      await api("/api/account", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          phone,
          preferences,
          currentPassword,
          newPassword,
        }),
      });
      await refresh();
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Saved. New dishes will start from these preferences.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  }

  return (
    <Shell>
      <PageIntro
        eyebrow={user.email}
        title="Your table preferences"
        lede="These travel into each new dish as a starting point. A kitfo order still asks its own questions, and a salad will not ask about berbere."
      />
      <form className="mt-8 grid gap-8 lg:grid-cols-2" onSubmit={save}>
        <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl">Contact</h2>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" className={control} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" className={control} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Usual table</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["fasting", "Fasting"],
                  ["non_fasting", "Non-fasting"],
                  ["mixed", "Mixed"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, fastingPreference: value as FastingPreference })}
                  className={`h-10 rounded-md border text-sm ${
                    preferences.fastingPreference === value ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Usual spice, when a dish allows it</Label>
            <div className="flex flex-wrap gap-2">
              {(["none", "mild", "medium", "hot", "extra"] as SpiceLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, spiceLevel: level })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    preferences.spiceLevel === level ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {SPICE_LABEL[level]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Standing note</Label>
            <Textarea
              id="notes"
              value={preferences.notes}
              onChange={(event) => setPreferences({ ...preferences, notes: event.target.value })}
            />
          </div>
          <h2 className="font-display text-2xl">Password</h2>
          <Input
            className={control}
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            className={control}
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </section>
        <section className="grid gap-5 rounded-xl border border-border bg-card p-5">
          <CheckList
            title="Allergies"
            options={[...ALLERGENS]}
            selected={preferences.allergens}
            onToggle={(value) => setPreferences({ ...preferences, allergens: toggle(preferences.allergens, value) })}
          />
          <CheckList
            title="Ingredients you do not eat"
            options={[...DISLIKED_INGREDIENTS]}
            selected={preferences.dislikedIngredients}
            onToggle={(value) =>
              setPreferences({ ...preferences, dislikedIngredients: toggle(preferences.dislikedIngredients, value) })
            }
          />
          <CheckList
            title="Dietary notes"
            options={[...DIETARY_PREFERENCES]}
            selected={preferences.dietary}
            onToggle={(value) => setPreferences({ ...preferences, dietary: toggle(preferences.dietary, value) })}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-gomen">{message}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="h-11 px-4" disabled={pending}>
              {pending ? "Saving…" : "Save preferences"}
            </Button>
            <Button type="button" variant="outline" className="h-11 bg-background px-4" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </section>
      </form>
    </Shell>
  );
}

function CheckList({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 text-sm">
            <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}
