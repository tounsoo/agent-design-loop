import { render } from "../../announced-waitlist/waitlist";

/** Pull request 42 halfway through its fix: one button per row, but leaving a waitlist while a room is free changes only the button. */
render({ oneButtonPerRow: true, sayLeavingWhileFree: false });
