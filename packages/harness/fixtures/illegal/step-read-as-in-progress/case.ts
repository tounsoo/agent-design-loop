/** Illegal: pull request 32's bug. After Approve, Todae's Steps reads the waiting Payment stage as "In progress: Payment due Nov 18, 2026", and the declarations say it is next. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/step-read-as-in-progress",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-progress/states.ts",
        views: "packages/harness/fixtures/illegal/step-read-as-in-progress/main.tsx",
      },
    ],
  },
  checks: [
    {
      run: "check:accessible-names",
      fails: 'expects listitem reading "Next: Payment due Nov 18, 2026" (aria-current="step"), and a screen reader does not hear it. Its listitem nodes are "Done: Received", "Done: Approval", "In progress: Payment due Nov 18, 2026" (aria-current="step")',
    },
  ],
};
