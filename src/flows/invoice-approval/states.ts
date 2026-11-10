export const modeledStates = [
  "loading",
  "empty",
  "error",
  "ready",
  "invoice-approved",
  "changes-requested",
] as const;

export type ModeledState = (typeof modeledStates)[number];

export type Screen = "collection" | "detail";

/** One charge on a bill. `quantity` × `unitPriceCents` is the line amount. */
export type LineItem = {
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly glAccount: string;
  readonly costCenter: string;
};

export type InvoiceStatus = "pending" | "approved" | "changes-requested";

export const statusLabel: Record<InvoiceStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  "changes-requested": "Changes requested",
};

export type Invoice = {
  readonly id: string;
  readonly number: string;
  readonly vendor: string;
  /** Subtotal plus tax. The queue shows this figure. */
  readonly amountCents: number;
  /** ISO date used for sorting. `due` is the display label. */
  readonly dueOn: string;
  readonly due: string;
  /** ISO date. `invoiceDate` is the display label. */
  readonly invoiceOn: string;
  readonly invoiceDate: string;
  /** ISO date. `received` is the display label. */
  readonly receivedOn: string;
  readonly received: string;
  readonly poNumber: string;
  readonly paymentTerms: string;
  readonly paymentMethod: string;
  readonly currency: "USD";
  readonly taxCents: number;
  readonly billingEntity: string;
  readonly submittedBy: string;
  readonly status: InvoiceStatus;
  readonly changeReason?: string;
  readonly lines: readonly LineItem[];
};

export function lineAmountCents(line: LineItem): number {
  return line.quantity * line.unitPriceCents;
}

export function invoiceSubtotalCents(invoice: Pick<Invoice, "lines">): number {
  return invoice.lines.reduce((sum, line) => sum + lineAmountCents(line), 0);
}

/** Total is the lines plus tax, so a sample invoice cannot drift from its bill. */
function bill(invoice: Omit<Invoice, "amountCents">): Invoice {
  return { ...invoice, amountCents: invoiceSubtotalCents(invoice) + invoice.taxCents };
}

const labs = "Meridian Labs, Inc.";
const distribution = "Meridian Distribution LLC";

