import { LayoutDashboard, CalendarDays, Clock, BookOpen, type LucideIcon } from 'lucide-react';
import type { BookingStatus } from '@/types';

export const DAYS_OF_WEEK: { label: string; value: number }[] = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 },
];

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Event Types', href: '/event-types', icon: CalendarDays },
  { label: 'Availability', href: '/availability', icon: Clock },
  { label: 'Bookings', href: '/bookings', icon: BookOpen },
];

export const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'success' | 'warning'> = {
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  COMPLETED: 'success',
  PENDING: 'warning',
};

export const STATUS_BLOCK_STYLES: Record<BookingStatus, string> = {
  CONFIRMED: 'border-l-primary bg-primary/10 text-foreground',
  PENDING: 'border-l-amber-500 bg-amber-500/10 text-foreground',
  COMPLETED: 'border-l-emerald-600 bg-emerald-600/10 text-foreground',
  CANCELLED: 'border-l-border bg-muted text-muted-foreground line-through opacity-70',
};

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];

export const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : FALLBACK_TIMEZONES;
