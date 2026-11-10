import { Link, Stack, Text } from "../../catalog";
import type { Preview } from "../../flows/invoice-approval/transition";

const links: readonly { href: string; label: string; matches: (preview: Preview) => boolean }[] = [
  { href: "?state=loading", label: "loading", matches: (preview) => preview.state === "loading" },
  { href: "?state=empty", label: "empty", matches: (preview) => preview.state === "empty" },
  { href: "?state=error", label: "error", matches: (preview) => preview.state === "error" },
  {
    href: "?state=ready&page=collection",
    label: "queue",
    matches: (preview) => preview.state === null || (preview.state === "ready" && preview.page !== "detail"),
  },
  {
    href: "?state=ready&page=detail",
    label: "detail",
    matches: (preview) => preview.state === "ready" && preview.page === "detail" && !preview.branch,
  },
  {
    href: "?state=invoice-approved&page=detail",
    label: "invoice-approved",
    matches: (preview) => preview.state === "invoice-approved",
  },
  {
    href: "?state=changes-requested&page=detail",
    label: "changes-requested",
    matches: (preview) => preview.state === "changes-requested",
  },
];

export function StatePreviewLinks({ preview }: { preview: Preview }) {
  return (
    <Stack.Root aria-label="Modeled states" as="nav" direction="row" gap="normal" wrap>
      <Text.Root as="span" tone="muted" variant="label">
        Preview
      </Text.Root>
      {links.map((link) => (
        <Link.Root key={link.label} aria-current={link.matches(preview) ? "page" : undefined} href={link.href}>
          {link.label}
        </Link.Root>
      ))}
    </Stack.Root>
  );
}
