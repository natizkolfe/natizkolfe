import { formatWhen } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/format";
import type { Fulfillment, OrderStatus, StatusEvent } from "@/lib/types";
import { cn } from "cn";

const FLOW: OrderStatus[] = ["payment_pending", "confirmed", "preparing", "ready", "picked_up", "completed"];

export function StatusTimeline({
  history,
  fulfillment,
  status,
}: {
  history: StatusEvent[];
  fulfillment: Fulfillment;
  status: OrderStatus;
}) {
  if (status === "cancelled") {
    return (
      <div>
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">This order was cancelled.</p>
        <History history={history} />
      </div>
    );
  }
  const steps = FLOW.map((step) => (step === "picked_up" && fulfillment === "delivery" ? "delivered" : step));
  const reached = new Set(history.map((event) => event.status));
  return (
    <div>
      <ol className="grid gap-3">
        {steps.map((step, index) => {
          const done = reached.has(step);
          const current = status === step;
          return (
            <li key={step} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs",
                  done || current ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <div>
                <p className={cn("text-sm font-medium", !done && !current && "text-muted-foreground")}>
                  {STATUS_LABEL[step]}
                </p>
                {history.find((event) => event.status === step) ? (
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(history.find((event) => event.status === step)!.at)}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <History history={history} />
    </div>
  );
}

function History({ history }: { history: StatusEvent[] }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">Updates</p>
      <ul className="mt-3 grid gap-3">
        {history.map((event) => (
          <li key={`${event.status}-${event.at}`}>
            <p className="text-sm font-medium">{STATUS_LABEL[event.status]}</p>
            <p className="text-xs text-muted-foreground">{formatWhen(event.at)}</p>
            <p className="mt-1 text-sm leading-6">{event.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
