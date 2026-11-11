# tounsoo/agent-design-loop

This repository is a testing ground for deterministic UI design for agents. An agent generates UI inside constraints that already live in the repo, runs checks that can fail the build, fixes what those checks allow, and opens a proposal when a rule has to break.

The checks are a harness that any product in the repo can use. Each product names its own inventories in its own `harness.config.ts`, and the harness checks it against them.

## Where things live

| Path | What it is |
| --- | --- |
| [`packages/harness/`](packages/harness/README.md) | The checks, their fixtures, and the package `@agent-design-loop/harness` that products import |
| `packages/adapter-todae/` | `@agent-design-loop/adapter-todae`, Todae's names for the parts the checks count |
| [`products/meridian/`](products/meridian/README.md) | Meridian, an accounts-payable workspace, and the main worked example |
| `products/nook/` | Nook, a room booking app, the second product |
| [`proposals/`](proposals/README.md) | How an inventory grows: one file per requested or decided change |

[`AGENTS.md`](AGENTS.md) is the loop every agent follows.

## Install

Node.js 22 or newer. CI runs Node 22.

```sh
npm ci
```

`npm install` works too. `.npmrc` sets `legacy-peer-deps`.

## Run the build gate

```sh
npm run check:fixtures && npm run check
```

`check:fixtures` runs the harness's own tests. `check` runs typecheck, ESLint, and the Vitest suite, then every rule check on Meridian and on Nook, then `check:retirement`, which flags a rule most products opt out of, and `check:loop`, which validates the design loop graph. The [harness README](packages/harness/README.md) says what each check fails. `npm run dev` starts Meridian, and `npm run dev:nook` starts Nook.

## Read more

- [How this design loop works](packages/harness/docs/how-it-works.md): the control ladder, the checks, and when a proposal is required.
- [How Meridian works](products/meridian/docs/how-it-works.md): the layers on a Meridian screen, its flow, and a worked example.
- [The harness README](packages/harness/README.md): the checks, `check:product`, and how a product plugs in.
- [Meridian's README](products/meridian/README.md): running the app, its previews, and where its constraints live.
