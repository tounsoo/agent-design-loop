import { Tabs } from "../catalog/extra";

/** Reaches Tabs through the side door. */
export function Settings() {
  return (
    <Tabs.Root>
      <Tabs.List aria-label="Settings" />
    </Tabs.Root>
  );
}
