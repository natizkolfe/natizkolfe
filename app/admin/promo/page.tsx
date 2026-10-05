"use client";

import { PromoAdmin } from "@/components/promo-admin";
import { useAuth } from "@/components/providers";

export default function AdminPromoPage() {
  const { staff } = useAuth();
  if (!staff) return null;
  return <PromoAdmin />;
}
