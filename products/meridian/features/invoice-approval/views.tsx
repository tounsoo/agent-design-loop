import { useId, type ReactElement, type ReactNode } from "react";
import {
  Alert,
  Badge,
  type BadgeTone,
  Breadcrumbs,
  Button,
  DataList,
  Disclosure,
  EmptyState,
  ErrorMessage,
  Field,
  Label,
  Link,
  Loader,
  ScrollArea,
  Skeleton,
  Stack,
  Steps,
  Table,
  submitOff,
  Text,
  VisuallyHidden,
} from "../../catalog";
import {
  formatMoney,
  invoiceHref,
  lineTotal,
  routeHref,
  statusLabel,
  termsLabel,
  vendorHref,
  vendorProfile,
  vendorRows,
  vendorsErrorMessage,
  type CollectionRoute,
  type FlowState,
  type Invoice,
  type InvoiceRoute,
  type ModeledState,
  type NewVendor,
  type Vendor,
  type VendorProfile,
} from "../../flows/invoice-approval";
import { DataTable, useCollectionBrowser } from "../../content-layouts/data-table";
import { Directory } from "../../content-layouts/directory";
import { CollectionPage } from "../../page-types/collection";
import { DetailPage } from "../../page-types/detail";
import { ProfilePage } from "../../page-types/profile";
import { navCopy } from "./navigation";

export type Actions = {
  retry: () => void;
  openInvoice: (invoiceId: string) => void;
  setLineItemsOpen: (open: boolean) => void;
  requestChanges: () => void;
  setReason: (reason: string) => void;
  approve: () => void;
  addVendor: (vendor: NewVendor) => void;
};

/** States this module renders. A missing member is a type error. */
export const renderedStates = [
  "loading",
  "empty",
  "error",
  "ready",
  "invoice-approved",
  "changes-requested",
  "vendor-added",
] as const satisfies readonly ModeledState[];

type MissingView = Exclude<ModeledState, (typeof renderedStates)[number]>;
type ViewsCovered = MissingView extends never ? true : never;
export const viewsCovered: ViewsCovered = true;

function lookup(ledger: readonly Invoice[], id: string): Invoice | undefined {
  return ledger.find((invoice) => invoice.id === id) ?? ledger[0];
}

function showsDetail(state: FlowState): state is Extract<FlowState, { invoiceId: string }> {
  return (
    state.status === "invoice-approved" ||
    state.status === "changes-requested" ||
    (state.status === "ready" && state.screen === "detail")
  );
}

/** A state that lists records: everything but an opened invoice. */
type ListState = Exclude<FlowState, { invoiceId: string }>;

function LoadingBody({ label }: { label: string }) {
  return (
    <>
      <VisuallyHidden.Root role="status">{label}</VisuallyHidden.Root>
      <Stack.Root aria-hidden="true" gap="normal">
        <Loader.Root aria-label={label} />
        <Skeleton.Root>
          <Text.Root>Northwind Office Supply</Text.Root>
        </Skeleton.Root>
        <Skeleton.Root>
          <Text.Root>Helios Freight</Text.Root>
        </Skeleton.Root>
      </Stack.Root>
    </>
  );
}

function EmptyBody({ route }: { route: InvoiceRoute }) {
  const copy =
    route === "invoices"
      ? { title: "No invoices", description: "The ledger has no invoices." }
      : { title: "No invoices waiting", description: "Nothing needs approval right now." };
  return (
    <EmptyState.Root>
      <EmptyState.Title as="h2">{copy.title}</EmptyState.Title>
      <EmptyState.Description>{copy.description}</EmptyState.Description>
    </EmptyState.Root>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack.Root align="start" gap="normal">
      <Alert.Root role="alert" tone="critical">
        <Alert.Title>{message}</Alert.Title>
      </Alert.Root>
      <Button.Root type="button" variant="secondary" onClick={onRetry}>
        Try again
      </Button.Root>
    </Stack.Root>
  );
}

function InvoiceFacts({ invoice, status }: { invoice: Invoice; status: Invoice["status"] }) {
  return (
    <DataList.Root orientation="horizontal">
      <DataList.Item>
        <DataList.Term>Invoice</DataList.Term>
        <DataList.Details>{invoice.number}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Vendor</DataList.Term>
        <DataList.Details>{invoice.vendor}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Status</DataList.Term>
        <DataList.Details>{statusLabel[status]}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Amount</DataList.Term>
        <DataList.Details>{formatMoney(invoice.amountCents)}</DataList.Details>
      </DataList.Item>
      <DataList.Item>
        <DataList.Term>Due</DataList.Term>
        <DataList.Details>{invoice.due}</DataList.Details>
      </DataList.Item>
    </DataList.Root>
  );
}

type StageStatus = "done" | "current" | "pending" | "error";

