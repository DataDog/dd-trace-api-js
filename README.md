# `dd-trace-api-js`: Node.js API package for Datadog APM

This, package, `dd-trace-api` on npm, exposes an API for the Datadog APM tracing library for Node.js (`dd-trace`).
It's meant to be used when `dd-trace` is installed via other means (such as Single-Step Install, other other non-npm methods) and you need an API to program against.
The API provided is completely inert unless `dd-trace` is installed and initialized in the same process.
You can still write code against it in that scenario, but it won't have any side effects, such as sending traces or metrics.

The API provided is as defined in the `index.d.ts` file. It's mostly a direct mapping of the API provided by `dd-trace`, but with some differences:
* The `TracerProvider` class for OpenTelemetry is not exported. Instead, use `dd-trace`'s automatic insertion of `TracerProvider`.
* The LLM Observability APIs are not (yet) included.
* The `use()` method is not (yet) included.
* Anything else not documented in this repo's `index.d.ts` file is not (yet) included.
