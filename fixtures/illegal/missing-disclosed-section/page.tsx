import { Button, Table } from "../../../src/catalog";
import { DetailPage } from "../../../src/page-types/detail";

/** Illegal: line items shown in the open. disclosed_sections says they sit behind a disclosure. */
export function OpenLineItems() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Table.Root>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Paper stock</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </DetailPage.Body>
      <DetailPage.Secondary>
        <Button.Root type="button" variant="secondary">
          Request changes
        </Button.Root>
      </DetailPage.Secondary>
      <DetailPage.Primary>
        <Button.Root type="button">Approve</Button.Root>
      </DetailPage.Primary>
    </DetailPage>
  );
}
