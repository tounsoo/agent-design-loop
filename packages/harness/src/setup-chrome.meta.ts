import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Installs the chrome-headless-shell build `puppeteer-core` pins into `.cache/chrome`, where the Chrome checks look for it.",
  tool: true,
  details: ["CI runs it too, so a local run measures in the same build. Nothing is installed system-wide."],
} satisfies CheckMeta;
