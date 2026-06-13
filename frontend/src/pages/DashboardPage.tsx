import { Link } from 'react-router-dom';
import { CalendarDays, Clock, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const SHORTCUTS = [
  {
    title: 'Event Types',
    description: 'Create and manage the events people can book with you.',
    href: '/event-types',
    icon: CalendarDays,
  },
  {
    title: 'Availability',
    description: 'Set your weekly working hours and timezone.',
    href: '/availability',
    icon: Clock,
  },
  {
    title: 'Bookings',
    description: 'View upcoming and past bookings, cancel as needed.',
    href: '/bookings',
    icon: BookOpen,
  },
];

export function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Welcome back. Here's a quick overview." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <item.icon className="mb-2 h-6 w-6 text-primary" />
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
