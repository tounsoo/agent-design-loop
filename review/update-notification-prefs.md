# Review: update-notification-prefs

Task: change notification preferences and save. Success state `prefs-saved`. Budget 4.

## What the checks already decided

- Primary is Save because the priority list ranks it 1. The primary slot has that one button.
- Delivery windows is rank 2, secondary, behind one disclosure. It is not a second primary.
- The shortest path that changes a channel, opens Delivery windows, changes a window, and saves is 4 steps. `max_steps` is 4.
- The flow renders loading, empty, error, ready, and prefs-saved.
- There is one settings page and one question (channels) visible before the disclosure.

## What the checks cannot decide

- Is an extra step earning its cost? Confirm-before-save would make the path 5. That is not shipped. [Proposal 0001](../proposals/0001-confirm-before-save.md) asks to raise the budget to 5 and graduate the pattern. A human still has to say whether the confirmation is worth the step.
- Is the thing shown first actually what people need first? Channels are visible. Save is the only primary. Delivery windows is disclosed. The priority list says that order. Research could still disagree.
- Does research support grouping the channel choices on one settings page? This follows the starting point: one question on the page, the second question behind the disclosure.
- Did we model the states that actually happen? The five states above are the ones this journey names. A partial save or a conflict with another device is not modeled.
- Should an important control aim for 44 CSS px instead of the 24 CSS px floor? The target-size check enforces the floor only.

No exception is recorded in the product inputs.
