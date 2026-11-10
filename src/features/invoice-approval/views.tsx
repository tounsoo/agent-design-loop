import { useId, type ReactElement } from "react";
import {
  Alert,
  Badge,
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
  Table,
  Text,
  VisuallyHidden,
  type BadgeTone,
} from "../../catalog";
import {
  formatMoney,
  formatQuantity,
  invoiceSubtotalCents,
  lineAmountCents,
  routeHref,
  statusLabel,
  type CollectionRoute,
  type FlowState,
  type Invoice,
  type InvoiceStatus,
  type ModeledState,
} from "../../flows/invoice-approval";
import { DataTable, useCollectionBrowser } from "../../content-layouts/data-table";
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
};

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

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  "changes-requested": "info",
};

function InvoiceFacts({ invoice, status }: { invoice: Invoice; status: InvoiceStatus }) {
  const facts: { term: string; details: string }[] = [
    { term: "Vendor", details: invoice.vendor },
    { term: "Invoice", details: invoice.number },
    { term: "Status", details: statusLabel[status] },
    { term: "Total", details: formatMoney(invoice.amountCents) },
    { term: "Subtotal", details: formatMoney(invoiceSubtotalCents(invoice)) },
    { term: "Tax", details: formatMoney(invoice.taxCents) },
    { term: "Due", details: invoice.due },
    { term: "Invoice date", details: invoice.invoiceDate },
    { term: "Received", details: invoice.received },
    { term: "Payment terms", details: invoice.paymentTerms },
    { term: "PO number", details: invoice.poNumber },
    { term: "Billing entity", details: invoice.billingEntity },
    { term: "Submitted by", details: invoice.submittedBy },
    { term: "Payment method", details: invoice.paymentMethod },
    { term: "Currency", details: invoice.currency },
  ];
  return (
    <DataList.Root aria-label="Invoice" minItemSize="16rem" orientation="vertical">
      {facts.map((fact) => (
        <DataList.Item key={fact.term}>
          <DataList.Term>{fact.term}</DataList.Term>
          <DataList.Details>
            {fact.term === "Status" ? (
              <Badge.Root tone={STATUS_TONE[status]}>{fact.details}</Badge.Root>
            ) : fact.term === "Total" ? (
              <Text.Root as="span" weight="bold">
                {fact.details}
              </Text.Root>
            ) : (
              fact.details
            )}
          </DataList.Details>
        </DataList.Item>
      ))}
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
  const subtotal = invoiceSubtotalCents(invoice);
  return (
    <Disclosure.Root
      open={open}
      onToggle={(event) => {
        onToggle(event.currentTarget.open);
      }}
    >
      <Disclosure.Summary>Line items</Disclosure.Summary>
      <ScrollArea.Root aria-label={`${invoice.number} line items`} axis="inline" focusable>
        <Table.Root>
          <Table.Caption>{`${invoice.number} line items`}</Table.Caption>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell scope="col">Description</Table.HeaderCell>
              <Table.HeaderCell className="num" scope="col">
                Quantity
              </Table.HeaderCell>
              <Table.HeaderCell className="num" scope="col">
                Unit price
              </Table.HeaderCell>
              <Table.HeaderCell className="num" scope="col">
                Amount
              </Table.HeaderCell>
              <Table.HeaderCell scope="col">GL account</Table.HeaderCell>
              <Table.HeaderCell scope="col">Cost center</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {invoice.lines.map((line) => (
              <Table.Row key={line.description}>
                <Table.HeaderCell scope="row">{line.description}</Table.HeaderCell>
                <Table.Cell className="num">{formatQuantity(line.quantity)}</Table.Cell>
                <Table.Cell className="num">{formatMoney(line.unitPriceCents)}</Table.Cell>
                <Table.Cell className="num">{formatMoney(lineAmountCents(line))}</Table.Cell>
                <Table.Cell>{line.glAccount}</Table.Cell>
                <Table.Cell>{line.costCenter}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
          <Table.Foot>
            <Table.Row>
              <Table.HeaderCell scope="row">Subtotal</Table.HeaderCell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell className="num">{formatMoney(subtotal)}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
            <Table.Row>
              <Table.HeaderCell scope="row">Tax</Table.HeaderCell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell className="num">{formatMoney(invoice.taxCents)}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
            <Table.Row>
              <Table.HeaderCell scope="row">Total</Table.HeaderCell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell className="num">{formatMoney(invoice.amountCents)}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          </Table.Foot>
        </Table.Root>
      </ScrollArea.Root>
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

export function InvoiceApprovalView({
  state,
  actions,
  route,
  ledger,
  onNavigate,
}: {
  state: FlowState;
  actions: Actions;
  route: CollectionRoute;
  ledger: readonly Invoice[];
  onNavigate: (href: string) => void;
}): ReactElement {
  const browser = useCollectionBrowser(route, ledger, actions.openInvoice);

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

  if (!showsDetail(state)) {
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
        <InvoiceFacts invoice={invoice} status={shownStatus} />
      </DetailPage.Meta>
      <DetailPage.Body>
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
        <Button.Root disabled={!canAct} type="button" variant="secondary" onClick={actions.requestChanges}>
          Request changes
        </Button.Root>
      </DetailPage.Secondary>
      <DetailPage.Primary>
        <Button.Root disabled={!canAct} type="button" onClick={actions.approve}>
          Approve
        </Button.Root>
      </DetailPage.Primary>
    </DetailPage>
  );
}
