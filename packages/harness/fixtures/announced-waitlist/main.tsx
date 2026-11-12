import { render } from "./waitlist";

/** After the fix: one button per row, and leaving while a room is free says so. */
render({ oneButtonPerRow: true, sayLeavingWhileFree: true });
