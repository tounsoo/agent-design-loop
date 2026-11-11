import path from "node:path";
import { pathToFileURL } from "node:url";
import { configName, type FlowConfig } from "./config";

/**
 * The preview query strings check:target-size and check:accessible-names
 * open, derived from each flow's
 * modeledStates rather than kept as a hand list. Every modeled state is opened:
 * `state=<state>` once when the flow's previews has no entry for it, or once
 * per query string that entry lists. A modeled state added later is opened
 * without anyone remembering to add it, and a previews entry for a state that
 * is not modeled is a problem, not a URL that quietly opens the default page.
 */
export async function previewQueries(flows: readonly FlowConfig[], firstIndex = 0): Promise<{ queries: string[]; problems: string[] }> {
  const queries: string[] = [];
  const problems: string[] = [];
  for (const [position, flow] of flows.entries()) {
    // A caller that reads one flow at a time passes its place in config.flows, so a message names the right entry.
    const index = firstIndex + position;
    const module = (await import(pathToFileURL(path.resolve(flow.states)).href)) as { modeledStates?: unknown };
    const states = module.modeledStates;
    if (!Array.isArray(states) || !states.every((state) => typeof state === "string")) {
      problems.push(`${flow.states} does not export modeledStates as a list of strings.`);
      continue;
    }
    for (const state of Object.keys(flow.previews ?? {})) {
      if (!states.includes(state)) {
        problems.push(`${configName} flows[${index}].previews names "${state}", which is not a modeled state in ${flow.states}.`);
      }
    }
    for (const [state, extras] of Object.entries(flow.previews ?? {})) {
      if (extras.some((extra) => new URLSearchParams(extra).has("state"))) {
        problems.push(`${configName} flows[${index}].previews.${state} sets state itself. The state comes from the key, so an entry cannot open another state.`);
      }
    }
    for (const state of states as string[]) {
      const extras = flow.previews?.[state];
      const variants = extras && extras.length > 0 ? extras : [""];
      for (const extra of variants) {
        const query = new URLSearchParams({ state });
        for (const [key, value] of new URLSearchParams(extra)) query.append(key, value);
        const text = query.toString();
        if (!queries.includes(text)) queries.push(text);
      }
    }
  }
  return { queries, problems };
}
