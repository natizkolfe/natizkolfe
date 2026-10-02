"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackagePanel } from "@/components/package-panel";
import { Button } from "@/components/ui/button";
import { MEAL_PACKAGES, readAddonMemory } from "@/lib/packages";

const EMPTY = { fasting: [] as string[], non_fasting: [] as string[] };

export function PackageBoard({ prices }: { prices: Record<string, number> }) {
  const [selected, setSelected] = useState(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSelected(readAddonMemory());
    setReady(true);
  }, []);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {(["fasting", "non_fasting"] as const).map((id) => (
        <PackagePanel
          key={`${id}-${ready}`}
          pkg={MEAL_PACKAGES[id]}
          prices={prices}
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
    </div>
  );
}
