# Backend — Scheduling Platform API

A stateless Express + TypeScript REST API backed by PostgreSQL via Prisma. It
serves the admin dashboard (event types, availability, bookings) and the
public booking flow (event details, available slots, creating a booking).

For project-wide setup (including database options), see the
[root README](../README.md).

## Tech Stack

- Node.js 20 LTS, TypeScript 5, Express 4
- PostgreSQL 15 via Prisma ORM 5
- Zod for request validation
- date-fns / date-fns-tz for timezone-aware slot generation
- Vitest + Supertest for API integration tests

## Setup

```bash
cd backend
cp .env.example .env     # see root README for database options
pnpm install
pnpm migrate              # prisma migrate dev
pnpm seed                  # seed a demo host user, event types & availability
pnpm dev                    # http://localhost:5000
```

Other scripts: `pnpm build` / `pnpm start` (production), `pnpm generate`
(regenerate Prisma client), `pnpm test` / `pnpm test:watch`.

## Architecture

```
src/
├── app.ts                 # createApp() — Express app factory (no listen; used by tests)
├── index.ts                # entry point: createApp() + app.listen()
├── config/env.ts            # Zod-validated environment variables
├── lib/prisma.ts             # Prisma client singleton
├── middleware/
│   ├── auth.ts                # attachUser — single-tenant "auth" stub
│   ├── validate.ts             # Zod request validation middleware
│   └── errorHandler.ts          # maps AppError/Prisma/Zod errors to the API envelope
├── routes/
│   ├── eventTypes.ts            # admin: CRUD for event types
│   ├── availability.ts           # admin: get/replace weekly availability
│   ├── bookings.ts                 # public booking creation + admin booking list/cancel
│   ├── me.ts                        # admin: current host profile
│   └── public.ts                     # public: event details + slot listing by username/slug
├── services/
│   ├── slotService.ts                # available-slot generation algorithm
│   └── bookingService.ts              # booking creation + double-booking handling
├── schemas/                  # Zod request schemas
└── types/index.ts             # ApiResponse<T>, AppError, Express req augmentation
```

### Request lifecycle

1. `helmet()` and `cors({ origin: env.FRONTEND_URL })` are applied globally.
2. Admin routers (`/api/event-types`, `/api/availability`,
   `/api/admin/bookings`, `/api/me`) run `attachUser`, which — in lieu of real
   auth — sets `req.userId = env.DEFAULT_USER_ID` for the single seeded host.
3. Public routers (`/api/:username/:slug`, `/api/bookings`) require no auth.
4. Route handlers validate input via `validate(schema)` (Zod), then read/write
   through Prisma.
5. `errorHandler` (registered last) converts thrown `AppError`s, Prisma error
   codes (`P2002` → 409, `P2025` → 404), and `ZodError`s into the response
   envelope `{ success: false, error, details? }`.

### Data model (`prisma/schema.prisma`)

- **User** — single seeded host (`DEFAULT_USER_ID`); has a `username` used in
  public booking URLs (`/:username/:slug`) and a `timezone`.
- **EventType** — a bookable meeting type (`title`, `slug`, `durationMinutes`,
  `isActive`). Soft-deleted via `isActive = false`.
- **AvailabilitySchedule** / **AvailabilityWindow** — a user's default weekly
  schedule; each window has a `dayOfWeek` (0=Mon…6=Sun, ISO) and `startTime`/
  `endTime` stored as `HH:MM` strings (not Postgres `TIME`).
- **Booking** — a confirmed/pending/cancelled/completed booking, with a
  **`@@unique([eventTypeId, startTime])`** constraint that is the final
  guard against double-booking.

### Slot generation algorithm (`services/slotService.ts`)

For a given `username`, `slug`, and `date`:

1. Resolve the event type (must be `isActive`) and its host's timezone.
2. Map `date` to an ISO day of week (0=Mon…6=Sun).
3. Look up the host's default `AvailabilitySchedule` window for that day; if
   none exists, return `[]` (day off).
4. Generate candidate slot start times every `durationMinutes`, each fully
   contained within the availability window, in the host's timezone, then
   converted to UTC.
5. Subtract any `CONFIRMED`/`PENDING` bookings already occupying those start
   times.

The public event endpoint (`GET /api/:username/:slug`) also returns
`availableDays: number[]` — the set of ISO weekdays with any availability
window configured — so the frontend calendar can disable days with no
availability before the user even picks a date.

### Double-booking prevention

`bookingService.createBooking` writes inside a transaction; if the
`(event_type_id, start_time)` unique constraint is violated (Prisma `P2002`,
e.g. two requests racing for the same slot), it's rethrown as a 409
`AppError('Slot already taken')`.

## API Reference

All responses use the envelope `{ success: true, data }` or
`{ success: false, error, details? }`.

### Admin (auth-stubbed via `DEFAULT_USER_ID`)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/me` | Current host profile (`id`, `name`, `email`, `username`, `timezone`) |
| GET    | `/api/event-types` | List active event types, newest first |
| POST   | `/api/event-types` | Create an event type (409 if `slug` taken) |
| PUT    | `/api/event-types/:id` | Update an event type (404 if not owned, 409 if new `slug` taken) |
| DELETE | `/api/event-types/:id` | Soft-delete (`isActive=false`) + cancel future `CONFIRMED` bookings |
| GET    | `/api/availability` | Get the default availability schedule + windows |
| PUT    | `/api/availability` | Replace the timezone and full set of weekly windows |
| GET    | `/api/admin/bookings?filter=upcoming\|past\|range&from=&to=` | List bookings (`upcoming`: future `CONFIRMED`; `past`: started or `CANCELLED`/`COMPLETED`; `range`: by `startTime` window) |
| PATCH  | `/api/admin/bookings/:id/cancel` | Cancel an upcoming `CONFIRMED` booking |

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/health` | Health check |
| GET    | `/api/:username/:slug` | Event type details for the public booking page, incl. `hostTimezone` and `availableDays` |
| GET    | `/api/:username/:slug/slots?date=YYYY-MM-DD` | Available slots (UTC ISO strings) for that date |
| POST   | `/api/bookings` | Create a booking — `{ eventTypeId, startTime, bookerName, bookerEmail, notes? }`. Returns `201` with `{ id }`, or `409 "Slot already taken"` |
| GET    | `/api/bookings/:id` | Booking details for the confirmation page |

## Testing

```bash
pnpm test          # requires scheduling_platform_test DB, migrated (see .env.test)
pnpm test:watch
```

Or from the repo root, `make test` / `make test-watch` will create/migrate
the test database (via Docker Compose) automatically. The suite covers every
route above: success paths, validation errors, 404s, the 409 double-booking
guard, soft-delete cascades, and admin upcoming/past/range filtering — the
test DB is truncated and re-seeded before each test.

## Scope / Assumptions

- Single-tenant v1: exactly one host user (`DEFAULT_USER_ID`), seeded by
  `prisma/seed.ts` — there is no signup/login.
- One default weekly availability schedule per user (no per-date overrides
  or multiple schedules).
- All primary keys are UUIDs; timestamps are `TIMESTAMPTZ`.
- `availability_windows.start_time` / `end_time` are `HH:MM` strings, kept
  consistent between the schema and `slotService`.
