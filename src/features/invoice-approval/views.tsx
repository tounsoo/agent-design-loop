import { useId, type ReactElement } from "react";
import {
  Alert,
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
  invoiceById,
  sampleInvoices,
  type FlowState,
  type Invoice,
  type ModeledState,
} from "../../flows/invoice-approval";
import { CollectionPage } from "../../page-types/collection";
import { DetailPage } from "../../page-types/detail";

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

function EmptyBody() {
  return (
    <EmptyState.Root>
      <EmptyState.Title as="h2">No invoices waiting</EmptyState.Title>
      <EmptyState.Description>Nothing needs approval right now.</EmptyState.Description>
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

function QueueBody({ onOpen }: { onOpen: (invoiceId: string) => void }) {
  return (
    <Table.Root>
      <Table.Caption>Pending vendor invoices</Table.Caption>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell scope="col">Vendor</Table.HeaderCell>
          <Table.HeaderCell scope="col">Invoice</Table.HeaderCell>
          <Table.HeaderCell scope="col">Amount</Table.HeaderCell>
          <Table.HeaderCell scope="col">Due</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {sampleInvoices.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell>
              <Link.Root
                href={`?invoice=${invoice.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  onOpen(invoice.id);
                }}
              >
                {invoice.vendor}
              </Link.Root>
            </Table.Cell>
            <Table.Cell>{invoice.number}</Table.Cell>
            <Table.Cell>{formatMoney(invoice.amountCents)}</Table.Cell>
            <Table.Cell>{invoice.due}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function InvoiceFacts({ invoice }: { invoice: Invoice }) {
  return (
    <DataList.Root orientation="horizontal">
      <DataList.Item>
        <DataList.Term>Invoice</DataList.Term>
        <DataList.Details>{invoice.number}</DataList.Details>
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

function DetailBody({
  invoice,
  lineItemsOpen,
  requestingChanges,
  reason,
  reasonError,
  outcome,
  actions,
}: {
  invoice: Invoice;
  lineItemsOpen: boolean;
  requestingChanges: boolean;
  reason: string;
  reasonError: boolean;
  outcome: "approved" | "changes" | null;
  actions: Actions;
}) {
  return (
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
      <InvoiceFacts invoice={invoice} />
      <LineItems invoice={invoice} open={lineItemsOpen} onToggle={actions.setLineItemsOpen} />
      {requestingChanges && outcome === null ? (
        <ReasonField reason={reason} reasonError={reasonError} onReason={actions.setReason} />
      ) : null}
    </>
  );
}

function queueBody(state: FlowState, actions: Actions): ReactElement {
  switch (state.status) {
    case "loading":
      return <LoadingBody />;
    case "empty":
      return <EmptyBody />;
    case "error":
      return <ErrorBody message={state.message} onRetry={actions.retry} />;
    case "ready":
      return <QueueBody onOpen={actions.openInvoice} />;
    case "invoice-approved":
    case "changes-requested":
      return <EmptyBody />;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

function isQueue(
  state: FlowState,
): state is
  | Extract<FlowState, { status: "loading" | "empty" | "error" }>
  | Extract<FlowState, { status: "ready"; screen: "collection" }> {
  return (
    state.status === "loading" ||
    state.status === "empty" ||
    state.status === "error" ||
    (state.status === "ready" && state.screen === "collection")
  );
}

export function renderInvoiceApproval(state: FlowState, actions: Actions): ReactElement {
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

  if (isQueue(state)) {
    return (
      <CollectionPage state={state.status}>
        <CollectionPage.Heading>Invoices to approve</CollectionPage.Heading>
        <CollectionPage.Body>{queueBody(state, actions)}</CollectionPage.Body>
      </CollectionPage>
    );
  }

  const invoice = invoiceById(state.invoiceId) ?? sampleInvoices[0];
  if (!invoice) throw new Error("The approval queue has no sample invoice.");
  const detail = state.status === "ready" ? state : null;
  const canAct = detail !== null;
  const outcome = state.status === "invoice-approved" ? "approved" : state.status === "changes-requested" ? "changes" : null;
  const reason = state.status === "invoice-approved" ? "" : state.reason;

  return (
    <DetailPage state={state.status}>
      <DetailPage.Heading>{invoice.vendor}</DetailPage.Heading>
      <DetailPage.Body>
        <DetailBody
          actions={actions}
          invoice={invoice}
          lineItemsOpen={detail?.lineItemsOpen ?? false}
          outcome={outcome}
          reason={reason}
          reasonError={detail?.reasonError ?? false}
          requestingChanges={detail?.requestingChanges ?? false}
        />
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
