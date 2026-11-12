import { scenarioSearch } from "@agent-design-loop/harness/scenarios";
import { Menu } from "../catalog";
import { scenarios } from "../flows/invoice-approval/scenarios";

/** The live app, then every scenario the checks open, named from its id: `invoice-detail` is "Invoice detail". */
const links: readonly { href: string; label: string }[] = [
  { href: "/", label: "Live" },
  ...Object.keys(scenarios).map((id) => ({ href: scenarioSearch(id), label: `${id.charAt(0).toUpperCase()}${id.slice(1).replace(/-/g, " ")}` })),
];

/** Discreet developer aid. The product nav is the app shell, not this menu. */
export function StatePreviewMenu({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger variant="ghost">Preview</Menu.Trigger>
      <Menu.Content aria-label="Scenarios">
        {links.map((link) => (
          <Menu.Item key={link.href} onSelect={() => onNavigate(link.href)}>
            {link.label}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
