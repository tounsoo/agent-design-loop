# Own sections

A product whose one disclosed section is "Attachments", not Meridian's "Line items". Its `case.ts` points the fixture product's `paths.inputs` at `inputs.ts` and `paths.features` at `features/`. `check:priority` passes it only if the sections it requires come from the product's `disclosed_sections` input. The illegal case `renamed-disclosed-section` runs the same inputs on the fixture product's own pages, which disclose "Line items" and no "Attachments", and must fail.
