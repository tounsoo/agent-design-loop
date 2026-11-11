/**
 * The file names and markdown `npm run screenshots` writes. A pull request
 * description cannot carry images from an agent, so each pull request that
 * changes a screen commits its screenshots with a gallery, a README.md that
 * GitHub renders beside them, and links that gallery from its description.
 */

/** A preview's query string as a file name: `state=ready&page=detail` is `ready--page-detail`. */
export function screenshotName(query: string): string {
  const params = new URLSearchParams(query);
  const parts = [params.get("state") ?? "default"];
  for (const [key, value] of params) {
    if (key !== "state") parts.push(`${key}-${value}`);
  }
  return parts.map((part) => part.replace(/[^A-Za-z0-9_-]+/g, "-")).join("--");
}

/** An image wrapped in a link to its own file, so a click opens it full size. */
function linkedImage(alt: string, file: string): string {
  return `[![${alt}](${file})](${file})`;
}

export type Gallery = {
  /** The config the screenshots were taken with, such as products/meridian/harness.config.ts. */
  readonly product: string;
  /** The ref the before screenshots were taken at, or null when there are none. */
  readonly base: string | null;
  /** The PNG file names in `before/`, empty without a base. */
  readonly before: readonly string[];
  /** The PNG file names in `after/` with a base, or in the folder itself without one. */
  readonly after: readonly string[];
};

/** The gallery's README.md: one row or section per preview, each image linked to its full-size file. */
export function galleryMarkdown({ product, base, before, after }: Gallery): string {
  const lines = [
    "# Screenshots",
    "",
    `Taken by \`npm run screenshots\` with \`${product}\`, at 1280 by 900 CSS px in headless Chrome, one per preview. Click an image to open it full size.`,
    "",
  ];
  if (base === null) {
    for (const file of after) {
      const name = file.replace(/\.png$/, "");
      lines.push(`## ${name}`, "", linkedImage(name, file), "");
    }
    return lines.join("\n");
  }
  lines.push(`Before is \`${base}\`. After is the change.`, "", "| Preview | Before | After |", "| --- | --- | --- |");
  for (const file of [...new Set([...before, ...after])].sort()) {
    const name = file.replace(/\.png$/, "");
    const cell = (side: "before" | "after", files: readonly string[]) => (files.includes(file) ? linkedImage(`${name}, ${side}`, `${side}/${file}`) : "none");
    lines.push(`| ${name} | ${cell("before", before)} | ${cell("after", after)} |`);
  }
  lines.push("");
  return lines.join("\n");
}

/** The pull request body's line: a plain link to the gallery, pinned to a commit. */
export function pullRequestMarkdown({
  repository,
  commit,
  folder,
  before,
  after,
}: {
  readonly repository: string;
  readonly commit: string;
  readonly folder: string;
  readonly before: readonly string[];
  readonly after: readonly string[];
}): string {
  const count = new Set([...before, ...after]).size;
  return `**Screenshots:** [${count} preview${count === 1 ? "" : "s"}${before.length > 0 ? ", before and after" : ""}](${repository}/blob/${commit}/${folder}/README.md)`;
}
