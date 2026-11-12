/**
 * The views the Chrome checks and the screenshots open each scenario in: two
 * widths, a desktop's and a phone's, each in the light and the dark colour
 * scheme. Which check reads which view is the check's call: what a screen
 * reader hears does not change with them, and contrast does.
 */

/** The desktop view, in CSS px. */
export const DESKTOP = { width: 1280, height: 900 } as const;
/** The phone view, in CSS px: a common phone's width and height. */
export const PHONE = { width: 390, height: 844 } as const;

export type Scheme = "light" | "dark";

export type View = {
  /** The view's name in a file name or a flag: `desktop-light`. */
  readonly name: ViewName;
  /** The view as a message says it: `390 by 844, dark`. */
  readonly label: string;
  readonly width: number;
  readonly height: number;
  /** A phone: Chrome lays the page out as a touch device with a meta viewport. */
  readonly mobile: boolean;
  readonly scheme: Scheme;
};

export const VIEW_NAMES = ["desktop-light", "desktop-dark", "phone-light", "phone-dark"] as const;
export type ViewName = (typeof VIEW_NAMES)[number];

function view(name: ViewName): View {
  const phone = name.startsWith("phone");
  const size = phone ? PHONE : DESKTOP;
  const scheme: Scheme = name.endsWith("dark") ? "dark" : "light";
  return { name, label: `${size.width} by ${size.height}, ${scheme}`, ...size, mobile: phone, scheme };
}

/** Every view, desktop first, light before dark. */
export const VIEWS: readonly View[] = VIEW_NAMES.map(view);

export function viewNamed(name: ViewName): View {
  return VIEWS.find((candidate) => candidate.name === name) ?? view(name);
}

export function isViewName(value: string): value is ViewName {
  return (VIEW_NAMES as readonly string[]).includes(value);
}
