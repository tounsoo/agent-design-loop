# Nook verification map

Nook is the room-booking demo in `products/nook/`, checked with `products/nook/harness.config.ts`. Read [the map's index](../README.md) for the preconditions and conventions every recipe here assumes, then use the matching feature file.

- Serve it with `npm run dev:nook` at `http://127.0.0.1:5173/`. There is no build or preview script for Nook; the Chrome checks build and serve their own copy.
- Its Vitest journeys are `products/nook/App.test.tsx`.
- It has no Preview menu: open a scenario by its `?scenario=<id>` URL, and `?fail` for a live load error.

## Features

- [Book a room](book-a-room.md): the rooms list, a room's booking page and the `book-room` task.
- [Hold a room](hold-a-room.md): the `hold-room` task, and a hold that runs out.
- [The waitlist](waitlist.md): joining and leaving a full room's waitlist, and a room that frees up.
- [Scenarios](scenarios.md): `?scenario=` URLs, and loading, no rooms and the load error.

When a feature is added or changes, update its file in the same pull request, and its `## Covers` section with it.
