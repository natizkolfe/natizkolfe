import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { FastingPreference } from "@/lib/types";

const PACKAGES: { id: FastingPreference; title: string; detail: string }[] = [
  {
    id: "fasting",
    title: "Fasting",
    detail: "Traditional Ethiopian fasting selections.",
  },
  {
    id: "non_fasting",
    title: "Non-Fasting",
    detail: "Traditional Ethiopian non-fasting selections.",
  },
  {
    id: "mixed",
    title: "Mixed Order",
    detail: "Choose a combination of fasting and non-fasting foods.",
  },
];

export function PackageBoard() {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {PACKAGES.map((pkg) => (
        <article key={pkg.id} className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-4xl">{pkg.title}</h3>
          <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{pkg.detail}</p>
          <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
            <Button className="h-10 rounded-lg px-3" render={<Link href={`/order?kind=weekly&table=${pkg.id}`} />}>
              Weekly Meal
            </Button>
            <Button variant="outline" className="h-10 rounded-lg bg-background px-3" render={<Link href={`/order?kind=catering&table=${pkg.id}`} />}>
              Catering
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
