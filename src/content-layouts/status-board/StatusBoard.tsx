import { useId } from "react";
import { Badge, Card, DensityProvider, EmptyState, Link, ScrollArea, Stack, Text, VisuallyHidden } from "../../catalog";
import { formatMoney, invoiceHref, statusLabel, type Invoice, type InvoiceStatus } from "../../flows/invoice-approval";

/**
 * Status-board content layout. Columns of invoice cards for the Tracking
 * route. This module is product-owned glue. There is no board export in
 * `@tounsoo/todae`. The invoice number is a link. The card is not.
 *
 * Aging is measured from the sample ledger's as-of date so the board does not
 * depend on the clock. https://todae.omsoo.design/card
 */

const LEDGER_AS_OF = "2026-11-10";
const DUE_SOON_DAYS = 7;

const columns = [
  {
    status: "pending",
    hint: "To approve",
    empty: "Nothing is waiting for review.",
  },
  {
    status: "changes-requested",
    hint: "With the vendor",
    empty: "No invoices are waiting on a vendor.",
  },
  {
    status: "approved",
    hint: "Accepted",
    empty: "No invoices have been approved.",
  },
] as const satisfies readonly {
  readonly status: InvoiceStatus;
  readonly hint: string;
  readonly empty: string;
}[];

function daysUntilDue(dueOn: string): number {
  const due = Date.parse(`${dueOn}T00:00:00Z`);
  const today = Date.parse(`${LEDGER_AS_OF}T00:00:00Z`);
  return Math.round((due - today) / 86_400_000);
}

function aging(invoice: Invoice): { label: string; tone: "critical" | "warning" } | null {
  if (invoice.status === "approved") return null;
  const days = daysUntilDue(invoice.dueOn);
  if (days < 0) {
    const count = Math.abs(days);
    return { label: `${count} ${count === 1 ? "day" : "days"} overdue`, tone: "critical" };
  }
  if (days === 0) return { label: "Due today", tone: "warning" };
  if (days <= DUE_SOON_DAYS) return { label: days === 1 ? "Due in 1 day" : `Due in ${days} days`, tone: "warning" };
  return null;
}

function byDueDate(invoices: readonly Invoice[]): Invoice[] {
  return [...invoices].sort((left, right) => left.dueOn.localeCompare(right.dueOn) || left.number.localeCompare(right.number));
}

function TrackingColumn({
  hint,
  empty,
  status,
  invoices,
  onOpen,
}: {
  hint: string;
  empty: string;
  status: InvoiceStatus;
  invoices: readonly Invoice[];
  onOpen: (invoiceId: string) => void;
}) {
  const headingId = useId();
  const label = statusLabel[status];
  const cards = byDueDate(invoices);
  return (
    <Stack.Root aria-labelledby={headingId} as="section" className="tracking-column" gap="condensed">
      <Stack.Root gap="none">
        <Stack.Root align="baseline" direction="row" justify="between">
          <Text.Root as="h2" id={headingId}>
            {label}
          </Text.Root>
          <Text.Root tone="muted">
            {cards.length}
            <VisuallyHidden.Root>{cards.length === 1 ? " invoice" : " invoices"}</VisuallyHidden.Root>
          </Text.Root>
        </Stack.Root>
        <Text.Root tone="muted">{hint}</Text.Root>
      </Stack.Root>
      {cards.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Title as="h3">No invoices</EmptyState.Title>
          <EmptyState.Description>{empty}</EmptyState.Description>
        </EmptyState.Root>
      ) : (
        <Stack.Root as="ul" gap="condensed">
          {cards.map((invoice) => {
            const due = aging(invoice);
            return (
              <li key={invoice.id}>
                <Card.Root>
                  <Card.Header>
                    <Stack.Root align="baseline" direction="row" gap="condensed" justify="between" wrap>
                      <Text.Root as="h3">
                        <Link.Root
                          className="tracking-invoice"
                          href={invoiceHref("tracking", invoice.id)}
                          onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                            event.preventDefault();
                            onOpen(invoice.id);
                          }}
                        >
                          {invoice.number}
                          <VisuallyHidden.Root>{`, ${invoice.vendor}`}</VisuallyHidden.Root>
                        </Link.Root>
                      </Text.Root>
                      {due ? <Badge.Root tone={due.tone}>{due.label}</Badge.Root> : null}
                    </Stack.Root>
                  </Card.Header>
                  <Card.Body>
                    <Stack.Root gap="condensed">
                      <Text.Root>{invoice.vendor}</Text.Root>
                      <Stack.Root align="baseline" direction="row" gap="condensed" justify="between" wrap>
                        <Text.Root className="num" weight="medium">
                          {formatMoney(invoice.amountCents)}
                        </Text.Root>
                        <Text.Root tone="muted">{invoice.due}</Text.Root>
                      </Stack.Root>
                    </Stack.Root>
                  </Card.Body>
                </Card.Root>
              </li>
            );
          })}
        </Stack.Root>
      )}
    </Stack.Root>
  );
}

export function StatusBoard({
  invoices,
  onOpen,
}: {
  invoices: readonly Invoice[];
  onOpen: (invoiceId: string) => void;
}) {
  return (
    <Stack.Root data-content-layout="status-board" gap="normal">
      <DensityProvider density="compact">
        <ScrollArea.Root aria-label="Invoice status columns" axis="inline">
          <Stack.Root className="tracking-board" direction="row" gap="normal">
            {columns.map((column) => (
              <TrackingColumn
                key={column.status}
                empty={column.empty}
                hint={column.hint}
                invoices={invoices.filter((invoice) => invoice.status === column.status)}
                status={column.status}
                onOpen={onOpen}
              />
            ))}
          </Stack.Root>
        </ScrollArea.Root>
      </DensityProvider>
    </Stack.Root>
  );
}
