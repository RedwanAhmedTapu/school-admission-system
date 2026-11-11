# AI usage

## Tool and scope
I used Claude (Anthropic) through Claude Code / claude.ai. The AI generated most of the code: the .NET backend,
the React frontend, the tests, the Dockerfiles and the first drafts of these documents. I am a Node.js/Express
developer and new to C#/.NET, so I used the AI for the C# code and for the project structure.

## My part
- Set up the environment (Docker/WSL problems on my PC, then GitHub Codespaces) and ran everything.
- Ran the backend tests in Docker, read the failure logs, applied the fixes and re-ran until all passed.
- Ran `docker compose up --build` and checked the API with curl.
- Split the work into incremental commits and prepared the repository for submission.

## Verification I did
- `docker compose --profile test run --rm backend-tests` -> 27 tests, 27 passed against real PostgreSQL 16
  (60 parallel hold requests for 5 seats, 15 parallel applies by one student, expiry by moving the clock).
- `docker compose up --build`: db, backend, frontend started; migration applied; 5 demo classes seeded;
  expiry worker ran every 5 seconds. `GET /classes` and `POST /classes/{id}/holds` (201, HELD) checked with curl.

## Checks done by the AI in its own sandbox (not by me)
Frontend typecheck/build, 18 frontend unit tests, a headless-browser run against a mock API, and a shell simulation
of the locking SQL. The sandbox had no .NET SDK or Docker, so the backend was first compiled and tested when I ran it.

## Mistakes the AI made and how they were caught
1. **Test project missing `using Xunit`.** The Docker test build failed with many CS0246 errors. Found by running
   the tests in Docker; fixed with a global using.
2. **EF Core query that could not be translated.** The AI filtered with `Where` after projecting to
   `new Row(...)`. `GET /classes/{id}` returned 500 and 12 of 27 tests failed. Found from the failing test log
   (LINQ expression could not be translated); fixed by filtering and ordering before the projection; 27/27 passed.
3. **Vite / plugin version mismatch** (npm ERESOLVE). Fixed by upgrading instead of using `--force`.
4. **Error middleware cleared CORS headers** (`Response.Clear()`), hiding error bodies from the browser.
   Found in code review, not by a test; removed.
5. My own mistake: `docker compose run` does not rebuild an existing image, so my first fix seemed to do nothing.
   I now run `build` before `run`.
