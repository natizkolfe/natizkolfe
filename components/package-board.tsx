"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MixedPackagePanel } from "@/components/mixed-package-panel";
import { PackagePanel } from "@/components/package-panel";
import { Button } from "@/components/ui/button";
import { MEAL_PACKAGES, readAddonMemory, readIncludedMemory } from "@/lib/packages";

const EMPTY = { fasting: [] as string[], non_fasting: [] as string[], mixed: [] as string[] };

export function PackageBoard() {
  const [selected, setSelected] = useState(EMPTY);
  const [included, setIncluded] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSelected(readAddonMemory());
    setIncluded(readIncludedMemory());
    setReady(true);
  }, []);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {(["fasting", "non_fasting"] as const).map((id) => (
        <PackagePanel
          key={`${id}-${ready}`}
          pkg={MEAL_PACKAGES[id]}
          billing="catering"
          selectedAddonIds={ready ? selected[id] : []}
          onSelectedAddonIds={(ids) => setSelected((current) => ({ ...current, [id]: ids }))}
          servingNote="One serving of each included dish. You do not add these yourself."
          actions={
            <>
              <Button className="h-10 px-3" render={<Link href={`/order?kind=weekly&table=${id}`} />}>
                Weekly meals
              </Button>
              <Button variant="outline" className="h-10 bg-background px-3" render={<Link href={`/order?kind=catering&table=${id}`} />}>
                Catering
              </Button>
            </>
          }
        />
      ))}
      <div className="lg:col-span-2">
        <MixedPackagePanel
          key={`mixed-${ready}`}
          billing="catering"
          selectedIncludedIds={ready ? included : []}
          onSelectedIncludedIds={setIncluded}
          selectedAddonIds={ready ? selected.mixed : []}
          onSelectedAddonIds={(ids) => setSelected((current) => ({ ...current, mixed: ids }))}
          servingNote="Choose up to four standard dishes from either table. The $21 price does not change. Further dishes are add-ons."
          actions={
            <>
              <Button className="h-10 px-3" render={<Link href="/order?kind=weekly&table=mixed" />}>
                Weekly meals
              </Button>
              <Button variant="outline" className="h-10 bg-background px-3" render={<Link href="/order?kind=catering&table=mixed" />}>
                Catering
              </Button>
            </>
          }
        />
      </div>
    </div>
  );
}
