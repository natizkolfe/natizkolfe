"use client";

import { ThemeProvider } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import type { OrderDraft, PublicUser } from "@/lib/types";

const DRAFT_KEY = "gebeta-draft-v1";

type AuthValue = {
  user: PublicUser | null;
  staff: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
};

type DraftValue = {
  draft: OrderDraft | null;
  hydrated: boolean;
  setDraft: (next: OrderDraft | null | ((current: OrderDraft | null) => OrderDraft | null)) => void;
  clearDraft: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);
const DraftContext = createContext<DraftValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth is unavailable.");
  return value;
}

export function useDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error("The order draft is unavailable.");
  return value;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [staff, setStaff] = useState(false);
  const [ready, setReady] = useState(false);
  const [draft, setDraftState] = useState<OrderDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/me");
    const data = (await response.json()) as { user: PublicUser | null; staff: boolean };
    setUser(data.user);
    setStaff(Boolean(data.staff));
    setReady(true);
  }, []);

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) setDraftState(JSON.parse(raw) as OrderDraft);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
      setHydrated(true);
    });
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user: PublicUser | null; staff: boolean }) => {
        if (ignore) return;
        setUser(data.user);
        setStaff(Boolean(data.staff));
        setReady(true);
      })
      .catch(() => {
        if (!ignore) setReady(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const setDraft = useCallback((next: OrderDraft | null | ((current: OrderDraft | null) => OrderDraft | null)) => {
    setDraftState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (value) localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      else localStorage.removeItem(DRAFT_KEY);
      return value;
    });
  }, []);

  const clearDraft = useCallback(() => setDraft(null), [setDraft]);

  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
      <AuthContext.Provider value={{ user, staff, ready, refresh }}>
        <DraftContext.Provider value={{ draft, hydrated, setDraft, clearDraft }}>
          {children}
          <Toaster position="top-center" />
        </DraftContext.Provider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
