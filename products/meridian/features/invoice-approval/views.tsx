import type { ReactElement } from "react";
import {
  Alert,
  Breadcrumbs,
  Button,
  EmptyState,
  Link,
  Loader,
  Skeleton,
  Stack,
  submitOff,
  Text,
  VisuallyHidden,
} from "../../catalog";
import {
  formatMoney,
  lineTotal,
  routeHref,
  statusLabel,
  vendorRows,
  vendorsErrorMessage,
  type CollectionRoute,
  type FlowState,
  type Invoice,
  type InvoiceRoute,
  type ModeledState,
  type NewVendor,
  type Vendor,
} from "../../flows/invoice-approval";
import { DataTable, useCollectionBrowser } from "../../content-layouts/data-table";
import { Directory } from "../../content-layouts/directory";
import { Facts, type Fact } from "../../content-layouts/facts";
import { LineItems } from "../../content-layouts/line-items";
import { Progress, type Stage, type StageStatus } from "../../content-layouts/progress";
import { TextQuestion } from "../../content-layouts/text-question";
import { CollectionPage } from "../../page-types/collection";
import { DetailPage } from "../../page-types/detail";
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

/** The facts an invoice shows under its heading, with the status the page shows. */
function invoiceFacts(invoice: Invoice, status: Invoice["status"]): readonly Fact[] {
  return [
    { term: "Invoice", details: invoice.number },
    { term: "Vendor", details: invoice.vendor },
    { term: "Status", details: statusLabel[status] },
    { term: "Amount", details: formatMoney(invoice.amountCents) },
    { term: "Due", details: invoice.due },
  ];
}

const stagesByStatus: Record<Invoice["status"], readonly [StageStatus, StageStatus, StageStatus]> = {
  pending: ["done", "current", "pending"],
  approved: ["done", "done", "current"],
  "changes-requested": ["done", "error", "pending"],
};

/** An invoice's stages: received, approval and payment, and where it is now. */
function invoiceStages(invoice: Invoice, status: Invoice["status"]): readonly Stage[] {
  const [received, approval, payment] = stagesByStatus[status];
  return [
    { label: "Received", status: received },
    { label: "Approval", status: approval, ...(approval === "error" ? { statusLabel: "Changes requested" } : {}) },
    { label: `Payment due ${invoice.due}`, status: payment, ...(payment === "current" ? { statusLabel: "Next" } : {}) },
  ];
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
}: {
  state: ListState;
  registry: readonly Vendor[];
  ledger: readonly Invoice[];
  actions: Actions;
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
            onAdd={actions.addVendor}
          />
        ) : null}
      </CollectionPage.Body>
    </CollectionPage>
  );
}

export function InvoiceApprovalView({
  state,
  actions,
  route,
  ledger,
  registry,
  onNavigate,
}: {
  state: FlowState;
  actions: Actions;
  route: CollectionRoute;
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

  if (!showsDetail(state)) {
    if (state.status === "vendor-added" || route === "vendors") {
      return <VendorsCollection actions={actions} ledger={ledger} registry={registry} state={state} />;
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
          <Breadcrumbs.Item current>{invoice.number}</Breadcrumbs.Item>
        </Breadcrumbs.Root>
      </DetailPage.Breadcrumbs>
      <DetailPage.Heading>{invoice.vendor}</DetailPage.Heading>
      <DetailPage.Meta>
        <Facts items={invoiceFacts(invoice, shownStatus)} />
      </DetailPage.Meta>
      <DetailPage.Body>
        <Progress label="Invoice progress" stages={invoiceStages(invoice, shownStatus)} />
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
        <LineItems
          items={invoice.lines.map((line) => ({ description: line.description, amount: formatMoney(line.amountCents) }))}
          open={detail?.lineItemsOpen ?? false}
          total={formatMoney(lineTotal(invoice))}
          onToggle={actions.setLineItemsOpen}
        />
        {detail?.requestingChanges && outcome === null ? (
          <TextQuestion
            error="Enter what the vendor should change."
            hint="Required before the request is sent."
            invalid={detail.reasonError}
            label="What should change?"
            value={reason}
            onValueChange={actions.setReason}
          />
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
