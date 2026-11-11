/** Illegal: the design system loaded with require reached through a property and through a comma, outside the catalog. */
declare const globalThis: { require(name: string): unknown };
declare const require: (name: string) => unknown;

export const viaGlobal = globalThis.require("@tounsoo/todae");

export const viaComma = (0, require)("@tounsoo/todae/styles.css");

const load = require;
export const viaAlias = load("@tounsoo/todae");
