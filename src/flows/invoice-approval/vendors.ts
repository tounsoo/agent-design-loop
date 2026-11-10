import type { Invoice } from "./states";

/**
 * Vendor master data joined to the invoice ledger by legal name.
 * That name is the same string as `Invoice.vendor`.
 * Outstanding balance is not stored. It is the sum of this vendor's
 * invoices that are not approved, so it stays aligned with the ledger.
 */
export type Vendor = {
  readonly id: string;
  readonly legalName: string;
  readonly taxId: string;
  readonly paymentTerms: string;
  readonly paymentMethod: string;
  readonly address: string;
  readonly contact: string;
};

export const sampleVendors: readonly Vendor[] = [
  {
    id: "northwind-office-supply",
    legalName: "Northwind Office Supply",
    taxId: "36-4829107",
    paymentTerms: "Net 30",
    paymentMethod: "ACH",
    address: "400 N Michigan Ave, Chicago, IL 60611",
    contact: "Accounts payable · ap@northwind.example",
  },
  {
    id: "helios-freight",
    legalName: "Helios Freight",
    taxId: "91-2201844",
    paymentTerms: "Net 15",
    paymentMethod: "Wire",
    address: "800 Harbor Blvd, Oakland, CA 94607",
    contact: "Freight billing · billing@heliosfreight.example",
  },
  {
    id: "lumen-cloud-services",
    legalName: "Lumen Cloud Services",
    taxId: "84-7712055",
    paymentTerms: "Net 30",
    paymentMethod: "ACH",
    address: "200 Westlake Ave N, Seattle, WA 98109",
    contact: "Accounts receivable · ar@lumencloud.example",
  },
  {
    id: "brightline-paper-co",
    legalName: "Brightline Paper Co",
    taxId: "41-5583201",
    paymentTerms: "Net 45",
    paymentMethod: "Check",
    address: "15 Mill Street, Appleton, WI 54911",
    contact: "Accounts payable · ap@brightlinepaper.example",
  },
  {
    id: "harbor-pine-catering",
    legalName: "Harbor & Pine Catering",
    taxId: "27-9044182",
    paymentTerms: "Due on receipt",
    paymentMethod: "ACH",
    address: "88 Pine Street, Portland, OR 97204",
    contact: "Events billing · billing@harborandpine.example",
  },
  {
    id: "sable-security",
    legalName: "Sable Security",
    taxId: "52-3309186",
    paymentTerms: "Net 30",
    paymentMethod: "Wire",
    address: "600 K Street NW, Washington, DC 20001",
    contact: "Accounts payable · ap@sablesecurity.example",
  },
  {
    id: "fieldnote-print",
    legalName: "Fieldnote Print",
    taxId: "13-6628409",
    paymentTerms: "Net 15",
    paymentMethod: "Check",
    address: "42 Bond Street, New York, NY 10012",
    contact: "Production billing · billing@fieldnoteprint.example",
  },
  {
    id: "kite-analytics",
    legalName: "Kite Analytics",
    taxId: "82-1194470",
    paymentTerms: "Net 30",
    paymentMethod: "ACH",
    address: "501 Folsom Street, San Francisco, CA 94105",
    contact: "Accounts receivable · ar@kiteanalytics.example",
  },
];

export function vendorById(id: string): Vendor | undefined {
  return sampleVendors.find((vendor) => vendor.id === id);
}

export function vendorByName(legalName: string): Vendor | undefined {
  return sampleVendors.find((vendor) => vendor.legalName === legalName);
}

/** Pending and changes-requested invoices. Approved invoices are no longer outstanding. */
export function outstandingCents(invoices: readonly Invoice[], legalName: string): number {
  return invoices.reduce((total, invoice) => {
    if (invoice.vendor !== legalName || invoice.status === "approved") return total;
    return total + invoice.amountCents;
  }, 0);
}

/** Soonest due date first, the same order as the approval queue. */
export function invoicesForVendor(invoices: readonly Invoice[], legalName: string): Invoice[] {
  return invoices
    .filter((invoice) => invoice.vendor === legalName)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.number.localeCompare(b.number));
}
