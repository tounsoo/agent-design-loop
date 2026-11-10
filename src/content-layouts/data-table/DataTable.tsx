import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SearchX } from "lucide-react";
import {
  Badge,
  Button,
  ChipList,
  EmptyState,
  Field,
  Label,
  Link,
  Menu,
  Pagination,
  ScrollArea,
  Stack,
  Table,
  Text,
  Toolbar,
  paginationRange,
  useAnnouncer,
  useFocusHandoff,
  VisuallyHidden,
  type BadgeTone,
  type TableSort,
} from "../../catalog";
import {
  balanceBucket,
  balanceBuckets,
  costCenters,
  dueBucket,
  dueBuckets,
  formatMoney,
  invoiceHref,
  paymentTerms,
  statusLabel,
  submitters,
  summarizeVendors,
  type CollectionRoute,
  type DueBucket,
  type Invoice,
  type InvoiceStatus,
  type VendorSummary,
} from "../../flows/invoice-approval";

/**
 * Data-table content layout. Filter bar and data table, composed the way
 * the Todae recipes describe. This module is product-owned glue. There is
 * no `DataTable.*` export in `@tounsoo/todae`.
 *
 * Search, sort, filters, and paging are not steps on the approval path.
 * Row selection is omitted: the queue's job is to open one invoice, and
 * there is no bulk approve. The invoice number is a link in the cell.
 *
 * https://todae.omsoo.design/recipes/filter-bar
 * https://todae.omsoo.design/recipes/data-table
 */

const PAGE_SIZE = 10;

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  "changes-requested": "info",
};

const AGING_TONE: Record<DueBucket, BadgeTone> = {
  Overdue: "critical",
  "Due in 7 days": "warning",
  "Due in 30 days": "info",
  Later: "neutral",
};

type Direction = "ascending" | "descending";

type Sort = { column: string; direction: Direction };

type Facet = {
  key: string;
  label: string;
  options: readonly string[];
};

type Column = {
  key: string;
  label: string;
  alignEnd?: boolean;
};

type ActiveChip = { key: string; label: string; value: string };

const INVOICE_COLUMNS: readonly Column[] = [
  { key: "number", label: "Invoice" },
  { key: "vendor", label: "Vendor" },
  { key: "status", label: "Status" },
  { key: "po", label: "PO" },
  { key: "amount", label: "Amount", alignEnd: true },
  { key: "due", label: "Due" },
  { key: "aging", label: "Aging" },
  { key: "terms", label: "Terms" },
  { key: "costCenter", label: "Cost center" },
  { key: "submitter", label: "Submitter" },
];

const VENDOR_COLUMNS: readonly Column[] = [
  { key: "name", label: "Vendor" },
  { key: "outstanding", label: "Outstanding", alignEnd: true },
  { key: "terms", label: "Terms" },
  { key: "open", label: "Open invoices", alignEnd: true },
  { key: "last", label: "Last invoice" },
];

export type CollectionBrowser = {
  heading: string;
  description: string;
  total: number;
  toolbar: ReactNode;
  table: ReactNode;
  pagination: ReactNode | null;
};

function noun(kind: "invoice" | "vendor", count: number): string {
  if (kind === "vendor") return count === 1 ? "vendor" : "vendors";
  return count === 1 ? "invoice" : "invoices";
}

function optionsIn<T extends string>(order: readonly T[], values: Iterable<T>): T[] {
  const have = new Set(values);
  return order.filter((item) => have.has(item));
}

function openLabel(count: number): string {
  return count > 0 ? "Has open invoices" : "No open invoices";
}

function compareValue(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right));
}

function invoiceSearchText(invoice: Invoice): string {
  return [
    invoice.number,
    invoice.vendor,
    invoice.poNumber,
    statusLabel[invoice.status],
    formatMoney(invoice.amountCents),
    invoice.due,
    dueBucket(invoice.dueOn),
    invoice.terms,
    invoice.costCenter,
    invoice.submitter,
  ].join(" ");
}

function vendorSearchText(row: VendorSummary): string {
  return [
    row.name,
    row.terms,
    formatMoney(row.outstandingCents),
    openLabel(row.openCount),
    row.openCount,
    row.lastNumber,
    row.lastDue,
  ].join(" ");
}

function invoiceFacetValue(invoice: Invoice, key: string): string {
  switch (key) {
    case "status":
      return statusLabel[invoice.status];
    case "vendor":
      return invoice.vendor;
    case "terms":
      return invoice.terms;
    case "aging":
      return dueBucket(invoice.dueOn);
    case "costCenter":
      return invoice.costCenter;
    case "submitter":
      return invoice.submitter;
    default:
      return "";
  }
}

