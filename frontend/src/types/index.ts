export interface EventType {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0=Mon … 6=Sun
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
}

export interface AvailabilitySchedule {
  id: string;
  timezone: string;
  windows: AvailabilityWindow[];
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Booking {
  id: string;
  eventType: Pick<EventType, 'id' | 'title' | 'durationMinutes' | 'slug'>;
  bookerName: string;
  bookerEmail: string;
  startTime: string; // ISO UTC string
  endTime: string; // ISO UTC string
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  cancelledAt?: string;
}

export interface PublicEventType {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  slug: string;
  hostTimezone: string;
  availableDays: number[]; // ISO day-of-week (0=Mon … 6=Sun) with availability configured
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  username: string;
  timezone: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
