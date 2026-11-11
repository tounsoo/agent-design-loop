import { Field } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

/**
 * Illegal: the fields are built in variables outside the shell, so a per-page
 * scope cannot see them. The check fails rather than count zero questions.
 */
export function HoistedQuestions() {
  const note = (
    <Field.Root id="note">
      <Field.Textarea rows={2} />
    </Field.Root>
  );
  const reason = (
    <Field.Root id="reason">
      <Field.Textarea rows={3} />
    </Field.Root>
  );
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        {note}
        {reason}
      </DetailPage.Body>
    </DetailPage>
  );
}
