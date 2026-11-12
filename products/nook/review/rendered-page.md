# Review: the page ground in dark, and room cards as a list

`check:rendered-page` opens every preview as Chrome paints it, under [proposal 2026-11-12-rendered-page](../../../proposals/2026-11-12-rendered-page.md). On main it failed Nook twice.

- **Dark scheme.** Nook's `ThemeProvider` follows the system scheme, so in dark its text turned light, but the page under it stayed white: the root never took Todae's canvas. The app's root now paints `--todae-color-bg-canvas` and `--todae-color-fg-default`, so text and ground switch together.
- **Room names.** Each room card names its room in a 24 px h2, one type-scale step under the 30 px title. A heading that repeats per record sits one step below the title, but only inside a list item, so the room cards are now a list and each card a list item, as Meridian's vendor directory is. A screen reader now also hears how many rooms are free.

## What the checks already decided

- `check:rendered-page` passes all 11 previews, every run of text at AA in light and dark.
- `check:accessible-names` passes with the list in the accessibility tree.

## What the checks cannot decide

- Whether the room name should be smaller anyway. One step under the title is allowed for a record name; whether the cards read as a list of equals or as competing headlines is for the screenshots.

## Screenshots
