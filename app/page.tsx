import Link from "next/link";
import { DishSwatch, PlatterArt } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { money } from "@/lib/format";
import { publicSettings } from "@/lib/orders";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Menu", "Pick fasting or non-fasting dishes, platters, salads, and sides."],
  ["Customize", "Spice, allergies, and notes belong to one dish, not the whole order."],
  ["Review", "Check quantities, dates, and the kitchen’s reading of each plate."],
  ["Pay", "The order is not confirmed until the card clears."],
  ["Prepare", "The kitchen cooks only what has been paid."],
  ["Collect", "A text arrives with a code when the food is ready."],
];

export default function HomePage() {
  const db = readDb();
  const settings = publicSettings(db.settings);
  const featured = db.menu.filter((item) => item.featured && item.available).slice(0, 4);

  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.2em] text-primary uppercase">Ethiopian catering kitchen</p>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] text-balance sm:text-7xl">
            Order the week. Or the whole table.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Gebeta prepares fasting and non-fasting Ethiopian food to order. Weekly meals run one or two weeks. Catering is priced by the number of guests. Each dish can be changed on its own.
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
            Seven or fourteen days of lunches and dinners. Repeat a day across the week, or build each plate differently. Spice, allergies, and sides stay with the dish you set them on.
          </p>
          <Button className="mt-6 h-10 px-3" variant="secondary" render={<Link href="/order?kind=weekly" />}>
            Start a week
          </Button>
        </article>
        <article className="rounded-2xl border border-border bg-[#2A1814] p-6 text-[#F6EFE4]">
          <p className="text-xs tracking-[0.16em] text-[#E7D3A1] uppercase">02</p>
          <h2 className="mt-2 font-display text-4xl">Catering by the guest</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-[#E7D7C8]">
            Tell us how many people are eating. Portions start from that number — two injera each, stews by the headcount — and you can still pull a stew off one platter.
          </p>
          <Button className="mt-6 h-10 bg-[#F6EFE4] px-3 text-[#2A1814] hover:bg-white" render={<Link href="/order?kind=catering" />}>
            Count the table
          </Button>
        </article>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-4xl">From the menu to the door</h2>
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

      <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">On the board</h2>
          <Link href="/menu" className="text-sm text-primary">
            Full menu
          </Link>
        </div>
        <div className="mt-6 grid gap-3">
          {featured.map((item) => (
            <Link key={item.id} href={`/menu#${item.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <DishSwatch color={item.swatch} name={item.name} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl leading-none">{item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.amharic}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
              <p className="text-sm">{money(item.price)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-4xl">Fasting, kept separate</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            On fasting days, Ethiopian Orthodox cooking sets meat and dairy aside. Gebeta marks those dishes, and a few stews can be finished either with oil or with niter kibbeh. The choice is stored on that line, so the rest of the table can be different.
          </p>
        </div>
        <div>
          <h2 className="font-display text-4xl">What the kitchen asks</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Allergies, ingredients to leave out, spice, salad finish, sauce, and a note for the cook. Kitfo asks how cooked you want it, and it will not arrive raw unless you choose tire. Injera can be requested teff-only. A condiment does not ask you about doneness.
          </p>
        </div>
      </section>
    </div>
  );
}
