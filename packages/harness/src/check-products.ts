import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { productConfigs } from "./lib/products";

/**
 * Runs check:product on every product the registry finds (lib/products.ts),
 * one after another: `npm run check:products`. A new product is checked once
 * its harness.config.ts exists, with no script or CI job of its own.
 *
 * `--json` prints the configs as a JSON array and runs nothing. CI reads it to
 * give each product its own job.
 */

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--json")) {
  console.error("check:products takes no arguments but --json. It runs check:product on every product's harness.config.ts.");
  process.exit(1);
}

const configs = productConfigs();
if (configs.length === 0) {
  console.error("check:products: found no harness.config.ts outside the harness package.");
  process.exit(1);
}
if (args[0] === "--json") {
  console.log(JSON.stringify(configs));
  process.exit(0);
}

const checkProduct = fileURLToPath(new URL("./check-product.ts", import.meta.url));
const failed: string[] = [];
for (const config of configs) {
  console.log(`check:products: ${config}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", checkProduct, "--config", config], { stdio: "inherit" });
  if (result.status !== 0) failed.push(config);
}

if (failed.length > 0) {
  console.error(`check:products: ${failed.length} of ${configs.length} products failed: ${failed.join(", ")}.`);
  process.exit(1);
}
console.log(`check:products: ${configs.length} products passed: ${configs.join(", ")}.`);
