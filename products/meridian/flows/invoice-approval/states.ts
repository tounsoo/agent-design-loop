import type { VendorId } from "./vendors";

export const modeledStates = [
  "loading",
  "empty",
  "error",
  "ready",
  "invoice-approved",
  "changes-requested",
  "vendor-added",
] as const;

export type ModeledState = (typeof modeledStates)[number];

export type Screen = "collection" | "detail";

export type LineItem = {
  readonly description: string;
  readonly amountCents: number;
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
  readonly amountCents: number;
  /** ISO date used for sorting. `due` is the display label. */
  readonly dueOn: string;
  readonly due: string;
  readonly status: InvoiceStatus;
  readonly changeReason?: string;
  readonly lines: readonly LineItem[];
};

export const sampleInvoices: readonly Invoice[] = [
  {
    id: "inv-1842",
    number: "INV-1842",
    vendor: "Northwind Office Supply",
    amountCents: 428_000,
    dueOn: "2026-11-18",
    due: "Nov 18, 2026",
    status: "pending",
    lines: [
      { description: "Paper stock", amountCents: 124_000 },
      { description: "Printer toner", amountCents: 86_000 },
      { description: "Desk chairs", amountCents: 218_000 },
    ],
  },
  {
    id: "inv-1907",
    number: "INV-1907",
    vendor: "Helios Freight",
    amountCents: 1_264_050,
    dueOn: "2026-11-24",
    due: "Nov 24, 2026",
    status: "pending",
    lines: [
      { description: "LTL freight", amountCents: 940_000 },
      { description: "Fuel surcharge", amountCents: 124_050 },
      { description: "Pallet exchange", amountCents: 200_000 },
    ],
  },
  {
    id: "inv-1760",
    number: "INV-1760",
    vendor: "Lumen Cloud Services",
    amountCents: 89_000,
    dueOn: "2026-12-01",
    due: "Dec 1, 2026",
    status: "pending",
    lines: [
      { description: "Workspace seats", amountCents: 75_000 },
      { description: "Support add-on", amountCents: 14_000 },
    ],
  },
  {
    id: "inv-1914",
    number: "INV-1914",
    vendor: "Brightline Paper Co",
    amountCents: 215_000,
    dueOn: "2026-11-28",
    due: "Nov 28, 2026",
    status: "pending",
    lines: [
      { description: "Recycled bond", amountCents: 140_000 },
      { description: "Envelopes", amountCents: 75_000 },
    ],
  },
  {
    id: "inv-1888",
    number: "INV-1888",
    vendor: "Harbor & Pine Catering",
    amountCents: 64_075,
    dueOn: "2026-12-03",
    due: "Dec 3, 2026",
    status: "pending",
    lines: [
      { description: "Staff lunch", amountCents: 48_000 },
      { description: "Beverage service", amountCents: 16_075 },
    ],
  },
  {
    id: "inv-1922",
    number: "INV-1922",
    vendor: "Sable Security",
    amountCents: 348_000,
    dueOn: "2026-12-08",
    due: "Dec 8, 2026",
    status: "pending",
    lines: [
      { description: "Badge readers", amountCents: 220_000 },
      { description: "Monitoring", amountCents: 128_000 },
    ],
  },
  {
    id: "inv-1855",
    number: "INV-1855",
    vendor: "Fieldnote Print",
    amountCents: 112_500,
    dueOn: "2026-11-21",
    due: "Nov 21, 2026",
    status: "pending",
    lines: [
      { description: "Annual report", amountCents: 90_000 },
      { description: "Color proofs", amountCents: 22_500 },
    ],
  },
  {
    id: "inv-1711",
    number: "INV-1711",
    vendor: "Northwind Office Supply",
    amountCents: 98_000,
    dueOn: "2026-10-30",
    due: "Oct 30, 2026",
    status: "approved",
    lines: [{ description: "Copy paper", amountCents: 98_000 }],
  },
  {
    id: "inv-1694",
    number: "INV-1694",
    vendor: "Helios Freight",
    amountCents: 821_000,
    dueOn: "2026-10-22",
    due: "Oct 22, 2026",
    status: "approved",
    lines: [
      { description: "Westbound freight", amountCents: 700_000 },
      { description: "Liftgate", amountCents: 121_000 },
    ],
  },
  {
    id: "inv-1802",
    number: "INV-1802",
    vendor: "Kite Analytics",
    amountCents: 640_000,
    dueOn: "2026-11-12",
    due: "Nov 12, 2026",
    status: "approved",
    lines: [
      { description: "Analytics seats", amountCents: 520_000 },
      { description: "Audit export", amountCents: 120_000 },
    ],
  },
  {
    id: "inv-1744",
    number: "INV-1744",
    vendor: "Lumen Cloud Services",
    amountCents: 276_000,
    dueOn: "2026-11-15",
    due: "Nov 15, 2026",
    status: "changes-requested",
    changeReason: "Seat count is higher than the contract.",
    lines: [{ description: "Extra seats", amountCents: 276_000 }],
  },
  {
    id: "inv-1770",
    number: "INV-1770",
    vendor: "Harbor & Pine Catering",
    amountCents: 41_000,
    dueOn: "2026-11-09",
    due: "Nov 9, 2026",
    status: "changes-requested",
    changeReason: "The reception date on the invoice does not match the event order.",
    lines: [{ description: "Reception coffee", amountCents: 41_000 }],
  },
];

export const loadErrorMessage = "Couldn't load invoices.";

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** The sum of an invoice's lines, so a reviewer can hold it against the amount. */
export function lineTotal(invoice: Invoice): number {
  return invoice.lines.reduce((sum, line) => sum + line.amountCents, 0);
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
  | { readonly status: "changes-requested"; readonly invoiceId: string; readonly reason: string }
  | { readonly status: "vendor-added"; readonly vendorId: VendorId };

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
  | { readonly type: "approve" }
  | { readonly type: "add-vendor"; readonly vendorId: VendorId };

export function isModeledState(value: string): value is ModeledState {
  return (modeledStates as readonly string[]).includes(value);
}

export function isScreen(value: string): value is Screen {
  return value === "collection" || value === "detail";
}
