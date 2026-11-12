---
status: adopted
changes:
  - MAX_VISIBLE_QUESTIONS
tightens:
  - TARGET_MIN_PX
---
# Raise the touch target minimum

## Reason

Touch targets of 24 pixels are still hard to hit on a phone.

## Preview

Every control measures at least 32 pixels on each side.

## Adoption

`rules.ts` sets TARGET_MIN_PX in the pull request that adds this proposal.
