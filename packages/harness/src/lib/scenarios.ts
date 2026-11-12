import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { FlowConfig } from "./parse-config";
import { scenarioSearch } from "./scenario-read";

/**
 * Loads each flow's scenarios and checks them before any Chrome check opens
 * one. A flow's scenarios are product code, `scenarios.ts` beside its
 * `states` module, exporting `scenarios`: an id to `{ state, ...data }`. The
 * checks hold three things to it: every modeled state has a scenario, every
 * scenario names a modeled state, and an id is used once across the product.
 * Adding or removing a scenario needs no proposal; the flow states, which
 * are an inventory, keep the floor.
 */

/** A scenario as the checks open it. */
export type LoadedScenario = {
  /** Its id, the key in `scenarios`: `booking-lantern`. */
  readonly id: string;
  /** The modeled state it renders. */
  readonly state: string;
  /** The address search that opens it: `?scenario=booking-lantern`. */
  readonly search: string;
  /** The scenarios.ts it comes from. */
  readonly file: string;
};

/** The file a flow's scenarios live in: `scenarios.ts` beside its `states` module. */
export function scenariosFile(flow: Pick<FlowConfig, "states">): string {
  return path.join(path.dirname(flow.states), "scenarios.ts");
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function importModule(file: string): Promise<Record<string, unknown>> {
  return (await import(pathToFileURL(path.resolve(file)).href)) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Every scenario of the given flows, in each file's order, and every problem
 * with them. Flows whose states sit in one folder share its scenarios.ts, so
 * the file answers for all their modeled states. `firstIndex` is the first
 * flow's place in config.flows, so a message names the right entry.
 */
export async function loadScenarios(flows: readonly FlowConfig[], firstIndex = 0): Promise<{ scenarios: LoadedScenario[]; problems: string[] }> {
  const problems: string[] = [];
  const byFile = new Map<string, { states: Set<string>; flows: number[] }>();
  for (const [position, flow] of flows.entries()) {
    const index = firstIndex + position;
    let module: Record<string, unknown>;
    try {
      module = await importModule(flow.states);
    } catch (error) {
      problems.push(`${flow.states} does not load: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const states = module.modeledStates;
    if (!Array.isArray(states) || !states.every((state) => typeof state === "string")) {
      problems.push(`${flow.states} does not export modeledStates as a list of strings.`);
      continue;
    }
    const file = scenariosFile(flow);
    const entry = byFile.get(file) ?? { states: new Set<string>(), flows: [] };
    for (const state of states as string[]) entry.states.add(state);
    entry.flows.push(index);
    byFile.set(file, entry);
  }

  const scenarios: LoadedScenario[] = [];
  const owner = new Map<string, string>();
  for (const [file, { states }] of byFile) {
    const example = [...states][0] ?? "<state>";
    if (!existsSync(file)) {
      problems.push(
        `${file} is missing. Beside the flow's states module, export const scenarios = { "${example}": { state: "${example}" } } satisfies Scenarios<ModeledState>, with at least one scenario for each of its ${states.size} modeled states.`,
      );
      continue;
    }
    let module: Record<string, unknown>;
    try {
      module = await importModule(file);
    } catch (error) {
      problems.push(`${file} does not load: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const record = module.scenarios;
    if (!isRecord(record)) {
      problems.push(`${file} does not export scenarios as an object of scenario id to { state, ...data }.`);
      continue;
    }
    const covered = new Set<string>();
    for (const [id, value] of Object.entries(record)) {
      const where = `${file} "${id}"`;
      if (!SLUG.test(id)) {
        problems.push(`${where} is not a lowercase slug, such as booking-lantern. The id names the scenario in its address, a screenshot's file name and every message.`);
        continue;
      }
      if (!isRecord(value) || typeof value.state !== "string") {
        problems.push(`${where} must be an object with a state, the modeled state it renders.`);
        continue;
      }
      if (!states.has(value.state)) {
        problems.push(`${where} renders "${value.state}", which is not a modeled state. Its states are ${[...states].map((state) => `"${state}"`).join(", ")}.`);
        continue;
      }
      const first = owner.get(id);
      if (first !== undefined) {
        problems.push(`${where} is also a scenario in ${first}. A scenario id is used once across a product, because its address opens one case.`);
        continue;
      }
      owner.set(id, file);
      covered.add(value.state);
      scenarios.push({ id, state: value.state, search: scenarioSearch(id), file });
    }
    for (const state of states) {
      if (!covered.has(state)) problems.push(`${file} has no scenario for the modeled state "${state}". Add one, such as "${state}": { state: "${state}" }.`);
    }
  }
  return { scenarios, problems };
}
