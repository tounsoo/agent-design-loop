import { describe, expect, it } from "vitest";
import { auditPreview, declarationsFile, flattenAxTree, parseDeclarations, type AxNode, type CdpAxNode, type DomElement } from "./accessible-names";

const FILE = "flows/accessible-names.ts";

function node(role: string, fields: Partial<AxNode> = {}): AxNode {
  return { role, name: "", text: "", current: null, disabled: false, expanded: null, checked: null, pressed: null, selected: null, html: `<${role}>`, ...fields };
}

describe("flattenAxTree", () => {
  // Steps.Item after Approve: a hidden status word, an aria-hidden marker, and the stage.
  const nodes: CdpAxNode[] = [
    { nodeId: "1", ignored: false, role: { value: "RootWebArea" }, name: { value: "Invoice" }, childIds: ["2", "9"] },
    { nodeId: "2", ignored: true, role: { value: "generic" }, parentId: "1", childIds: ["3"] },
    { nodeId: "3", ignored: false, role: { value: "listitem" }, parentId: "2", childIds: ["4", "6", "7", "8"], backendDOMNodeId: 30 },
    { nodeId: "4", ignored: true, role: { value: "generic" }, parentId: "3", childIds: ["5"] },
    { nodeId: "5", ignored: true, role: { value: "StaticText" }, name: { value: "✓" }, parentId: "4" },
    { nodeId: "6", ignored: false, role: { value: "StaticText" }, name: { value: "In progress: " }, parentId: "3" },
    { nodeId: "7", ignored: false, role: { value: "StaticText" }, name: { value: "Payment due " }, parentId: "3" },
    { nodeId: "8", ignored: false, role: { value: "StaticText" }, name: { value: "Nov 18" }, parentId: "3" },
    { nodeId: "9", ignored: false, role: { value: "button" }, name: { value: "Approve" }, parentId: "1", properties: [{ name: "disabled", value: { value: true } }] },
  ];
  const elements = new Map<number, DomElement>([[30, { tag: "LI", attributes: { "aria-current": "step", class: "item" } }]]);

  it("reads a node's text from its runs, leaving out aria-hidden ones", () => {
    const item = flattenAxTree(nodes, elements).find((found) => found.role === "listitem");
    expect(item?.text).toBe("In progress: Payment due Nov 18");
  });

  it("takes aria-current from the element, since Chrome's tree does not carry it", () => {
    const item = flattenAxTree(nodes, elements).find((found) => found.role === "listitem");
    expect(item?.current).toBe("step");
    expect(item?.html).toBe('<li aria-current="step" class="item">');
  });

  it("keeps document order and walks through ignored wrappers", () => {
    expect(flattenAxTree(nodes, elements).map((found) => found.role)).toEqual(["RootWebArea", "listitem", "button"]);
  });

  it("reads disabled from the node's properties", () => {
    expect(flattenAxTree(nodes, elements).find((found) => found.role === "button")?.disabled).toBe(true);
  });

  it("keeps a closing run against the word before it", () => {
    const sentence: CdpAxNode[] = [
      { nodeId: "1", ignored: false, role: { value: "status" }, childIds: ["2", "3"] },
      { nodeId: "2", ignored: false, role: { value: "StaticText" }, name: { value: "Harbor is yours for 1 hour" }, parentId: "1" },
      { nodeId: "3", ignored: false, role: { value: "StaticText" }, name: { value: "." }, parentId: "1" },
    ];
    expect(flattenAxTree(sentence, new Map())[0]?.text).toBe("Harbor is yours for 1 hour.");
  });
});

describe("auditPreview", () => {
  const approved = [
    node("listitem", { text: "Done: Approval" }),
    node("listitem", { text: "In progress: Payment due Nov 18", current: "step" }),
    node("button", { name: "Approve", disabled: true }),
  ];

  it("fails a declared announcement the page does not make, and says what it makes instead", () => {
    const problems = auditPreview(approved, [{ role: "listitem", text: "Next: Payment due Nov 18", current: "step" }], FILE);
    expect(problems).toEqual([
      `${FILE} expects listitem reading "Next: Payment due Nov 18" (aria-current="step"), and a screen reader does not hear it. Its listitem nodes are "Done: Approval", "In progress: Payment due Nov 18" (aria-current="step").`,
    ]);
  });

  it("fails an aria-current node the declarations leave out", () => {
    expect(auditPreview(approved, [{ role: "button", name: "Approve", disabled: true }], FILE)).toEqual([
      `listitem reading "In progress: Payment due Nov 18" (aria-current="step") changes with the state, and ${FILE} does not declare it.`,
    ]);
  });

  it("passes when the declarations match, states included", () => {
    expect(auditPreview(approved, [{ role: "listitem", text: "In progress: Payment due Nov 18", current: "step" }], FILE)).toEqual([]);
  });

  it("compares a declared state, so an enabled button does not pass for a disabled one", () => {
    expect(auditPreview(approved, [{ role: "button", name: "Approve", disabled: false }, { role: "listitem", text: "In progress: Payment due Nov 18" }], FILE)).toHaveLength(1);
  });

  it("fails a control with no name, whatever is declared", () => {
    const problems = auditPreview([node("button", { html: '<button class="more">' })], [], FILE);
    expect(problems).toEqual(['button <button class="more"> has no accessible name, so a screen reader announces only "button".']);
  });

  it("asks for a live region only when it has something to say", () => {
    expect(auditPreview([node("status")], [], FILE)).toEqual([]);
    expect(auditPreview([node("status", { text: "Invoice approved" })], [], FILE)).toHaveLength(1);
  });
});

describe("parseDeclarations", () => {
  const previews = ["state=ready", "state=invoice-approved"];

  it("accepts a declaration for every preview", () => {
    const value = { "state=ready": [{ role: "button", name: "Approve" }], "state=invoice-approved": [{ role: "status", text: "Approved" }] };
    expect(parseDeclarations(value, FILE, previews).problems).toEqual([]);
  });

  it("fails a preview with nothing declared and a key that is not a preview", () => {
    const { problems } = parseDeclarations({ "state=ready": [{ role: "button", name: "Approve" }], "state=done": [] }, FILE, previews);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('"state=done" is not a preview of this flow');
    expect(problems[1]).toContain('declares nothing for "state=invoice-approved"');
  });

  it("fails an announcement with nothing to compare, or a key it does not read", () => {
    const { problems } = parseDeclarations({ "state=ready": [{ role: "button" }], "state=invoice-approved": [{ role: "button", name: "Approve", aria: "x" }] }, FILE, previews);
    expect(problems).toEqual([`${FILE} "state=ready"[0] needs a name or a text to compare.`, expect.stringContaining('[0] has unknown keys: aria.')]);
  });
});

describe("declarationsFile", () => {
  it("sits beside the flow's views module", () => {
    expect(declarationsFile("products/meridian/features/invoice-approval/views.tsx")).toBe("products/meridian/features/invoice-approval/accessible-names.ts");
  });
});
