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
  formatMoney,
  invoiceHref,
  statusLabel,
  type CollectionRoute,
  type Invoice,
  type InvoiceStatus,
} from "../../flows/invoice-approval";

/**
 * Filter bar + data table, composed the way the Todae recipes describe.
 * Search, sort, filters, and paging are not steps on the approval path.
 * Row selection is omitted: the queue's job is to open one invoice, and
 * there is no bulk approve.
 *
 * https://todae.omsoo.design/recipes/filter-bar
 * https://todae.omsoo.design/recipes/data-table
 */

const PAGE_SIZE = 5;

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  "changes-requested": "info",
};

type Direction = "ascending" | "descending";

type Sort = { column: string; direction: Direction };

type Facet = {
  key: string;
  label: string;
  options: readonly string[];
};

type ActiveChip = { key: string; label: string; value: string };

type VendorRow = {
  name: string;
  openCount: number;
  lastNumber: string;
  lastDue: string;
  lastDueOn: string;
  open: string;
};

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

function vendorsFrom(invoices: readonly Invoice[]): VendorRow[] {
  const byName = new Map<string, VendorRow>();
  for (const invoice of invoices) {
    const current = byName.get(invoice.vendor);
    if (!current) {
      byName.set(invoice.vendor, {
        name: invoice.vendor,
        openCount: invoice.status === "pending" ? 1 : 0,
        lastNumber: invoice.number,
        lastDue: invoice.due,
        lastDueOn: invoice.dueOn,
        open: "",
      });
      continue;
    }
    const later = invoice.dueOn > current.lastDueOn;
    byName.set(invoice.vendor, {
      name: invoice.vendor,
      openCount: current.openCount + (invoice.status === "pending" ? 1 : 0),
      lastNumber: later ? invoice.number : current.lastNumber,
      lastDue: later ? invoice.due : current.lastDue,
      lastDueOn: later ? invoice.dueOn : current.lastDueOn,
      open: "",
    });
  }
  return [...byName.values()]
    .map((row) => ({ ...row, open: row.openCount > 0 ? "Has open invoices" : "No open invoices" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function compareValue(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right));
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
  const vendorRows = vendorsFrom(invoices);
  const facets: readonly Facet[] =
    route === "vendors"
      ? [{ key: "open", label: "Open invoices", options: ["Has open invoices", "No open invoices"] }]
      : [
          ...(route === "invoices"
            ? [{ key: "status", label: "Status", options: ["Pending", "Approved", "Changes requested"] } satisfies Facet]
            : []),
          {
            key: "vendor",
            label: "Vendor",
            options: [...new Set(invoiceRows.map((invoice) => invoice.vendor))].sort((a, b) => a.localeCompare(b)),
          },
        ];

  const needle = query.trim().toLowerCase();
  const active: ActiveChip[] = facets.flatMap((facet) =>
    facet.options
      .filter((option) => (filters[facet.key] ?? []).includes(option))
      .map((value) => ({ key: facet.key, label: facet.label, value })),
  );

  const invoiceValue = (invoice: Invoice, column: string): string | number => {
    if (column === "amount") return invoice.amountCents;
    if (column === "vendor") return invoice.vendor;
    if (column === "status") return statusLabel[invoice.status];
    if (column === "number") return invoice.number;
    return invoice.dueOn;
  };
  const vendorValue = (row: VendorRow, column: string): string | number => {
    if (column === "open") return row.openCount;
    if (column === "last") return row.lastDueOn;
    return row.name;
  };

  const invoiceMatches = invoiceRows.filter((invoice) => {
    const text = `${invoice.number} ${invoice.poNumber} ${invoice.vendor} ${statusLabel[invoice.status]} ${formatMoney(invoice.amountCents)} ${invoice.due}`;
    if (needle && !text.toLowerCase().includes(needle)) return false;
    return facets.every((facet) => {
      const chosen = filters[facet.key] ?? [];
      if (chosen.length === 0) return true;
      const value = facet.key === "status" ? statusLabel[invoice.status] : invoice.vendor;
      return chosen.includes(value);
    });
  });
  const vendorMatches = vendorRows.filter((row) => {
    const text = `${row.name} ${row.lastNumber} ${row.lastDue} ${row.openCount}`;
    if (needle && !text.toLowerCase().includes(needle)) return false;
    return facets.every((facet) => {
      const chosen = filters[facet.key] ?? [];
      return chosen.length === 0 || chosen.includes(row.open);
    });
  });

  const direction = sorted.direction === "ascending" ? 1 : -1;
  const sortedInvoices = [...invoiceMatches].sort(
    (a, b) => direction * compareValue(invoiceValue(a, sorted.column), invoiceValue(b, sorted.column)),
  );
  const sortedVendors = [...vendorMatches].sort(
    (a, b) => direction * compareValue(vendorValue(a, sorted.column), vendorValue(b, sorted.column)),
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
      ? meridianCopy("Vendors", "Vendors with invoices in Meridian.", "Search vendors", "Filter vendors", "Vendors", "Vendors table", "Vendor pages")
      : route === "invoices"
        ? meridianCopy("All invoices", "Every invoice in the payables ledger.", "Search invoices", "Filter invoices", "Invoices", "Invoices table", "Invoice pages")
        : meridianCopy("To approve", "Vendor invoices waiting for a decision.", "Search invoices", "Filter invoices", "Invoices to approve", "Invoices table", "Invoice pages");

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
              <Menu.Root key={facet.key} onOpenChange={(open) => setOpenMenu((currentMenu) => (open ? facet.key : currentMenu === facet.key ? null : currentMenu))}>
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

  const header = (column: string, label: string, alignEnd = false) => (
    <Table.HeaderCell className={alignEnd ? "num" : undefined} scope="col" sort={sortOf(column)}>
      <Table.SortButton onClick={() => sortBy(column)}>{label}</Table.SortButton>
    </Table.HeaderCell>
  );

  const table =
    route === "vendors" ? (
      <Stack.Root gap="condensed">
        <Text.Root tone="muted">{`${matchCount} of ${total} ${noun("vendor", total)}`}</Text.Root>
        <ScrollArea.Root aria-label={copy.scroll} axis="inline" focusable>
          <Table.Root>
            <Table.Caption>{copy.caption}</Table.Caption>
            <Table.Head>
              <Table.Row>
                {header("name", "Vendor")}
                {header("open", "Open invoices", true)}
                {header("last", "Last invoice")}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {pageVendors.map((row) => (
                <Table.Row key={row.name}>
                  <Table.HeaderCell scope="row">{row.name}</Table.HeaderCell>
                  <Table.Cell className="num">{row.openCount}</Table.Cell>
                  <Table.Cell>
                    {row.lastNumber}
                    <Text.Root as="span" tone="muted">{` · ${row.lastDue}`}</Text.Root>
                  </Table.Cell>
                </Table.Row>
              ))}
              {pageVendors.length === 0 ? emptyRow(3) : null}
            </Table.Body>
          </Table.Root>
        </ScrollArea.Root>
      </Stack.Root>
    ) : (
      <Stack.Root gap="condensed">
        <Text.Root tone="muted">{`${matchCount} of ${total} ${noun("invoice", total)}`}</Text.Root>
        <ScrollArea.Root aria-label={copy.scroll} axis="inline" focusable>
          <Table.Root>
            <Table.Caption>{copy.caption}</Table.Caption>
            <Table.Head>
              <Table.Row>
                {header("number", "Invoice")}
                {header("vendor", "Vendor")}
                {header("status", "Status")}
                {header("amount", "Amount", true)}
                {header("due", "Due")}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {pageInvoices.map((invoice) => (
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
                  <Table.Cell className="num">{formatMoney(invoice.amountCents)}</Table.Cell>
                  <Table.Cell>{invoice.due}</Table.Cell>
                </Table.Row>
              ))}
              {pageInvoices.length === 0 ? emptyRow(5) : null}
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
