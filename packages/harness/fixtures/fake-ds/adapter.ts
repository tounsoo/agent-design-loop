import type { DesignSystemAdapter } from "../../src/lib/adapter";

/**
 * A stand-in design system that shares no name with Todae. An action is only
 * primary with tone="strong", where Todae's Button.Root is primary by default.
 * The fake-ds cases run the checks on a config that names this file, so a Todae
 * name left in a check fails them.
 */
export default {
  name: "Fake DS",
  packages: ["@fake/ds"],
  action: {
    tag: "Action",
    variantProp: "tone",
    primary: ["strong"],
    primaryByDefault: false,
    secondary: "quiet",
  },
  disclosure: {
    root: "Reveal.Root",
    summary: "Reveal.Label",
  },
  questions: ["Ask"],
  statusParts: ["Action", "Notice", "Spinner"],
  tokens: {
    css: "packages/harness/fixtures/fake-ds/tokens.css",
    actionPaddingY: "--fake-action-padding-y",
    actionFontSize: "--fake-action-font-size",
    privatePrefix: "--_fake-",
  },
} satisfies DesignSystemAdapter;
