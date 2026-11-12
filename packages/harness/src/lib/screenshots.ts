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

/**
 * An image wrapped in a link to its own file. Until `--pin` points the link at
 * the raw file, it opens GitHub's page for the file, which shows the image no
 * larger than the gallery does on a phone.
 */
function linkedImage(alt: string, file: string): string {
  return `[![${alt}](${file})](${file})`;
}

/** What the gallery's header says a click does, before and after `--pin`. */
const UNPINNED_CLICK = "Click an image to open its file.";
const PINNED_CLICK = "Click an image to open it full size.";

/** Every image in a gallery, wrapped in its link: the alt text and the image's path. */
const LINKED_IMAGE = /\[!\[([^\]]*)\]\(([^)\s]+\.png)\)\]\([^)\s]+\)/g;

/**
 * The gallery with each image's link pointed at the raw PNG, at the commit
 * that holds it, so a click opens the image itself, full size on any device,
 * and the link still works once the branch is deleted. `raw` is the folder's
 * address at that commit, such as
 * https://raw.githubusercontent.com/o/r/<sha>/products/x/review/screenshots/change.
 * A link `--pin` set before is replaced, so pinning again moves every link.
 */
export function pinGallery(markdown: string, raw: string): { markdown: string; files: string[] } {
  const files: string[] = [];
  const pinned = markdown
    .replace(UNPINNED_CLICK, PINNED_CLICK)
    .replace(LINKED_IMAGE, (_match, alt: string, file: string) => {
      files.push(file);
      return `[![${alt}](${file})](${raw}/${file})`;
    });
  return { markdown: pinned, files };
}

/** A folder's raw address at a commit, each path segment escaped. */
export function rawFolderUrl({ owner, repo, commit, folder }: { readonly owner: string; readonly repo: string; readonly commit: string; readonly folder: string }): string {
  const segments = folder.split("/").filter((segment) => segment !== "").map(encodeURIComponent);
  return ["https://raw.githubusercontent.com", owner, repo, commit, ...segments].join("/");
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

/** The gallery's README.md: one row or section per preview, each image linked to its own file until `--pin` runs. */
export function galleryMarkdown({ product, base, before, after }: Gallery): string {
  const lines = [
    "# Screenshots",
    "",
    `Taken by \`npm run screenshots\` with \`${product}\`, at 1280 by 900 CSS px in headless Chrome, one per preview. ${UNPINNED_CLICK}`,
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
