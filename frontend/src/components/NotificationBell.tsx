/**
 * The bell in the header: shows how many messages are unread and opens a list of them
 * (order updates, cancellations, out-of-stock notes, ...). Tapping a message marks it read
 * and opens the page it belongs to. Hidden for visitors who are not logged in.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

function timeAgo(value: string | Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const list = trpc.community.notifications.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30_000, refetchOnWindowFocus: true });
  const markRead = trpc.community.notifications.markRead.useMutation({ onSuccess: () => list.refetch() });
  const markAllRead = trpc.community.notifications.markAllRead.useMutation({ onSuccess: () => list.refetch() });

  if (!isAuthenticated) return null;

  const items = list.data ?? [];
  const unread = items.filter(item => !item.isRead).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className={`relative grid h-9 w-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted ${className}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button type="button" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()} className="text-xs font-semibold text-primary disabled:opacity-50">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          {list.isLoading && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {!list.isLoading && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
              <BellOff className="h-6 w-6" />
              No notifications yet. Order updates will appear here.
            </div>
          )}
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!item.isRead) markRead.mutate({ notificationId: item.id });
                setOpen(false);
                if (item.actionUrl) navigate(item.actionUrl);
              }}
              className={`flex w-full gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/60 ${item.isRead ? "" : "bg-primary/[0.04]"}`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${item.isRead ? "font-medium text-foreground/80" : "font-semibold text-foreground"}`}>{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.body}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground/80">{timeAgo(item.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}