/**
 * What a product's app imports to render a scenario, so no product parses a
 * query string of its own. Browser-safe: no Node module, so the app's bundle
 * can take it. The checks load and check the same records in lib/scenarios.ts.
 */

/** The address parameter every check and the screenshots open a scenario with: `?scenario=<id>`. */
export const SCENARIO_PARAM = "scenario";

/**
 * One case a flow renders: a modeled state, and the product's own data for
 * it, such as which room or invoice, how long a list, which page, or a
 * failure. The harness reads `state`; the rest is the product's.
 */
export type Scenario<State extends string = string> = { readonly state: State };

/**
 * A flow's scenarios, exported as `scenarios` from `scenarios.ts` beside its
 * `states` module: a lowercase slug, such as `booking-lantern`, to the case it
 * renders. Every modeled state needs at least one.
 */
export type Scenarios<State extends string = string, Case extends Scenario<State> = Scenario<State>> = { readonly [id: string]: Case };

/**
 * The scenario an address names with `?scenario=<id>`, with its id, or null
 * when it names none or one the record does not have, so the app shows its
 * live state instead.
 */
export function readScenario<Case extends Scenario>(search: string, scenarios: { readonly [id: string]: Case }): (Case & { readonly id: string }) | null {
  const id = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(SCENARIO_PARAM);
  if (id === null || !Object.hasOwn(scenarios, id)) return null;
  const found = scenarios[id];
  return found === undefined ? null : { ...found, id };
}

/** The address search that opens a scenario: `?scenario=<id>`. */
export function scenarioSearch(id: string): string {
  return `?${new URLSearchParams({ [SCENARIO_PARAM]: id }).toString()}`;
}
