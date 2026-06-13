# Scheduling Platform

A Cal.com-style scheduling app: hosts define **event types** and a **weekly
availability schedule**, and share a public booking link
(`/:username/:event-slug`) where anyone can pick a time and book a
conflict-free meeting.

This is a full-stack monorepo:

- **`backend/`** — Express + TypeScript REST API, PostgreSQL via Prisma ORM
- **`frontend/`** — React (Vite) admin dashboard + public booking pages

See [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md) for architecture details, project
structure, and design decisions specific to each app.

## Features

- **Event types** — create, edit, and soft-delete bookable meeting types
  (title, description, duration, slug).
- **Weekly availability** — define a default schedule of working hours per
  day of week, in the host's timezone.
- **Public booking pages** — `/:username/:event-slug` shows event details and
  a calendar; days with no availability are disabled automatically.
- **Timezone-aware slot generation** — available time slots are computed from
  the host's availability window, converted between the host's timezone and
  UTC, with already-booked slots removed.
- **Conflict-free booking** — a database-level unique constraint
  (`event_type_id`, `start_time`) guarantees two people can never double-book
  the same slot, even under concurrent requests.
- **Booking confirmation page** — bookers land on a confirmation page with
  their meeting details after submitting the form.
- **Admin dashboard** — manage event types, availability, and view/cancel
  upcoming or past bookings.

## Tech Stack

| Layer          | Technology       | Version |
|----------------|-------------------|---------|
| Runtime        | Node.js           | 20 LTS  |
| Language       | TypeScript        | 5.x     |
| API framework  | Express           | 4.x     |
| ORM            | Prisma            | 5.x     |
| Database       | PostgreSQL        | 15      |
| Validation     | Zod               | 3.x     |
| Date handling  | date-fns / date-fns-tz | 3.x |
| Testing        | Vitest / Supertest | 2.x / 7.x |
| Frontend       | React (Vite) + TypeScript | 18.x / 5.x |
| UI             | Tailwind CSS + ShadCN/UI (dark) | 3.x |
| Routing        | React Router      | 6.x     |
| Server state   | TanStack Query    | 5.x     |
| Forms          | react-hook-form + Zod | 7.x / 3.x |

## Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io/installation)
- A PostgreSQL 15+ database — see [Database setup](#database-setup) below
  for three ways to get one (Docker, local install, or a free cloud DB).

## Quick Start

```bash
git clone <this-repo-url>
cd Scheduling-Platform

# 1. Set up a Postgres database (pick ONE option from "Database setup" below)

# 2. Install dependencies for both apps
make install            # or: cd backend && pnpm install && cd ../frontend && pnpm install

# 3. Configure env vars
cd backend  && cp .env.example .env   # edit DATABASE_URL/DIRECT_URL if needed
cd ../frontend && cp .env.example .env

# 4. Apply migrations + seed demo data
cd ../backend
pnpm migrate   # prisma migrate dev
pnpm seed      # creates a demo host user, event types & availability

# 5. Run both apps
cd ..
make dev       # backend on :5000, frontend on :3000
```

Open http://localhost:3000 for the admin dashboard, or
http://localhost:3000/admin/15-min-intro for an example public booking page
(seeded data).

## Database Setup

A PostgreSQL 15+ database is required, but **how you get one is up to you** —
pick whichever of the following is most convenient:

### Option A — Docker Compose (recommended, zero local install)

```bash
cp .env.example .env      # repo root — drives docker-compose.yaml
docker compose up -d
```

Starts Postgres 15 on `localhost:5433` (mapped from the container's 5432, to
avoid clashing with any Postgres you already have running locally). The
default `backend/.env.example` is already configured for this.

### Option B — Local PostgreSQL install

If you already have PostgreSQL 15+ running locally:

```bash
createdb scheduling_platform
```

Then point `backend/.env` at it, e.g.:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/scheduling_platform?schema=public"
DIRECT_URL="postgresql://<user>:<password>@localhost:5432/scheduling_platform?schema=public"
```

(`DIRECT_URL` is only different from `DATABASE_URL` when using a connection
pooler — see Option C.)

### Option C — Cloud Postgres (e.g. Supabase, Neon, Railway)

Create a free Postgres database with any provider, then set in
`backend/.env`:

- `DATABASE_URL` — the **pooled/transaction** connection string used at
  runtime (e.g. Supabase's Supavisor on port `6543` with `?pgbouncer=true`).
- `DIRECT_URL` — the **direct** connection string used by `prisma migrate`
  (e.g. port `5432`). Pooled connections in transaction mode don't support
  the locks Prisma migrations need.

If your provider only gives you a single connection string, set both
`DATABASE_URL` and `DIRECT_URL` to the same value.

### After choosing an option

```bash
cd backend
pnpm migrate   # applies all Prisma migrations
pnpm seed      # seeds a demo host user, event types, availability & bookings
```

## Environment Variables

### Root `.env` (only needed for Docker Compose)

| Key | Description | Example |
|-----|-------------|---------|
| `POSTGRES_USER` | Postgres username | `scheduling` |
| `POSTGRES_PASSWORD` | Postgres password | `scheduling` |
| `POSTGRES_DB` | Database name | `scheduling_platform` |
| `POSTGRES_PORT` | Host port mapped to container's 5432 | `5433` |

### `backend/.env`

| Key | Description | Example |
|-----|-------------|---------|
| `DATABASE_URL` | Prisma connection string (pooled, used at runtime) | `postgresql://scheduling:scheduling@localhost:5433/scheduling_platform?schema=public` |
| `DIRECT_URL` | Direct connection string (used by `prisma migrate`) | same as above for local Postgres |
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `DEFAULT_USER_ID` | Seeded host user id (single-tenant v1) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

### `frontend/.env`

| Key | Description | Example |
|-----|-------------|---------|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:5000/api` |
| `VITE_BASE_URL` | Base URL of this frontend (used to build public booking links) | `http://localhost:3000` |

## API Overview

All responses use the envelope `{ success: true, data }` or
`{ success: false, error, details? }`. "Auth" routes are guarded by a stub
middleware that attaches the single seeded host user (`DEFAULT_USER_ID`) —
there is no login flow in v1.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/health` | No | Health check |
| GET    | `/api/me` | Yes | Current host profile (incl. `username`) |
| GET    | `/api/event-types` | Yes | List active event types |
| POST   | `/api/event-types` | Yes | Create event type |
| PUT    | `/api/event-types/:id` | Yes | Update event type |
| DELETE | `/api/event-types/:id` | Yes | Soft-delete + cancel future bookings |
| GET    | `/api/availability` | Yes | Get default availability schedule |
| PUT    | `/api/availability` | Yes | Replace weekly availability windows |
| GET    | `/api/:username/:slug` | No | Public event type details + available days |
| GET    | `/api/:username/:slug/slots?date=YYYY-MM-DD` | No | Available slots for a date |
| POST   | `/api/bookings` | No | Create a booking |
| GET    | `/api/bookings/:id` | No | Booking details (confirmation page) |
| GET    | `/api/admin/bookings?filter=upcoming\|past\|range` | Yes | List bookings |
| PATCH  | `/api/admin/bookings/:id/cancel` | Yes | Cancel an upcoming booking |

See [`backend/README.md`](backend/README.md) for request/response shapes and
implementation notes.

## Testing

The backend's API integration test suite (Vitest + Supertest) covers every
route above: success paths, validation errors, 404s, the 409 double-booking
guard, soft-delete cascades, and admin upcoming/past filtering. Tests run
against a dedicated `scheduling_platform_test` database, truncated and
re-seeded before each test.

```bash
make test         # creates/migrates the test DB (via docker-compose), then runs the suite once
make test-watch   # same, but in watch mode
```

If you're not using Docker Compose, create a `scheduling_platform_test`
database manually and configure `backend/.env.test`, then run `pnpm test` /
`pnpm test:watch` from `backend/`.

## Common Commands (Makefile)

| Command | Description |
|---------|-------------|
| `make setup` | First-time setup: install deps, start Postgres, migrate, seed |
| `make dev` | Run backend + frontend dev servers concurrently |
| `make build` | Build both apps for production |
| `make lint` | Type-check both apps |
| `make db-up` / `make db-down` | Start/stop the Docker Compose Postgres container |
| `make db-reset` | Drop the local DB volume and re-run migrate + seed |
| `make migrate` / `make seed` | Run Prisma migrations / seed data |
| `make test` / `make test-watch` | Run the backend test suite |

Run `make help` for the full list.

## Assumptions

1. Single-tenant v1: exactly one host user, seeded by `prisma/seed.ts`.
2. "Auth" is a stand-in middleware that attaches `DEFAULT_USER_ID` — no login flow.
3. Availability is a single default weekly schedule (one window per day, Mon–Sun).
4. `availability_windows.start_time` / `end_time` are stored as `HH:MM` strings.
5. Double-booking prevention relies on the DB unique constraint
   `(event_type_id, start_time)`, not application-level locking.

## Known Limitations / Future Improvements

- No real authentication/authorization (multi-tenant support, login, sessions).
- No support for multiple availability schedules per user or date-specific
  overrides (holidays, one-off blocks).
- No rate limiting or request logging middleware.
