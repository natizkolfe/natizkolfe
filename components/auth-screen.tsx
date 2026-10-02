"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";

const control = "h-11 bg-card px-3";

function nextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/orders";
  return value;
}

export function AuthScreen({ mode }: { mode: "login" | "join" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const joining = mode === "join";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api(joining ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(joining ? { name, email, phone, password } : { email, password }),
      });
      await refresh();
      router.push(nextPath(params.get("next")));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
      setPending(false);
    }
  }

  return (
    <Shell className="max-w-xl">
      <PageIntro
        eyebrow={joining ? "Create an account" : "Welcome back"}
        title={joining ? "So the kitchen knows who to text." : "Sign in to your orders."}
        lede={
          joining
            ? "Your name and phone are used on the order and on the pickup text. Passwords stay on this kitchen’s server."
            : "Open an order you already placed, or pick up a draft that is waiting to be paid."
        }
      />
      <form className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-5" autoComplete="off" onSubmit={submit}>
        {joining ? (
          <>
            <Field id="name" label="Name" value={name} onChange={setName} />
            <Field id="phone" label="Phone" value={phone} onChange={setPhone} type="tel" hint="Used for the ready-for-pickup text." />
          </>
        ) : null}
        <Field id="email" label="Email" value={email} onChange={setEmail} type="email" />
        <Field id="password" label="Password" value={password} onChange={setPassword} type="password" />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? "Saving…" : joining ? "Create account" : "Sign in"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {joining ? (
            <Link href={`/login?next=${encodeURIComponent(nextPath(params.get("next")))}`} className="text-primary">
              I already have an account
            </Link>
          ) : (
            <Link href={`/join?next=${encodeURIComponent(nextPath(params.get("next")))}`} className="text-primary">
              Create an account
            </Link>
          )}
        </p>
      </form>
    </Shell>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={`gebeta-${id}`}
        className={control}
        type={type}
        value={value}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onInput={(event) => onChange(event.currentTarget.value)}
        required
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
