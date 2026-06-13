import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EVENT_DURATIONS } from '@/constants';
import { useCreateEventType, useUpdateEventType } from '@/hooks/useEventTypes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { EventType } from '@/types';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(500).optional(),
  durationMinutes: z.coerce.number().int().positive().max(480),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
});

type FormValues = z.infer<typeof formSchema>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface EventTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType?: EventType | null;
}

export function EventTypeForm({ open, onOpenChange, eventType }: EventTypeFormProps) {
  const isEditMode = !!eventType;
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const { data: currentUser } = useCurrentUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      durationMinutes: 30,
      slug: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: eventType?.title ?? '',
        description: eventType?.description ?? '',
        durationMinutes: eventType?.durationMinutes ?? 30,
        slug: eventType?.slug ?? '',
      });
    }
  }, [open, eventType, form]);

  const titleValue = form.watch('title');
  const slugValue = form.watch('slug');

  useEffect(() => {
    if (!isEditMode && !form.getFieldState('slug').isTouched) {
      form.setValue('slug', slugify(titleValue ?? ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleValue]);

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, description: values.description || undefined };

    if (isEditMode && eventType) {
      updateMutation.mutate(
        { id: eventType.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Event type updated');
            onOpenChange(false);
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to update event type');
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Event type created');
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to create event type');
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const baseUrl = import.meta.env.VITE_BASE_URL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event Type' : 'New Event Type'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this event type.' : 'Create a new bookable event type.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 30 Minute Meeting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_DURATIONS.map((duration) => (
                        <SelectItem key={duration} value={String(duration)}>
                          {duration} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 30-minute-meeting" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {baseUrl}/{currentUser?.username ?? ''}/{slugValue || '...'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditMode ? 'Save Changes' : 'Create Event Type'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
