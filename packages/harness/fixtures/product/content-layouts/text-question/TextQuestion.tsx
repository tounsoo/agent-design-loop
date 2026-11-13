import { Field, Label, Stack } from "../../catalog";

/** The fixture product's one question: a detail page's body section, asked in the open. */
export function TextQuestion({ label, value, onValueChange }: { label: string; value: string; onValueChange: (value: string) => void }) {
  return (
    <Stack.Root>
      <Label.Root htmlFor="change-reason">{label}</Label.Root>
      <Field.Root id="change-reason">
        <Field.Textarea rows={3} value={value} onValueChange={onValueChange} />
      </Field.Root>
    </Stack.Root>
  );
}
