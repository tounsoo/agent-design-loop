import { Ask } from "../../catalog";

/** One question in the open, asked with the stand-in question part. */
export function Question({ label }: { label: string }) {
  return <Ask label={label} />;
}
