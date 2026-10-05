import { CARE_FIELDS } from "@/lib/care";
import type { PublicCare } from "@/lib/care";

const MARK: Partial<Record<(typeof CARE_FIELDS)[number]["key"], string>> = {
  storage: "🧊",
  serving: "🥄",
  reheating: "🔥",
  notes: "📅",
};

export function CarePageView({ care }: { care: PublicCare }) {
  return (
    <article className="mx-auto w-full max-w-lg px-5 py-8">
      <img src="/gebeta-logo.png" alt="Gebeta" className="h-14 w-auto rounded-xl" />
      <h1 className="mt-6 font-display text-4xl leading-tight">Food Care & Storage Instructions</h1>
      <p className="mt-3 text-sm text-muted-foreground">Order: {care.orderNumber}</p>
      {care.placeholder ? (
        <p className="mt-4 rounded-xl border border-amber-700/30 bg-amber-100 px-4 py-3 text-sm leading-6 text-amber-950">
          DRAFT / PLACEHOLDER – NOT FINAL. These notes are for testing this page. Gebeta will replace them with approved storage and reheating instructions before launch.
        </p>
      ) : null}
      <div className="mt-8 grid gap-10">
        {care.foods.map((food) => (
          <section key={food.foodId}>
            <h2 className="font-display text-3xl">{food.name}</h2>
            <div className="mt-4 grid gap-5">
              {CARE_FIELDS.map((field) => {
                const text = food.sections[field.key].trim();
                if (!text) return null;
                const mark = MARK[field.key];
                return (
                  <div key={field.key}>
                    <h3 className="text-base font-medium">
                      {mark ? <span className="mr-1">{mark}</span> : null}
                      {field.customer}
                    </h3>
                    {text.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={`${field.key}-${index}`} className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">Instruction version {care.version}</p>
      <p className="mt-6 font-medium">Thank you for choosing Gebeta.</p>
    </article>
  );
}

export function CareUnavailable({ message }: { message: string }) {
  return (
    <article className="mx-auto w-full max-w-lg px-5 py-10">
      <img src="/gebeta-logo.png" alt="Gebeta" className="h-14 w-auto rounded-xl" />
      <h1 className="mt-6 font-display text-4xl">Food care</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
    </article>
  );
}
