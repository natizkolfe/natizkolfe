"use client";

import { KitchenMenu } from "@/components/kitchen";
import { useAuth } from "@/components/providers";

export default function AdminMenuPage() {
  const { staff } = useAuth();
  if (!staff) return null;
  return <KitchenMenu />;
}
