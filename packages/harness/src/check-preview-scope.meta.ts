import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The page and the document title open a vendor with openVendor, not with a find or some on knownVendors or previewVendors.",
  fails: [
    "App.tsx or a feature file resolves a vendor id with knownVendors or previewVendors, by calling .find or .some on the list or on a const assigned from it.",
  ],
  details: [
    "openVendor in products/meridian/flows/invoice-approval/vendors.ts searches every vendor the session can reach, including one a preview seeded. previewVendors is the directory for the current preview, and it drops that vendor once a link leaves the preview. A type cannot stop .find on either list. `packages/harness/src/lib/preview-scope.test.ts` feeds the check the page and the title from before 3a3c7d7 and at 3a3c7d7, and the files this check reads.",
  ],
} satisfies CheckMeta;
