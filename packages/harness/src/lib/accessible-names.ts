import path from "node:path";

/**
 * What check:accessible-names compares. A product declares, for each preview
 * check:target-size also opens, what a screen reader should hear there. The
 * check reads Chrome's accessibility tree for each preview and holds it to
 * three rules: every control has a name, every declared announcement is in
 * the tree, and every node whose announcement depends on the state (an
 * `aria-current` item or a live region with something to say) is declared.
 */

/** One thing a preview announces, as the product declares it. */
export type Announcement = {
  /** The role Chrome's accessibility tree gives the node, as DevTools' Accessibility pane shows it: `button`, `listitem`, `status`. */
  readonly role: string;
  /** Its accessible name, exactly, with runs of whitespace collapsed. */
  readonly name?: string;
  /** What its subtree reads, exactly: each text run, visually hidden ones included and `aria-hidden` ones left out, joined by spaces, with none before closing punctuation. */
  readonly text?: string;
  /** Its `aria-current` value, such as `step` or `page`. */
  readonly current?: string;
  readonly disabled?: boolean;
  readonly expanded?: boolean;
  readonly checked?: boolean | "mixed";
  readonly pressed?: boolean | "mixed";
  readonly selected?: boolean;
};

/** A flow's declarations: each preview query, as check:target-size --list prints it, mapped to what it announces. */
export type AccessibleNames = { readonly [preview: string]: readonly Announcement[] };

/** One node of the rendered accessibility tree, in document order. */
export type AxNode = {
  readonly role: string;
  readonly name: string;
  readonly text: string;
  readonly current: string | null;
  readonly disabled: boolean;
  readonly expanded: boolean | null;
  readonly checked: boolean | "mixed" | null;
  readonly pressed: boolean | "mixed" | null;
  readonly selected: boolean | null;
  /** The DOM element behind it, as a short tag for messages. */
  readonly html: string;
};

/** The node shape Chrome's `Accessibility.getFullAXTree` returns, as far as the check reads it. */
export type CdpAxNode = {
  readonly nodeId: string;
  readonly ignored: boolean;
  readonly role?: { readonly value?: unknown };
  readonly name?: { readonly value?: unknown };
  readonly properties?: readonly { readonly name: string; readonly value?: { readonly value?: unknown } }[];
  readonly parentId?: string;
  readonly childIds?: readonly string[];
  readonly backendDOMNodeId?: number;
};

/** The DOM element behind an accessibility node: its tag and attributes. */
export type DomElement = { readonly tag: string; readonly attributes: Readonly<Record<string, string>> };

/** Roles a person operates. Each needs a name, or a screen reader says only its role. */
const CONTROL_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "searchbox",
  "checkbox",
  "radio",
  "switch",
  "combobox",
  "listbox",
  "option",
  "slider",
  "spinbutton",
  "tab",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "treeitem",
  "DisclosureTriangle",
  "image",
]);

/** Live regions and progress, which announce the state as it changes. */
const LIVE_ROLES = new Set(["status", "alert", "log", "timer", "marquee", "progressbar", "meter"]);

const ANNOUNCEMENT_KEYS = new Set(["role", "name", "text", "current", "disabled", "expanded", "checked", "pressed", "selected"]);

