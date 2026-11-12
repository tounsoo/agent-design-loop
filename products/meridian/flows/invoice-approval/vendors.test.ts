import { describe, expect, it } from "vitest";
import { sampleInvoices } from "./states";
import {
  addVendor,
  checkVendorDraft,
  emptyDraft,
  previewAddedVendor,
  previewAddedVendorId,
  sampleVendors,
  searchVendors,
  vendorKey,
  vendorRows,
  knownVendors,
  previewVendors,
  type NewVendor,
} from "./vendors";

function valid(name: string, remitEmail = "ap@ridgeway.example"): NewVendor {
  const result = checkVendorDraft({ name, remitEmail, terms: "net-30" }, sampleVendors);
  if (!result.ok) throw new Error(`expected ${name} to pass: ${JSON.stringify(result.problems)}`);
  return result.vendor;
}

describe("vendor registry", () => {
  it("has a vendor for every invoice in the ledger, and no vendor twice", () => {
    const keys = sampleVendors.map((vendor) => vendorKey(vendor.name));
    for (const invoice of sampleInvoices) expect(keys).toContain(vendorKey(invoice.vendor));
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(sampleVendors.map((vendor) => vendor.id)).size).toBe(sampleVendors.length);
  });
});

describe("checkVendorDraft", () => {
  it("asks for every field of an empty form", () => {
    expect(checkVendorDraft(emptyDraft, sampleVendors)).toEqual({
      ok: false,
      problems: {
        name: "Enter the vendor's name.",
        remitEmail: "Enter the email that gets remittance advice.",
      },
    });
  });

  it("refuses a name the registry has, whatever its spacing and case, in the registry's spelling", () => {
    const result = checkVendorDraft({ name: "  northwind   OFFICE supply ", remitEmail: "ap@x.example", terms: "net-30" }, sampleVendors);
    expect(result).toEqual({ ok: false, problems: { name: "Northwind Office Supply is already a vendor." } });
  });

  it("refuses an email that is not an address, with a dotless domain included", () => {
    for (const remitEmail of ["ap", "ap@", "ap@vendor", "ap vendor@x.example", "@vendor.com"]) {
      const result = checkVendorDraft({ name: "Ridgeway Janitorial", remitEmail, terms: "net-30" }, sampleVendors);
      expect(result).toEqual({ ok: false, problems: { remitEmail: "Enter an email like ap@vendor.com." } });
    }
  });

  it("caps the name at 80 characters", () => {
    const result = checkVendorDraft({ name: "A".repeat(81), remitEmail: "ap@x.example", terms: "net-30" }, sampleVendors);
    expect(result).toEqual({ ok: false, problems: { name: "Use 80 characters or fewer." } });
    expect(checkVendorDraft({ name: "A".repeat(80), remitEmail: "ap@x.example", terms: "net-30" }, sampleVendors).ok).toBe(true);
  });

  it("refuses terms the select does not offer", () => {
    const result = checkVendorDraft({ name: "Ridgeway Janitorial", remitEmail: "ap@x.example", terms: "net-90" }, sampleVendors);
    expect(result).toEqual({ ok: false, problems: { terms: "Choose payment terms." } });
  });

  it("returns the tidied vendor when every rule holds", () => {
    const result = checkVendorDraft({ name: "  Ridgeway   Janitorial ", remitEmail: " ap@ridgeway.example ", terms: "net-45" }, sampleVendors);
    expect(result).toEqual({ ok: true, vendor: { name: "Ridgeway Janitorial", remitEmail: "ap@ridgeway.example", terms: "net-45" } });
  });
});

describe("addVendor", () => {
  it("adds a vendor with an id from its name", () => {
    const { registry, id, added } = addVendor(sampleVendors, valid("Ridgeway Janitorial"));
    expect(added).toBe(true);
    expect(id).toBe("ridgeway-janitorial");
    expect(registry).toHaveLength(sampleVendors.length + 1);
    expect(registry.find((vendor) => vendor.id === id)).toEqual({
      id,
      name: "Ridgeway Janitorial",
      remitEmail: "ap@ridgeway.example",
      terms: "net-30",
    });
  });

  it("adds the same name once, so a second submit changes nothing", () => {
    const first = addVendor(sampleVendors, valid("Ridgeway Janitorial"));
    const second = addVendor(first.registry, valid("ridgeway janitorial"));
    expect(second).toEqual({ registry: first.registry, id: first.id, added: false });
  });

  it("gives a name whose id is taken the next free id", () => {
    const one = addVendor(sampleVendors, valid("Pine & Co"));
    const two = addVendor(one.registry, valid("Pine and Co"));
    expect([one.id, two.id]).toEqual(["pine-and-co", "pine-and-co-2"]);
  });
});

