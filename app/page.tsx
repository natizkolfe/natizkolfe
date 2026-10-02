import Link from "next/link";
import { PlatterArt } from "@/components/mark";
import { PackageBoard } from "@/components/package-board";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { publicSettings } from "@/lib/orders";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Service", "Weekly meal preparation, or catering for a set number of guests."],
  ["Table", "Fasting or non-fasting. That chooses the standard package."],
  ["Package", "The standard dishes are already included. You do not add them one by one."],
  ["Add-ons", "Optional dishes stay closed until you ask for them, and each has its own charge."],
  ["Preferences", "Spice, allergies, and a note for the kitchen."],
  ["Pay", "Nothing is cooked until the card clears."],
];

export default function HomePage() {
  const db = readDb();
  const settings = publicSettings(db.settings);
  const prices = Object.fromEntries(db.menu.filter((item) => item.available).map((item) => [item.id, item.price]));

  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.2em] text-primary uppercase">Ethiopian catering kitchen</p>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] text-balance sm:text-7xl">
            Order the week. Or the whole table.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Gebeta cooks complete fasting and non-fasting packages for the week, or for the table. The standard dishes are already included. Add only the extras you want.
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

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs tracking-[0.16em] text-primary uppercase">01</p>
          <h2 className="mt-2 font-display text-4xl">Meal preparation</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            Seven or fourteen days of the standard package. Choose fasting or non-fasting, then add extra dishes only if the week needs them.
          </p>
          <Button className="mt-6 h-10 px-3" variant="secondary" render={<Link href="/order?kind=weekly" />}>
            Start a week
          </Button>
        </article>
        <article className="rounded-2xl border border-border bg-[#2A1814] p-6 text-[#F6EFE4]">
          <p className="text-xs tracking-[0.16em] text-[#E7D3A1] uppercase">02</p>
          <h2 className="mt-2 font-display text-4xl">Catering by the guest</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-[#E7D7C8]">
            Tell us how many people are eating. The fasting or non-fasting package is portioned for that table, and extra dishes are optional.
          </p>
          <Button className="mt-6 h-10 bg-[#F6EFE4] px-3 text-[#2A1814] hover:bg-white" render={<Link href="/order?kind=catering" />}>
            Count the table
          </Button>
        </article>
      </section>

      <section id="packages" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-4xl">Choose a package</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Gebeta sells the meal, not a list of dishes to assemble. The checked foods come with the package. Extra meals stay hidden until you open them.
        </p>
        <PackageBoard prices={prices} />
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
          <h2 className="font-display text-4xl">Fasting, kept separate</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            On fasting days, Ethiopian Orthodox cooking sets meat and dairy aside. The fasting package is built that way from the start. The non-fasting package is a separate table, not a dish you mix in one by one.
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
