import type { Invoice, InvoiceStatus, ModeledState } from "./states";

export const paymentTerms = ["due-on-receipt", "net-15", "net-30", "net-45", "net-60"] as const;

export type PaymentTerms = (typeof paymentTerms)[number];

export const termsLabel: Record<PaymentTerms, string> = {
  "due-on-receipt": "Due on receipt",
  "net-15": "Net 15",
  "net-30": "Net 30",
  "net-45": "Net 45",
  "net-60": "Net 60",
};

export const defaultTerms: PaymentTerms = "net-30";

declare const vendorIdBrand: unique symbol;
/** Only sampleVendors and addVendor mint one. */
export type VendorId = string & { readonly [vendorIdBrand]: true };

/** A vendor Meridian pays. Invoices name their vendor by `name`. */
export type Vendor = {
  readonly id: VendorId;
  readonly name: string;
  readonly remitEmail: string;
  readonly terms: PaymentTerms;
};

export type VendorDraft = {
  readonly name: string;
  readonly remitEmail: string;
  readonly terms: string;
};

export type VendorDraftField = keyof VendorDraft;

export const emptyDraft: VendorDraft = { name: "", remitEmail: "", terms: defaultTerms };

declare const checkedBrand: unique symbol;
/** A draft that passed checkVendorDraft, the only input addVendor takes. */
export type NewVendor = Omit<Vendor, "id"> & { readonly [checkedBrand]: true };

export type DraftCheck =
  | { readonly ok: true; readonly vendor: NewVendor }
  | { readonly ok: false; readonly problems: Readonly<Partial<Record<VendorDraftField, string>>> };

export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

