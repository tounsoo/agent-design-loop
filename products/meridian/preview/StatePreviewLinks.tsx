import { Menu } from "../catalog";

const links: readonly { href: string; label: string }[] = [
  { href: "?state=loading", label: "Loading" },
  { href: "?state=empty", label: "Empty" },
  { href: "?state=error", label: "Error" },
  { href: "/", label: "Queue" },
  { href: "?state=ready&page=detail", label: "Detail" },
  { href: "?state=invoice-approved&page=detail", label: "Invoice approved" },
  { href: "?state=changes-requested&page=detail", label: "Changes requested" },
];

/** Discreet developer aid. The product nav is the app shell, not this menu. */
export function StatePreviewMenu({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger variant="ghost">Preview</Menu.Trigger>
      <Menu.Content aria-label="Modeled states">
        {links.map((link) => (
          <Menu.Item key={link.label} onSelect={() => onNavigate(link.href)}>
            {link.label}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
