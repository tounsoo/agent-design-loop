import { DataList } from "../../catalog";

export type Fact = { readonly term: string; readonly details: string };

export type FactsProps = {
  /** The record's facts, in the order they read. */
  readonly items: readonly Fact[];
};

/**
 * Facts content layout: one record's facts as term and details pairs, side
 * by side, such as an invoice's number, vendor, status, amount and due date.
 */
export function Facts({ items }: FactsProps) {
  return (
    <DataList.Root orientation="horizontal">
      {items.map((item) => (
        <DataList.Item key={item.term}>
          <DataList.Term>{item.term}</DataList.Term>
          <DataList.Details>{item.details}</DataList.Details>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}