describe("vendorRows", () => {
  it("joins each vendor's open invoices and latest invoice, sorted by name", () => {
    const rows = vendorRows(sampleVendors, sampleInvoices);
    expect(rows.map((row) => row.vendor.name)).toEqual([...sampleVendors.map((vendor) => vendor.name)].sort((a, b) => a.localeCompare(b)));
    const northwind = rows.find((row) => row.vendor.name === "Northwind Office Supply");
    expect(northwind).toMatchObject({ openCount: 1, lastInvoice: { id: "inv-1842", number: "INV-1842", due: "Nov 18, 2026" } });
    const kite = rows.find((row) => row.vendor.name === "Kite Analytics");
    expect(kite).toMatchObject({ openCount: 0, lastInvoice: { number: "INV-1802" } });
  });

  it("gives a vendor with no invoices no last invoice", () => {
    const { registry } = addVendor(sampleVendors, valid("Ridgeway Janitorial"));
    expect(vendorRows(registry, sampleInvoices).find((row) => row.vendor.name === "Ridgeway Janitorial")).toMatchObject({
      openCount: 0,
      lastInvoice: null,
    });
  });
});

describe("searchVendors", () => {
  const rows = vendorRows(sampleVendors, sampleInvoices);

  it("matches the name or the remittance email, ignoring case and spacing", () => {
    expect(searchVendors(rows, "  HELIOS ").map((row) => row.vendor.name)).toEqual(["Helios Freight"]);
    expect(searchVendors(rows, "billing@").map((row) => row.vendor.name)).toEqual(["Fieldnote Print", "Lumen Cloud Services"]);
    expect(searchVendors(rows, "")).toBe(rows);
    expect(searchVendors(rows, "zebra")).toEqual([]);
  });
});

describe("the vendors a preview shows", () => {
  it("adds the preview's vendor only on vendor-added", () => {
    expect(previewVendors("ready", [])).toBe(sampleVendors);
    const shown = previewVendors("vendor-added", []);
    expect(shown.find((vendor) => vendor.id === previewAddedVendorId)?.name).toBe(previewAddedVendor.name);
    expect(shown).toHaveLength(sampleVendors.length + 1);
  });

  it("shows no vendors on Empty, then the ones added there", () => {
    expect(previewVendors("empty", [])).toEqual([]);
    const { registry } = addVendor([], valid("Ridgeway Janitorial"));
    expect(previewVendors("empty", registry)).toEqual(registry);
  });

  it("follows the preview with vendors added this session, minus names it already has", () => {
    const fromEmpty = checkVendorDraft({ name: "northwind office supply", remitEmail: "ap@northwind.example", terms: "net-30" }, []);
    if (!fromEmpty.ok) throw new Error("expected the draft to pass against an empty list");
    const { registry } = addVendor([], fromEmpty.vendor);
    expect(previewVendors("ready", registry)).toBe(sampleVendors);
    const quarry = addVendor(sampleVendors, valid("Quarry Lane Movers")).registry.slice(-1);
    expect(previewVendors("ready", quarry)).toEqual([...sampleVendors, ...quarry]);
  });

  it("never mints an id a reserved vendor has, even one off the list", () => {
    const known = knownVendors([]);
    const harbor = addVendor([], valid("Harbor and Pine Catering"), known);
    expect(known.map((vendor) => vendor.id)).not.toContain(harbor.id);
    const ridgeway = addVendor(sampleVendors, valid("Ridgeway Janitorial."), known);
    expect(ridgeway.id).not.toBe(previewAddedVendorId);
  });

  it("gives two session vendors different ids when a preview hides the first", () => {
    const fromEmpty = checkVendorDraft({ name: "Northwind Office Supply", remitEmail: "ap@other.example", terms: "net-30" }, []);
    if (!fromEmpty.ok) throw new Error("expected the draft to pass against an empty list");
    const first = addVendor([], fromEmpty.vendor, knownVendors([]));
    const added = first.registry;
    const second = addVendor(previewVendors("ready", added), valid("Northwind Office Supply 2"), knownVendors(added));
    expect(second.id).not.toBe(first.id);
  });
});