function vendorFacetValue(row: VendorSummary, key: string): string {
  switch (key) {
    case "terms":
      return row.terms;
    case "open":
      return openLabel(row.openCount);
    case "balance":
      return balanceBucket(row.outstandingCents);
    default:
      return "";
  }
}

function invoiceSortValue(invoice: Invoice, column: string): string | number {
  switch (column) {
    case "amount":
      return invoice.amountCents;
    case "vendor":
      return invoice.vendor;
    case "status":
      return statusLabel[invoice.status];
    case "number":
      return invoice.number;
    case "po":
      return invoice.poNumber;
    case "terms":
      return invoice.terms;
    case "costCenter":
      return invoice.costCenter;
    case "submitter":
      return invoice.submitter;
    default:
      return invoice.dueOn;
  }
}

function vendorSortValue(row: VendorSummary, column: string): string | number {
  switch (column) {
    case "outstanding":
      return row.outstandingCents;
    case "terms":
      return row.terms;
    case "open":
      return row.openCount;
    case "last":
      return row.lastIssuedOn;
    default:
      return row.name;
  }
}

export function useCollectionBrowser(
  route: CollectionRoute,
  invoices: readonly Invoice[],
  onOpen: (invoiceId: string) => void,
): CollectionBrowser {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const firstFilter = useRef<HTMLButtonElement>(null);
  const announce = useAnnouncer();
  const chipsHandoff = useFocusHandoff({ to: firstFilter });
  const emptyHandoff = useFocusHandoff({ to: firstFilter });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, readonly string[]>>({});
  const [sorted, setSorted] = useState<Sort>({ column: "due", direction: "ascending" });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [seen, setSeen] = useState(route);
  const announced = useRef("");
  const skipAnnounce = useRef(true);

  if (seen !== route) {
    setSeen(route);
    setQuery("");
    setPage(1);
    setFilters({});
    setSorted(route === "vendors" ? { column: "name", direction: "ascending" } : { column: "due", direction: "ascending" });
    setOpenMenu(null);
    skipAnnounce.current = true;
  }

  const kind = route === "vendors" ? "vendor" : "invoice";
  const invoiceRows = route === "to-approve" ? invoices.filter((invoice) => invoice.status === "pending") : invoices;
  const vendorRows = summarizeVendors(invoices);
  const facets: readonly Facet[] =
    route === "vendors"
      ? [
          { key: "terms", label: "Terms", options: optionsIn(paymentTerms, vendorRows.map((row) => row.terms)) },
          { key: "open", label: "Open invoices", options: ["Has open invoices", "No open invoices"] },
          {
            key: "balance",
            label: "Balance",
            options: optionsIn(
              balanceBuckets,
              vendorRows.map((row) => balanceBucket(row.outstandingCents)),
            ),
          },
        ]
      : [
          ...(route === "invoices"
            ? [{ key: "status", label: "Status", options: ["Pending", "Approved", "Changes requested"] } satisfies Facet]
            : []),
          {
            key: "vendor",
            label: "Vendor",
            options: [...new Set(invoiceRows.map((invoice) => invoice.vendor))].sort((a, b) => a.localeCompare(b)),
          },
          { key: "terms", label: "Terms", options: optionsIn(paymentTerms, invoiceRows.map((invoice) => invoice.terms)) },
          {
            key: "aging",
            label: "Aging",
            options: optionsIn(
              dueBuckets,
              invoiceRows.map((invoice) => dueBucket(invoice.dueOn)),
            ),
          },
          {
            key: "costCenter",
            label: "Cost center",
            options: optionsIn(
              costCenters,
              invoiceRows.map((invoice) => invoice.costCenter),
            ),
          },
          {
            key: "submitter",
            label: "Submitter",
            options: optionsIn(
              submitters,
              invoiceRows.map((invoice) => invoice.submitter),
            ),
          },
        ];

  const needle = query.trim().toLowerCase();
  const active: ActiveChip[] = facets.flatMap((facet) =>
    facet.options
      .filter((option) => (filters[facet.key] ?? []).includes(option))
      .map((value) => ({ key: facet.key, label: facet.label, value })),
  );

  const invoiceMatches = invoiceRows.filter((invoice) => {
    if (needle && !invoiceSearchText(invoice).toLowerCase().includes(needle)) return false;
    return facets.every((facet) => {
      const chosen = filters[facet.key] ?? [];
      return chosen.length === 0 || chosen.includes(invoiceFacetValue(invoice, facet.key));
    });
  });
  const vendorMatches = vendorRows.filter((row) => {
    if (needle && !vendorSearchText(row).toLowerCase().includes(needle)) return false;
    return facets.every((facet) => {
      const chosen = filters[facet.key] ?? [];
      return chosen.length === 0 || chosen.includes(vendorFacetValue(row, facet.key));
    });
  });

  const direction = sorted.direction === "ascending" ? 1 : -1;
  const sortedInvoices = [...invoiceMatches].sort(
    (a, b) => direction * compareValue(invoiceSortValue(a, sorted.column), invoiceSortValue(b, sorted.column)),
  );
  const sortedVendors = [...vendorMatches].sort(
    (a, b) => direction * compareValue(vendorSortValue(a, sorted.column), vendorSortValue(b, sorted.column)),
  );
  const matchCount = route === "vendors" ? sortedVendors.length : sortedInvoices.length;
  const total = route === "vendors" ? vendorRows.length : invoiceRows.length;
  const pageCount = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageInvoices = sortedInvoices.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageVendors = sortedVendors.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const chosen = `${needle}|${active.map((chip) => `${chip.key}:${chip.value}`).join("|")}`;

  useEffect(() => {
    if (openMenu) return;
    const timer = setTimeout(() => {
      if (skipAnnounce.current) {
        skipAnnounce.current = false;
        announced.current = chosen;
        return;
      }
      if (announced.current === chosen) return;
      announced.current = chosen;
      const none = needle
        ? `No ${kind === "vendor" ? "vendors" : "invoices"} found`
        : active.length > 0
          ? `No ${kind === "vendor" ? "vendors" : "invoices"} match these filters`
          : `No ${kind === "vendor" ? "vendors" : "invoices"} left`;
      announce(matchCount === 0 ? none : `${matchCount} ${noun(kind, matchCount)} found`);
    }, 500);
    return () => clearTimeout(timer);
  }, [active.length, announce, chosen, kind, matchCount, needle, openMenu]);

  const changeQuery = (next: string) => {
    setQuery(next);
    setPage(1);
  };
  const sortBy = (column: string) => {
    setSorted((currentSort) => ({
      column,
      direction: currentSort.column === column && currentSort.direction === "ascending" ? "descending" : "ascending",
    }));
    setPage(1);
  };
  const toggle = (key: string, value: string, on: boolean) => {
    setFilters((currentFilters) => {
      const list = currentFilters[key] ?? [];
      return {
        ...currentFilters,
        [key]: on ? (list.includes(value) ? list : [...list, value]) : list.filter((item) => item !== value),
      };
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };
  const goTo = (to: number) => {
    if (to === current) return;
    setPage(to);
    announce(`Page ${to} of ${pageCount}`);
  };
  const sortOf = (column: string): TableSort => (sorted.column === column ? sorted.direction : "none");

  const copy =
    route === "vendors"
      ? meridianCopy(
          "Vendors",
          "Outstanding balance, terms, and open invoices for each vendor.",
          "Search vendors",
          "Filter vendors",
          "Vendors",
          "Vendors table",
          "Vendor pages",
        )
      : route === "invoices"
        ? meridianCopy(
            "All invoices",
            "Every invoice in the payables ledger.",
            "Search invoices",
            "Filter invoices",
            "Invoices",
            "Invoices table",
            "Invoice pages",
          )
        : meridianCopy(
            "To approve",
            "Vendor invoices waiting for a decision.",
            "Search invoices",
            "Filter invoices",
            "Invoices to approve",
            "Invoices table",
            "Invoice pages",
          );

  const filtered = active.length > 0;
  const emptyTitle = needle
    ? `No ${kind === "vendor" ? "vendors" : "invoices"} found`
    : filtered
      ? `No ${kind === "vendor" ? "vendors" : "invoices"} match these filters`
      : `No ${kind === "vendor" ? "vendors" : "invoices"}`;
  const emptyDescription = needle
    ? `Nothing matches “${query.trim()}”. Check the spelling or try a shorter search.`
    : filtered
      ? "Remove a filter or clear them all."
      : kind === "vendor"
        ? "There are no vendors in the ledger."
        : "There are no invoices in this view.";

  const toolbar = (
    <Stack.Root gap="normal">
      <Stack.Root align="end" direction="row" gap="normal" wrap>
        <Field.Group className="collection-search">
          <Label.Root htmlFor={searchId}>{copy.search}</Label.Root>
          <Field.Root id={searchId}>
            <Field.TextInput ref={searchRef} type="search" value={query} onValueChange={changeQuery} />
          </Field.Root>
        </Field.Group>
        <Toolbar.Root aria-label={copy.filters}>
          {facets.map((facet, index) => {
            const count = (filters[facet.key] ?? []).length;
            return (
              <Menu.Root
                key={facet.key}
                onOpenChange={(open) => setOpenMenu((currentMenu) => (open ? facet.key : currentMenu === facet.key ? null : currentMenu))}
              >
                <Menu.Trigger ref={index === 0 ? firstFilter : undefined} variant="secondary">
                  {facet.label}
                  {count > 0 ? (
                    <Badge.Root>
                      {count}
                      <VisuallyHidden.Root> selected</VisuallyHidden.Root>
                    </Badge.Root>
                  ) : null}
                </Menu.Trigger>
                <Menu.Content aria-label={facet.label}>
                  {facet.options.map((option) => (
                    <Menu.CheckboxItem
                      key={option}
                      checked={(filters[facet.key] ?? []).includes(option)}
                      onCheckedChange={(on) => toggle(facet.key, option, on)}
                    >
                      {option}
                    </Menu.CheckboxItem>
                  ))}
                </Menu.Content>
              </Menu.Root>
            );
          })}
        </Toolbar.Root>
      </Stack.Root>
      {active.length > 0 ? (
        <Stack.Root ref={chipsHandoff} align="center" direction="row" gap="condensed" wrap>
          <ChipList.Root
            aria-label="Active filters"
            chips={active.map(({ label, value }) => `${label}: ${value}`)}
            maxRows={2}
            onRemove={(index) => {
              const chip = active[index];
              if (chip) toggle(chip.key, chip.value, false);
            }}
          />
          <Button.Root type="button" variant="ghost" onClick={clearFilters}>
            Clear all
          </Button.Root>
        </Stack.Root>
      ) : null}
    </Stack.Root>
  );

  const emptyRow = (span: number) => (
    <Table.Row>
      <Table.Cell colSpan={span}>
        <EmptyState.Root>
          {needle ? (
            <EmptyState.Icon>
              <SearchX />
            </EmptyState.Icon>
          ) : null}
          <EmptyState.Title as="h3">{emptyTitle}</EmptyState.Title>
          <EmptyState.Description>{emptyDescription}</EmptyState.Description>
          {needle || filtered ? (
            <EmptyState.Actions ref={filtered && !needle ? emptyHandoff : undefined}>
              <Button.Root
                type="button"
                variant="secondary"
                onClick={() => {
                  if (needle) {
                    changeQuery("");
                    searchRef.current?.focus();
                  }
                  if (filtered) clearFilters();
                }}
              >
                {needle ? "Clear search" : "Clear filters"}
              </Button.Root>
            </EmptyState.Actions>
          ) : null}
        </EmptyState.Root>
      </Table.Cell>
    </Table.Row>
  );

  const header = (column: Column) => (
    <Table.HeaderCell key={column.key} className={column.alignEnd ? "num" : undefined} scope="col" sort={sortOf(column.key)}>
      <Table.SortButton onClick={() => sortBy(column.key)}>{column.label}</Table.SortButton>
    </Table.HeaderCell>
  );

  const table =
    route === "vendors" ? (
      <Stack.Root gap="condensed">
        <Text.Root tone="muted">{`${matchCount} of ${total} ${noun("vendor", total)}`}</Text.Root>
        <ScrollArea.Root aria-label={copy.scroll} axis="inline" className="queue-scroll" focusable>
          <Table.Root>
            <Table.Caption>{copy.caption}</Table.Caption>
            <Table.Head>
              <Table.Row>{VENDOR_COLUMNS.map((column) => header(column))}</Table.Row>
            </Table.Head>
            <Table.Body>
              {pageVendors.map((row) => (
                <Table.Row key={row.name}>
                  <Table.HeaderCell scope="row">{row.name}</Table.HeaderCell>
                  <Table.Cell className="num">{formatMoney(row.outstandingCents)}</Table.Cell>
                  <Table.Cell>{row.terms}</Table.Cell>
                  <Table.Cell className="num">{row.openCount}</Table.Cell>
                  <Table.Cell>
                    {row.lastNumber}
                    <Text.Root as="span" tone="muted">{` · ${row.lastDue}`}</Text.Root>
                  </Table.Cell>
                </Table.Row>
              ))}
              {pageVendors.length === 0 ? emptyRow(VENDOR_COLUMNS.length) : null}
            </Table.Body>
          </Table.Root>
        </ScrollArea.Root>
      </Stack.Root>
    ) : (
      <Stack.Root gap="condensed">
        <Text.Root tone="muted">{`${matchCount} of ${total} ${noun("invoice", total)}`}</Text.Root>
        <ScrollArea.Root aria-label={copy.scroll} axis="inline" className="queue-scroll" focusable>
          <Table.Root className="invoice-queue">
            <Table.Caption>{copy.caption}</Table.Caption>
            <Table.Head>
              <Table.Row>{INVOICE_COLUMNS.map((column) => header(column))}</Table.Row>
            </Table.Head>
            <Table.Body>
              {pageInvoices.map((invoice) => {
                const bucket = dueBucket(invoice.dueOn);
                return (
                  <Table.Row key={invoice.id}>
                    <Table.HeaderCell scope="row">
                      <Link.Root
                        href={invoiceHref(route, invoice.id)}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                          event.preventDefault();
                          onOpen(invoice.id);
                        }}
                      >
                        {invoice.number}
                        <VisuallyHidden.Root>{`, ${invoice.vendor}`}</VisuallyHidden.Root>
                      </Link.Root>
                    </Table.HeaderCell>
                    <Table.Cell>{invoice.vendor}</Table.Cell>
                    <Table.Cell>
                      <Badge.Root tone={STATUS_TONE[invoice.status]}>{statusLabel[invoice.status]}</Badge.Root>
                    </Table.Cell>
                    <Table.Cell>{invoice.poNumber}</Table.Cell>
                    <Table.Cell className="num">{formatMoney(invoice.amountCents)}</Table.Cell>
                    <Table.Cell>{invoice.due}</Table.Cell>
                    <Table.Cell>
                      <Badge.Root tone={AGING_TONE[bucket]}>{bucket}</Badge.Root>
                    </Table.Cell>
                    <Table.Cell>{invoice.terms}</Table.Cell>
                    <Table.Cell>{invoice.costCenter}</Table.Cell>
                    <Table.Cell>{invoice.submitter}</Table.Cell>
                  </Table.Row>
                );
              })}
              {pageInvoices.length === 0 ? emptyRow(INVOICE_COLUMNS.length) : null}
            </Table.Body>
          </Table.Root>
        </ScrollArea.Root>
      </Stack.Root>
    );

  const step = (to: number, label: string) => (
    <Pagination.Item>
      <Button.Root
        aria-disabled={to < 1 || to > pageCount ? true : undefined}
        type="button"
        variant="ghost"
        onClick={() => {
          if (to >= 1 && to <= pageCount) goTo(to);
        }}
      >
        {label}
      </Button.Root>
    </Pagination.Item>
  );

  const pagination =
    pageCount > 1 ? (
      <Pagination.Root aria-label={copy.pages}>
        {step(current - 1, "Previous")}
        {paginationRange({ page: current, count: pageCount }).map((item) =>
          typeof item === "number" ? (
            <Pagination.Item key={item}>
              <Button.Root
                aria-current={item === current ? "page" : undefined}
                type="button"
                variant="ghost"
                onClick={() => goTo(item)}
              >
                {item}
              </Button.Root>
            </Pagination.Item>
          ) : (
            <Pagination.Ellipsis key={item} />
          ),
        )}
        {step(current + 1, "Next")}
      </Pagination.Root>
    ) : null;

  return {
    heading: copy.heading,
    description: copy.description,
    total,
    toolbar,
    table,
    pagination,
  };
}

/** The ready collection body: filter bar, table, and pagination, in that order. */
export function DataTable({
  toolbar,
  table,
  pagination,
}: {
  toolbar: ReactNode;
  table: ReactNode;
  pagination: ReactNode | null;
}) {
  return (
    <Stack.Root data-content-layout="data-table" gap="spacious">
      <div data-slot="toolbar">{toolbar}</div>
      {table}
      {pagination ? <div data-slot="pagination">{pagination}</div> : null}
    </Stack.Root>
  );
}

function meridianCopy(
  heading: string,
  description: string,
  search: string,
  filters: string,
  caption: string,
  scroll: string,
  pages: string,
) {
  return { heading, description, search, filters, caption, scroll, pages };
}
