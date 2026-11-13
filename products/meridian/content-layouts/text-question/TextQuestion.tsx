import { useId } from "react";
import { ErrorMessage, Field, Label, Stack, Text } from "../../catalog";

export type TextQuestionProps = {
  /** The question, as its label. */
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** The line under the field while the answer is acceptable. */
  readonly hint: string;
  /** The line under the field, in its place, while the answer is not. */
  readonly error: string;
  readonly invalid: boolean;
  readonly rows?: number;
};

/** Text question content layout: one question answered in a few lines of text, with a hint that becomes the error when the answer is missing. */
export function TextQuestion({ label, value, onValueChange, hint, error, invalid, rows = 3 }: TextQuestionProps) {
  const fieldId = useId();
  const errorId = useId();
  return (
    <Stack.Root gap="condensed">
      <Label.Root htmlFor={fieldId}>{label}</Label.Root>
      <Field.Root id={fieldId} invalid={invalid}>
        <Field.Textarea aria-describedby={invalid ? errorId : undefined} rows={rows} value={value} onValueChange={onValueChange} />
      </Field.Root>
      {invalid ? <ErrorMessage.Root id={errorId}>{error}</ErrorMessage.Root> : <Text.Root tone="muted">{hint}</Text.Root>}
    </Stack.Root>
  );
}
