import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The page and the document title open a vendor with openVendor, not by searching knownVendors, previewVendors, vendorDirectory, or a list taken from them.",
  fails: [
    "App.tsx or a feature file resolves a vendor id with knownVendors, previewVendors or vendorDirectory, or with a const assigned from one of them, by calling find, findIndex, findLast, filter or some, or by looping over the list.",
  ],
  details: [
    "openVendor in products/meridian/flows/invoice-approval/vendors.ts searches every vendor the session can reach, including one a preview seeded. vendorDirectory is that list for the page, and it is what the flow barrel exports along with openVendor. knownVendors stays in the module so id uniqueness can use it, and a feature cannot import it from the barrel. previewVendors is the directory for the current preview, and it drops a seeded vendor once a link leaves the preview. `packages/harness/src/lib/preview-scope.test.ts` feeds the check the page and the title from before 3a3c7d7 and at 3a3c7d7, and a page that takes the first shownVendors.filter result or a findIndex. It skips when the commit is not in the clone.",
  ],
} satisfies CheckMeta;
