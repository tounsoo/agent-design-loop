import { Field, Label } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

function ReasonField() {
  return (
    <>
      <Label.Root htmlFor="reason">What should change?</Label.Root>
      <Field.Root id="reason">
        <Field.Textarea rows={3} />
      </Field.Root>
    </>
  );
}

/** Illegal: a note field and a reason field outside a disclosure on one page. The cap is one. */
export function TwoQuestions() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Label.Root htmlFor="note">Approval note</Label.Root>
        <Field.Root id="note">
          <Field.Textarea rows={2} />
        </Field.Root>
        <ReasonField />
      </DetailPage.Body>
    </DetailPage>
  );
}
