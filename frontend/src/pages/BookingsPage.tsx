import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { WeekCalendar } from "@/components/bookings/WeekCalendar";
import {
  useBookings,
  useBookingsRange,
  useCancelBooking,
} from "@/hooks/useBookings";

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-border divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 p-4">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function BookingsPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data: upcoming, isLoading: upcomingLoading } =
    useBookings("upcoming");
  const { data: past, isLoading: pastLoading } = useBookings("past");
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const { data: rangeBookings, isLoading: rangeLoading } = useBookingsRange(
    weekStart,
    weekEnd,
    view === "calendar",
  );
  const cancelMutation = useCancelBooking();

  const pastOnly = useMemo(
    () => (past ?? []).filter((b) => b.status !== "CANCELLED"),
    [past],
  );
  const cancelled = useMemo(
    () => (past ?? []).filter((b) => b.status === "CANCELLED"),
    [past],
  );

  const handleCancelConfirm = () => {
    if (!cancelId) return;
    cancelMutation.mutate(cancelId, {
      onSuccess: () => {
        toast.success("Booking cancelled");
        setCancelId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel booking");
        setCancelId(null);
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Bookings"
        description={
          !upcomingLoading && !pastLoading
            ? `${upcoming?.length ?? 0} upcoming · ${pastOnly.length} past · ${cancelled.length} cancelled`
            : undefined
        }
        action={
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-none",
                view === "list" && " text-slate-800 hover:bg-slate-700",
              )}
              title="List view"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-none border-l border-border",
                view === "calendar" && "bg-slate-900 text-slate-800 hover:bg-slate-700",
              )}
              title="Calendar view"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="sr-only">Calendar view</span>
            </Button>
          </div>
        }
      />

      {view === "list" ? (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            {upcomingLoading ? (
              <ListSkeleton />
            ) : (
              <BookingsTable
                bookings={upcoming ?? []}
                isUpcoming
                onCancel={setCancelId}
              />
            )}
          </TabsContent>
          <TabsContent value="past">
            {pastLoading ? (
              <ListSkeleton />
            ) : (
              <BookingsTable bookings={pastOnly} isUpcoming={false} />
            )}
          </TabsContent>
          <TabsContent value="cancelled">
            {pastLoading ? (
              <ListSkeleton />
            ) : (
              <BookingsTable bookings={cancelled} isUpcoming={false} />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart((prev) => addDays(prev, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
                }
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart((prev) => addDays(prev, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm font-medium">
              {format(weekStart, "MMM d")} –{" "}
              {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
          </div>

          <div className="min-h-0 flex-1">
            {rangeLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <WeekCalendar
                weekStart={weekStart}
                bookings={rangeBookings ?? []}
                onCancel={setCancelId}
              />
            )}
          </div>
        </div>
      )}

      <AlertDialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              The booker will lose their reserved slot. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelConfirm}
            >
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
