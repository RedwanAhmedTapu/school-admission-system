# Assumptions

Each item: what was assumed, why, and how it affects the implementation.

1. **Shift is part of the class name.** The API has no shift field, so "Class 6 - Morning Shift" is one class record. *Effect:* no schema change; admin creates one record per class+shift.
2. **Student ID = exactly 17 digits**, sent as `X-Student-Id`. Enforced in the UI, in the API (400) and by a DB check constraint. No login/password.
3. **Ownership**: confirm/cancel by a different student returns **403** (the brief only lists 400/404/409 as examples). 403 keeps "wrong student" distinct from "not found".
4. **Missing/malformed `X-Student-Id`** on endpoints that need it -> 400.
5. **Duplicate rule**: one HELD-or-CONFIRMED application per student per class. After CANCELLED/EXPIRED the student may apply again. Duplicate -> 409.
6. **Hold at/after `expiresAt` is expired** (`expires_at <= now`). Reads report EXPIRED immediately even if the sweeper has not yet persisted it; the sweeper persists it within `EXPIRY_SWEEP_INTERVAL_SECONDS` (default 5s).
7. **Confirm** on an already CONFIRMED hold (same student) -> 200, no change. Confirm on EXPIRED/CANCELLED -> 409.
8. **Cancel**: only HELD holds can be cancelled. Cancelling a CANCELLED hold -> 204 (idempotent). Cancelling a CONFIRMED hold -> 409 (the brief says cancellation must never corrupt confirmed counts; refunds/withdrawal are out of scope). Cancelling EXPIRED -> 409.
9. **GET /holds/{id} is public** (matches the contract, which shows no header). Hold IDs are random, not guessable sequences.
10. **Payment is simulated**: pressing "Pay admission fee" calls confirm. No gateway.
11. **Admin area has no authentication** ("no mandatory login"). It is clearly labelled "Demo access". The extra read-only `GET /admin/holds` endpoint is likewise open; a real deployment must protect `/admin` and `POST /classes`.
12. **`POST /classes` is open**, as in the contract. Reducing capacity of existing classes is not offered.
13. **Seeded data** (5 demo classes) is inserted only into an empty database; disable with `SEED_DEMO_DATA=false`.
14. **School identity is fictional** ("Greenfield Model School", placeholder address/phone) and marked as demo content.
15. **Schema management**: plain versioned SQL files in `backend/.../Migrations/` applied by the app at start (advisory-locked, tracked in `schema_migrations`) instead of EF-generated migration classes, because EF migrations could not be generated without the .NET SDK in the authoring environment. EF Core is still used for all data access.
16. **CORS is open** (any origin) so the SPA on :3000 can call :8080. Tighten for production.
17. **Polling** every 5 s (no WebSockets); polling pauses in hidden tabs and refreshes on focus. Countdowns use the server clock offset taken from the `X-Server-Time` response header.
18. Listing endpoints are not paginated (admin listing is capped at 500 rows) given the demo scale.
