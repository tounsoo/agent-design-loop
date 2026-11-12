import { render } from "../../announced-waitlist/waitlist";

/** Pull request 42 before its fix: each offer is its own button, so joining or leaving swaps the row's button for a new one. */
render({ oneButtonPerRow: false, sayLeavingWhileFree: true });
