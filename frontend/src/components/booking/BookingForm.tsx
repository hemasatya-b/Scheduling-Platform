import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateBooking } from '@/hooks/useCreateBooking';

const formSchema = z.object({
  bookerName: z.string().min(1, 'Name is required').max(120),
  bookerEmail: z.string().email('Enter a valid email').max(254),
  notes: z.string().max(250).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BookingFormProps {
  eventTypeId: string;
  startTime: string;
  onSlotTaken: () => void;
}

export function BookingForm({ eventTypeId, startTime, onSlotTaken }: BookingFormProps) {
  const navigate = useNavigate();
  const createBooking = useCreateBooking();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { bookerName: '', bookerEmail: '', notes: '' },
  });

  const onSubmit = (values: FormValues) => {
    createBooking.mutate(
      {
        eventTypeId,
        startTime,
        bookerName: values.bookerName,
        bookerEmail: values.bookerEmail,
        notes: values.notes || undefined,
      },
      {
        onSuccess: (data) => {
          navigate(`/booking/${data.id}/confirm`);
        },
        onError: (error) => {
          const status = (error as Error & { status?: number }).status;
          if (status === 409) {
            form.setError('root', {
              message: 'This slot was just taken. Please choose another time.',
            });
            onSlotTaken();
          } else {
            form.setError('root', { message: error.message || 'Failed to create booking' });
          }
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="bookerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bookerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Anything you'd like to share?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={createBooking.isPending}>
          Confirm Booking
        </Button>
      </form>
    </Form>
  );
}