export const sampleInvoices: readonly Invoice[] = [
  bill({
    id: "inv-1842",
    number: "INV-1842",
    vendor: "Northwind Office Supply",
    dueOn: "2026-11-18",
    due: "Nov 18, 2026",
    invoiceOn: "2026-11-04",
    invoiceDate: "Nov 4, 2026",
    receivedOn: "2026-11-05",
    received: "Nov 5, 2026",
    poNumber: "PO-4418",
    paymentTerms: "Net 14",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 28_000,
    billingEntity: labs,
    submittedBy: "Priya Shah",
    status: "pending",
    lines: [
      {
        description: "Paper stock",
        quantity: 40,
        unitPriceCents: 3_100,
        glAccount: "6100 Office supplies",
        costCenter: "140 Facilities",
      },
      {
        description: "Printer toner",
        quantity: 4,
        unitPriceCents: 21_500,
        glAccount: "6100 Office supplies",
        costCenter: "140 Facilities",
      },
      {
        description: "Desk chairs",
        quantity: 2,
        unitPriceCents: 95_000,
        glAccount: "1500 Furniture and equipment",
        costCenter: "140 Facilities",
      },
    ],
  }),
  bill({
    id: "inv-1907",
    number: "INV-1907",
    vendor: "Helios Freight",
    dueOn: "2026-11-24",
    due: "Nov 24, 2026",
    invoiceOn: "2026-11-10",
    invoiceDate: "Nov 10, 2026",
    receivedOn: "2026-11-10",
    received: "Nov 10, 2026",
    poNumber: "PO-4520",
    paymentTerms: "Net 14",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 64_050,
    billingEntity: distribution,
    submittedBy: "Jordan Lee",
    status: "pending",
    lines: [
      {
        description: "LTL freight",
        quantity: 4,
        unitPriceCents: 220_000,
        glAccount: "6200 Freight",
        costCenter: "210 Logistics",
      },
      {
        description: "Fuel surcharge",
        quantity: 5,
        unitPriceCents: 24_000,
        glAccount: "6210 Fuel",
        costCenter: "210 Logistics",
      },
      {
        description: "Pallet exchange",
        quantity: 40,
        unitPriceCents: 5_000,
        glAccount: "6220 Pallet",
        costCenter: "210 Logistics",
      },
    ],
  }),
  bill({
    id: "inv-1760",
    number: "INV-1760",
    vendor: "Lumen Cloud Services",
    dueOn: "2026-12-01",
    due: "Dec 1, 2026",
    invoiceOn: "2026-11-01",
    invoiceDate: "Nov 1, 2026",
    receivedOn: "2026-11-02",
    received: "Nov 2, 2026",
    poNumber: "PO-4488",
    paymentTerms: "Net 30",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 4_000,
    billingEntity: labs,
    submittedBy: "Alex Okonkwo",
    status: "pending",
    lines: [
      {
        description: "Workspace seats",
        quantity: 5,
        unitPriceCents: 15_000,
        glAccount: "6300 Software",
        costCenter: "310 Engineering",
      },
      {
        description: "Support add-on",
        quantity: 2,
        unitPriceCents: 5_000,
        glAccount: "6310 Software support",
        costCenter: "310 Engineering",
      },
    ],
  }),
  bill({
    id: "inv-1914",
    number: "INV-1914",
    vendor: "Brightline Paper Co",
    dueOn: "2026-11-28",
    due: "Nov 28, 2026",
    invoiceOn: "2026-10-29",
    invoiceDate: "Oct 29, 2026",
    receivedOn: "2026-10-30",
    received: "Oct 30, 2026",
    poNumber: "PO-4502",
    paymentTerms: "Net 30",
    paymentMethod: "Check",
    currency: "USD",
    taxCents: 15_000,
    billingEntity: labs,
    submittedBy: "Sam Rivera",
    status: "pending",
    lines: [
      {
        description: "Recycled bond",
        quantity: 20,
        unitPriceCents: 6_500,
        glAccount: "6100 Office supplies",
        costCenter: "220 Marketing",
      },
      {
        description: "Envelopes",
        quantity: 10,
        unitPriceCents: 7_000,
        glAccount: "6100 Office supplies",
        costCenter: "220 Marketing",
      },
    ],
  }),
  bill({
    id: "inv-1888",
    number: "INV-1888",
    vendor: "Harbor & Pine Catering",
    dueOn: "2026-12-03",
    due: "Dec 3, 2026",
    invoiceOn: "2026-11-03",
    invoiceDate: "Nov 3, 2026",
    receivedOn: "2026-11-04",
    received: "Nov 4, 2026",
    poNumber: "PO-4511",
    paymentTerms: "Net 30",
    paymentMethod: "Check",
    currency: "USD",
    taxCents: 4_075,
    billingEntity: labs,
    submittedBy: "Sam Rivera",
    status: "pending",
    lines: [
      {
        description: "Staff lunch",
        quantity: 12,
        unitPriceCents: 4_000,
        glAccount: "6400 Catering",
        costCenter: "120 People",
      },
      {
        description: "Beverage service",
        quantity: 8,
        unitPriceCents: 1_500,
        glAccount: "6400 Catering",
        costCenter: "120 People",
      },
    ],
  }),
  bill({
    id: "inv-1922",
    number: "INV-1922",
    vendor: "Sable Security",
    dueOn: "2026-12-08",
    due: "Dec 8, 2026",
    invoiceOn: "2026-11-08",
    invoiceDate: "Nov 8, 2026",
    receivedOn: "2026-11-09",
    received: "Nov 9, 2026",
    poNumber: "PO-4533",
    paymentTerms: "Net 30",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 18_000,
    billingEntity: labs,
    submittedBy: "Priya Shah",
    status: "pending",
    lines: [
      {
        description: "Badge readers",
        quantity: 10,
        unitPriceCents: 21_000,
        glAccount: "6500 Security equipment",
        costCenter: "180 Corporate",
      },
      {
        description: "Monitoring",
        quantity: 12,
        unitPriceCents: 10_000,
        glAccount: "6510 Security services",
        costCenter: "180 Corporate",
      },
    ],
  }),
  bill({
    id: "inv-1855",
    number: "INV-1855",
    vendor: "Fieldnote Print",
    dueOn: "2026-11-21",
    due: "Nov 21, 2026",
    invoiceOn: "2026-11-07",
    invoiceDate: "Nov 7, 2026",
    receivedOn: "2026-11-08",
    received: "Nov 8, 2026",
    poNumber: "PO-4460",
    paymentTerms: "Net 14",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 7_500,
    billingEntity: labs,
    submittedBy: "Jordan Lee",
    status: "pending",
    lines: [
      {
        description: "Annual report",
        quantity: 1,
        unitPriceCents: 85_000,
        glAccount: "6600 Print and marketing",
        costCenter: "220 Marketing",
      },
      {
        description: "Color proofs",
        quantity: 8,
        unitPriceCents: 2_500,
        glAccount: "6600 Print and marketing",
        costCenter: "220 Marketing",
      },
    ],
  }),
  bill({
    id: "inv-1711",
    number: "INV-1711",
    vendor: "Northwind Office Supply",
    dueOn: "2026-10-30",
    due: "Oct 30, 2026",
    invoiceOn: "2026-10-16",
    invoiceDate: "Oct 16, 2026",
    receivedOn: "2026-10-17",
    received: "Oct 17, 2026",
    poNumber: "PO-4301",
    paymentTerms: "Net 14",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 8_000,
    billingEntity: labs,
    submittedBy: "Priya Shah",
    status: "approved",
    lines: [
      {
        description: "Copy paper",
        quantity: 20,
        unitPriceCents: 4_500,
        glAccount: "6100 Office supplies",
        costCenter: "140 Facilities",
      },
    ],
  }),
  bill({
    id: "inv-1694",
    number: "INV-1694",
    vendor: "Helios Freight",
    dueOn: "2026-10-22",
    due: "Oct 22, 2026",
    invoiceOn: "2026-10-08",
    invoiceDate: "Oct 8, 2026",
    receivedOn: "2026-10-09",
    received: "Oct 9, 2026",
    poNumber: "PO-4288",
    paymentTerms: "Net 14",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 21_000,
    billingEntity: distribution,
    submittedBy: "Jordan Lee",
    status: "approved",
    lines: [
      {
        description: "Westbound freight",
        quantity: 2,
        unitPriceCents: 340_000,
        glAccount: "6200 Freight",
        costCenter: "210 Logistics",
      },
      {
        description: "Liftgate",
        quantity: 4,
        unitPriceCents: 30_000,
        glAccount: "6230 Accessorials",
        costCenter: "210 Logistics",
      },
    ],
  }),
  bill({
    id: "inv-1802",
    number: "INV-1802",
    vendor: "Kite Analytics",
    dueOn: "2026-11-12",
    due: "Nov 12, 2026",
    invoiceOn: "2026-10-13",
    invoiceDate: "Oct 13, 2026",
    receivedOn: "2026-10-14",
    received: "Oct 14, 2026",
    poNumber: "PO-4390",
    paymentTerms: "Net 30",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 40_000,
    billingEntity: labs,
    submittedBy: "Alex Okonkwo",
    status: "approved",
    lines: [
      {
        description: "Analytics seats",
        quantity: 20,
        unitPriceCents: 24_000,
        glAccount: "6300 Software",
        costCenter: "310 Engineering",
      },
      {
        description: "Audit export",
        quantity: 4,
        unitPriceCents: 30_000,
        glAccount: "6320 Software",
        costCenter: "310 Engineering",
      },
    ],
  }),
  bill({
    id: "inv-1744",
    number: "INV-1744",
    vendor: "Lumen Cloud Services",
    dueOn: "2026-11-15",
    due: "Nov 15, 2026",
    invoiceOn: "2026-10-16",
    invoiceDate: "Oct 16, 2026",
    receivedOn: "2026-10-17",
    received: "Oct 17, 2026",
    poNumber: "PO-4366",
    paymentTerms: "Net 30",
    paymentMethod: "ACH",
    currency: "USD",
    taxCents: 16_000,
    billingEntity: labs,
    submittedBy: "Alex Okonkwo",
    status: "changes-requested",
    changeReason: "Seat count is higher than the contract.",
    lines: [
      {
        description: "Extra seats",
        quantity: 13,
        unitPriceCents: 20_000,
        glAccount: "6300 Software",
        costCenter: "310 Engineering",
      },
    ],
  }),
  bill({
    id: "inv-1770",
    number: "INV-1770",
    vendor: "Harbor & Pine Catering",
    dueOn: "2026-11-09",
    due: "Nov 9, 2026",
    invoiceOn: "2026-10-26",
    invoiceDate: "Oct 26, 2026",
    receivedOn: "2026-10-27",
    received: "Oct 27, 2026",
    poNumber: "PO-4422",
    paymentTerms: "Net 14",
    paymentMethod: "Check",
    currency: "USD",
    taxCents: 1_000,
    billingEntity: labs,
    submittedBy: "Sam Rivera",
    status: "changes-requested",
    changeReason: "The reception date on the invoice does not match the event order.",
    lines: [
      {
        description: "Reception coffee",
        quantity: 40,
        unitPriceCents: 1_000,
        glAccount: "6400 Catering",
        costCenter: "120 People",
      },
    ],
  }),
];

