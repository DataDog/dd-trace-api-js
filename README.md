# `dd-trace-api-js`: Node.js API package for Datadog APM

This, package, `dd-trace-api` on npm, exposes an API for the Datadog APM tracing library for Node.js (`dd-trace`).
It's meant to be used when `dd-trace` is installed via other means (such as Single-Step Install, other other non-npm methods) and you need an API to program against.
The API provided is completely inert unless `dd-trace` is installed and initialized in the same process.
You can still write code against it, but it won't have any side effects, such as sending traces or metrics.

The API provided is as defined in the `index.d.ts` file.