/** The WHATWG valid-email grammar, with at least one dot in the domain: `ap@vendor` is a typo in accounts payable. */
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function tidy(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function vendorKey(name: string): string {
  return tidy(name).toLocaleLowerCase("en-US");
}

function isPaymentTerms(value: string): value is PaymentTerms {
  return (paymentTerms as readonly string[]).includes(value);
}

function sameVendor(registry: readonly Vendor[], name: string): Vendor | undefined {
  const key = vendorKey(name);
  return registry.find((vendor) => vendorKey(vendor.name) === key);
}

export function checkVendorDraft(draft: VendorDraft, registry: readonly Vendor[]): DraftCheck {
  const name = tidy(draft.name);
  const remitEmail = draft.remitEmail.trim();
  const problems: Partial<Record<VendorDraftField, string>> = {};

  const existing = sameVendor(registry, name);
  if (name === "") problems.name = "Enter the vendor's name.";
  else if (name.length > NAME_MAX) problems.name = `Use ${NAME_MAX} characters or fewer.`;
  else if (existing) problems.name = `${existing.name} is already a vendor.`;

  if (remitEmail === "") problems.remitEmail = "Enter the email that gets remittance advice.";
  else if (remitEmail.length > EMAIL_MAX || !EMAIL.test(remitEmail)) problems.remitEmail = "Enter an email like ap@vendor.com.";

  const terms = isPaymentTerms(draft.terms) ? draft.terms : null;
  if (terms === null) problems.terms = "Choose payment terms.";

  if (terms === null || Object.keys(problems).length > 0) return { ok: false, problems };
  return { ok: true, vendor: { name, remitEmail, terms } as NewVendor };
}

function slug(name: string): string {
  const base = vendorKey(name)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base === "" ? "vendor" : base;
}

function mintId(taken: ReadonlySet<string>, name: string): VendorId {
  const base = slug(name);
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  return id as VendorId;
}

/**
 * Idempotent on the vendor's name: adding a name the registry already has
 * returns the registry as it is, with that vendor's id, so a double submit
 * never adds a second card. `reserved` holds vendors kept off this list whose
 * ids a new vendor still must not take, because they can show beside it later.
 */
export function addVendor(
  registry: readonly Vendor[],
  vendor: NewVendor,
  reserved: readonly Vendor[] = [],
): { readonly registry: readonly Vendor[]; readonly id: VendorId; readonly added: boolean } {
  const existing = sameVendor(registry, vendor.name);
  if (existing) return { registry, id: existing.id, added: false };
  const id = mintId(new Set([...registry, ...reserved].map((entry) => entry.id)), vendor.name);
  const { name, remitEmail, terms } = vendor;
  return { registry: [...registry, { id, name, remitEmail, terms }], id, added: true };
}

export type VendorRow = {
  readonly vendor: Vendor;
  /** Pending invoices. */
  readonly openCount: number;
  /** The invoice with the latest due date. */
  readonly lastInvoice: { readonly id: string; readonly number: string; readonly due: string } | null;
};

export function vendorRows(registry: readonly Vendor[], ledger: readonly Invoice[]): VendorRow[] {
  return registry
    .map((vendor) => {
      const key = vendorKey(vendor.name);
      const invoices = ledger.filter((invoice) => vendorKey(invoice.vendor) === key);
      const latest = invoices.reduce<Invoice | null>((last, invoice) => (last === null || invoice.dueOn > last.dueOn ? invoice : last), null);
      return {
        vendor,
        openCount: invoices.filter((invoice) => invoice.status === "pending").length,
        lastInvoice: latest ? { id: latest.id, number: latest.number, due: latest.due } : null,
      };
    })
    .sort((a, b) => a.vendor.name.localeCompare(b.vendor.name));
}

export type VendorSummary = {
  /** The registry's record, or null when the invoice names a vendor the registry does not hold. */
  readonly vendor: Vendor | null;
  /** Pending invoices from this vendor, this one included while it waits. */
  readonly openCount: number;
  /** The sum of this vendor's approved invoices. */
  readonly approvedCents: number;
};

/**
 * What the invoice page says about its vendor. The invoice counts with the
 * status the page shows, so a previewed or just-made decision moves the
 * counts the same way the facts above them move.
 */
export function vendorSummary(
  invoice: Invoice,
  shownStatus: InvoiceStatus,
  registry: readonly Vendor[],
  ledger: readonly Invoice[],
): VendorSummary {
  const key = vendorKey(invoice.vendor);
  const vendor = registry.find((entry) => vendorKey(entry.name) === key) ?? null;
  const theirs = [
    ...ledger.filter((entry) => entry.id !== invoice.id && vendorKey(entry.vendor) === key),
    { ...invoice, status: shownStatus },
  ];
  return {
    vendor,
    openCount: theirs.filter((entry) => entry.status === "pending").length,
    approvedCents: theirs.filter((entry) => entry.status === "approved").reduce((sum, entry) => sum + entry.amountCents, 0),
  };
}

export function searchVendors(rows: readonly VendorRow[], query: string): readonly VendorRow[] {
  const needle = vendorKey(query);
  if (needle === "") return rows;
  return rows.filter((row) => `${vendorKey(row.vendor.name)} ${row.vendor.remitEmail.toLowerCase()}`.includes(needle));
}

function sample(name: string, remitEmail: string, terms: PaymentTerms): Vendor {
  return { id: slug(name) as VendorId, name, remitEmail, terms };
}

/** One per vendor in sampleInvoices. A test holds every invoice's vendor to this list. */
export const sampleVendors: readonly Vendor[] = [
  sample("Brightline Paper Co", "ap@brightlinepaper.example", "net-30"),
  sample("Fieldnote Print", "billing@fieldnoteprint.example", "net-15"),
  sample("Harbor & Pine Catering", "accounts@harborandpine.example", "net-30"),
  sample("Helios Freight", "remit@heliosfreight.example", "net-45"),
  sample("Kite Analytics", "finance@kiteanalytics.example", "net-30"),
  sample("Lumen Cloud Services", "billing@lumencloud.example", "net-30"),
  sample("Northwind Office Supply", "ar@northwindoffice.example", "net-30"),
  sample("Sable Security", "payments@sablesecurity.example", "net-60"),
];

function checked(draft: VendorDraft): NewVendor {
  const result = checkVendorDraft(draft, sampleVendors);
  if (!result.ok) throw new Error(`The vendor-added preview's vendor does not pass its own checks: ${Object.values(result.problems).join(" ")}`);
  return result.vendor;
}

export const previewAddedVendor: NewVendor = checked({
  name: "Ridgeway Janitorial",
  remitEmail: "ap@ridgewayjanitorial.example",
  terms: "net-30",
});

export const previewAddedVendorId: VendorId = addVendor(sampleVendors, previewAddedVendor).id;

/**
 * Empty means nothing has loaded, so it shows only what this session added. A
 * session vendor whose name the preview already has stays hidden rather than
 * showing twice.
 */
/** Every vendor any preview can show, so a new vendor's id is unique wherever it appears. */
export function knownVendors(added: readonly Vendor[]): readonly Vendor[] {
  return [...addVendor(sampleVendors, previewAddedVendor).registry, ...added];
}

export function previewVendors(previewState: ModeledState | null, added: readonly Vendor[]): readonly Vendor[] {
  const base =
    previewState === "empty"
      ? []
      : previewState === "vendor-added"
        ? addVendor(sampleVendors, previewAddedVendor).registry
        : sampleVendors;
  if (added.length === 0) return base;
  return added.reduce<readonly Vendor[]>((registry, vendor) => (sameVendor(registry, vendor.name) ? registry : [...registry, vendor]), base);
}