/** The declarations module for a flow: accessible-names.ts beside the flow's views module. */
export function declarationsFile(views: string): string {
  return path.join(path.dirname(views), "accessible-names.ts").split(path.sep).join("/");
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses a declarations module's `accessibleNames` export against the
 * previews its flow opens. Every preview needs at least one announcement, and
 * a key that is not a preview is stale.
 */
export function parseDeclarations(value: unknown, file: string, previews: readonly string[]): { declarations: AccessibleNames; problems: string[] } {
  const problems: string[] = [];
  if (!isRecord(value)) {
    return { declarations: {}, problems: [`${file} does not export accessibleNames as an object of previews.`] };
  }
  const declarations: Record<string, Announcement[]> = {};
  for (const [preview, list] of Object.entries(value)) {
    const where = `${file} "${preview}"`;
    if (!previews.includes(preview)) {
      problems.push(`${where} is not a preview of this flow. Its previews are ${previews.map((query) => `"${query}"`).join(", ")}.`);
      continue;
    }
    if (!Array.isArray(list)) {
      problems.push(`${where} must be a list of announcements.`);
      continue;
    }
    declarations[preview] = list.flatMap((item, index): Announcement[] => {
      const problem = announcementProblem(item);
      if (problem === null) return [item as Announcement];
      problems.push(`${where}[${index}] ${problem}`);
      return [];
    });
  }
  for (const preview of previews) {
    if ((declarations[preview]?.length ?? 0) === 0 && !problems.some((problem) => problem.startsWith(`${file} "${preview}"`))) {
      problems.push(`${file} declares nothing for "${preview}". Say what a screen reader hears there: the things that change between states, at least.`);
    }
  }
  return { declarations, problems };
}

function announcementProblem(item: unknown): string | null {
  if (!isRecord(item)) return "must be an object.";
  const unknown = Object.keys(item).filter((key) => !ANNOUNCEMENT_KEYS.has(key));
  if (unknown.length > 0) return `has unknown keys: ${unknown.join(", ")}. It reads ${[...ANNOUNCEMENT_KEYS].join(", ")}.`;
  if (typeof item.role !== "string" || item.role === "") return "needs a role.";
  if (item.name === undefined && item.text === undefined) return "needs a name or a text to compare.";
  for (const key of ["name", "text", "current"] as const) {
    if (item[key] !== undefined && typeof item[key] !== "string") return `${key} must be a string.`;
  }
  if (item.current === "false") return 'current "false" is the same as no aria-current. Leave current out.';
  for (const key of ["disabled", "expanded", "selected"] as const) {
    if (item[key] !== undefined && typeof item[key] !== "boolean") return `${key} must be true or false.`;
  }
  for (const key of ["checked", "pressed"] as const) {
    if (item[key] !== undefined && typeof item[key] !== "boolean" && item[key] !== "mixed") return `${key} must be true, false or "mixed".`;
  }
  return null;
}

function tristate(value: unknown): boolean | "mixed" | null {
  if (value === "mixed") return "mixed";
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function shortTag(element: DomElement | undefined): string {
  if (!element) return "a node with no element";
  const attributes = Object.entries(element.attributes)
    .filter(([name]) => name === "id" || name === "class" || name.startsWith("data-") || name.startsWith("aria-") || name === "href" || name === "type")
    .map(([name, value]) => (value === "" ? name : `${name}="${value}"`));
  const tag = `<${[element.tag.toLowerCase(), ...attributes].join(" ")}>`;
  return tag.length > 120 ? `${tag.slice(0, 117)}...>` : tag;
}

/**
 * Flattens Chrome's accessibility tree into the nodes a screen reader
 * reaches, in document order. Ignored nodes are walked through, not kept, so
 * a named node inside a plain wrapper still counts. `elements` maps a node's
 * backend DOM id to its element, which gives `aria-current`, a value Chrome's
 * tree does not carry.
 */
export function flattenAxTree(nodes: readonly CdpAxNode[], elements: ReadonlyMap<number, DomElement>): AxNode[] {
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const root = nodes.find((node) => node.parentId === undefined || !byId.has(node.parentId));
  if (!root) return [];
  const texts = new Map<string, string>();
  const textOf = (node: CdpAxNode): string => {
    const known = texts.get(node.nodeId);
    if (known !== undefined) return known;
    const role = String(node.role?.value ?? "");
    let text: string;
    if (role === "StaticText") text = node.ignored ? "" : String(node.name?.value ?? "");
    else if (role === "InlineTextBox") text = "";
    else text = (node.childIds ?? []).map((id) => byId.get(id)).flatMap((child) => (child ? [textOf(child)] : [])).join(" ");
    // Runs are joined by spaces, so a run that only closes a sentence, like React's "." after "{duration}", keeps to the word before it.
    text = collapse(text).replace(/ ([.,;:!?)\]])/g, "$1");
    texts.set(node.nodeId, text);
    return text;
  };
  const found: AxNode[] = [];
  const visit = (node: CdpAxNode): void => {
    const role = String(node.role?.value ?? "");
    if (!node.ignored && role !== "StaticText" && role !== "InlineTextBox") {
      const properties = new Map((node.properties ?? []).map((property) => [property.name, property.value?.value]));
      const element = node.backendDOMNodeId === undefined ? undefined : elements.get(node.backendDOMNodeId);
      const current = element?.attributes["aria-current"];
      found.push({
        role,
        name: collapse(String(node.name?.value ?? "")),
        text: textOf(node),
        current: current === undefined || current === "false" ? null : current === "" ? "true" : current,
        disabled: properties.get("disabled") === true,
        expanded: properties.has("expanded") ? properties.get("expanded") === true : null,
        checked: tristate(properties.get("checked")),
        pressed: tristate(properties.get("pressed")),
        selected: properties.has("selected") ? properties.get("selected") === true : null,
        html: shortTag(element),
      });
    }
    for (const id of node.childIds ?? []) {
      const child = byId.get(id);
      if (child) visit(child);
    }
  };
  visit(root);
  return found;
}

