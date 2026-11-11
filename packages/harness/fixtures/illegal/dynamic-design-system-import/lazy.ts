/** Illegal: a dynamic import of the design system outside the catalog, and one whose specifier is computed. */
export const loadTodae = () => import("@tounsoo/todae");

export const loadAny = (name: string) => import(name);
