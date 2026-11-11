import { describe, expect, it } from "vitest";
import { findChrome } from "./chrome";

const INSTALLED = "/repo/.cache/chrome/chrome-headless-shell/linux-1/chrome-headless-shell";

describe("findChrome", () => {
  it("uses CHROME_PATH first", () => {
    expect(findChrome({ CHROME_PATH: "/opt/chrome" }, () => true, INSTALLED)).toEqual({ path: "/opt/chrome" });
  });

  it("does not fall through when CHROME_PATH names no file", () => {
    const found = findChrome({ CHROME_PATH: "/opt/typo" }, (file) => file === INSTALLED, INSTALLED);
    expect("missing" in found && found.missing).toContain("CHROME_PATH is /opt/typo, and there is no file there");
  });

  it("prefers the setup:chrome install over a system Chrome", () => {
    expect(findChrome({}, () => true, INSTALLED)).toEqual({ path: INSTALLED });
  });

  it("falls back to a system Chrome", () => {
    expect(findChrome({}, (file) => file === "/usr/bin/chromium", INSTALLED)).toEqual({ path: "/usr/bin/chromium" });
  });

  it("names what it looked for and both fixes when there is none", () => {
    const found = findChrome({}, () => false, INSTALLED);
    expect("missing" in found).toBe(true);
    if (!("missing" in found)) return;
    expect(found.missing).toContain("no headless Chrome found");
    expect(found.missing).toContain("npm run setup:chrome");
    expect(found.missing).toContain("CHROME_PATH=/path/to/chrome");
    expect(found.missing).toContain("/usr/bin/google-chrome-stable");
  });
});
