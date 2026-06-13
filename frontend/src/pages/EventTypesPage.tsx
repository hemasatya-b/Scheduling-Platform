import { useState } from 'react';
import { CalendarX, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EventTypeCard } from '@/components/event-types/EventTypeCard';
import { EventTypeForm } from '@/components/event-types/EventTypeForm';
import { useEventTypes, useDeleteEventType } from '@/hooks/useEventTypes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { EventType } from '@/types';

export function EventTypesPage() {
  const { data: eventTypes, isLoading } = useEventTypes();
  const { data: currentUser } = useCurrentUser();
  const deleteMutation = useDeleteEventType();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleNew = () => {
    setEditingEventType(null);
    setFormOpen(true);
  };

  const handleEdit = (id: string) => {
    const eventType = eventTypes?.find((e) => e.id === id) ?? null;
    setEditingEventType(eventType);
    setFormOpen(true);
  };

  const handleCopyLink = (slug: string) => {
    const url = `${import.meta.env.VITE_BASE_URL}/${currentUser?.username ?? ''}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Event type deleted');
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete event type');
        setDeleteId(null);
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Event Types"
        description="Configure different events for people to book on your calendar."
        action={
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            New Event Type
          </Button>
        }
      />

      {isLoading ? (
        <div className="overflow-hidden rounded-md border border-border divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-2 h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : !eventTypes || eventTypes.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No event types yet"
          description="Create your first event type to start accepting bookings."
          action={
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4" />
              New Event Type
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border divide-y divide-border">
          {eventTypes.map((eventType) => (
            <EventTypeCard
              key={eventType.id}
              eventType={eventType}
              username={currentUser?.username ?? ''}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              onCopyLink={handleCopyLink}
            />
          ))}
        </div>
      )}

      <EventTypeForm open={formOpen} onOpenChange={setFormOpen} eventType={editingEventType} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the event type and cancel any future confirmed bookings for it. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
