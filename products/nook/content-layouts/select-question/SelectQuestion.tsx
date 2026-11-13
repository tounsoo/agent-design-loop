import { useId } from "react";
import { Field, Label, Stack } from "../../catalog";

export type Choice = { readonly value: string; readonly label: string };

export type SelectQuestionProps = {
  /** The question, as its label. */
  readonly label: string;
  readonly choices: readonly Choice[];
  readonly value: string;
  readonly disabled: boolean;
  readonly onValueChange: (value: string) => void;
};

/** Select question content layout: one question answered by picking one of a few choices. */
export function SelectQuestion({ label, choices, value, disabled, onValueChange }: SelectQuestionProps) {
  const fieldId = useId();
  return (
    <Stack.Root gap="condensed">
      <Label.Root htmlFor={fieldId}>{label}</Label.Root>
      <Field.Root disabled={disabled} id={fieldId}>
        <Field.Select value={value} onValueChange={onValueChange}>
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </Field.Select>
      </Field.Root>
    </Stack.Root>
  );
}
