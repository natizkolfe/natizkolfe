"use client";

import { KitchenFrame } from "@/components/kitchen";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <KitchenFrame>{children}</KitchenFrame>;
}
