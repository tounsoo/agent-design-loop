import { Link, Stack, Text } from "../../catalog";
import { modeledStates, type ModeledState } from "../../flows/notification-prefs/states";

export function StatePreviewLinks({ active }: { active: ModeledState | null }) {
  return (
    <Stack.Root aria-label="Modeled states" as="nav" direction="row" gap="normal" wrap>
      <Text.Root as="span" variant="label" tone="muted">
        Preview
      </Text.Root>
      {modeledStates.map((state) => {
        const current = active === state || (active == null && state === "ready");
        return (
          <Link.Root key={state} aria-current={current ? "page" : undefined} href={`?state=${state}`}>
            {state}
          </Link.Root>
        );
      })}
    </Stack.Root>
  );
}
