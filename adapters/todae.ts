import type { DesignSystemAdapter } from "../scripts/lib/adapter";

/**
 * Todae's names for the parts the checks look for. Plain literals only: the
 * inventory check reads this file at the pull request base with `git show`.
 * Changing it changes what every check counts, so a change needs a proposal
 * under proposals/, and CODEOWNERS asks for review.
 */
export default {
  name: "Todae",
  packages: ["@tounsoo/todae"],
  action: {
    tag: "Button.Root",
    variantProp: "variant",
    primary: ["primary"],
    primaryByDefault: true,
    secondary: "secondary",
  },
  disclosure: {
    root: "Disclosure.Root",
    summary: "Disclosure.Summary",
  },
  questions: ["Field.Root"],
  statusParts: ["Alert", "Button", "EmptyState", "ErrorMessage", "Loader", "Skeleton", "Stack", "Text", "VisuallyHidden"],
  tokens: {
    css: "node_modules/@tounsoo/todae/dist/todae.css",
    actionPaddingY: "--todae-button-padding-y",
    actionFontSize: "--todae-button-font-size",
    privatePrefix: "--_todae-",
  },
} satisfies DesignSystemAdapter;
