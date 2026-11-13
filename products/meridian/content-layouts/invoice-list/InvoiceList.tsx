import type { ReactElement } from "react";
import { Badge, type BadgeTone, Link, ScrollArea, Stack, Table, Text } from "../../catalog";
import { formatMoney, statusLabel, type Invoice } from "../../flows/invoice-approval";

export type InvoiceListProps = {
  /** What the list holds, such as "Open invoices": its section heading and the table's name. */
  readonly title: string;
  /** In the order they read. */
  readonly invoices: readonly Invoice[];
  /** Whether a Status column shows each invoice's status. */
  readonly showStatus: boolean;
  /** Where each invoice's page is, for its number's link. */
  readonly invoiceHref: (invoiceId: string) => string;
  /** Opens an invoice's page in place. */
  readonly onOpenInvoice: (invoiceId: string) => void;
};

const statusTone: Record<Invoice["status"], BadgeTone> = {
  pending: "warning",
  approved: "success",
  "changes-requested": "info",
};

/**
 * Invoice list content layout: one section, under its own h2, holding a short,
 * fixed table of invoices, each number a link to its invoice, with its amount
 * and due date and, where asked, its status. Unlike the data table it has no
 * search, sort or pages, because it shows one vendor's few invoices in the
 * order given. Its h2 sits under the page's h1, so the outline skips no level.
 */
export function InvoiceList({ title, invoices, showStatus, invoiceHref, onOpenInvoice }: InvoiceListProps): ReactElement {
  // The heading names the section for the page outline and the table carries its own name, so the section is not a second landmark.
  // A phone is narrower than four columns, so the table scrolls inside its own frame and the page does not.
  return (
    <Stack.Root as="section" gap="normal">
      <Text.Root as="h2">{title}</Text.Root>
      <ScrollArea.Root aria-label={`${title} table`} axis="inline" focusable>
        <Table.Root aria-label={title}>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell scope="col">Invoice</Table.HeaderCell>
              {showStatus ? <Table.HeaderCell scope="col">Status</Table.HeaderCell> : null}
              <Table.HeaderCell className="num" scope="col">
                Amount
              </Table.HeaderCell>
              <Table.HeaderCell scope="col">Due</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {invoices.map((invoice) => (
              <Table.Row key={invoice.id}>
                <Table.HeaderCell scope="row">
                  <Link.Root
                    href={invoiceHref(invoice.id)}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      onOpenInvoice(invoice.id);
                    }}
                  >
                    {invoice.number}
                  </Link.Root>
                </Table.HeaderCell>
                {showStatus ? (
                  <Table.Cell>
                    <Badge.Root tone={statusTone[invoice.status]}>{statusLabel[invoice.status]}</Badge.Root>
                  </Table.Cell>
                ) : null}
                <Table.Cell className="num">{formatMoney(invoice.amountCents)}</Table.Cell>
                <Table.Cell>{invoice.due}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </ScrollArea.Root>
    </Stack.Root>
  );
}
