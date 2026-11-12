import { describe, expect, it } from "vitest";
import { readScenario, scenarioSearch } from "./scenario-read";

const scenarios = {
  rooms: { state: "choosing" },
  "booking-lantern": { state: "choosing", room: "lantern" },
};

describe("readScenario", () => {
  it("returns the scenario the address names, with its id and its data", () => {
    expect(readScenario("?scenario=booking-lantern", scenarios)).toEqual({ id: "booking-lantern", state: "choosing", room: "lantern" });
    expect(readScenario("scenario=rooms&route=x", scenarios)).toEqual({ id: "rooms", state: "choosing" });
  });

  it("returns null for no scenario, an unknown one, or an inherited key, so the app shows its live state", () => {
    expect(readScenario("", scenarios)).toBeNull();
    expect(readScenario("?scenario=quarry", scenarios)).toBeNull();
    expect(readScenario("?scenario=toString", scenarios)).toBeNull();
  });
});

describe("scenarioSearch", () => {
  it("writes the address search that readScenario reads back", () => {
    expect(scenarioSearch("booking-lantern")).toBe("?scenario=booking-lantern");
    expect(readScenario(scenarioSearch("rooms"), scenarios)?.id).toBe("rooms");
  });
});
