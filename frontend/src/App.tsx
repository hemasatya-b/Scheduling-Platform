import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { StandaloneLayout } from '@/components/layout/StandaloneLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { EventTypesPage } from '@/pages/EventTypesPage';
import { AvailabilityPage } from '@/pages/AvailabilityPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { BookPage } from '@/pages/BookPage';
import { BookingConfirmPage } from '@/pages/BookingConfirmPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/event-types" element={<EventTypesPage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
      </Route>

      <Route element={<StandaloneLayout />}>
        <Route path="/:username/:slug" element={<BookPage />} />
        <Route path="/booking/:id/confirm" element={<BookingConfirmPage />} />
      </Route>
    </Routes>
  );
}
