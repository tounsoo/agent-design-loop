import { Action } from "@fake/ds";

/** Illegal under the stand-in adapter: product UI imports the design system package, not the catalog. */
export function FakeOffCatalogSave() {
  return <Action tone="strong">Save</Action>;
}
