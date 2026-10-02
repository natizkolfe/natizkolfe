"use client";

import { KitchenSettings } from "@/components/kitchen";
import { useAuth } from "@/components/providers";

export default function AdminSettingsPage() {
  const { staff } = useAuth();
  if (!staff) return null;
  return <KitchenSettings />;
}
