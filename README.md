# Scheduling Platform

A Cal.com-style scheduling app: event types, host availability, and conflict-free
public booking. This repo contains the **backend (Express/Prisma) and database
(PostgreSQL)** layers, plus a **React (Vite) admin app and public booking pages**.

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
| Local DB       | Docker Compose    | -       |
| Testing        | Vitest / Supertest | 2.x / 7.x |
| Frontend       | React (Vite) + TypeScript | 18.x / 5.x |
| UI             | Tailwind CSS + ShadCN/UI (dark) | 3.x |
| Routing        | React Router      | 6.x     |
| Server state   | TanStack Query    | 5.x     |
| Forms          | react-hook-form + Zod | 7.x / 3.x |

## Prerequisites

- Node.js >= 20
- pnpm
- Docker + Docker Compose (for local PostgreSQL), or a PostgreSQL >= 15 instance

## Local Setup

1. Copy root env file (drives `docker-compose.yaml`):
   ```bash
   cp .env.example .env
   ```
2. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```
   This starts Postgres 15 on `localhost:5433` (mapped from container port 5432,
   to avoid clashing with any existing local Postgres on 5432).
3. Configure the backend:
   ```bash
   cd backend
   cp .env.example .env
   pnpm install
   ```
4. Run migrations and seed data:
   ```bash
   pnpm migrate   # prisma migrate dev
   pnpm seed      # prisma db seed
   ```
5. Start the API:
   ```bash
   pnpm dev       # http://localhost:5000
   ```

## Environment Variables

### Root `.env` (docker-compose)

| Key | Description | Example |
|-----|-------------|---------|
| `POSTGRES_USER` | Postgres username | `scheduling` |
| `POSTGRES_PASSWORD` | Postgres password | `scheduling` |
| `POSTGRES_DB` | Database name | `scheduling_platform` |
| `POSTGRES_PORT` | Host port mapped to container's 5432 | `5433` |

### `backend/.env`

| Key | Description | Example |
|-----|-------------|---------|
| `DATABASE_URL` | Prisma connection string | `postgresql://scheduling:scheduling@localhost:5433/scheduling_platform?schema=public` |
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `DEFAULT_USER_ID` | Seeded host user id (single-tenant v1) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

## Architecture Overview

The API is a stateless Express + TypeScript app backed by PostgreSQL via Prisma.
Admin routes (`/api/event-types`, `/api/availability`, `/api/admin/bookings`) are
guarded by a simple middleware that injects the single seeded host user
(`DEFAULT_USER_ID`) — there is no real auth in v1. Public routes
(`/api/book/:slug`, `/api/book/:slug/slots`, `/api/bookings`) require no auth.
Slot generation (`src/services/slotService.ts`) resolves the host's timezone and
weekly availability window, generates candidate slots, and subtracts existing
bookings; booking creation (`src/services/bookingService.ts`) relies on a
`bookings(event_type_id, start_time)` unique constraint as the final
double-booking guard, surfaced as `409 Slot already taken`.

## API Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/health` | No | Health check |
| GET    | `/api/event-types` | Yes | List active event types |
| POST   | `/api/event-types` | Yes | Create event type |
| PUT    | `/api/event-types/:id` | Yes | Update event type |
| DELETE | `/api/event-types/:id` | Yes | Soft-delete + cancel future bookings |
| GET    | `/api/availability` | Yes | Get default availability schedule |
| PUT    | `/api/availability` | Yes | Replace weekly availability windows |
| GET    | `/api/book/:slug` | No | Public event type details |
| GET    | `/api/book/:slug/slots?date=YYYY-MM-DD` | No | Available slots for a date |
| POST   | `/api/bookings` | No | Create a booking |
| GET    | `/api/bookings/:id` | No | Booking details (confirmation page) |
| GET    | `/api/admin/bookings?filter=upcoming\|past` | Yes | List bookings |
| PATCH  | `/api/admin/bookings/:id/cancel` | Yes | Cancel an upcoming booking |

All responses use the envelope `{ success, data }` or `{ success, error, details? }`.

## Testing

API integration tests (Vitest + Supertest) cover every route above: success paths,
validation errors, 404s, the 409 double-booking guard, soft-delete cascades, and
admin upcoming/past filtering. Tests run against a dedicated `scheduling_platform_test`
database (same Postgres container, configured via `backend/.env.test`) which is
truncated and re-seeded before each test.

```bash
make test         # creates/migrates the test DB, then runs the suite once
make test-watch   # same, but in watch mode
```

Or, from `backend/`, once the test DB exists: `pnpm test` / `pnpm test:watch`.

## Assumptions

1. Single-tenant v1: exactly one host user, seeded by `prisma/seed.ts`.
2. "Auth" is a stand-in middleware that attaches `DEFAULT_USER_ID` — no login flow.
3. Availability is a single default weekly schedule (one window per day, Mon–Sun).
4. `availability_windows.start_time` / `end_time` are stored as `HH:MM` strings.
5. Double-booking prevention relies on the DB unique constraint
   `(event_type_id, start_time)`, not application-level locking.

## Known Limitations / Future Improvements

- No real authentication/authorization (multi-tenant support, login, sessions).
- No support for multiple availability schedules per user or date-specific overrides
  (holidays, one-off blocks).
- No rate limiting or request logging middleware.