const stagesByStatus: Record<Invoice["status"], readonly [StageStatus, StageStatus, StageStatus]> = {
  pending: ["done", "current", "pending"],
  approved: ["done", "done", "current"],
  "changes-requested": ["done", "error", "pending"],
};

function InvoiceProgress({ invoice, status }: { invoice: Invoice; status: Invoice["status"] }) {
  const [received, approval, payment] = stagesByStatus[status];
  return (
    <Steps.Root aria-label="Invoice progress" variant="progress">
      <Steps.Item status={received}>Received</Steps.Item>
      <Steps.Item status={approval} statusLabel={approval === "error" ? "Changes requested" : undefined}>
        Approval
      </Steps.Item>
      <Steps.Item status={payment} statusLabel={payment === "current" ? "Next" : undefined}>
        Payment due {invoice.due}
      </Steps.Item>
    </Steps.Root>
  );
}

function LineItems({
  invoice,
  open,
  onToggle,
}: {
  invoice: Invoice;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  return (
    <Disclosure.Root
      open={open}
      onToggle={(event) => {
        onToggle(event.currentTarget.open);
      }}
    >
      <Disclosure.Summary>Line items</Disclosure.Summary>
      <Table.Root>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell scope="col">Description</Table.HeaderCell>
            <Table.HeaderCell scope="col">Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {invoice.lines.map((line) => (
            <Table.Row key={line.description}>
              <Table.Cell>{line.description}</Table.Cell>
              <Table.Cell>{formatMoney(line.amountCents)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        <Table.Foot>
          <Table.Row>
            <Table.HeaderCell scope="row">Total</Table.HeaderCell>
            <Table.Cell>{formatMoney(lineTotal(invoice))}</Table.Cell>
          </Table.Row>
        </Table.Foot>
      </Table.Root>
    </Disclosure.Root>
  );
}

function ReasonField({
  reason,
  reasonError,
  onReason,
}: {
  reason: string;
  reasonError: boolean;
  onReason: (reason: string) => void;
}) {
  const fieldId = useId();
  const errorId = useId();
  return (
    <Stack.Root gap="condensed">
      <Label.Root htmlFor={fieldId}>What should change?</Label.Root>
      <Field.Root id={fieldId} invalid={reasonError}>
        <Field.Textarea
          aria-describedby={reasonError ? errorId : undefined}
          rows={3}
          value={reason}
          onValueChange={onReason}
        />
      </Field.Root>
      {reasonError ? (
        <ErrorMessage.Root id={errorId}>Enter what the vendor should change.</ErrorMessage.Root>
      ) : (
        <Text.Root tone="muted">Required before the request is sent.</Text.Root>
      )}
    </Stack.Root>
  );
}

function crumbFor(route: CollectionRoute): { href: string; label: string } {
  if (route === "invoices" || route === "vendors") {
    const copy = navCopy(route);
    return { href: copy.href, label: copy.label };
  }
  return { href: routeHref("to-approve"), label: "To approve" };
}

function InvoicesCollection({
  state,
  route,
  ledger,
  actions,
}: {
  state: Exclude<ListState, { status: "vendor-added" }>;
  route: InvoiceRoute;
  ledger: readonly Invoice[];
  actions: Actions;
}) {
  const browser = useCollectionBrowser(route, ledger, actions.openInvoice);
  const copy = navCopy(route);
  const ready = state.status === "ready";
  const showTable = ready && browser.total > 0;
  return (
    <CollectionPage state={state.status}>
      <CollectionPage.Heading>{ready ? browser.heading : copy.label}</CollectionPage.Heading>
      {ready ? <CollectionPage.Description>{browser.description}</CollectionPage.Description> : null}
      <CollectionPage.Body>
        {state.status === "loading" ? <LoadingBody label="Loading invoices" /> : null}
        {state.status === "empty" || (ready && browser.total === 0) ? <EmptyBody route={route} /> : null}
        {state.status === "error" ? <ErrorBody message={state.message} onRetry={actions.retry} /> : null}
        {showTable ? (
          <DataTable pagination={browser.pagination} table={browser.table} toolbar={browser.toolbar} />
        ) : null}
      </CollectionPage.Body>
    </CollectionPage>
  );
}

function VendorsCollection({
  state,
  registry,
  ledger,
  actions,
  onNavigate,
}: {
  state: ListState;
  registry: readonly Vendor[];
  ledger: readonly Invoice[];
  actions: Actions;
  onNavigate: (href: string) => void;
}) {
  const copy = navCopy("vendors");
  const listed = state.status === "ready" || state.status === "empty" || state.status === "vendor-added";
  return (
    <CollectionPage state={state.status}>
      <CollectionPage.Heading>{copy.label}</CollectionPage.Heading>
      {listed ? <CollectionPage.Description>{copy.description}</CollectionPage.Description> : null}
      <CollectionPage.Body>
        {state.status === "loading" ? <LoadingBody label="Loading vendors" /> : null}
        {state.status === "error" ? <ErrorBody message={vendorsErrorMessage} onRetry={actions.retry} /> : null}
        {listed ? (
          <Directory
            justAdded={state.status === "vendor-added" ? state.vendorId : null}
            rows={vendorRows(registry, ledger)}
            vendorHref={vendorHref}
            onAdd={actions.addVendor}
            onOpenVendor={(vendorId) => onNavigate(vendorHref(vendorId))}
          />
        ) : null}
      </CollectionPage.Body>
    </CollectionPage>
  );
}

/** A link that changes the page in place, unless the person asks for a new tab or window. */
function PageLink({ href, onNavigate, children }: { href: string; onNavigate: (href: string) => void; children: ReactNode }) {
  return (
    <Link.Root
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {children}
    </Link.Root>
  );
}

const statusTone: Record<Invoice["status"], BadgeTone> = {
  pending: "warning",
  approved: "success",
  "changes-requested": "info",
};

function VendorInvoices({
  label,
  vendorId,
  invoices,
  withStatus,
  onNavigate,
}: {
  label: string;
  vendorId: string;
  invoices: readonly Invoice[];
  withStatus: boolean;
  onNavigate: (href: string) => void;
}) {
  // A phone is narrower than four columns, so the table scrolls inside its own frame and the page does not.
  return (
    <ScrollArea.Root aria-label={`${label} table`} axis="inline" focusable>
      <Table.Root aria-label={label}>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell scope="col">Invoice</Table.HeaderCell>
            {withStatus ? <Table.HeaderCell scope="col">Status</Table.HeaderCell> : null}
            <Table.HeaderCell className="num" scope="col">
              Amount
            </Table.HeaderCell>
            <Table.HeaderCell scope="col">Due</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {invoices.map((invoice) => (
            <Table.Row key={invoice.id}>
              <Table.HeaderCell scope="row">
                <PageLink href={invoiceHref("vendors", invoice.id, vendorId)} onNavigate={onNavigate}>
                  {invoice.number}
                </PageLink>
              </Table.HeaderCell>
              {withStatus ? (
                <Table.Cell>
                  <Badge.Root tone={statusTone[invoice.status]}>{statusLabel[invoice.status]}</Badge.Root>
                </Table.Cell>
              ) : null}
              <Table.Cell className="num">{formatMoney(invoice.amountCents)}</Table.Cell>
              <Table.Cell>{invoice.due}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </ScrollArea.Root>
  );
}

/** One vendor: where its money goes, what is still open, and what is approved. A section with nothing in it is left out. */
function VendorPage({ profile, onNavigate }: { profile: VendorProfile; onNavigate: (href: string) => void }) {
  const { vendor, open, approved } = profile;
  const vendors = navCopy("vendors");
  return (
    <ProfilePage state="ready">
      <ProfilePage.Breadcrumbs>
        <Breadcrumbs.Root>
          <Breadcrumbs.Item>
            <PageLink href={vendors.href} onNavigate={onNavigate}>
              {vendors.label}
            </PageLink>
          </Breadcrumbs.Item>
          <Breadcrumbs.Item current>{vendor.name}</Breadcrumbs.Item>
        </Breadcrumbs.Root>
      </ProfilePage.Breadcrumbs>
      <ProfilePage.Heading>{vendor.name}</ProfilePage.Heading>
      <ProfilePage.Meta>
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.Term>Remittance</DataList.Term>
            <DataList.Details>{vendor.remitEmail}</DataList.Details>
          </DataList.Item>
          <DataList.Item>
            <DataList.Term>Terms</DataList.Term>
            <DataList.Details>{termsLabel[vendor.terms]}</DataList.Details>
          </DataList.Item>
          <DataList.Item>
            <DataList.Term>Open total</DataList.Term>
            <DataList.Details>{formatMoney(profile.openTotalCents)}</DataList.Details>
          </DataList.Item>
        </DataList.Root>
      </ProfilePage.Meta>
      <ProfilePage.Body>
        {open.length > 0 ? (
          <ProfilePage.Section title="Open invoices">
            <VendorInvoices invoices={open} label="Open invoices" vendorId={vendor.id} withStatus onNavigate={onNavigate} />
          </ProfilePage.Section>
        ) : null}
        {approved.length > 0 ? (
          <ProfilePage.Section title="Approved">
            <VendorInvoices invoices={approved} label="Approved" vendorId={vendor.id} withStatus={false} onNavigate={onNavigate} />
          </ProfilePage.Section>
        ) : null}
        {open.length === 0 && approved.length === 0 ? <Text.Root tone="muted">No invoices from this vendor yet.</Text.Root> : null}
      </ProfilePage.Body>
    </ProfilePage>
  );
}

export function InvoiceApprovalView({
  state,
  actions,
  route,
  vendorId = null,
  ledger,
  registry,
  onNavigate,
}: {
  state: FlowState;
  actions: Actions;
  route: CollectionRoute;
  /** The vendor whose page an invoice was opened from, if any. */
  vendorId?: string | null;
  ledger: readonly Invoice[];
  registry: readonly Vendor[];
  onNavigate: (href: string) => void;
}): ReactElement {
  switch (state.status) {
    case "loading":
    case "empty":
    case "error":
    case "ready":
    case "invoice-approved":
    case "changes-requested":
    case "vendor-added":
      break;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }

  if (state.status === "ready" && state.screen === "vendor") {
    const profile = vendorProfile(registry, ledger, state.vendorId);
    // A link to a vendor Meridian does not have opens the Vendors page.
    if (profile === null) {
      const list = { status: "ready", screen: "collection" } as const;
      return <VendorsCollection actions={actions} ledger={ledger} registry={registry} state={list} onNavigate={onNavigate} />;
    }
    return <VendorPage profile={profile} onNavigate={onNavigate} />;
  }

  if (!showsDetail(state)) {
    if (state.status === "vendor-added" || route === "vendors") {
      return <VendorsCollection actions={actions} ledger={ledger} registry={registry} state={state} onNavigate={onNavigate} />;
    }
    return <InvoicesCollection actions={actions} ledger={ledger} route={route} state={state} />;
  }

  const invoice = lookup(ledger, state.invoiceId);
  if (!invoice) throw new Error("The approval queue has no sample invoice.");
  const detail = state.status === "ready" ? state : null;
  const outcome = state.status === "invoice-approved" ? "approved" : state.status === "changes-requested" ? "changes" : null;
  const shownStatus = outcome === "approved" ? "approved" : outcome === "changes" ? "changes-requested" : invoice.status;
  const canAct = detail !== null && shownStatus === "pending";
  const reason = state.status === "changes-requested" ? state.reason : (detail?.reason ?? "");
  const crumb = crumbFor(route);
  // Opened from a vendor's page: the breadcrumb leads back to that vendor too.
  const fromVendor = route === "vendors" && vendorId ? registry.find((entry) => entry.id === vendorId && entry.name === invoice.vendor) : undefined;

  return (
    <DetailPage state={state.status}>
      <DetailPage.Breadcrumbs>
        <Breadcrumbs.Root>
          <Breadcrumbs.Item>
            <Link.Root
              href={crumb.href}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onNavigate(crumb.href);
              }}
            >
              {crumb.label}
            </Link.Root>
          </Breadcrumbs.Item>
          {fromVendor ? (
            <Breadcrumbs.Item>
              <PageLink href={vendorHref(fromVendor.id)} onNavigate={onNavigate}>
                {fromVendor.name}
              </PageLink>
            </Breadcrumbs.Item>
          ) : null}
          <Breadcrumbs.Item current>{invoice.number}</Breadcrumbs.Item>
        </Breadcrumbs.Root>
      </DetailPage.Breadcrumbs>
      <DetailPage.Heading>{invoice.vendor}</DetailPage.Heading>
      <DetailPage.Meta>
        <InvoiceFacts invoice={invoice} status={shownStatus} />
      </DetailPage.Meta>
      <DetailPage.Body>
        <InvoiceProgress invoice={invoice} status={shownStatus} />
        <Stack.Root gap="normal" role="status">
          {outcome === "approved" ? (
            <Alert.Root role="none" tone="success">
              <Alert.Title>Invoice approved</Alert.Title>
              <Alert.Description>
                {invoice.vendor} · {formatMoney(invoice.amountCents)} is approved.
              </Alert.Description>
            </Alert.Root>
          ) : null}
          {outcome === "changes" ? (
            <Alert.Root role="none" tone="info">
              <Alert.Title>Changes requested</Alert.Title>
              <Alert.Description>{reason}</Alert.Description>
            </Alert.Root>
          ) : null}
        </Stack.Root>
        <LineItems invoice={invoice} open={detail?.lineItemsOpen ?? false} onToggle={actions.setLineItemsOpen} />
        {detail?.requestingChanges && outcome === null ? (
          <ReasonField reason={reason} reasonError={detail.reasonError} onReason={actions.setReason} />
        ) : null}
      </DetailPage.Body>
      <DetailPage.Secondary>
        <Button.Root {...submitOff(!canAct)} type="button" variant="secondary" onClick={actions.requestChanges}>
          Request changes
        </Button.Root>
      </DetailPage.Secondary>
      <DetailPage.Primary>
        <Button.Root {...submitOff(!canAct)} type="button" onClick={actions.approve}>
          Approve
        </Button.Root>
      </DetailPage.Primary>
    </DetailPage>
  );
}
