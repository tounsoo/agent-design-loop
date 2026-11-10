import { useId, type ReactElement } from "react";
import {
  Alert,
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
  Skeleton,
  Stack,
  Table,
  Text,
  VisuallyHidden,
} from "../../catalog";
import {
  formatMoney,
  routeHref,
  statusLabel,
  vendorById,
  vendorHref,
  type CollectionRoute,
  type FlowState,
  type Invoice,
  type ModeledState,
  type Vendor,
} from "../../flows/invoice-approval";
import { DataTable, useCollectionBrowser } from "../../content-layouts/data-table";
import { CollectionPage } from "../../page-types/collection";
import { DetailPage } from "../../page-types/detail";
import { navCopy } from "./navigation";
import { VendorIdentity, VendorInvoices } from "./vendor-record";

export type Actions = {
  retry: () => void;
  openInvoice: (invoiceId: string) => void;
  openVendor: (vendorId: string) => void;
  setLineItemsOpen: (open: boolean) => void;
  requestChanges: () => void;
  setReason: (reason: string) => void;
  approve: () => void;
};

type InvoiceRecord = {
  kind: "invoice";
  invoice: Invoice;
  flow: Extract<FlowState, { invoiceId: string }>;
};

type VendorRecord = {
  kind: "vendor";
  vendor: Vendor;
};

type DetailRecord = InvoiceRecord | VendorRecord;

/** States this module renders. A missing member is a type error. */
export const renderedStates = [
  "loading",
  "empty",
  "error",
  "ready",
  "invoice-approved",
  "changes-requested",
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

function LoadingBody() {
  return (
    <>
      <VisuallyHidden.Root>Loading invoices</VisuallyHidden.Root>
      <Stack.Root aria-hidden="true" gap="normal">
        <Loader.Root aria-label="Loading invoices" />
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

function EmptyBody({ route }: { route: CollectionRoute }) {
  const copy =
    route === "vendors"
      ? { title: "No vendors", description: "No vendors are in the ledger." }
      : route === "invoices"
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
      <Alert.Root role="none" tone="critical">
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

function RecordDetail({
  record,
  actions,
  route,
  ledger,
  vendorId,
  onNavigate,
}: {
  record: DetailRecord;
  actions: Actions;
  route: CollectionRoute;
  ledger: readonly Invoice[];
  vendorId: string | null;
  onNavigate: (href: string) => void;
}): ReactElement {
  const invoice = record.kind === "invoice" ? record.invoice : null;
  const flow = record.kind === "invoice" ? record.flow : null;
  const detail = flow?.status === "ready" ? flow : null;
  const outcome = flow?.status === "invoice-approved" ? "approved" : flow?.status === "changes-requested" ? "changes" : null;
  const shownStatus = outcome === "approved" ? "approved" : outcome === "changes" ? "changes-requested" : invoice?.status;
  const canAct = detail !== null && shownStatus === "pending";
  const reason = flow?.status === "changes-requested" ? flow.reason : (detail?.reason ?? "");
  const crumb = crumbFor(route);
  const vendors = navCopy("vendors");
  const fromVendor = record.kind === "invoice" && route === "vendors" ? vendorById(vendorId ?? "") : undefined;
  const linkedVendor = fromVendor && invoice && fromVendor.legalName === invoice.vendor ? fromVendor : null;

  return (
    <DetailPage state={flow?.status ?? "ready"}>
      <DetailPage.Breadcrumbs>
        <Breadcrumbs.Root>
          <Breadcrumbs.Item>
            <Link.Root
              href={record.kind === "vendor" ? vendors.href : crumb.href}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onNavigate(record.kind === "vendor" ? vendors.href : crumb.href);
              }}
            >
              {record.kind === "vendor" ? vendors.label : crumb.label}
            </Link.Root>
          </Breadcrumbs.Item>
          {linkedVendor ? (
            <Breadcrumbs.Item>
              <Link.Root
                href={vendorHref(linkedVendor.id)}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onNavigate(vendorHref(linkedVendor.id));
                }}
              >
                {linkedVendor.legalName}
              </Link.Root>
            </Breadcrumbs.Item>
          ) : null}
          <Breadcrumbs.Item current>{record.kind === "vendor" ? record.vendor.legalName : invoice?.number}</Breadcrumbs.Item>
        </Breadcrumbs.Root>
      </DetailPage.Breadcrumbs>
      <DetailPage.Heading>{record.kind === "vendor" ? record.vendor.legalName : invoice?.vendor}</DetailPage.Heading>
      <DetailPage.Meta>
        {record.kind === "vendor" ? (
          <VendorIdentity invoices={ledger} vendor={record.vendor} />
        ) : invoice && shownStatus ? (
          <InvoiceFacts invoice={invoice} status={shownStatus} />
        ) : null}
      </DetailPage.Meta>
      <DetailPage.Body>
        {record.kind === "vendor" ? (
          <VendorInvoices invoices={ledger} route={route} vendor={record.vendor} onOpen={actions.openInvoice} />
        ) : invoice ? (
          <>
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
          </>
        ) : null}
      </DetailPage.Body>
      {record.kind === "invoice" ? (
        <DetailPage.Secondary>
          <Button.Root disabled={!canAct} type="button" variant="secondary" onClick={actions.requestChanges}>
            Request changes
          </Button.Root>
        </DetailPage.Secondary>
      ) : null}
      {record.kind === "invoice" ? (
        <DetailPage.Primary>
          <Button.Root disabled={!canAct} type="button" onClick={actions.approve}>
            Approve
          </Button.Root>
        </DetailPage.Primary>
      ) : null}
    </DetailPage>
  );
}

