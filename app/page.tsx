import Link from "next/link";
import { PlatterArt } from "@/components/mark";
import { PackageBoard } from "@/components/package-board";
import { WeeklyContainer } from "@/components/weekly-container";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { publicSettings } from "@/lib/orders";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Service", "Weekly meal preparation, or catering for a set number of guests."],
  ["Table", "Fasting, non-fasting, or a mixed order."],
  ["Package", "Weekly meals are the ones you check. Catering includes the standard dishes for every guest."],
  ["Add-ons", "Optional dishes stay closed until you ask for them, and each has its own charge."],
  ["Preferences", "Spice, allergies, and a note for the kitchen."],
  ["Pay", "Nothing is cooked until the card clears."],
];

export default function HomePage() {
  const settings = publicSettings(readDb().settings);

  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.2em] text-primary uppercase">Ethiopian catering kitchen</p>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] text-balance sm:text-7xl">
            Order the week. Or the whole table.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Gebeta cooks weekly meals you choose, or catering for the table. Pick fasting, non-fasting, or a mix. Add only the extras you want.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button className="h-11 px-4" render={<Link href="/order?kind=weekly" />}>
              Plan weekly meals
            </Button>
            <Button variant="outline" className="h-11 bg-card px-4" render={<Link href="/order?kind=catering" />}>
              Cater a gathering
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Earliest weekly start is {formatDate(settings.earliestWeeklyDate)}. Earliest catering date is{" "}
            {formatDate(settings.earliestCateringDate)}.
          </p>
        </div>
        <PlatterArt className="mx-auto w-full max-w-md" />
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-start gap-4 px-4 sm:px-6 md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
        <article className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs tracking-[0.16em] text-primary uppercase">01</p>
          <h2 className="mt-2 font-display text-4xl">Meal preparation</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            A one-week order uses a 24 oz round container. A two-week order uses a 28 oz square container. You choose the meals that go in them.
          </p>
          <div className="mt-5 grid grid-cols-2 items-stretch gap-3">
            <div className="h-full rounded-xl border border-border bg-background p-3">
              <WeeklyContainer days={7} />
            </div>
            <div className="h-full rounded-xl border border-border bg-background p-3">
              <WeeklyContainer days={14} />
            </div>
          </div>
          <Button className="mt-6 h-10 px-3" variant="secondary" render={<Link href="/order?kind=weekly" />}>
            Start a week
          </Button>
        </article>
        <article className="rounded-2xl border border-border bg-[#2A1814] p-6 text-[#F6EFE4]">
          <p className="text-xs tracking-[0.16em] text-[#E7D3A1] uppercase">02</p>
          <h2 className="mt-2 font-display text-4xl text-balance">Catering by the guest</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-[#E7D7C8]">
            The standard meal starts at $21 per person. Tell us how many people are eating, then add extras at their own per-person price.
          </p>
          <Button className="mt-6 h-10 bg-[#F6EFE4] px-3 text-[#2A1814] hover:bg-white" render={<Link href="/order?kind=catering" />}>
            Count the table
          </Button>
        </article>
      </section>

      <section id="packages" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-4xl">Choose your meal style</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Pick fasting, non-fasting, or a mix, then continue to weekly meals or catering. The meals, containers, and add-ons are chosen on the order page.
        </p>
        <PackageBoard />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-4xl">From the package to the door</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([title, detail], index) => (
            <li key={title} className="border-t border-border pt-4">
              <p className="text-xs text-primary">{String(index + 1).padStart(2, "0")}</p>
              <p className="mt-1 font-display text-2xl">{title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-4xl">Fasting, non-fasting, or both</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            On fasting days, Ethiopian Orthodox cooking sets meat and dairy aside. Weekly orders let you check fasting meals, non-fasting meals, or both. Catering starts with recommended foods you can change, and extras can raise the starting price per person.
          </p>
        </div>
        <div>
          <h2 className="font-display text-4xl">What the kitchen asks</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            After the package is set, tell the kitchen about spice, allergies, and anything to leave out. Those preferences sit on the package. A single included dish can still be adjusted before you pay.
          </p>
        </div>
      </section>
    </div>
  );
}
