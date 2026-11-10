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

export type LineItem = {
  readonly description: string;
  readonly amountCents: number;
};

export type Invoice = {
  readonly id: string;
  readonly number: string;
  readonly vendor: string;
  readonly amountCents: number;
  readonly due: string;
  readonly lines: readonly LineItem[];
};

export const sampleInvoices: readonly Invoice[] = [
  {
    id: "inv-1842",
    number: "INV-1842",
    vendor: "Northwind Office Supply",
    amountCents: 428_000,
    due: "Nov 18, 2026",
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
    due: "Nov 24, 2026",
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
    due: "Dec 1, 2026",
    lines: [
      { description: "Workspace seats", amountCents: 75_000 },
      { description: "Support add-on", amountCents: 14_000 },
    ],
  },
];

export const loadErrorMessage = "Couldn't load invoices.";

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
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
