import { useEffect, useId, useRef, useState, type FormEvent, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { SearchX } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  DataList,
  Description,
  Disclosure,
  EmptyState,
  ErrorMessage,
  Field,
  Form,
  Grid,
  Label,
  Stack,
  Text,
  useAnnouncer,
} from "../../catalog";
import {
  checkVendorDraft,
  emptyDraft,
  paymentTerms,
  searchVendors,
  termsLabel,
  type NewVendor,
  type VendorDraft,
  type VendorId,
  type VendorRow,
} from "../../flows/invoice-approval";

/**
 * Directory content layout: one search field, one "Add a…" disclosure that
 * holds the whole form, and a grid of cards with a list of facts each. This
 * module is product-owned glue; Todae has no `Directory.*` export.
 *
 * Every form field is written inline under Disclosure.Root in this one
 * function. check:one-thing counts a Field.Root as hidden only when a
 * Disclosure.Root is its ancestor in the same file's JSX, so a fields
 * component, local or imported, would count each field as a visible question.
 */

export type DirectoryProps = {
  /** Already joined and sorted. Empty means there are no vendors yet. */
  readonly rows: readonly VendorRow[];
  readonly justAdded: VendorId | null;
  /** Called only with a draft that passed checkVendorDraft against the rows' vendors. */
  readonly onAdd: (vendor: NewVendor) => void;
};

function noun(count: number): string {
  return count === 1 ? "vendor" : "vendors";
}

