import { Bell, Check, CheckCheck, ClipboardCheck, ExternalLink, X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function WorkspaceNotificationMenu() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.notifications.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });
  const resolveTakeoff = trpc.notifications.resolveTakeoff.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`AI takeoff ${variables.decision}`);
      void utils.notifications.list.invalidate();
      void utils.projects.recentSummaries.invalidate();
      void utils.audit.recent.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const unreadCount = notifications.filter((notification) => notification.status === "unread").length;

  const openNotification = (notification: (typeof notifications)[number]) => {
    if (notification.status === "unread") markRead.mutate({ notificationId: notification.id });
    navigate(notification.takeoffId ? `/project/${notification.projectId}/takeoff/${notification.takeoffId}` : `/project/${notification.projectId}`);
  };

  const resolveNotification = (event: React.MouseEvent, notification: (typeof notifications)[number], decision: "approved" | "rejected") => {
    event.stopPropagation();
    resolveTakeoff.mutate({ notificationId: notification.id, decision });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0" aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span>Workspace notifications</span>
          {unreadCount > 0 && <span className="text-xs font-normal text-muted-foreground">{unreadCount} unread</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <ClipboardCheck className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">You’re all caught up</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">AI takeoff completion alerts will appear here.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto py-1">
            {notifications.map((notification) => {
              const canResolve = notification.type === "takeoff_completed" && (notification.status === "unread" || notification.status === "read");
              return <div key={notification.id} className={`${notification.status === "unread" ? "bg-blue-50/60" : ""}`}>
                <button type="button" className="flex w-full items-start gap-3 px-4 pt-3 text-left transition-colors hover:bg-muted/60" onClick={() => openNotification(notification)}>
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.status === "unread" ? "bg-primary" : "bg-slate-300"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="font-medium leading-5">{notification.title}</span><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /></span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.content}</span><span className="mt-1.5 block text-[11px] text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</span></span>
                </button>
                {canResolve && <div className="flex justify-end gap-2 px-4 pb-3 pt-2"><Button size="sm" variant="outline" className="h-7 text-rose-700 hover:bg-rose-50" disabled={resolveTakeoff.isPending} onClick={(event) => resolveNotification(event, notification, "rejected")}><X className="mr-1 h-3.5 w-3.5" />Reject</Button><Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" disabled={resolveTakeoff.isPending} onClick={(event) => resolveNotification(event, notification, "approved")}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button></div>}
              </div>;
            })}
          </div>
        )}
        {unreadCount > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground"><CheckCheck className="mr-1 inline h-3.5 w-3.5" />Open an alert to mark it as read.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
