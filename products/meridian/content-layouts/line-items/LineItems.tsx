import { Disclosure, Table } from "../../catalog";

export type LineItem = { readonly description: string; readonly amount: string };

export type LineItemsProps = {
  readonly items: readonly LineItem[];
  /** The sum of the items, formatted. */
  readonly total: string;
  readonly open: boolean;
  readonly onToggle: (open: boolean) => void;
};

/**
 * Line items content layout: a record's line items and their total, closed
 * behind a disclosure. Its summary is "Line items", the section
 * disclosed_sections names, so check:priority finds it here.
 */
export function LineItems({ items, total, open, onToggle }: LineItemsProps) {
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
          {items.map((item) => (
            <Table.Row key={item.description}>
              <Table.Cell>{item.description}</Table.Cell>
              <Table.Cell>{item.amount}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        <Table.Foot>
          <Table.Row>
            <Table.HeaderCell scope="row">Total</Table.HeaderCell>
            <Table.Cell>{total}</Table.Cell>
          </Table.Row>
        </Table.Foot>
      </Table.Root>
    </Disclosure.Root>
  );
}
