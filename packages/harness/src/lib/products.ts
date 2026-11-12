import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The product registry. A product is any `harness.config.ts` git knows of,
 * tracked or new and not ignored, outside the harness package, whose fixtures
 * are not products. Nothing lists products by hand: `npm run check`, CI's
 * product jobs, check:proposals, check:retirement and check:trace all read
 * this, so a new product under `products/<name>/` is checked once its config
 * exists.
 */

/** The harness package's folder, as seen from the repository root, where the checks run. */
export const harnessDir = path.relative(process.cwd(), path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))))).split(path.sep).join("/");

/** True when a repository path is a product's config: a harness.config.ts outside the harness package. */
export function isProductConfig(file: string): boolean {
  return path.posix.basename(file) === "harness.config.ts" && !file.startsWith(`${harnessDir}/`);
}

/**
 * Every product's config in the working tree, sorted. A config deleted from
 * the working tree but still in the index is no longer a product.
 */
export function productConfigs(): string[] {
  const output = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  return [...new Set(output.split("\0").filter((file) => isProductConfig(file) && existsSync(file)))].sort();
}
