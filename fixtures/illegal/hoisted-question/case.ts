/** Illegal: a question held in a variable outside any page, so no per-page cap can count it. */
export default {
  config: {
    paths: {
      features: "fixtures/illegal/hoisted-question",
    },
  },
  checks: [
    { run: "check:one-thing", fails: "is not reached from any page" },
  ],
};
