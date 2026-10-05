"use client";

import { CareAdmin } from "@/components/care-admin";
import { useAuth } from "@/components/providers";

export default function AdminCarePage() {
  const { staff } = useAuth();
  if (!staff) return null;
  return <CareAdmin />;
}
