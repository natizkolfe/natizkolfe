import { Suspense } from "react";
import { PackageBuilder } from "@/components/package-builder";

export default function OrderMenuPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-muted-foreground">Opening your package…</p>}>
      <PackageBuilder />
    </Suspense>
  );
}
