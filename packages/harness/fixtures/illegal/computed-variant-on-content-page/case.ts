/** Illegal: the help page, a content page under shells.content, renders a button whose variant is computed. The check cannot tell it is not primary, so it fails. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/computed-variant-on-content-page",
      inputs: "packages/harness/fixtures/content-page/inputs.ts",
      pageTypes: "packages/harness/fixtures/content-page/page-types",
    },
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      content: ["help"],
    },
  },
  checks: [
    { run: "check:one-thing", fails: "Steps.tsx:8 gives a button on the HelpPage content page a computed variant" },
  ],
};