export function Directory({ rows, justAdded, onAdd }: DirectoryProps): ReactElement {
  const searchId = useId();
  const nameId = useId();
  const emailId = useId();
  const emailHintId = useId();
  const termsId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const announce = useAnnouncer();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<VendorDraft>(emptyDraft);
  // A new key after each add gives the cleared form no problems to show until its next submit.
  const [formKey, setFormKey] = useState(0);
  const [open, setOpen] = useState(justAdded !== null || rows.length === 0);

  const registry = rows.map((row) => row.vendor);
  const check = checkVendorDraft(draft, registry);
  const problems = check.ok ? {} : check.problems;
  const visible = searchVendors(rows, query);
  const needle = query.trim();
  const added = rows.find((row) => row.vendor.id === justAdded)?.vendor ?? null;
  const count = needle === "" ? `${rows.length} ${noun(rows.length)}` : `${visible.length} of ${rows.length} ${noun(rows.length)}`;

  const announced = useRef(needle);
  useEffect(() => {
    if (announced.current === needle) return;
    const timer = setTimeout(() => {
      announced.current = needle;
      announce(visible.length === 0 ? "No vendors found" : `${visible.length} ${noun(visible.length)} found`);
    }, 500);
    return () => clearTimeout(timer);
  }, [announce, needle, visible.length]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Form.Root has checked the DOM; the decision still rests on the pure check.
    const result = checkVendorDraft(draft, registry);
    if (!result.ok) return;
    onAdd(result.vendor);
    flushSync(() => {
      setDraft(emptyDraft);
      setFormKey((key) => key + 1);
    });
    nameRef.current?.focus();
  };

  const addSearched = () => {
    flushSync(() => {
      setDraft({ ...emptyDraft, name: needle });
      setOpen(true);
    });
    emailRef.current?.focus();
  };

  return (
    <Stack.Root data-content-layout="directory" gap="spacious">
      <Stack.Root align="end" data-slot="toolbar" direction="row" gap="normal" wrap>
        <Field.Group className="collection-search">
          <Label.Root htmlFor={searchId}>Search vendors</Label.Root>
          <Field.Root id={searchId}>
            <Field.TextInput ref={searchRef} type="search" value={query} onValueChange={setQuery} />
          </Field.Root>
        </Field.Group>
        <Text.Root tone="muted">{count}</Text.Root>
      </Stack.Root>

      <Disclosure.Root open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <Disclosure.Summary>Add a vendor</Disclosure.Summary>
        <Stack.Root className="directory-form" gap="normal">
          <Stack.Root role="status">
            {added ? (
              <Alert.Root role="none" tone="success">
                <Alert.Title>{`Added ${added.name}.`}</Alert.Title>
              </Alert.Root>
            ) : null}
          </Stack.Root>
          <Form.Root key={formKey} onSubmit={submit}>
            <Stack.Root gap="normal">
              <Form.Summary />
              <Field.Group>
                <Label.Root htmlFor={nameId}>Vendor name</Label.Root>
                <Field.Root customValidity={problems.name} id={nameId} name="name">
                  <Field.TextInput
                    ref={nameRef}
                    autoComplete="organization"
                    value={draft.name}
                    onValueChange={(name) => setDraft({ ...draft, name })}
                  />
                </Field.Root>
                <ErrorMessage.Root />
              </Field.Group>
              <Field.Group>
                <Label.Root htmlFor={emailId}>Remittance email</Label.Root>
                <Field.Root aria-describedby={emailHintId} customValidity={problems.remitEmail} id={emailId} name="remitEmail">
                  <Field.TextInput
                    ref={emailRef}
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    value={draft.remitEmail}
                    onValueChange={(remitEmail) => setDraft({ ...draft, remitEmail })}
                  />
                </Field.Root>
                <Description.Root id={emailHintId}>Where remittance advice goes.</Description.Root>
                <ErrorMessage.Root />
              </Field.Group>
              <Field.Group>
                <Label.Root htmlFor={termsId}>Payment terms</Label.Root>
                <Field.Root customValidity={problems.terms} id={termsId} name="terms">
                  <Field.Select value={draft.terms} onValueChange={(terms) => setDraft({ ...draft, terms })}>
                    {paymentTerms.map((terms) => (
                      <option key={terms} value={terms}>
                        {termsLabel[terms]}
                      </option>
                    ))}
                  </Field.Select>
                </Field.Root>
                <ErrorMessage.Root />
              </Field.Group>
              <Stack.Root align="start">
                <Button.Root type="submit" variant="secondary">
                  Add vendor
                </Button.Root>
              </Stack.Root>
            </Stack.Root>
          </Form.Root>
        </Stack.Root>
      </Disclosure.Root>

      {visible.length > 0 ? (
        <Grid.Root aria-label="Vendors" data-slot="list" minItemSize="18rem" role="list">
          {visible.map((row) => (
            <Card.Root key={row.vendor.id} className="directory-card" role="listitem">
              <Card.Header>
                <Text.Root as="h2">{row.vendor.name}</Text.Root>
              </Card.Header>
              <Card.Body>
                <DataList.Root orientation="vertical">
                  <DataList.Item>
                    <DataList.Term>Remittance</DataList.Term>
                    <DataList.Details>{row.vendor.remitEmail}</DataList.Details>
                  </DataList.Item>
                  <DataList.Item>
                    <DataList.Term>Terms</DataList.Term>
                    <DataList.Details>{termsLabel[row.vendor.terms]}</DataList.Details>
                  </DataList.Item>
                  <DataList.Item>
                    <DataList.Term>Open invoices</DataList.Term>
                    <DataList.Details>{row.openCount}</DataList.Details>
                  </DataList.Item>
                  <DataList.Item>
                    <DataList.Term>Last invoice</DataList.Term>
                    <DataList.Details>
                      {row.lastInvoice ? (
                        <>
                          {row.lastInvoice.number}
                          <Text.Root as="span" tone="muted">{` · ${row.lastInvoice.due}`}</Text.Root>
                        </>
                      ) : (
                        "No invoices yet"
                      )}
                    </DataList.Details>
                  </DataList.Item>
                </DataList.Root>
              </Card.Body>
            </Card.Root>
          ))}
        </Grid.Root>
      ) : rows.length === 0 ? (
        <EmptyState.Root>
          <EmptyState.Title as="h2">No vendors yet</EmptyState.Title>
          <EmptyState.Description>Add the first vendor Meridian pays.</EmptyState.Description>
        </EmptyState.Root>
      ) : (
        <EmptyState.Root>
          <EmptyState.Icon>
            <SearchX />
          </EmptyState.Icon>
          <EmptyState.Title as="h2">No vendors found</EmptyState.Title>
          <EmptyState.Description>{`Nothing matches “${needle}”. Check the spelling, or add it as a vendor.`}</EmptyState.Description>
          <EmptyState.Actions>
            <Button.Root
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              Clear search
            </Button.Root>
            <Button.Root type="button" variant="secondary" onClick={addSearched}>
              {`Add “${needle}”`}
            </Button.Root>
          </EmptyState.Actions>
        </EmptyState.Root>
      )}
    </Stack.Root>
  );
}
