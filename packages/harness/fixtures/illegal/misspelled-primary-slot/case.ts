/** Illegal: the config names the detail shell's primary slot "Primry". DetailPage has no such slot. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primry" },
      collections: { collection: ["Heading", "Description"] },
    },
  },
  checks: [
    { run: "lint:slots", fails: 'names slot "Primry" for page type "detail", but DetailPage has no such slot' },
  ],
};