function matches(node: AxNode, announcement: Announcement): boolean {
  if (node.role !== announcement.role) return false;
  if (announcement.name !== undefined && node.name !== collapse(announcement.name)) return false;
  if (announcement.text !== undefined && node.text !== collapse(announcement.text)) return false;
  if (announcement.current !== undefined && node.current !== announcement.current) return false;
  if (announcement.disabled !== undefined && node.disabled !== announcement.disabled) return false;
  for (const key of ["expanded", "checked", "pressed", "selected"] as const) {
    if (announcement[key] !== undefined && node[key] !== announcement[key]) return false;
  }
  return true;
}

function states(item: Announcement | AxNode): string {
  const parts: string[] = [];
  if (item.current !== undefined && item.current !== null) parts.push(`aria-current="${item.current}"`);
  if (item.disabled === true) parts.push("disabled");
  for (const key of ["expanded", "checked", "pressed", "selected"] as const) {
    const value = item[key];
    if (value !== undefined && value !== null) parts.push(`${key}=${String(value)}`);
  }
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

function describe(announcement: Announcement): string {
  const said = announcement.name !== undefined ? `named "${collapse(announcement.name)}"` : `reading "${collapse(announcement.text ?? "")}"`;
  const text = announcement.name !== undefined && announcement.text !== undefined ? ` and reading "${collapse(announcement.text)}"` : "";
  return `${announcement.role} ${said}${text}${states(announcement)}`;
}

function heard(node: AxNode): string {
  return node.name !== "" ? `named "${node.name}"` : `reading "${node.text}"`;
}

/**
 * The problems in one preview: a control with no name, a declared
 * announcement the tree does not have, and a state-dependent node the
 * declarations leave out. Each message says what a screen reader hears
 * instead, so the fix is in the message.
 */
export function auditPreview(tree: readonly AxNode[], declared: readonly Announcement[], file: string): string[] {
  const problems: string[] = [];
  for (const node of tree) {
    if (CONTROL_ROLES.has(node.role) && node.name === "") {
      problems.push(`${node.role} ${node.html} has no accessible name, so a screen reader announces only "${node.role}".`);
    }
  }
  // A role whose declaration failed already lists what its nodes say, so they are not reported again as undeclared.
  const listed = new Set<string>();
  for (const announcement of declared) {
    if (tree.some((node) => matches(node, announcement))) continue;
    listed.add(announcement.role);
    const sameRole = tree.filter((node) => node.role === announcement.role);
    const instead =
      sameRole.length === 0
        ? `The page has no ${announcement.role}.`
        : `Its ${announcement.role} nodes are ${sameRole
            .slice(0, 6)
            .map((node) => `${announcement.name !== undefined ? `"${node.name}"` : `"${node.text}"`}${states(node)}`)
            .join(", ")}${sameRole.length > 6 ? `, and ${sameRole.length - 6} more` : ""}.`;
    problems.push(`${file} expects ${describe(announcement)}, and a screen reader does not hear it. ${instead}`);
  }
  for (const node of tree) {
    const live = LIVE_ROLES.has(node.role) && (node.text !== "" || node.name !== "" || node.role === "progressbar" || node.role === "meter");
    if ((node.current === null && !live) || listed.has(node.role)) continue;
    if (declared.some((announcement) => matches(node, announcement))) continue;
    problems.push(`${node.role} ${heard(node)}${states(node)} changes with the state, and ${file} does not declare it.`);
  }
  return problems;
}
