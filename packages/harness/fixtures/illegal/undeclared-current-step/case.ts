/** Illegal: pull request 32's list with declarations that leave it out. The current step's announcement changes with the state, so the check asks for it to be declared, and the declaration puts "In progress: Payment due" in front of the reviewer. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/undeclared-current-step",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-progress/states.ts",
        views: "packages/harness/fixtures/illegal/undeclared-current-step/main.tsx",
      },
    ],
  },
  checks: [
    {
      run: "check:accessible-names",
      fails: 'listitem reading "In progress: Payment due Nov 18, 2026" (aria-current="step") changes with the state, and',
    },
  ],
};
