/** Illegal: the help page, a content page under shells.content, renders a component with a primary action. A content page shows information, so it holds none. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/primary-on-content-page",
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
    { run: "check:one-thing", fails: "Steps.tsx:8 puts a primary button on the HelpPage content page" },
  ],
};
