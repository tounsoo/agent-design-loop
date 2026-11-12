import { describe, expect, it } from "vitest";
import { membershipChanges, type Change, type Inventory } from "./membership";
import type { ParsedConfig } from "./parse-config";

const CONFIG = "products/demo/harness.config.ts";

function config(change: { shells?: ParsedConfig["shells"]; tasks?: Record<string, string>; previews?: Record<string, string[]> } = {}): ParsedConfig {
  return {
    adapter: "packages/adapter-todae/index.ts",
    paths: {
      source: "products/demo",
      features: "products/demo/features",
      layouts: "products/demo/layouts",
      contentLayouts: "products/demo/content-layouts",
      pageTypes: "products/demo/page-types",
      catalog: "products/demo/catalog/index.ts",
      inputs: "products/demo/inputs.ts",
      rules: "products/demo/rules.ts",
      styles: "products/demo/styles.css",
      app: [],
      web: "products/demo",
      proposals: "proposals",
    },
    shells: change.shells ?? { primarySlots: { detail: "Primary" }, collections: { collection: ["Heading", "Description"] } },
    flows: [
      {
        states: "products/demo/flows/states.ts",
        views: "products/demo/features/views.tsx",
        tasks: change.tasks ?? { approve: "products/demo/flows/approve.ts" },
        previews: change.previews ?? { ready: ["page=collection", "page=detail"] },
      },
    ],
    optOuts: {},
  };
}

function inventory(change: Partial<Inventory> = {}): Inventory {
  const own = change.config ?? config();
  const previews: Record<string, string[]> = { ready: [], approved: [] };
  for (const flow of own.flows) for (const [state, queries] of Object.entries(flow.previews ?? {})) previews[state] = [...queries];
  return {
    layouts: ["app-shell"],
    contentLayouts: ["data-table"],
    pageTypes: ["collection", "detail"],
    catalogExports: ["Button", "Heading"],
    flowStates: ["approved", "ready"],
    tasks: [{ id: "approve", success_state: "approved", max_steps: 3 }],
    priority: [{ action: "Approve", rank: 1, level: "primary" }],
    disclosedSections: ["Line items"],
    disclosureDepth: 1,
    disclosuresPerPage: 1,
    visibleQuestions: 1,
    targetMinPx: 24,
    previews,
    adapter: null,
    ...change,
    config: own,
  };
}

const compare = (head: Partial<Inventory>, base: Partial<Inventory> = {}) => membershipChanges(inventory(base), inventory(head), true, CONFIG);
const one = (changes: Change[], text: string) => {
  const found = changes.find((change) => change.text.includes(text));
  if (!found) throw new Error(`no change says ${text}: ${changes.map((change) => change.text).join(" | ")}`);
  return found;
};

const withBoard = { primarySlots: { detail: "Primary" }, collections: { board: ["Heading", "Description"], collection: ["Heading", "Description"] } };

