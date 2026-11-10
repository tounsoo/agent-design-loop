# Proposal 0001: Confirm before save

Status: open. Not applied.

Layer: flow model and the `update-notification-prefs` step budget.

## Reason

Save currently applies on the next step. A confirm-before-save step would catch an accidental overwrite of notification preferences. Whether that confirmation earns its cost is a review question. The step-budget check cannot answer it, and the agent must not raise `max_steps` on its own.

The shipped happy path is 4 steps, which is the budget. Adding confirm makes it 5. This proposal asks to raise the budget and graduate the pattern. The shipped page does not show a confirm step.

## Preview

Shipped path (within budget):

1. Change a channel
2. Open Delivery windows
3. Change a window
4. Save → `prefs-saved`

Proposed path:

1. Change a channel
2. Open Delivery windows
3. Change a window
4. Save
5. Confirm → `prefs-saved`

Save would move the flow to a `confirming` state. Confirm would be the only event that reaches `prefs-saved`. The settings primary slot would still hold one button: Save, then Confirm on the next step.

## Graduation, after approval

- `src/inputs/product.ts`: `max_steps` for `update-notification-prefs` from 4 to 5
- `src/flows/notification-prefs`: add `confirming` between `ready` and `prefs-saved`, and a `confirm` event
- No new catalog component

Until that lands, the budget stays 4 and confirm-before-save stays out of the UI.
