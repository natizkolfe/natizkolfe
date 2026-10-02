"use client";

import { KitchenBoard } from "@/components/kitchen";
import { useAuth } from "@/components/providers";

export default function AdminPage() {
  const { staff } = useAuth();
  if (!staff) return null;
  return <KitchenBoard />;
}
