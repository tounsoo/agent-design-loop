import {
  Badge,
  DataList,
  Link,
  ScrollArea,
  Table,
  Text,
  type BadgeTone,
} from "../../catalog";
import {
  formatMoney,
  invoiceHref,
  invoicesForVendor,
  outstandingCents,
  statusLabel,
  type CollectionRoute,
  type Invoice,
  type InvoiceStatus,
  type Vendor,
} from "../../flows/invoice-approval";

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  "changes-requested": "info",
};

export function VendorIdentity({ vendor, invoices }: { vendor: Vendor; invoices: readonly Invoice[] }) {
  return (
    <DataList.Root aria-label="Commercial identity" orientation="horizontal">
      <DataList.Item>
        <DataList.Term>Legal name</DataList.Term>
        <DataList.Details>{vendor.legalName}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Tax ID</DataList.Term>
        <DataList.Details>{vendor.taxId}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Payment terms</DataList.Term>
        <DataList.Details>{vendor.paymentTerms}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Payment method</DataList.Term>
        <DataList.Details>{vendor.paymentMethod}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Address</DataList.Term>
        <DataList.Details>{vendor.address}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Outstanding balance</DataList.Term>
        <DataList.Details>{formatMoney(outstandingCents(invoices, vendor.legalName))}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Contact</DataList.Term>
        <DataList.Details>{vendor.contact}</DataList.Details>
      </DataList.Item>
    </DataList.Root>
  );
}

/**
 * This vendor's invoices, in the detail body. A short read-only table, not a
 * second disclosure and not another collection. The invoice number is the cell
 * link into the existing invoice detail.
 */
export function VendorInvoices({
  vendor,
  invoices,
  route,
  onOpen,
}: {
  vendor: Vendor;
  invoices: readonly Invoice[];
  route: CollectionRoute;
  onOpen: (invoiceId: string) => void;
}) {
  const rows = invoicesForVendor(invoices, vendor.legalName);
  if (rows.length === 0) {
    return <Text.Root tone="muted">No invoices for this vendor.</Text.Root>;
  }
  return (
    <ScrollArea.Root aria-label={`${vendor.legalName} invoices`} axis="inline" focusable>
      <Table.Root>
        <Table.Caption>Invoices</Table.Caption>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell scope="col">Invoice</Table.HeaderCell>
            <Table.HeaderCell scope="col">Status</Table.HeaderCell>
            <Table.HeaderCell className="num" scope="col">
              Amount
            </Table.HeaderCell>
            <Table.HeaderCell scope="col">Due</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((invoice) => (
            <Table.Row key={invoice.id}>
              <Table.HeaderCell scope="row">
                <Link.Root
                  href={invoiceHref(route, invoice.id, vendor.id)}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    onOpen(invoice.id);
                  }}
                >
                  {invoice.number}
                </Link.Root>
              </Table.HeaderCell>
              <Table.Cell>
                <Badge.Root tone={STATUS_TONE[invoice.status]}>{statusLabel[invoice.status]}</Badge.Root>
              </Table.Cell>
              <Table.Cell className="num">{formatMoney(invoice.amountCents)}</Table.Cell>
              <Table.Cell>{invoice.due}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </ScrollArea.Root>
  );
}