describe("membershipChanges", () => {
  it("finds nothing when base and head match", () => {
    expect(compare({})).toEqual([]);
  });

  it("makes a page type with its own new shells entry an addition, and prints the rule it joins", () => {
    const changes = compare({ pageTypes: ["board", "collection", "detail"], config: config({ shells: withBoard }) });
    expect(one(changes, "allowed_page_types")).toMatchObject({ kind: "adds", names: ["page-type:board"], terms: ["board"] });
    expect(one(changes, "shells adds board")).toMatchObject({
      kind: "adds",
      names: ["page-type:board"],
      terms: ["shells.collections"],
      text: `${CONFIG} shells adds board, the page type this change adds: board joins shells.collections: chrome Heading, Description.`,
    });
  });

  it("names a primary slot when the new page type joins shells.primarySlots", () => {
    const shells = { primarySlots: { detail: "Primary", wizard: "Action" }, collections: { collection: ["Heading", "Description"] } };
    const changes = compare({ pageTypes: ["collection", "detail", "wizard"], config: config({ shells }) });
    expect(one(changes, "shells adds wizard").text).toContain("wizard joins shells.primarySlots: primary slot Action");
  });

  it("does not make a page type an addition when an entry the base had also changes", () => {
    const shells = { primarySlots: { detail: "Primary" }, collections: { board: ["Heading", "Description"], collection: ["Heading"] } };
    const changes = compare({ pageTypes: ["board", "collection", "detail"], config: config({ shells }) });
    expect(one(changes, "allowed_page_types").kind).toBeUndefined();
    expect(one(changes, "allowed_page_types").note).toContain('alters a shells entry the base had ("collection")');
    expect(one(changes, "shells changed an entry the base had")).toMatchObject({ terms: ["shells.collections"], names: ["page-type:board"] });
    expect(one(changes, "shells changed an entry the base had").kind).toBeUndefined();
  });

  it("does not make moving a page type the base had between the rules an addition", () => {
    const shells = { primarySlots: { detail: "Primary", collection: "Heading" }, collections: {} };
    const change = one(compare({ config: config({ shells }) }), 'shells changed an entry the base had ("collection")');
    expect(change.kind).toBeUndefined();
    expect(change.terms).toEqual(["shells.primarySlots", "shells.collections"]);
  });

  it("does not make a page type an addition when it has no shells entry of its own", () => {
    const changes = compare({ pageTypes: ["board", "collection", "detail"] });
    expect(one(changes, "allowed_page_types").kind).toBeUndefined();
  });

  it("makes a new task with its graph module an addition", () => {
    const changes = compare({
      tasks: [
        { id: "approve", success_state: "approved", max_steps: 3 },
        { id: "reject", success_state: "approved", max_steps: 2 },
      ],
      config: config({ tasks: { approve: "products/demo/flows/approve.ts", reject: "products/demo/flows/reject.ts" } }),
    });
    expect(one(changes, "tasks changed")).toMatchObject({ kind: "adds", names: ["task:reject"] });
    expect(one(changes, 'task graph of "reject"')).toMatchObject({ kind: "adds", names: ["task:reject"] });
  });

  it("does not make a renamed task an addition", () => {
    const changes = compare({
      tasks: [{ id: "sign-off", success_state: "approved", max_steps: 3 }],
      config: config({ tasks: { "sign-off": "products/demo/flows/approve.ts" } }),
    });
    expect(one(changes, "tasks changed")).toMatchObject({ names: ["task:sign-off"], terms: ["approve", "max_steps", "sign-off"] });
    expect(one(changes, "tasks changed").kind).toBeUndefined();
  });

  it("does not make a changed graph module an addition", () => {
    const change = one(compare({ config: config({ tasks: { approve: "products/demo/flows/other.ts" } }) }), 'task graph of "approve"');
    expect(change.kind).toBeUndefined();
  });

  it("makes a new preview pair an addition", () => {
    const head = config({ previews: { ready: ["page=collection", "page=detail", "page=detail&room=quarry"] } });
    expect(one(compare({ config: head }), "flows previews")).toMatchObject({ kind: "adds", names: ["preview:ready?page=detail&room=quarry"] });
  });

  it("does not make a query moved to another state an addition", () => {
    const head = config({ previews: { ready: ["page=collection"], approved: ["page=detail"] } });
    const change = one(compare({ config: head }), "flows previews");
    expect(change.kind).toBeUndefined();
    expect(change.terms).toEqual(["flows", "preview:approved", "preview:approved?page=detail", "preview:ready?page=detail"]);
  });

  it("makes a lower cap and a raised target size tightenings", () => {
    const changes = compare({ visibleQuestions: 0, targetMinPx: 32 });
    expect(one(changes, "MAX_VISIBLE_QUESTIONS")).toMatchObject({ kind: "tightens", names: ["MAX_VISIBLE_QUESTIONS"] });
    expect(one(changes, "TARGET_MIN_PX")).toMatchObject({ kind: "tightens", names: ["TARGET_MIN_PX"] });
  });

  it("makes a lower step budget a tightening, named per task", () => {
    const change = one(compare({ tasks: [{ id: "approve", success_state: "approved", max_steps: 2 }] }), 'max_steps of "approve"');
    expect(change).toMatchObject({ kind: "tightens", names: ["max_steps:approve"], text: 'max_steps of "approve" changed from 3 to 2.' });
  });

  it("makes a raised budget a loosening that a tightens proposal cannot cover", () => {
    const change = one(compare({ tasks: [{ id: "approve", success_state: "approved", max_steps: 4 }] }), 'max_steps of "approve"');
    expect(change.kind).toBeUndefined();
    expect(change.loosens).toEqual([{ name: "max_steps:approve", how: "3 to 4" }]);
  });

  it("makes no tightening of a change that also loosens a rule input", () => {
    const base = {
      tasks: [
        { id: "approve", success_state: "approved", max_steps: 3 },
        { id: "reject", success_state: "approved", max_steps: 3 },
      ],
    };
    const head = {
      tasks: [
        { id: "approve", success_state: "approved", max_steps: 2 },
        { id: "reject", success_state: "approved", max_steps: 4 },
      ],
    };
    const changes = compare(head, base);
    const lowered = one(changes, 'max_steps of "approve"');
    expect(lowered.kind).toBeUndefined();
    expect(lowered.notTightening).toContain("max_steps:reject (3 to 4)");
  });

  it("compares success_state, and does not call a lower budget for a moved finish a tightening", () => {
    const changes = compare({ tasks: [{ id: "approve", success_state: "ready", max_steps: 2 }] });
    expect(one(changes, 'success_state of "approve"')).toMatchObject({ terms: ["success_state", "approve"] });
    expect(one(changes, 'max_steps of "approve"').kind).toBeUndefined();
  });

  it("makes a disclosed section added a tightening and one removed a loosening", () => {
    expect(one(compare({ disclosedSections: ["History", "Line items"] }), "disclosed_sections")).toMatchObject({
      kind: "tightens",
      names: ["disclosed_sections:History"],
    });
    const removed = one(compare({ disclosedSections: [] }), "disclosed_sections");
    expect(removed.kind).toBeUndefined();
    expect(removed.loosens).toEqual([{ name: "disclosed_sections:Line items", how: "removed" }]);
  });

  it("keeps the four lists' bare names, and notes a name another list holds on the base", () => {
    const change = one(compare({ layouts: ["app-shell", "ready"] }), "allowed_layouts");
    expect(change).toMatchObject({ kind: "adds", names: ["ready"], elsewhere: ["ready"] });
  });

  it("does not compare the config when told not to, but still reads shells for a new page type", () => {
    const changes = membershipChanges(inventory(), inventory({ pageTypes: ["board", "collection", "detail"], config: config({ shells: withBoard }) }), false, CONFIG);
    expect(changes.map((change) => change.text)).toEqual(['allowed_page_types changed from ["collection","detail"] to ["board","collection","detail"].']);
    expect(changes[0]?.kind).toBe("adds");
  });
});
