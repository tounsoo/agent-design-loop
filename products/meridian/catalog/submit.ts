/**
 * The submit pattern: a submit button that turns itself off once it is used,
 * or while its request is busy, gets `aria-disabled`, never `disabled`.
 * A `disabled` button drops the focus it holds to the page body, so a screen
 * reader starts again from the top; an `aria-disabled` one keeps focus, reads
 * as turned off, and Todae's Button ignores presses on it. Say the result in
 * a status region that is on the page before the press, so it is read from
 * there while focus stays put.
 *
 *     <Button.Root {...submitOff(!canSubmit)} onClick={submit}>Approve</Button.Root>
 */
export function submitOff(off: boolean): { readonly "aria-disabled"?: true } {
  return off ? { "aria-disabled": true } : {};
}
