# Critique

Round 1, by sonnet, which did not build the change: pass, with 2 for the review note. Written by `npm run critique` from the critic's findings on this folder's screenshots. It is advisory: no check reads it.

## For the review note

- **Grouping** (`after/invoice-detail--desktop-light.png`, `after/invoice-detail--desktop-dark.png`, `after/invoice-detail--phone-light.png`, `after/invoice-detail--phone-dark.png`, `after/invoice-approved--desktop-light.png`, `after/invoice-approved--phone-light.png`): The vendor name appears twice, as the page title and again in the Vendor row of the facts list. The approved banner repeats it a third time with the amount, and the Status row and the Approval step both say the same state. Already present in the before screenshots, so the change does not worsen it. Fix: Drop the Vendor row when the title is the vendor, and let the banner carry only what the facts list does not.
- **Hierarchy** (`after/invoice-detail--desktop-light.png`, `after/invoice-detail--phone-light.png`): The facts list sits tight under the title with little gap, while the steps and the Line items disclosure are spaced further apart. Line items reads like a section heading at body weight. Same as before. Fix: Add a little space under the title and give the disclosure a quieter or clearer label treatment.
