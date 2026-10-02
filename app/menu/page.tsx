import Link from "next/link";
import { DishSwatch } from "@/components/mark";
import { PageIntro, Shell } from "@/components/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, money } from "@/lib/format";
import type { MenuCategory } from "@/lib/types";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const ORDER: MenuCategory[] = ["platter", "stew", "salad", "side", "condiment"];

export default function MenuPage() {
  const menu = readDb().menu.filter((item) => item.available);

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageIntro
          eyebrow="Menu"
          title="A standard Ethiopian board, with room to change it."
          lede="Prices are per serving. Catering quantities follow your guest count. Weekly meals are one serving at a time, placed on a day."
        />
        <Button className="h-11 px-4" render={<Link href="/order" />}>
          Start an order
        </Button>
      </div>
      <div className="mt-10 grid gap-12">
        {ORDER.map((category) => {
          const items = menu.filter((item) => item.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="font-display text-3xl">{CATEGORY_LABEL[category]}</h2>
              <div className="mt-4 grid gap-3">
                {items.map((item) => (
                  <article id={item.id} key={item.id} className="flex scroll-mt-24 gap-4 rounded-xl border border-border bg-card p-4">
                    <DishSwatch color={item.swatch} name={item.name} />
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <h3 className="font-display text-2xl leading-none">{item.name}</h3>
                        <span className="text-sm text-muted-foreground">{item.amharic}</span>
                        <span className="text-sm">{money(item.price)}</span>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{item.fasting ? "Fasting" : "Non-fasting"}</Badge>
                        {item.canChooseFastingStyle ? <Badge variant="outline">Oil or niter kibbeh</Badge> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
