# AI usage

## Tools
Claude (Anthropic, via Claude Code in a cloud sandbox) generated the project from the assignment brief: backend, frontend,
tests, Docker files and documentation.

## Verification status (read this first)

What was **actually run** while building:

| Check | Result |
|---|---|
| Frontend `tsc --noEmit` and `vite build` | pass |
| Frontend Vitest suite (18 tests) | pass |
| Built frontend driven in headless Chromium against a **mock API** that imitates the contract: ID validation, ID persistence after refresh, apply, countdown, refresh keeps countdown, automatic EXPIRED state with Pay disabled, apply again, pay -> CONFIRMED, admin pages, no console errors, no horizontal scroll at 390px | pass |
| Migration SQL applied to a real PostgreSQL 16; 60 concurrent "apply" transactions for 5 seats using the same locking sequence as the C# service (`FOR UPDATE`, duplicate check, capacity check, insert) -> exactly 5 rows; 20 concurrent applies by one student -> exactly 1 row; unique index rejects a forced duplicate | pass |

What was **NOT run** (the sandbox had no .NET SDK, no Docker daemon, and could not reach NuGet/Docker registries):

* The C# backend has **never been compiled or executed**, and the xUnit tests (including the real concurrency test) have **never been run**.
* `docker compose up` has **never been run**; Dockerfiles and compose file are unverified.
* The frontend has not been run against the real backend, only against the mock.

Treat the backend as unverified code until you run `docker compose up --build` and
`docker compose --profile test run --rm backend-tests` yourself. Compile errors or small test fixes are possible.

## Mistakes made by the AI and how they were caught
1. **Dependency mismatch**: AI installed Vite 5 together with `@vitejs/plugin-react` 6, which requires Vite 8. `npm install` failed with ERESOLVE; read the report and upgraded Vite instead of using `--force`.
2. **TypeScript 7 pulled in by `latest`**: pinned to TypeScript 5 for a safer toolchain; typecheck and build were then run.
3. **Lost CORS headers on errors** (found by code review, not by running): the first error middleware called `Response.Clear()`, which would also remove CORS headers, so browsers could not read 4xx bodies. Removed the call.
4. **Test DB location**: the first local PostgreSQL attempt failed on directory permissions; moved the data directory.

## Final verification you should do (add your own results here)
Do not copy the table above as your own work. Record what **you** ran, e.g. `docker compose up` result, backend test output, and a manual walkthrough.