export function InvoiceApprovalView({
  state,
  actions,
  route,
  ledger,
  vendorId,
  previewState,
  onNavigate,
}: {
  state: FlowState;
  actions: Actions;
  route: CollectionRoute;
  ledger: readonly Invoice[];
  vendorId: string | null;
  previewState: ModeledState | null;
  onNavigate: (href: string) => void;
}): ReactElement {
  const browser = useCollectionBrowser(route, ledger, actions.openInvoice, actions.openVendor);

  switch (state.status) {
    case "loading":
    case "empty":
    case "error":
    case "ready":
    case "invoice-approved":
    case "changes-requested":
      break;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }

  const invoiceState = showsDetail(state) ? state : null;
  const vendor =
    invoiceState == null && state.status === "ready" && route === "vendors" && previewState == null
      ? (vendorById(vendorId ?? "") ?? null)
      : null;

  if (vendor) {
    return (
      <RecordDetail
        actions={actions}
        ledger={ledger}
        record={{ kind: "vendor", vendor }}
        route={route}
        vendorId={vendorId}
        onNavigate={onNavigate}
      />
    );
  }

  if (!invoiceState) {
    const copy = navCopy(route);
    const ready = state.status === "ready";
    const showTable = ready && browser.total > 0;
    return (
      <CollectionPage state={state.status}>
        <CollectionPage.Heading>{ready ? browser.heading : copy.label}</CollectionPage.Heading>
        {ready ? <CollectionPage.Description>{browser.description}</CollectionPage.Description> : null}
        <CollectionPage.Body>
          {state.status === "loading" ? <LoadingBody /> : null}
          {state.status === "empty" || (ready && browser.total === 0) ? <EmptyBody route={route} /> : null}
          {state.status === "error" ? <ErrorBody message={state.message} onRetry={actions.retry} /> : null}
          {showTable ? (
            <DataTable pagination={browser.pagination} table={browser.table} toolbar={browser.toolbar} />
          ) : null}
        </CollectionPage.Body>
      </CollectionPage>
    );
  }

  const invoice = lookup(ledger, invoiceState.invoiceId);
  if (!invoice) throw new Error("The approval queue has no sample invoice.");

  return (
    <RecordDetail
      actions={actions}
      ledger={ledger}
      record={{ kind: "invoice", invoice, flow: invoiceState }}
      route={route}
      vendorId={vendorId}
      onNavigate={onNavigate}
    />
  );
}