export const loadErrorMessage = "Couldn't load invoices.";

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(quantity);
}

export function invoiceById(id: string): Invoice | undefined {
  return sampleInvoices.find((invoice) => invoice.id === id);
}

export type FlowState =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly screen: "collection" }
  | {
      readonly status: "ready";
      readonly screen: "detail";
      readonly invoiceId: string;
      readonly lineItemsOpen: boolean;
      readonly requestingChanges: boolean;
      readonly reason: string;
      readonly reasonError: boolean;
    }
  | { readonly status: "invoice-approved"; readonly invoiceId: string }
  | { readonly status: "changes-requested"; readonly invoiceId: string; readonly reason: string };

export type FlowEvent =
  | { readonly type: "loaded"; readonly invoices: readonly Invoice[] }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "retry" }
  | { readonly type: "open-invoice"; readonly invoiceId: string }
  | { readonly type: "open-line-items" }
  | { readonly type: "close-line-items" }
  | { readonly type: "start-request" }
  | { readonly type: "set-reason"; readonly reason: string }
  | { readonly type: "submit-request" }
  | { readonly type: "approve" };

export function isModeledState(value: string): value is ModeledState {
  return (modeledStates as readonly string[]).includes(value);
}

export function isScreen(value: string): value is Screen {
  return value === "collection" || value === "detail";
}
