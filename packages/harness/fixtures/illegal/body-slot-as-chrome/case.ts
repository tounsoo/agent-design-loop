/** Illegal: the config names the collection's Body slot as chrome, so no slot is left for the body rule to read. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Body"] },
    },
  },
  checks: [
    { run: "check:inventories", fails: "CollectionPage pages fill no slot outside the chrome slots" },
  ],
};
