# School Admission Management System

First-come-first-served online admission. Each **class + shift** is one record with its own seats. Applying
holds a seat for a limited time; paying (simulated) confirms it; an unpaid hold expires and the seat returns
automatically.

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui-style components (Radix), lucide-react, React Router, Axios, TanStack Query |
| Backend | C#, .NET 8 Web API, Entity Framework Core, PostgreSQL 16 |
| Infra | Docker, Docker Compose, persistent volume for PostgreSQL |

## Run it

Prerequisite: **Docker** (with Compose v2). Nothing else needs to be installed.

```bash
docker compose up --build
```

| What | URL |
|---|---|
| Parent portal | http://localhost:3000 |
| Staff area (demo, no login) | http://localhost:3000/admin |
| Backend API | http://localhost:8080 (health: `/health`) |

PostgreSQL data lives in the `pgdata` Docker volume and survives `docker compose down` / restarts
(`docker compose down -v` deletes it). Migrations run automatically at backend start; demo classes are seeded
into an empty database.

Configuration (all optional, see `.env.example`): `HOLD_DURATION_SECONDS` (default 600), `EXPIRY_SWEEP_INTERVAL_SECONDS`,
`DB_CONNECTION`, `API_URL` (backend URL as seen by the browser), `SEED_DEMO_DATA`.

## Demo workflow

1. Open http://localhost:3000 and enter the demo Student ID `20152691234567890` (or click it under the form).
2. Press **Apply for this class** on a class, confirm the dialog. You land on *My applications* with a live countdown.
3. **Pay admission fee** (simulated, always succeeds) -> CONFIRMED. Or **Cancel application**, or wait for the
   countdown to end -> EXPIRED and the seat is released. Tip: start with `HOLD_DURATION_SECONDS=30` to see expiry fast.
4. Refresh the page / reopen the browser: the Student ID is remembered and the statuses are re-fetched from the server.
5. In `/admin`: create a class (put the shift in the name, e.g. `Class 8 - Day Shift`), watch seat numbers, filter/search applications.

## API (exact contract)

| Method | Path | Success | Notes |
|---|---|---|---|
| POST | `/classes` | 201 `{id,name,totalSeats}` | 400 on invalid input |
| GET | `/classes` | 200 list with `heldSeats, confirmedSeats, availableSeats` | |
| GET | `/classes/{id}` | 200 | 404 |
| POST | `/classes/{id}/holds` | 201 `{holdId,classId,studentId,status,expiresAt}` | header `X-Student-Id`; 409 no seats / duplicate; 400 bad id; 404 |
| GET | `/holds/{id}` | 200 `{holdId,classId,status,expiresAt}` | 404 |
| POST | `/holds/{id}/confirm` | 200 `{holdId,status:"CONFIRMED"}` | idempotent; 403 other student; 409 expired/cancelled |
| DELETE | `/holds/{id}` | 204 | 403 other student; 409 if confirmed/expired |
| GET | `/me/holds` | 200 list incl. `className` | header `X-Student-Id` |

Extra (not in the contract, read-only, for the admin screen): `GET /admin/holds?classId=&status=&q=`.
Errors are JSON: `{"error":{"code":"...","message":"..."}}`.

## How correctness is guaranteed (summary)

* **No stored counters.** held/confirmed are computed from `admission_holds` rows, so they cannot drift.
* **Seat hold** = one transaction that `SELECT ... FOR UPDATE`-locks the class row, then checks duplicates and capacity,
  then inserts. Requests for a class queue up in PostgreSQL, so it is safe across threads and across backend instances.
* **Duplicates**: partial unique index on `(class_id, student_id) WHERE status IN ('HELD','CONFIRMED')` (also catches races).
* **Confirm / cancel** lock the hold row; confirm of a confirmed hold is a no-op 200 (idempotent).
* **Expiry**: `HoldExpiryWorker` (hosted service) runs one atomic `UPDATE ... WHERE status='HELD' AND expires_at <= now`
  every few seconds from persisted timestamps (works after restart, safe with several instances). Reads also treat an
  overdue HELD row as EXPIRED, so a seat is never shown as taken past its deadline.

## Tests

Backend (xUnit, runs against **real PostgreSQL**, includes a 60-parallel-request concurrency test):

```bash
docker compose --profile test build backend-tests && docker compose --profile test run --rm backend-tests
# or locally with a Postgres on localhost:
#   TEST_DATABASE_CONNECTION="Host=localhost;Database=school_admission_test;Username=postgres;Password=postgres" \
#   dotnet test backend/SchoolAdmission.sln
```

Frontend (Vitest + React Testing Library, 18 tests):

```bash
cd frontend && npm ci && npm test
```

## Project layout

```
backend/SchoolAdmission.Api   Controllers, Services, Data, Entities, DTOs, BackgroundServices, Middleware, Configurations, Migrations (*.sql)
backend/SchoolAdmission.Tests xUnit integration + concurrency tests
frontend/src                  app, components/ui (design system), layouts, pages, features, services, hooks, types, utils, styles
```

See `ASSUMPTIONS.md` and `AI_USAGE.md` (read the *verification status* section in both).

## Running in GitHub Codespaces (optional)

On a normal machine nothing extra is needed: open http://localhost:3000.

In Codespaces the forwarded ports are private by default, so the browser cannot call the API.
In the Ports tab set the backend port (8080) visibility to **Public**, then point the frontend at it:

    echo "API_URL=https://${CODESPACE_NAME}-8080.app.github.dev" > .env
    docker compose up -d --build

Then open the forwarded URL of port 3000.
