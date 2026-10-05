"use client";

import { usePathname } from "next/navigation";

export function HideOnCare({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/care")) return null;
  return children;
}
