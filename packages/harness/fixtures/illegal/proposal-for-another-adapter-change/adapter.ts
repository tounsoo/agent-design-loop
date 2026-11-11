import type { DesignSystemAdapter } from "@agent-design-loop/harness";

/** Todae's adapter, with "ghost" added as a primary variant: a change to adapter.action that no proposal in this case names. */
export default {
  name: "Todae",
  packages: ["@tounsoo/todae"],
  action: {
    tag: "Button.Root",
    variantProp: "variant",
    primary: ["primary", "ghost"],
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
