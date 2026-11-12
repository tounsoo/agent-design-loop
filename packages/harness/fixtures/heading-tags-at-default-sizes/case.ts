/** Legal: proper h1, h2 and h3 tags at Todae's default sizes, 30, 24 and 20 px, as pull requests 48 and 49 used them. A card's h2 inside the wrapper the Vendor h2 opens is its sibling, as a screen reader hears it, a visually hidden h2 counts, a list of one item holds an h3, going back up from h4 to h2 is fine, an h4 with `aria-level="3"` is read at level 3, as Chrome reads it, and an h5 with `role="presentation"` is not a heading. Sizes are the design system's, so none is read. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/heading-tags-at-default-sizes",
    },
  },
  checks: [{ run: "check:rendered-page", passes: "each page has one h1 and its headings skip no level" }],
};
