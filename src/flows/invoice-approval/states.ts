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

export type InvoiceStatus = "pending" | "approved" | "changes-requested";

export const statusLabel: Record<InvoiceStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  "changes-requested": "Changes requested",
};

export const paymentTerms = ["Due on receipt", "Net 15", "Net 30", "Net 45"] as const;

export type PaymentTerms = (typeof paymentTerms)[number];

export const costCenters = ["Operations", "Finance", "Facilities", "People", "IT"] as const;

export type CostCenter = (typeof costCenters)[number];

export const submitters = ["Avery Chen", "Priya Shah", "Jonah Hale", "Mina Ortiz"] as const;

export type Submitter = (typeof submitters)[number];

/** Queue clock. Aging is computed from this date so the sample ledger does not drift. */
export const AS_OF = "2026-11-10";

export const dueBuckets = ["Overdue", "Due in 7 days", "Due in 30 days", "Later"] as const;

export type DueBucket = (typeof dueBuckets)[number];

export const balanceBuckets = ["No balance", "Under $1,000", "$1,000–$10,000", "Over $10,000"] as const;

export type BalanceBucket = (typeof balanceBuckets)[number];

const MS_DAY = 86_400_000;

const termDays: Record<PaymentTerms, number> = {
  "Due on receipt": 0,
  "Net 15": 15,
  "Net 30": 30,
  "Net 45": 45,
};

const vendorTerms = {
  "Brightline Paper Co": "Due on receipt",
  "Copperline Facilities": "Net 30",
  "Elm Street Courier": "Net 15",
  "Fieldnote Print": "Net 30",
  "Harbor & Pine Catering": "Due on receipt",
  "Helios Freight": "Net 15",
  "Kite Analytics": "Net 30",
  "Lumen Cloud Services": "Net 30",
  "Marlowe Legal": "Net 45",
  "Northline Hardware": "Net 30",
  "Northwind Office Supply": "Net 30",
  "Plover Software": "Net 30",
  "Quill Staffing": "Net 15",
  "Redwood Waste": "Due on receipt",
  "Sable Security": "Net 45",
  "Vesper Utilities": "Net 15",
} as const satisfies Record<string, PaymentTerms>;

export type VendorName = keyof typeof vendorTerms;

export type Invoice = {
  readonly id: string;
  readonly number: string;
  readonly vendor: VendorName;
  readonly amountCents: number;
  /** ISO date the vendor issued the invoice. Due is issued plus the vendor's terms. */
  readonly issuedOn: string;
  /** ISO date used for sorting. `due` is the display label. */
  readonly dueOn: string;
  readonly due: string;
  readonly status: InvoiceStatus;
  readonly terms: PaymentTerms;
  /** `Non-PO` when the invoice is not matched to a purchase order. */
  readonly poNumber: string;
  readonly costCenter: CostCenter;
  readonly submitter: Submitter;
  readonly changeReason?: string;
  readonly lines: readonly LineItem[];
};

export type VendorSummary = {
  readonly name: VendorName;
  readonly terms: PaymentTerms;
  readonly openCount: number;
  readonly outstandingCents: number;
  readonly lastNumber: string;
  readonly lastDue: string;
  readonly lastIssuedOn: string;
};

function parseIsoDate(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Bad date ${iso}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatIsoDate(utc: number): string {
  const date = new Date(utc);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDue(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parseIsoDate(iso)));
}

export function dueBucket(dueOn: string, asOf: string = AS_OF): DueBucket {
  const days = Math.round((parseIsoDate(dueOn) - parseIsoDate(asOf)) / MS_DAY);
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due in 7 days";
  if (days <= 30) return "Due in 30 days";
  return "Later";
}

export function balanceBucket(cents: number): BalanceBucket {
  if (cents <= 0) return "No balance";
  if (cents < 100_000) return "Under $1,000";
  if (cents <= 1_000_000) return "$1,000–$10,000";
  return "Over $10,000";
}

function invoice(input: {
  id: string;
  number: string;
  vendor: VendorName;
  amountCents: number;
  issuedOn: string;
  status: InvoiceStatus;
  poNumber: string;
  costCenter: CostCenter;
  submitter: Submitter;
  lines: readonly LineItem[];
  changeReason?: string;
}): Invoice {
  const terms = vendorTerms[input.vendor];
  const dueOn = formatIsoDate(parseIsoDate(input.issuedOn) + termDays[terms] * MS_DAY);
  const lineTotal = input.lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (lineTotal !== input.amountCents) {
    throw new Error(`${input.number} line items total ${lineTotal}, invoice is ${input.amountCents}.`);
  }
  if (input.status === "changes-requested" && !input.changeReason?.trim()) {
    throw new Error(`${input.number} is missing a change reason.`);
  }
  return {
    ...input,
    terms,
    dueOn,
    due: formatDue(dueOn),
  };
}

