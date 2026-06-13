# Frontend — Scheduling Platform

A React (Vite) app with two parts:

- **Admin dashboard** (`/`, `/event-types`, `/availability`, `/bookings`) —
  manage event types, weekly availability, and bookings.
- **Public booking pages** (`/:username/:slug`, `/booking/:id/confirm`) —
  the booker-facing flow: pick a date and time, fill in details, and land on
  a confirmation page.

For project-wide setup (including database options), see the
[root README](../README.md).

## Tech Stack

- React 18 + TypeScript 5, built with Vite 5
- Tailwind CSS + ShadCN/UI (dark theme), lucide-react icons
- React Router 6 (client-side routing)
- TanStack Query 5 (server state) + Axios
- react-hook-form + Zod resolvers (forms/validation)
- date-fns / date-fns-tz (timezone conversions), react-day-picker (calendar)
- Sonner (toasts)

## Setup

```bash
cd frontend
cp .env.example .env     # VITE_API_URL should point at the running backend
pnpm install
pnpm dev                   # http://localhost:3000
```

Other scripts: `pnpm build` (type-check + production build), `pnpm preview`
(serve the production build), `pnpm lint` (type-check only).

## Architecture

```
src/
├── main.tsx                    # entry point — mounts <App/>, QueryClientProvider, ThemeProvider, Toaster
├── App.tsx                      # route definitions
├── pages/
│   ├── DashboardPage.tsx          # admin home
│   ├── EventTypesPage.tsx          # list/create/edit/delete event types
│   ├── AvailabilityPage.tsx         # edit weekly availability schedule
│   ├── BookingsPage.tsx              # upcoming/past bookings, cancel
│   ├── BookPage.tsx                   # public booking page (/:username/:slug)
│   └── BookingConfirmPage.tsx          # post-booking confirmation
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx                # admin sidebar + nav (wraps admin pages via <Outlet/>)
│   │   └── StandaloneLayout.tsx         # no-sidebar layout for public pages
│   ├── event-types/                      # EventTypeCard, EventTypeForm
│   ├── availability/                      # AvailabilityForm, DayToggleRow, TimePicker, TimezoneCombobox
│   ├── bookings/                           # BookingsTable, BookingStatusBadge, WeekCalendar
│   ├── booking/                             # BookingCalendar, SlotGrid, BookingForm (public flow)
│   ├── theme/                                # ThemeProvider, ModeToggle (dark theme)
│   ├── shared/                                # PageHeader, EmptyState
│   └── ui/                                     # ShadCN/UI generated primitives
├── hooks/                       # one hook per resource — TanStack Query wrappers
├── lib/
│   ├── api.ts                    # Axios instance + ApiResponse<T> unwrapping
│   ├── queryClient.ts              # QueryClient (staleTime: 30s, retry: 1)
│   └── utils.ts                     # cn() and misc helpers
├── types/index.ts                # shared TS interfaces mirroring backend API shapes
└── constants/index.ts             # nav items, day names, timezone list, etc.
```

### Routing

```tsx
<Routes>
  <Route element={<AppShell />}>           {/* sidebar layout */}
    <Route path="/" element={<DashboardPage />} />
    <Route path="/event-types" element={<EventTypesPage />} />
    <Route path="/availability" element={<AvailabilityPage />} />
    <Route path="/bookings" element={<BookingsPage />} />
  </Route>

  <Route element={<StandaloneLayout />}>   {/* no sidebar */}
    <Route path="/:username/:slug" element={<BookPage />} />
    <Route path="/booking/:id/confirm" element={<BookingConfirmPage />} />
  </Route>
</Routes>
```

### Data layer

`src/lib/api.ts` wraps Axios with `baseURL = VITE_API_URL`. A response
interceptor unwraps the backend's `{ success, data }` envelope — on success
it returns `data` directly (so hooks/components work with plain types from
`src/types/index.ts`, not the envelope), and on `success: false` (or a
non-2xx status) it rejects with an `Error` carrying the API's `error` message
and HTTP `status`.

Every resource has a dedicated TanStack Query hook in `src/hooks/`:

| Hook | Query key | Backend route |
|------|-----------|---------------|
| `useCurrentUser` | `['me']` | `GET /api/me` |
| `useEventTypes` | `['eventTypes']` | `/api/event-types` (+ create/update/delete mutations) |
| `useAvailability` | `['availability']` | `/api/availability` (+ save mutation) |
| `useBookings` | `['bookings', filter]` | `/api/admin/bookings?filter=...` (+ cancel mutation) |
| `usePublicEvent` | `['publicEvent', username, slug]` | `GET /api/:username/:slug` |
| `useSlots` | `['slots', username, slug, date]` | `GET /api/:username/:slug/slots?date=...` |
| `useCreateBooking` | — (mutation) | `POST /api/bookings` |
| `useBooking` | `['booking', id]` | `GET /api/bookings/:id` |

`staleTime: 30_000` and `retry: 1` are set globally in
`src/lib/queryClient.ts`.

### Public booking flow (`BookPage.tsx`)

1. `usePublicEvent(username, slug)` loads event details, `hostTimezone`, and
   `availableDays` (ISO weekdays that have any availability configured).
2. `BookingCalendar` disables past dates and any date whose weekday isn't in
   `availableDays`.
3. Selecting a date calls `useSlots(username, slug, date)`; `SlotGrid` renders
   the returned UTC slots converted to the host's timezone via
   `date-fns-tz`.
4. Selecting a slot shows `BookingForm` (react-hook-form + Zod). On submit,
   `useCreateBooking` calls `POST /api/bookings`.
   - A `409` ("slot already taken" — someone else booked it first) is shown
     as an **inline form error**, not a toast, and the slot list is
     invalidated/refetched so the booker can pick another time.
   - On success, the user is routed to `/booking/:id/confirm`.

### Theming

Dark theme only (ShadCN dark variant), Cal.com-style: dark sidebar, near-black
content area, brand accent color. `ThemeProvider` / `ModeToggle` exist for
future light-mode support but the app ships dark-only.

## Scope / Assumptions

- Single-tenant v1: the admin dashboard always operates as the one seeded
  host user (`useCurrentUser` → `GET /api/me`) — no login/account switching.
- All times shown to bookers/admins are converted from the API's UTC ISO
  strings into the host's timezone via `date-fns-tz`.
- Public booking pages (`/:username/:slug`, `/booking/:id/confirm`) require
  no authentication and use `StandaloneLayout` (no admin sidebar).
