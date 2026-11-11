# Longer route

The two-task notes inbox, with one change to its reducer: a note that has had its reminder sent can still be archived. So open, send the reminder, then archive is a second route to `archived`, three steps long. `archive-note` has `max_steps` 3 here, so the route fits and `check:step-budget` passes, printing it as the longest shipped route. Send reminder is a step because the `send-reminder` task in the same flow names it.

`illegal/route-over-budget` runs the same flow with the two-task inputs, where `archive-note` has `max_steps` 2. Its shortest path still fits, and the longer route fails.