/**
 * Pending invoices are an open balance. Approved and changes-requested are not.
 * Last invoice is the latest issued, which is not always the latest due date.
 */
export function summarizeVendors(invoices: readonly Invoice[]): VendorSummary[] {
  const byName = new Map<VendorName, VendorSummary>();
  for (const item of invoices) {
    const pending = item.status === "pending";
    const current = byName.get(item.vendor);
    if (!current) {
      byName.set(item.vendor, {
        name: item.vendor,
        terms: item.terms,
        openCount: pending ? 1 : 0,
        outstandingCents: pending ? item.amountCents : 0,
        lastNumber: item.number,
        lastDue: item.due,
        lastIssuedOn: item.issuedOn,
      });
      continue;
    }
    if (current.terms !== item.terms) {
      throw new Error(`${item.vendor} has more than one payment term.`);
    }
    const later = item.issuedOn > current.lastIssuedOn;
    byName.set(item.vendor, {
      name: item.vendor,
      terms: current.terms,
      openCount: current.openCount + (pending ? 1 : 0),
      outstandingCents: current.outstandingCents + (pending ? item.amountCents : 0),
      lastNumber: later ? item.number : current.lastNumber,
      lastDue: later ? item.due : current.lastDue,
      lastIssuedOn: later ? item.issuedOn : current.lastIssuedOn,
    });
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export const sampleInvoices: readonly Invoice[] = [
  invoice({
    id: "inv-1842",
    number: "INV-1842",
    vendor: "Northwind Office Supply",
    amountCents: 428_000,
    issuedOn: "2026-10-19",
    status: "pending",
    poNumber: "PO-43842",
    costCenter: "Operations",
    submitter: "Avery Chen",
    lines: [
      { description: "Paper stock", amountCents: 124_000 },
      { description: "Printer toner", amountCents: 86_000 },
      { description: "Desk chairs", amountCents: 218_000 },
    ],
  }),
  invoice({
    id: "inv-1907",
    number: "INV-1907",
    vendor: "Helios Freight",
    amountCents: 1_264_050,
    issuedOn: "2026-11-09",
    status: "pending",
    poNumber: "PO-43907",
    costCenter: "Operations",
    submitter: "Jonah Hale",
    lines: [
      { description: "LTL freight", amountCents: 940_000 },
      { description: "Fuel surcharge", amountCents: 124_050 },
      { description: "Pallet exchange", amountCents: 200_000 },
    ],
  }),
  invoice({
    id: "inv-1760",
    number: "INV-1760",
    vendor: "Lumen Cloud Services",
    amountCents: 89_000,
    issuedOn: "2026-11-01",
    status: "pending",
    poNumber: "Non-PO",
    costCenter: "IT",
    submitter: "Priya Shah",
    lines: [
      { description: "Workspace seats", amountCents: 75_000 },
      { description: "Support add-on", amountCents: 14_000 },
    ],
  }),
  invoice({
    id: "inv-1914",
    number: "INV-1914",
    vendor: "Brightline Paper Co",
    amountCents: 215_000,
    issuedOn: "2026-11-28",
    status: "pending",
    poNumber: "PO-43914",
    costCenter: "Operations",
    submitter: "Mina Ortiz",
    lines: [
      { description: "Recycled bond", amountCents: 140_000 },
      { description: "Envelopes", amountCents: 75_000 },
    ],
  }),
  invoice({
    id: "inv-1888",
    number: "INV-1888",
    vendor: "Harbor & Pine Catering",
    amountCents: 64_075,
    issuedOn: "2026-12-03",
    status: "pending",
    poNumber: "PO-43888",
    costCenter: "People",
    submitter: "Avery Chen",
    lines: [
      { description: "Staff lunch", amountCents: 48_000 },
      { description: "Beverage service", amountCents: 16_075 },
    ],
  }),
  invoice({
    id: "inv-1922",
    number: "INV-1922",
    vendor: "Sable Security",
    amountCents: 348_000,
    issuedOn: "2026-10-24",
    status: "pending",
    poNumber: "PO-43922",
    costCenter: "Facilities",
    submitter: "Avery Chen",
    lines: [
      { description: "Badge readers", amountCents: 220_000 },
      { description: "Monitoring", amountCents: 128_000 },
    ],
  }),
  invoice({
    id: "inv-1855",
    number: "INV-1855",
    vendor: "Fieldnote Print",
    amountCents: 112_500,
    issuedOn: "2026-10-22",
    status: "pending",
    poNumber: "PO-43855",
    costCenter: "Finance",
    submitter: "Priya Shah",
    lines: [
      { description: "Annual report", amountCents: 90_000 },
      { description: "Color proofs", amountCents: 22_500 },
    ],
  }),
  invoice({
    id: "inv-1936",
    number: "INV-1936",
    vendor: "Northline Hardware",
    amountCents: 64_050,
    issuedOn: "2026-10-03",
    status: "pending",
    poNumber: "PO-43936",
    costCenter: "Operations",
    submitter: "Jonah Hale",
    lines: [
      { description: "Fasteners", amountCents: 40_050 },
      { description: "Safety glasses", amountCents: 24_000 },
    ],
  }),
  invoice({
    id: "inv-1930",
    number: "INV-1930",
    vendor: "Vesper Utilities",
    amountCents: 124_000,
    issuedOn: "2026-10-20",
    status: "pending",
    poNumber: "Non-PO",
    costCenter: "Facilities",
    submitter: "Mina Ortiz",
    lines: [
      { description: "Electric service", amountCents: 98_000 },
      { description: "Demand charge", amountCents: 26_000 },
    ],
  }),
  invoice({
    id: "inv-1933",
    number: "INV-1933",
    vendor: "Copperline Facilities",
    amountCents: 287_500,
    issuedOn: "2026-10-07",
    status: "pending",
    poNumber: "PO-43933",
    costCenter: "Facilities",
    submitter: "Avery Chen",
    lines: [
      { description: "Janitorial", amountCents: 210_000 },
      { description: "Supplies", amountCents: 77_500 },
    ],
  }),
  invoice({
    id: "inv-1944",
    number: "INV-1944",
    vendor: "Redwood Waste",
    amountCents: 38_000,
    issuedOn: "2026-11-12",
    status: "pending",
    poNumber: "PO-43944",
    costCenter: "Facilities",
    submitter: "Mina Ortiz",
    lines: [{ description: "Weekly haul", amountCents: 38_000 }],
  }),
  invoice({
    id: "inv-1940",
    number: "INV-1940",
    vendor: "Plover Software",
    amountCents: 480_000,
    issuedOn: "2026-10-15",
    status: "pending",
    poNumber: "PO-43940",
    costCenter: "IT",
    submitter: "Priya Shah",
    lines: [
      { description: "Seats", amountCents: 400_000 },
      { description: "SSO", amountCents: 80_000 },
    ],
  }),
  invoice({
    id: "inv-1942",
    number: "INV-1942",
    vendor: "Quill Staffing",
    amountCents: 615_000,
    issuedOn: "2026-11-01",
    status: "pending",
    poNumber: "PO-43942",
    costCenter: "People",
    submitter: "Avery Chen",
    lines: [{ description: "Contract analysts", amountCents: 615_000 }],
  }),
  invoice({
    id: "inv-1946",
    number: "INV-1946",
    vendor: "Marlowe Legal",
    amountCents: 320_000,
    issuedOn: "2026-10-03",
    status: "pending",
    poNumber: "PO-43946",
    costCenter: "Finance",
    submitter: "Priya Shah",
    lines: [{ description: "Contract review", amountCents: 320_000 }],
  }),
  invoice({
    id: "inv-1950",
    number: "INV-1950",
    vendor: "Vesper Utilities",
    amountCents: 118_000,
    issuedOn: "2026-11-12",
    status: "pending",
    poNumber: "Non-PO",
    costCenter: "Facilities",
    submitter: "Mina Ortiz",
    lines: [
      { description: "Gas service", amountCents: 90_000 },
      { description: "Water", amountCents: 28_000 },
    ],
  }),
  invoice({
    id: "inv-1952",
    number: "INV-1952",
    vendor: "Northline Hardware",
    amountCents: 89_000,
    issuedOn: "2026-11-04",
    status: "pending",
    poNumber: "PO-43952",
    costCenter: "Operations",
    submitter: "Jonah Hale",
    lines: [
      { description: "Replacement locks", amountCents: 51_000 },
      { description: "Keys", amountCents: 38_000 },
    ],
  }),
  invoice({
    id: "inv-1960",
    number: "INV-1960",
    vendor: "Helios Freight",
    amountCents: 210_000,
    issuedOn: "2026-12-03",
    status: "pending",
    poNumber: "PO-43960",
    costCenter: "Operations",
    submitter: "Jonah Hale",
    lines: [
      { description: "Eastbound freight", amountCents: 180_000 },
      { description: "Liftgate", amountCents: 30_000 },
    ],
  }),
  invoice({
    id: "inv-1962",
    number: "INV-1962",
    vendor: "Sable Security",
    amountCents: 150_000,
    issuedOn: "2026-11-07",
    status: "pending",
    poNumber: "PO-43962",
    costCenter: "Facilities",
    submitter: "Avery Chen",
    lines: [{ description: "Camera install", amountCents: 150_000 }],
  }),
  invoice({
    id: "inv-1964",
    number: "INV-1964",
    vendor: "Lumen Cloud Services",
    amountCents: 89_000,
    issuedOn: "2026-12-03",
    status: "pending",
    poNumber: "Non-PO",
    costCenter: "IT",
    submitter: "Priya Shah",
    lines: [
      { description: "Workspace seats", amountCents: 75_000 },
      { description: "Support add-on", amountCents: 14_000 },
    ],
  }),
  invoice({
    id: "inv-1711",
    number: "INV-1711",
    vendor: "Northwind Office Supply",
    amountCents: 98_000,
    issuedOn: "2026-09-30",
    status: "approved",
    poNumber: "PO-43711",
    costCenter: "Operations",
    submitter: "Mina Ortiz",
    lines: [{ description: "Copy paper", amountCents: 98_000 }],
  }),
  invoice({
    id: "inv-1694",
    number: "INV-1694",
    vendor: "Helios Freight",
    amountCents: 821_000,
    issuedOn: "2026-10-07",
    status: "approved",
    poNumber: "PO-43694",
    costCenter: "Operations",
    submitter: "Jonah Hale",
    lines: [
      { description: "Westbound freight", amountCents: 700_000 },
      { description: "Liftgate", amountCents: 121_000 },
    ],
  }),
  invoice({
    id: "inv-1802",
    number: "INV-1802",
    vendor: "Kite Analytics",
    amountCents: 640_000,
    issuedOn: "2026-10-13",
    status: "approved",
    poNumber: "Non-PO",
    costCenter: "IT",
    submitter: "Priya Shah",
    lines: [
      { description: "Analytics seats", amountCents: 520_000 },
      { description: "Audit export", amountCents: 120_000 },
    ],
  }),
  invoice({
    id: "inv-1670",
    number: "INV-1670",
    vendor: "Elm Street Courier",
    amountCents: 54_000,
    issuedOn: "2026-10-13",
    status: "approved",
    poNumber: "PO-43670",
    costCenter: "Operations",
    submitter: "Jonah Hale",
    lines: [{ description: "Same-day run", amountCents: 54_000 }],
  }),
  invoice({
    id: "inv-1744",
    number: "INV-1744",
    vendor: "Lumen Cloud Services",
    amountCents: 276_000,
    issuedOn: "2026-10-16",
    status: "changes-requested",
    poNumber: "Non-PO",
    costCenter: "IT",
    submitter: "Priya Shah",
    changeReason: "Seat count is higher than the contract.",
    lines: [{ description: "Extra seats", amountCents: 276_000 }],
  }),
  invoice({
    id: "inv-1770",
    number: "INV-1770",
    vendor: "Harbor & Pine Catering",
    amountCents: 41_000,
    issuedOn: "2026-11-09",
    status: "changes-requested",
    poNumber: "PO-43770",
    costCenter: "People",
    submitter: "Avery Chen",
    changeReason: "The reception date on the invoice does not match the event order.",
    lines: [{ description: "Reception coffee", amountCents: 41_000 }],
  }),
];

function assertUnique(label: string, values: readonly string[], allowRepeat: readonly string[] = []): void {
  const repeats = new Set(allowRepeat);
  const seen = new Set<string>();
  for (const value of values) {
    if (repeats.has(value)) continue;
    if (seen.has(value)) throw new Error(`Duplicate ${label} ${value}.`);
    seen.add(value);
  }
}

assertUnique(
  "invoice id",
  sampleInvoices.map((item) => item.id),
);
assertUnique(
  "invoice number",
  sampleInvoices.map((item) => item.number),
);
assertUnique(
  "PO number",
  sampleInvoices.map((item) => item.poNumber),
  ["Non-PO"],
);

export const loadErrorMessage = "Couldn't load invoices.";

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function invoiceById(id: string): Invoice | undefined {
  return sampleInvoices.find((item) => item.id === id);
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
