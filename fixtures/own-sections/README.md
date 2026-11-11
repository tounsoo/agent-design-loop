# Own sections

A product whose one disclosed section is "Attachments", not Meridian's "Line items". Its config, `harness.config.ts`, points `paths.inputs` at `inputs.ts` and `paths.features` at `features/`. `check:priority` passes it only if the sections it requires come from the product's `disclosed_sections` input. The illegal case `renamed-disclosed-section` runs the same config against Meridian's own features, which disclose "Line items" and no "Attachments", and must fail.
