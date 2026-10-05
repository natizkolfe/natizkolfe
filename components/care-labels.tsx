"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { careLabels, type CareLabel } from "@/lib/care";
import type { OrderRecord } from "@/lib/types";

export function CareLabels({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;
    api<{ order: OrderRecord }>(`/api/admin/orders/${orderId}/care`, { method: "POST" })
      .then((data) => {
        if (!ignore) setOrder(data.order);
      })
      .catch((reason: Error) => {
        if (!ignore) setError(reason.message);
      });
    return () => {
      ignore = true;
    };
  }, [orderId]);

  const labels = order ? careLabels(order) : [];
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const orderPath = order?.careToken ? `/care/${order.careToken}` : "";
  const labelKey = labels.map((label) => label.path).join("|");

  useEffect(() => {
    if (!orderPath || !labelKey) return;
    let ignore = false;
    const paths = [orderPath, ...labelKey.split("|")];
    import("qrcode").then(async (QR) => {
      const entries = await Promise.all(
        [...new Set(paths)].map(async (path) => [path, await QR.toDataURL(`${origin}${path}`, { margin: 1, width: 280 })] as const),
      );
      if (!ignore) setCodes(Object.fromEntries(entries));
    });
    return () => {
      ignore = true;
    };
  }, [orderPath, origin, labelKey]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!order) return <p className="text-muted-foreground">Preparing labels…</p>;

  const stickers: { key: string; title: string; size: string | null; path: string; caption?: string }[] = [
    {
      key: "order",
      title: "This order",
      size: null,
      path: orderPath,
      caption: labels.map((label) => label.name).join(" · "),
    },
    ...labels.flatMap((label) => copies(label)),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <Link href={`/admin/orders/${order.id}`} className="text-sm text-primary">
            Back to {order.number}
          </Link>
          <h1 className="mt-2 font-display text-4xl">Print labels</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Each dish gets one QR code. Weekly prints that code once. Catering prints the same code once for each guest. A full-order sticker is included. The instruction text stays off the sticker.
            {order.care ? ` Instruction version ${order.care.version}.` : ""}
          </p>
          {order.care?.placeholder ? (
            <p className="mt-3 max-w-xl text-sm text-amber-900">
              DRAFT / PLACEHOLDER – NOT FINAL. The words behind these codes are still the test instructions.
            </p>
          ) : null}
        </div>
        <Button type="button" className="h-11 px-4" onClick={() => window.print()}>
          Print Labels
        </Button>
      </div>
      {labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">None of the foods on this order have active care instructions yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4 print:block">
          {stickers.map((sticker) => (
            <article
              key={sticker.key}
              className="flex w-[3in] break-inside-avoid flex-col items-center rounded-[28px] border border-border bg-white px-4 py-4 text-center text-black print:mb-4"
            >
              <img src="/gebeta-logo.png" alt="Gebeta" className="h-10 w-auto rounded-[28px]" />
              <h2 className="mt-3 font-display text-2xl tracking-wide uppercase">{sticker.title}</h2>
              {sticker.size ? <p className="mt-1 text-sm font-medium">{sticker.size}</p> : null}
              {sticker.caption ? <p className="mt-1 text-xs leading-5">{sticker.caption}</p> : null}
              {codes[sticker.path] ? (
                <img src={codes[sticker.path]} alt="QR code for storage and reheating instructions" className="mt-3 size-36" />
              ) : (
                <div className="mt-3 size-36 bg-muted" />
              )}
              <p className="mt-3 text-xs font-medium tracking-wide">Scan for Storage & Reheating Instructions</p>
              <p className="mt-2 text-xs">Order: {order.number}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function copies(label: CareLabel) {
  return Array.from({ length: label.quantity }, (_, index) => ({
    key: `${label.foodId}-${index}`,
    title: label.name,
    size: label.size,
    path: label.path,
  }));
}
