import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Starts a product: `npm run new:product <name>` copies the harness's fixture
 * product, which passes every check, to `products/<name>/` and points its
 * harness.config.ts at the new folder. The registry (lib/products.ts) finds it
 * from there, so `npm run check` and CI check it with no script, job or
 * pointer of its own. The copy is the fixture's invoice approval: rename and
 * reshape it from there, one proposal at a time.
 *
 * A new product is a whole inventory added at once, so check:inventories
 * passes it only with an adopted proposal that lists the product's directory,
 * decided on the base. The script prints that path.
 */

const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/product", import.meta.url));
const FIXTURE = path.relative(process.cwd(), FIXTURE_DIR).split(path.sep).join("/");
/** Fixture-only files: case.ts tells check:fixtures which checks to run, and a product has none. */
const SKIP = new Set(["case.ts"]);
const TEXT = /\.(ts|tsx|css|html|md|json)$/;

const args = process.argv.slice(2);
const name = args[0];
if (args.length !== 1 || !name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("new:product: give the product's name, a lowercase slug: npm run new:product -- <name>, such as npm run new:product -- harbor.");
  process.exit(1);
}

const dest = `products/${name}`;
if (existsSync(dest)) {
  console.error(`new:product: ${dest} already exists. Pick another name, or delete that folder first.`);
  process.exit(1);
}

cpSync(FIXTURE, dest, { recursive: true, filter: (source) => !SKIP.has(path.basename(source)) });

// Every path inside the copy that names the fixture names the product instead.
let rewritten = 0;
const visit = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const file = path.join(dir, entry);
    if (statSync(file).isDirectory()) {
      visit(file);
      continue;
    }
    if (!TEXT.test(entry)) continue;
    const text = readFileSync(file, "utf8");
    const next = text.split(FIXTURE).join(dest);
    if (next === text) continue;
    writeFileSync(file, next);
    rewritten += 1;
  }
};
visit(dest);

// The copy describes itself as the product, not the fixture.
const retitle = (file: string, from: RegExp, to: string): void => {
  const text = readFileSync(file, "utf8");
  writeFileSync(file, text.replace(from, to));
};
retitle(`${dest}/index.html`, /<title>[^<]*<\/title>/, `<title>${name}</title>`);
retitle(`${dest}/main.tsx`, /\/\*\*\n \* The fixture product's app:/, `/**\n * ${name}'s app, started from the harness's fixture product:`);
retitle(
  `${dest}/harness.config.ts`,
  /\/\*\*[\s\S]*?\*\/\n(?=export default)/,
  `/**\n * ${name}'s harness config, started from the harness's fixture product by\n * npm run new:product. The checks find this file, so CI and npm run check\n * read it with no other edit. Plain literals only: check:inventories reads it\n * at the pull request base with git show.\n */\n`,
);

const config = `${dest}/harness.config.ts`;
if (!readFileSync(config, "utf8").includes(`source: "${dest}"`)) {
  console.error(`new:product: ${config} does not name ${dest} as paths.source, so the copy is not pointed at its folder. The fixture product's config changed shape; fix this script.`);
  process.exit(1);
}

console.log(`new:product: copied ${FIXTURE} to ${dest} and pointed ${rewritten} ${rewritten === 1 ? "file" : "files"} at it.`);
console.log("new:product: next:");
console.log(`- npm run check:product -- --config ${config} checks it alone; npm run check and CI pick it up with no other edit.`);
console.log(`- A new product is an inventory change: a proposal that lists ${dest} under changes, decided on the base, then adopted in the pull request that adds the product (proposals/README.md).`);
console.log(`- Start the app with npx vite --config vite.config.ts ${dest}.`);
