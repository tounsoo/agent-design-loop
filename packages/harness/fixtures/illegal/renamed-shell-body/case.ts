/** Illegal: a page shell imported under another name is still that shell, so its body is still read. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/renamed-shell-body",
    },
  },
  checks: [
    { run: "check:inventories", fails: "Disclosure.Root in packages/harness/fixtures/illegal/renamed-shell-body/page.tsx is not a registered content layout" },
  ],
};
