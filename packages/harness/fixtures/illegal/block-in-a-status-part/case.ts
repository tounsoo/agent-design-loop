/** Illegal: JSX an expression builds inside a status part, such as a map, is read like any other element in the body. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/block-in-a-status-part",
    },
  },
  checks: [
    { run: "check:inventories", fails: "Disclosure.Root in packages/harness/fixtures/illegal/block-in-a-status-part/page.tsx is not a registered content layout" },
  ],
};
