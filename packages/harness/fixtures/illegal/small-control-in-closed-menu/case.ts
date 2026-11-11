/** Illegal: two 12 CSS px links inside a closed menu in the chrome. The check opens every closed disclosure in the document on its own and measures what it shows. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/small-control-in-closed-menu",
    },
  },
  checks: [
    { run: "check:target-size", fails: 'a "Ready" is 12×12 CSS px and fails the spacing exception' },
  ],
};
